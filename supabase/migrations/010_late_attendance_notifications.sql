ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS late_notification_minutes INTEGER NOT NULL DEFAULT 10;

CREATE TABLE IF NOT EXISTS attendance_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  notification_date DATE NOT NULL,
  scheduled_at TIMESTAMPTZ,
  actual_entry_at TIMESTAMPTZ,
  minutes_late INTEGER NOT NULL DEFAULT 0,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT attendance_notifications_type_check
    CHECK (type IN ('late_entry')),
  CONSTRAINT attendance_notifications_status_check
    CHECK (status IN ('pending', 'read'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_notifications_unique_day
  ON attendance_notifications(empresa_id, empleado_id, type, notification_date);

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_empresa_status
  ON attendance_notifications(empresa_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_attendance_notifications_empleado
  ON attendance_notifications(empleado_id, created_at DESC);

ALTER TABLE attendance_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "attendance_notifications_select_own_company" ON attendance_notifications;
CREATE POLICY "attendance_notifications_select_own_company"
  ON attendance_notifications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = attendance_notifications.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "attendance_notifications_insert_own_company" ON attendance_notifications;
CREATE POLICY "attendance_notifications_insert_own_company"
  ON attendance_notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = attendance_notifications.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "attendance_notifications_update_own_company" ON attendance_notifications;
CREATE POLICY "attendance_notifications_update_own_company"
  ON attendance_notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = attendance_notifications.empresa_id
        AND employees.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = attendance_notifications.empresa_id
        AND employees.role = 'admin'
    )
  );
