CREATE TABLE IF NOT EXISTS company_holidays (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  fecha DATE NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'feriado',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT company_holidays_tipo_check
    CHECK (tipo IN ('feriado', 'cierre_empresa', 'otro'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_company_holidays_unique_date
  ON company_holidays(empresa_id, fecha);

CREATE INDEX IF NOT EXISTS idx_company_holidays_empresa_fecha
  ON company_holidays(empresa_id, fecha DESC);

CREATE TABLE IF NOT EXISTS employee_absences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  empleado_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  tipo TEXT NOT NULL,
  motivo TEXT NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  CONSTRAINT employee_absences_tipo_check
    CHECK (tipo IN ('permiso', 'licencia', 'vacaciones', 'dia_administrativo', 'otro')),
  CONSTRAINT employee_absences_date_check
    CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_employee_absences_empresa_dates
  ON employee_absences(empresa_id, fecha_inicio, fecha_fin);

CREATE INDEX IF NOT EXISTS idx_employee_absences_empleado_dates
  ON employee_absences(empleado_id, fecha_inicio, fecha_fin);

ALTER TABLE company_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_absences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_holidays_select_admin" ON company_holidays;
CREATE POLICY "company_holidays_select_admin"
  ON company_holidays
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = company_holidays.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company_holidays_insert_admin" ON company_holidays;
CREATE POLICY "company_holidays_insert_admin"
  ON company_holidays
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = company_holidays.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "company_holidays_delete_admin" ON company_holidays;
CREATE POLICY "company_holidays_delete_admin"
  ON company_holidays
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = company_holidays.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "employee_absences_select_admin" ON employee_absences;
CREATE POLICY "employee_absences_select_admin"
  ON employee_absences
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = employee_absences.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "employee_absences_insert_admin" ON employee_absences;
CREATE POLICY "employee_absences_insert_admin"
  ON employee_absences
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = employee_absences.empresa_id
        AND employees.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "employee_absences_update_admin" ON employee_absences;
CREATE POLICY "employee_absences_update_admin"
  ON employee_absences
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = employee_absences.empresa_id
        AND employees.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
        AND employees.empresa_id = employee_absences.empresa_id
        AND employees.role = 'admin'
    )
  );
