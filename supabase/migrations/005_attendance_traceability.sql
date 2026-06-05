CREATE EXTENSION IF NOT EXISTS "pgcrypto";

ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS foto_url TEXT,
  ADD COLUMN IF NOT EXISTS firma_url TEXT,
  ADD COLUMN IF NOT EXISTS duracion_colacion_minutos INTEGER,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS request_ip TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS client_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS record_hash TEXT;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_tipo_registro_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_tipo_registro_check
  CHECK (tipo_registro IN (
    'entrada',
    'salida',
    'entrada_laboral',
    'salida_almuerzo',
    'entrada_almuerzo',
    'salida_laboral'
  ));

UPDATE attendance
SET created_at = COALESCE(fecha_hora, created_at),
    created_by = COALESCE(created_by, empleado_id),
    client_metadata = COALESCE(client_metadata, '{}'::jsonb)
WHERE created_by IS NULL OR client_metadata IS NULL;

CREATE TABLE IF NOT EXISTS attendance_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  attendance_id UUID REFERENCES attendance(id) ON DELETE SET NULL,
  empresa_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  empleado_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated')),
  old_data JSONB,
  new_data JSONB,
  request_ip TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_attendance_id
  ON attendance_audit_logs(attendance_id);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_empresa_created
  ON attendance_audit_logs(empresa_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_audit_logs_actor_id
  ON attendance_audit_logs(actor_id);

CREATE OR REPLACE FUNCTION set_attendance_trace_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_at = COALESCE(NEW.created_at, NOW());
    NEW.created_by = COALESCE(NEW.created_by, auth.uid(), NEW.empleado_id);
  END IF;

  NEW.client_metadata = COALESCE(NEW.client_metadata, '{}'::jsonb);
  NEW.record_hash = encode(
    digest(
      concat_ws(
        '|',
        NEW.id::text,
        NEW.empresa_id::text,
        NEW.empleado_id::text,
        NEW.tipo_registro,
        NEW.fecha_hora::text,
        COALESCE(NEW.latitud::text, ''),
        COALESCE(NEW.longitud::text, ''),
        COALESCE(NEW.distancia_empresa_metros::text, ''),
        NEW.valido::text,
        COALESCE(NEW.foto_url, ''),
        COALESCE(NEW.firma_url, ''),
        COALESCE(NEW.duracion_colacion_minutos::text, '')
      ),
      'sha256'
    ),
    'hex'
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION write_attendance_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO attendance_audit_logs (
      attendance_id,
      empresa_id,
      empleado_id,
      actor_id,
      action,
      old_data,
      new_data,
      request_ip,
      user_agent
    )
    VALUES (
      NEW.id,
      NEW.empresa_id,
      NEW.empleado_id,
      COALESCE(NEW.created_by, auth.uid(), NEW.empleado_id),
      'created',
      NULL,
      to_jsonb(NEW),
      NEW.request_ip,
      NEW.user_agent
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    INSERT INTO attendance_audit_logs (
      attendance_id,
      empresa_id,
      empleado_id,
      actor_id,
      action,
      old_data,
      new_data,
      request_ip,
      user_agent
    )
    VALUES (
      NEW.id,
      NEW.empresa_id,
      NEW.empleado_id,
      auth.uid(),
      'updated',
      to_jsonb(OLD),
      to_jsonb(NEW),
      COALESCE(NEW.request_ip, OLD.request_ip),
      COALESCE(NEW.user_agent, OLD.user_agent)
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION prevent_attendance_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Los registros de asistencia no se pueden eliminar; deben conservarse para trazabilidad.';
END;
$$;

UPDATE attendance
SET record_hash = encode(
  digest(
    concat_ws(
      '|',
      id::text,
      empresa_id::text,
      empleado_id::text,
      tipo_registro,
      fecha_hora::text,
      COALESCE(latitud::text, ''),
      COALESCE(longitud::text, ''),
      COALESCE(distancia_empresa_metros::text, ''),
      valido::text,
      COALESCE(foto_url, ''),
      COALESCE(firma_url, ''),
      COALESCE(duracion_colacion_minutos::text, '')
    ),
    'sha256'
  ),
  'hex'
)
WHERE record_hash IS NULL;

INSERT INTO attendance_audit_logs (
  attendance_id,
  empresa_id,
  empleado_id,
  actor_id,
  action,
  old_data,
  new_data,
  request_ip,
  user_agent,
  created_at
)
SELECT
  a.id,
  a.empresa_id,
  a.empleado_id,
  COALESCE(a.created_by, a.empleado_id),
  'created',
  NULL,
  to_jsonb(a),
  a.request_ip,
  a.user_agent,
  COALESCE(a.created_at, a.fecha_hora)
FROM attendance a
WHERE NOT EXISTS (
  SELECT 1
  FROM attendance_audit_logs l
  WHERE l.attendance_id = a.id
    AND l.action = 'created'
);

DROP TRIGGER IF EXISTS trg_set_attendance_trace_fields ON attendance;
CREATE TRIGGER trg_set_attendance_trace_fields
  BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION set_attendance_trace_fields();

DROP TRIGGER IF EXISTS trg_write_attendance_audit_log ON attendance;
CREATE TRIGGER trg_write_attendance_audit_log
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION write_attendance_audit_log();

DROP TRIGGER IF EXISTS trg_prevent_attendance_delete ON attendance;
CREATE TRIGGER trg_prevent_attendance_delete
  BEFORE DELETE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION prevent_attendance_delete();

ALTER TABLE attendance_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_audit_select_own_company" ON attendance_audit_logs;
CREATE POLICY "attendance_audit_select_own_company"
  ON attendance_audit_logs
  FOR SELECT
  USING (empresa_id = get_my_empresa_id());

DROP POLICY IF EXISTS "attendance_audit_select_superadmin" ON attendance_audit_logs;
CREATE POLICY "attendance_audit_select_superadmin"
  ON attendance_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
