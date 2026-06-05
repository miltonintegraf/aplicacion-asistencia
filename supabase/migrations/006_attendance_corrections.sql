ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS estado_registro TEXT NOT NULL DEFAULT 'vigente',
  ADD COLUMN IF NOT EXISTS correction_reason TEXT,
  ADD COLUMN IF NOT EXISTS corrected_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS corrected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS correction_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_estado_registro_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_estado_registro_check
  CHECK (estado_registro IN ('vigente', 'corregido', 'anulado'));

CREATE INDEX IF NOT EXISTS idx_attendance_estado_registro
  ON attendance(estado_registro);

CREATE OR REPLACE FUNCTION validate_attendance_correction()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  changed_sensitive_fields BOOLEAN;
BEGIN
  changed_sensitive_fields :=
    NEW.tipo_registro IS DISTINCT FROM OLD.tipo_registro OR
    NEW.fecha_hora IS DISTINCT FROM OLD.fecha_hora OR
    NEW.estado_registro IS DISTINCT FROM OLD.estado_registro OR
    NEW.duracion_colacion_minutos IS DISTINCT FROM OLD.duracion_colacion_minutos OR
    NEW.valido IS DISTINCT FROM OLD.valido;

  IF changed_sensitive_fields THEN
    IF NEW.corrected_by IS NULL THEN
      RAISE EXCEPTION 'Toda corrección de asistencia debe indicar el usuario responsable.';
    END IF;

    IF NEW.corrected_at IS NULL THEN
      NEW.corrected_at := NOW();
    END IF;

    IF NEW.correction_reason IS NULL OR length(trim(NEW.correction_reason)) < 10 THEN
      RAISE EXCEPTION 'Toda corrección de asistencia debe incluir un motivo de al menos 10 caracteres.';
    END IF;

    IF NEW.estado_registro = 'vigente' THEN
      NEW.estado_registro := 'corregido';
    END IF;

    NEW.correction_count := COALESCE(OLD.correction_count, 0) + 1;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_attendance_correction ON attendance;
CREATE TRIGGER trg_validate_attendance_correction
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION validate_attendance_correction();
