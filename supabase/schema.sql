-- ============================================================
-- SCHEMA: Sistema de Tickets BBDD & Tarifas
-- Ejecutar en Supabase > SQL Editor
-- ============================================================

-- Tabla de perfiles (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS perfiles (
  id        UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre    TEXT NOT NULL,
  mail      TEXT NOT NULL,
  rol       TEXT NOT NULL DEFAULT 'responsable' CHECK (rol IN ('admin', 'responsable')),
  activo    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: crear perfil automáticamente al registrar usuario
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO perfiles (id, nombre, mail, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'responsable')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Tabla principal de tickets
CREATE TABLE IF NOT EXISTS tickets (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  numero                TEXT UNIQUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Datos del formulario (del solicitante externo)
  mail_solicitante      TEXT NOT NULL,
  area_afectada         TEXT NOT NULL CHECK (area_afectada IN ('Tarifas', 'Base de Datos', 'Otro')),
  motivo_tarifas        TEXT,
  motivo_bd             TEXT,
  proveedor             TEXT,
  ciudad                TEXT,
  tipo_servicio         TEXT,
  fechas_servicio       TEXT,
  descripcion           TEXT NOT NULL,
  imagen_url            TEXT,
  resumen_servicio      TEXT,

  -- Gestión interna
  responsable_id        UUID REFERENCES perfiles(id),
  comentario_asignacion TEXT,
  comentario_solucion   TEXT,
  tipo_ticket           TEXT CHECK (tipo_ticket IN (
                          'Error del Usuario', 'Pedido de Alta Tarifa',
                          'Pedido de Alta Operador / Cliente', 'Error del Área',
                          'Error del Sistema', 'Pedido de Alta SVC/HTL',
                          'Consulta', 'Pedido de Alta Paquete',
                          'Actualización de Descriptivos'
                        )),
  estado                TEXT NOT NULL DEFAULT 'Recibido'
                          CHECK (estado IN ('Recibido', 'Asignado', 'Resuelto')),
  assigned_at           TIMESTAMPTZ,
  fecha_resolucion      TIMESTAMPTZ
);

-- Auto-número de ticket por área
CREATE OR REPLACE FUNCTION generar_numero_ticket()
RETURNS TRIGGER AS $$
DECLARE
  prefijo TEXT;
  ultimo  INT;
BEGIN
  IF NEW.area_afectada = 'Tarifas'      THEN prefijo := 'TF';
  ELSIF NEW.area_afectada = 'Base de Datos' THEN prefijo := 'BD';
  ELSE prefijo := 'OT'; END IF;

  SELECT COALESCE(MAX(CAST(SUBSTRING(numero FROM LENGTH(prefijo)+1) AS INTEGER)), 0)
  INTO ultimo
  FROM tickets
  WHERE numero LIKE prefijo || '%'
    AND numero ~ ('^' || prefijo || '[0-9]+$');

  NEW.numero := prefijo || LPAD((ultimo + 1)::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_numero_ticket
  BEFORE INSERT ON tickets
  FOR EACH ROW WHEN (NEW.numero IS NULL)
  EXECUTE FUNCTION generar_numero_ticket();

-- Auto-timestamps al cambiar estado
CREATE OR REPLACE FUNCTION actualizar_timestamps_ticket()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'Asignado'  AND OLD.estado = 'Recibido'  THEN NEW.assigned_at      := NOW(); END IF;
  IF NEW.estado = 'Resuelto'  AND OLD.estado != 'Resuelto' THEN NEW.fecha_resolucion := NOW(); END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_timestamps_ticket
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION actualizar_timestamps_ticket();

-- Índices
CREATE INDEX IF NOT EXISTS idx_tickets_estado      ON tickets(estado);
CREATE INDEX IF NOT EXISTS idx_tickets_responsable ON tickets(responsable_id);
CREATE INDEX IF NOT EXISTS idx_tickets_area        ON tickets(area_afectada);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at  ON tickets(created_at DESC);

-- Vista con datos del responsable
CREATE OR REPLACE VIEW tickets_con_responsable AS
  SELECT t.*, p.nombre AS responsable_nombre, p.mail AS responsable_mail
  FROM tickets t
  LEFT JOIN perfiles p ON p.id = t.responsable_id;

-- ============================================================
-- RLS (Row Level Security)
-- ============================================================
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets  ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada usuario ve el suyo; admin ve todos
CREATE POLICY "perfil_propio" ON perfiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "admin_ve_perfiles" ON perfiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

CREATE POLICY "perfil_update_propio" ON perfiles FOR UPDATE
  USING (auth.uid() = id);

-- Tickets: responsable ve solo los suyos; admin ve todos
CREATE POLICY "responsable_ve_sus_tickets" ON tickets FOR SELECT
  USING (
    responsable_id = auth.uid()
    OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
  );

-- Cualquier autenticado puede insertar (el form público usa la API route, no RLS directo)
CREATE POLICY "insertar_tickets" ON tickets FOR INSERT
  WITH CHECK (true);

-- Solo admin puede asignar; responsable puede resolver los suyos
CREATE POLICY "actualizar_tickets" ON tickets FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin')
    OR (responsable_id = auth.uid() AND estado = 'Asignado')
  );

-- ============================================================
-- USUARIOS INICIALES
-- Los creás en Supabase > Authentication > Users > Add User
-- con estos mails y luego correr este UPDATE:
-- ============================================================
-- UPDATE perfiles SET rol = 'admin' WHERE mail = 'lupe@sayhueque.com';
--
-- Los demás quedan con rol = 'responsable' por default:
--   paulam@sayhueque.com
--   sebastianf@sayhueque.com
--   carolinad@sayhueque.com
--   melisa.b@sayhueque.com
--   jennifer.g@sayhueque.com
--   camilat@sayhueque.com
