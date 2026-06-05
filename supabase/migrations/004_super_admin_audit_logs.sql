CREATE TABLE IF NOT EXISTS super_admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_logs_actor_id
  ON super_admin_audit_logs(actor_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_logs_target
  ON super_admin_audit_logs(target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_super_admin_audit_logs_created_at
  ON super_admin_audit_logs(created_at DESC);

ALTER TABLE super_admin_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_audit_select_superadmin"
  ON super_admin_audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
