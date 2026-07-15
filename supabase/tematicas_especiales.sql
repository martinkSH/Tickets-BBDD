-- =============================================
-- TEMÁTICAS ESPECIALES — tabla propia
-- Ejecutar en Supabase SQL Editor (proyecto "Tickets BBDD").
--
-- NO toca `tickets` ni `perfiles`: es una tabla nueva e independiente, igual que
-- `proveedores` / `clientes`. Correr esto no afecta nada de lo que ya funciona.
--
-- Qué es: el form /tematicas-especiales carga acá el pedido para que después se
-- copie y pegue como nota "Descripción Temática" (DP1..DP9) en la ficha del
-- proveedor en TourPlan. Por eso los campos son exactamente los de esa plantilla.
-- =============================================

CREATE TABLE IF NOT EXISTS tematicas_especiales (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),

  -- Quién lo envía (mismo criterio que tickets.mail_solicitante).
  mail_solicitante  text NOT NULL,

  -- Proveedor al que hay que cargarle la nota en TP. No es parte de la plantilla
  -- (en TP la nota ya vive dentro de la ficha del proveedor), pero sin esto quien
  -- carga no sabe dónde pegarla.
  proveedor         text NOT NULL,

  -- Campos de la plantilla de TP, en su orden.
  destino           text NOT NULL,          -- código TP (ej. 'MDZ') — ver lib/destinos-tp.ts
  nombre_servicio   text,
  web_proveedor     text,
  descriptivo       text,
  comentarios       text,
  tarifa_aproximada text,
  tematica          text NOT NULL,          -- ver TEMATICAS en lib/tematicas.ts

  -- Estado de carga en TP. Arranca en 'Pendiente'; se marca 'Cargada' cuando la
  -- nota ya está puesta en TourPlan.
  estado            text NOT NULL DEFAULT 'Pendiente'
                    CHECK (estado IN ('Pendiente', 'Cargada')),
  cargada_at        timestamptz,
  cargada_por       text
);

CREATE INDEX IF NOT EXISTS tematicas_especiales_estado_idx  ON tematicas_especiales (estado, created_at DESC);
CREATE INDEX IF NOT EXISTS tematicas_especiales_tematica_idx ON tematicas_especiales (tematica);

ALTER TABLE tematicas_especiales ENABLE ROW LEVEL SECURITY;

-- Mismo criterio que el resto de este proyecto: el form es público (cualquiera de
-- la empresa carga sin login) y la lectura/edición queda abierta al equipo.
CREATE POLICY "insertar_tematicas"   ON tematicas_especiales FOR INSERT WITH CHECK (true);
CREATE POLICY "leer_tematicas"       ON tematicas_especiales FOR SELECT USING (true);
CREATE POLICY "actualizar_tematicas" ON tematicas_especiales FOR UPDATE USING (true);
