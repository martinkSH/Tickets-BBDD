-- ════════════════════════════════════════════════════════════════════════════
-- Mejoras en altas de proveedores/clientes y en el ciclo de tickets
-- Todo aditivo: columnas nuevas nullable y un estado más en el CHECK.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Proveedores ──────────────────────────────────────────────────────────
-- domicilio pasa a ser la dirección física; la de facturación va aparte.
-- cuit se reusa como identificación fiscal para los proveedores del exterior.
-- contacto_reservas pasa a guardar sólo el nombre; el mail va en mail_reservas.
ALTER TABLE proveedores
  ADD COLUMN IF NOT EXISTS domicilio_facturacion text,
  ADD COLUMN IF NOT EXISTS cbu                   text,
  ADD COLUMN IF NOT EXISTS alias_cbu             text,
  ADD COLUMN IF NOT EXISTS banco                 text,
  ADD COLUMN IF NOT EXISTS contacto_pagos        text,
  ADD COLUMN IF NOT EXISTS mail_reservas         text;

-- ── 2. Clientes ─────────────────────────────────────────────────────────────
-- Reemplazan a mail_telefono, que queda para las altas anteriores.
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS mail_cliente text,
  ADD COLUMN IF NOT EXISTS telefono     text;

-- ── 3. Tickets: estado 'Pendiente BBDD' ─────────────────────────────────────
-- Lo pone el sistema cuando el solicitante responde en la conversación.
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_estado_check;
ALTER TABLE tickets ADD CONSTRAINT tickets_estado_check CHECK (estado IN (
  'Recibido', 'Asignado', 'Pendiente BBDD', 'Pendiente Operador', 'Pendiente Ventas',
  'Pendiente Conformidad', 'Resuelto'
));
