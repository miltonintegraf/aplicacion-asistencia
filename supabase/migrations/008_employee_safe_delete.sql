ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS eliminado_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_employees_eliminado_at
  ON employees(eliminado_at);
