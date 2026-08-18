-- ════════════════════════════════════════════════════════════════════════════
-- Cierre del ticket por parte del solicitante
--
-- Separa dos conceptos que hoy viven juntos en estado='Resuelto':
--   · "resuelto" = fecha_resolucion IS NOT NULL  → BBDD terminó su trabajo (métricas)
--   · "cerrado"  = estado = 'Resuelto'           → el ticket terminó su vida
--
-- Flujo: BBDD responde → 'Pendiente Conformidad' (arranca reloj de 72 hs hábiles)
--        → el solicitante cierra, comenta (reabre) o se autocierra el cron.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Nuevo estado intermedio ──────────────────────────────────────────────
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_estado_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_estado_check CHECK (estado IN (
  'Recibido', 'Asignado', 'Pendiente Operador', 'Pendiente Ventas',
  'Pendiente Conformidad', 'Resuelto'
));

-- ── 2. Columnas del ciclo de conformidad ────────────────────────────────────
-- token_publico: va en el link del mail al solicitante, que no tiene login.
-- Se genera por fila (gen_random_uuid es volátil) y es único.
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS token_publico           text DEFAULT gen_random_uuid()::text,
  ADD COLUMN IF NOT EXISTS fecha_cierre            timestamptz,
  ADD COLUMN IF NOT EXISTS cerrado_por             text,
  ADD COLUMN IF NOT EXISTS conformidad_pedida_at   timestamptz,
  ADD COLUMN IF NOT EXISTS recordatorio_enviado_at timestamptz;

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_token_publico_key;
ALTER TABLE tickets ADD CONSTRAINT tickets_token_publico_key UNIQUE (token_publico);

ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_cerrado_por_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_cerrado_por_check
  CHECK (cerrado_por IS NULL OR cerrado_por IN ('solicitante', 'auto', 'bbdd', 'legacy'));

-- ── 3. Backfill: los tickets ya resueltos quedan cerrados de entrada ─────────
UPDATE tickets
SET fecha_cierre = fecha_resolucion, cerrado_por = 'legacy'
WHERE estado = 'Resuelto' AND fecha_cierre IS NULL;

-- ── 4. Hilo de comentarios del ticket ───────────────────────────────────────
-- Mismo patrón que proyectos_comentarios. autor_mail nunca se toma del body:
-- del lado del solicitante se deriva del token, del lado interno del perfil.
CREATE TABLE IF NOT EXISTS tickets_comentarios (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id  uuid NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  autor_tipo text NOT NULL CHECK (autor_tipo IN ('solicitante', 'responsable')),
  autor_mail text,
  autor_id   uuid REFERENCES perfiles(id),
  contenido  text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tickets_comentarios_ticket
  ON tickets_comentarios (ticket_id, created_at);

GRANT SELECT, INSERT ON tickets_comentarios TO anon, authenticated;

-- ── 5. Índice para el barrido del cron ──────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_conformidad
  ON tickets (conformidad_pedida_at)
  WHERE estado = 'Pendiente Conformidad';

-- ── 6. La vista se recrea para exponer las columnas nuevas ──────────────────
-- `t.*` se expande al crear la vista: sin este paso las columnas de conformidad
-- no llegan al código, que lee todo por esta vista.
DROP VIEW IF EXISTS tickets_con_responsable;
CREATE VIEW tickets_con_responsable AS
SELECT t.*, p.nombre AS responsable_nombre, p.mail AS responsable_mail
FROM tickets t LEFT JOIN perfiles p ON p.id = t.responsable_id;

GRANT SELECT ON tickets_con_responsable TO anon, authenticated;

-- ── 7. Horas hábiles transcurridas, para el cron de autocierre ──────────────
CREATE OR REPLACE FUNCTION public.horas_habiles_conformidad()
RETURNS TABLE (id uuid, horas numeric)
LANGUAGE sql STABLE AS $$
  SELECT t.id, business_hours_between(t.conformidad_pedida_at, now())
  FROM tickets t
  WHERE t.estado = 'Pendiente Conformidad'
    AND t.conformidad_pedida_at IS NOT NULL;
$$;

GRANT EXECUTE ON FUNCTION public.horas_habiles_conformidad() TO anon, authenticated;

-- ── 8. El trigger también marca la resolución al pedir conformidad ──────────
-- La guarda `IS NULL` es la que evita que el cierre final pise fecha_resolucion
-- (y con eso el promedio de resolución) cuando el ticket pasa a 'Resuelto'.
CREATE OR REPLACE FUNCTION public.actualizar_timestamps_ticket()
RETURNS trigger LANGUAGE plpgsql AS $function$
BEGIN
  IF NEW.estado = 'Asignado' AND OLD.estado != 'Asignado' AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  IF NEW.estado IN ('Resuelto', 'Pendiente Conformidad')
     AND OLD.estado NOT IN ('Resuelto', 'Pendiente Conformidad')
     AND NEW.fecha_resolucion IS NULL THEN
    NEW.fecha_resolucion := now();
  END IF;
  RETURN NEW;
END;
$function$;
