CREATE OR REPLACE FUNCTION write_attendance_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
      COALESCE(NEW.corrected_by, auth.uid()),
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

DROP TRIGGER IF EXISTS trg_write_attendance_audit_log ON attendance;
CREATE TRIGGER trg_write_attendance_audit_log
  AFTER INSERT OR UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION write_attendance_audit_log();
