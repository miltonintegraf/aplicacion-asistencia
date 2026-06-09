ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS rut_empresa TEXT,
  ADD COLUMN IF NOT EXISTS razon_social TEXT,
  ADD COLUMN IF NOT EXISTS representante_legal TEXT;

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS rut TEXT,
  ADD COLUMN IF NOT EXISTS cargo TEXT;

CREATE INDEX IF NOT EXISTS idx_employees_rut
  ON employees(rut);
