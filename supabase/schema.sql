-- =============================================
-- TICKETS BBDD & TARIFAS — Schema completo v3
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Limpiar si existe
DROP TRIGGER IF EXISTS trigger_numero_ticket ON tickets;
DROP TRIGGER IF EXISTS trigger_timestamps_ticket ON tickets;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS generar_numero_ticket() CASCADE;
DROP FUNCTION IF EXISTS actualizar_timestamps_ticket() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP VIEW IF EXISTS tickets_con_responsable;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS perfiles CASCADE;

-- Tabla perfiles
CREATE TABLE perfiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      text NOT NULL DEFAULT '',
  mail        text NOT NULL DEFAULT '',
  rol         text NOT NULL DEFAULT 'responsable' CHECK (rol IN ('admin','responsable')),
  activo      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leer_perfiles"        ON perfiles FOR SELECT USING (true);
CREATE POLICY "update_perfil_propio" ON perfiles FOR UPDATE USING (auth.uid() = id);

-- Tabla tickets
CREATE TABLE tickets (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                text UNIQUE,
  created_at            timestamptz NOT NULL DEFAULT now(),
  mail_solicitante      text NOT NULL,
  area_afectada         text NOT NULL CHECK (area_afectada IN ('Tarifas','Base de Datos','Otro')),
  motivo_tarifas        text,
  motivo_bd             text,
  proveedor             text,
  ciudad                text,
  tipo_servicio         text,
  fechas_servicio       text,
  descripcion           text NOT NULL,
  imagen_url            text,
  resumen_servicio      text,
  responsable_id        uuid REFERENCES perfiles(id),
  comentario_asignacion text,
  comentario_solucion   text,
  tipo_ticket           text,
  estado                text NOT NULL DEFAULT 'Recibido'
                        CHECK (estado IN ('Recibido','Asignado','Pendiente Operador','Pendiente Ventas','Resuelto')),
  assigned_at           timestamptz,
  fecha_resolucion      timestamptz
);
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insertar_tickets"     ON tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "responsable_ve_sus_tickets" ON tickets FOR SELECT USING (true);
CREATE POLICY "actualizar_tickets"   ON tickets FOR UPDATE USING (true);

-- Auto-numeración
CREATE OR REPLACE FUNCTION generar_numero_ticket()
RETURNS TRIGGER AS $$
DECLARE
  prefix text;
  seq    int;
BEGIN
  prefix := CASE NEW.area_afectada
    WHEN 'Tarifas'       THEN 'TF'
    WHEN 'Base de Datos' THEN 'BD'
    ELSE 'OT'
  END;
  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM 3) AS int)), 0) + 1
    INTO seq FROM tickets WHERE numero LIKE prefix || '%';
  NEW.numero := prefix || LPAD(seq::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_numero_ticket
  BEFORE INSERT ON tickets
  FOR EACH ROW EXECUTE FUNCTION generar_numero_ticket();

-- Timestamps automáticos
CREATE OR REPLACE FUNCTION actualizar_timestamps_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'Asignado' AND OLD.estado != 'Asignado' AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := now();
  END IF;
  IF NEW.estado = 'Resuelto' AND OLD.estado != 'Resuelto' AND NEW.fecha_resolucion IS NULL THEN
    NEW.fecha_resolucion := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timestamps_ticket
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamps_ticket();

-- Trigger: crear perfil al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre, mail, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    'responsable'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Vista con join
CREATE OR REPLACE VIEW tickets_con_responsable AS
  SELECT t.*, p.nombre AS responsable_nombre, p.mail AS responsable_mail
  FROM tickets t
  LEFT JOIN perfiles p ON p.id = t.responsable_id;
