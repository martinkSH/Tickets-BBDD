-- ============================================================================
--  ESTADÍSTICAS — capa de agregación en Postgres
--  Aplicado en el proyecto Supabase "Tickets BBDD" (mmdbqnewkbrqhfqlhyel).
--  Este archivo es la fuente de verdad de las funciones/vistas de stats.
-- ============================================================================

-- ── 1. Horas hábiles (L-V 09:00-18:00) sobre reloj local de Argentina ───────
CREATE OR REPLACE FUNCTION business_hours_between(p_start timestamptz, p_end timestamptz)
RETURNS numeric
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  s timestamp := p_start AT TIME ZONE 'America/Argentina/Buenos_Aires';
  e timestamp := p_end   AT TIME ZONE 'America/Argentina/Buenos_Aires';
  total_sec numeric := 0;
  cur date;
  last_d date;
  ws timestamp; we timestamp; istart timestamp; iend timestamp;
  dow int;
BEGIN
  IF p_start IS NULL OR p_end IS NULL OR e <= s THEN
    RETURN 0;
  END IF;
  cur := s::date;
  last_d := e::date;
  WHILE cur <= last_d LOOP
    dow := EXTRACT(dow FROM cur);        -- 0=Dom .. 6=Sab
    IF dow >= 1 AND dow <= 5 THEN
      ws := cur + time '09:00';
      we := cur + time '18:00';
      istart := GREATEST(ws, s);
      iend   := LEAST(we, e);
      IF iend > istart THEN
        total_sec := total_sec + EXTRACT(EPOCH FROM (iend - istart));
      END IF;
    END IF;
    cur := cur + 1;
  END LOOP;
  RETURN round(total_sec / 3600.0, 2);
END;
$$;

-- ── 2. Vista base BBDD (normaliza área + métricas de tiempo) ────────────────
CREATE OR REPLACE VIEW tickets_stats_base AS
WITH area_map AS (
  SELECT lower(x->>'mail') AS mail, upper(x->>'area') AS area
  FROM app_settings, jsonb_array_elements(value) AS x
  WHERE key = 'solicitantes_areas'
)
SELECT
  t.id, t.numero, t.created_at, t.assigned_at, t.fecha_resolucion,
  t.mail_solicitante, t.estado, t.area_afectada, t.motivo_tarifas, t.motivo_bd,
  t.proveedor, t.ciudad, t.tipo_servicio, t.tipo_ticket, t.responsable_id,
  p.nombre AS responsable_nombre,
  COALESCE(am.area, 'OTRO') AS area_negocio,
  (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS created_local,
  (t.fecha_resolucion AT TIME ZONE 'America/Argentina/Buenos_Aires') AS resuelto_local,
  -- El corte es fecha_resolucion, no estado='Resuelto': un ticket en
  -- 'Pendiente Conformidad' ya tiene el trabajo de BBDD terminado y tiene que
  -- traer sus horas, o entra al set de resueltos en NULL y hunde el %SLA.
  CASE WHEN t.fecha_resolucion IS NOT NULL
       THEN business_hours_between(t.created_at, t.fecha_resolucion) END AS horas_resolucion,
  CASE WHEN t.assigned_at IS NOT NULL
       THEN business_hours_between(t.created_at, t.assigned_at) END AS horas_asignacion
FROM tickets t
LEFT JOIN perfiles p ON p.id = t.responsable_id
LEFT JOIN area_map am ON am.mail = lower(t.mail_solicitante);

-- ── 3. Vista base IT ────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW tickets_it_stats_base AS
SELECT
  t.id, t.numero, t.created_at, t.assigned_at, t.fecha_resolucion,
  t.mail_solicitante, t.estado, t.sistema,
  COALESCE(t.modulo_tourplan, t.modulo_pythagoras, t.modulo_b2c) AS modulo,
  COALESCE(t.codigo_file, t.codigo_file_tourplan, t.codigo_file_pythagoras) AS codigo_file_u,
  t.tipo_ticket, t.responsable_id, p.nombre AS responsable_nombre,
  (t.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') AS created_local,
  (t.fecha_resolucion AT TIME ZONE 'America/Argentina/Buenos_Aires') AS resuelto_local,
  CASE WHEN t.estado = 'Resuelto' AND t.fecha_resolucion IS NOT NULL
       THEN business_hours_between(t.created_at, t.fecha_resolucion) END AS horas_resolucion,
  CASE WHEN t.assigned_at IS NOT NULL
       THEN business_hours_between(t.created_at, t.assigned_at) END AS horas_asignacion
FROM tickets_it t
LEFT JOIN perfiles p ON p.id = t.responsable_id;

-- ── 4 y 5. RPC estadisticas_bbdd / estadisticas_it ──────────────────────────
-- (Ver definiciones aplicadas vía migración; devuelven JSONB con todos los
--  bloques del dashboard para un rango [p_from, p_to], granularidad p_bucket
--  ('day'|'week'|'month'), umbral SLA p_sla en horas hábiles y, en BBDD,
--  filtro opcional de área de negocio p_area y de proveedor p_proveedor.)
--
--  estadisticas_bbdd(p_from, p_to, p_bucket, p_sla, p_area, p_proveedor)
--  El filtro por proveedor normaliza con lower(btrim(...)) para unir variantes
--  de mayúsculas/espacios del texto libre (ej. "blumar" + "Blumar" + "BLUMAR").
--
--  Criterio de resuelto/abierto (desde la conformidad del solicitante, ver
--  conformidad.sql): "resuelto" es fecha_resolucion IS NOT NULL y "abierto" es
--  fecha_resolucion IS NULL. NO se usa estado='Resuelto', que ahora significa
--  "cerrado" — un ticket en 'Pendiente Conformidad' está resuelto pero no
--  cerrado, y no debe inflar el backlog ni la lista de atrasados.

-- ── 6. Lista de proveedores presentes en tickets (para el selector) ─────────
--  proveedores_tickets_list() → [{ label, key, total }] normalizado por nombre.
