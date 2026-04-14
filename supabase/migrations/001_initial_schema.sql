-- Habilitar extensión uuid
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- TABLA: companies
-- =============================================
CREATE TABLE IF NOT EXISTS companies (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_empresa          TEXT NOT NULL,
  direccion               TEXT,
  latitud                 NUMERIC(10, 7),
  longitud                NUMERIC(10, 7),
  radio_permitido_metros  INTEGER NOT NULL DEFAULT 100,
  fecha_creacion          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TABLA: employees
-- =============================================
CREATE TABLE IF NOT EXISTS employees (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  nombre         TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT,
  activo         BOOLEAN NOT NULL DEFAULT TRUE,
  role           TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  fecha_creacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- TABLA: attendance
-- =============================================
CREATE TABLE IF NOT EXISTS attendance (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  empresa_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  empleado_id               UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  tipo_registro             TEXT NOT NULL CHECK (tipo_registro IN ('entrada', 'salida')),
  fecha_hora                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  latitud                   NUMERIC(10, 7),
  longitud                  NUMERIC(10, 7),
  distancia_empresa_metros  NUMERIC(10, 2),
  valido                    BOOLEAN NOT NULL DEFAULT TRUE
);

-- =============================================
-- ÍNDICES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_employees_empresa_id ON employees(empresa_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON employees(email);
CREATE INDEX IF NOT EXISTS idx_attendance_empresa_id ON attendance(empresa_id);
CREATE INDEX IF NOT EXISTS idx_attendance_empleado_id ON attendance(empleado_id);
CREATE INDEX IF NOT EXISTS idx_attendance_fecha_hora ON attendance(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_attendance_empresa_fecha ON attendance(empresa_id, fecha_hora);

-- =============================================
-- HABILITAR ROW LEVEL SECURITY
-- =============================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- =============================================
-- FUNCIÓN AUXILIAR: obtener empresa_id del usuario actual
-- =============================================
CREATE OR REPLACE FUNCTION get_my_empresa_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT empresa_id
  FROM employees
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- =============================================
-- POLÍTICAS RLS: companies
-- =============================================
-- Solo el admin de la empresa puede ver su propia empresa
CREATE POLICY "companies_select_own" ON companies
  FOR SELECT
  USING (id = get_my_empresa_id());

-- Solo el admin puede actualizar su empresa
CREATE POLICY "companies_update_own" ON companies
  FOR UPDATE
  USING (id = get_my_empresa_id());

-- Permitir inserción (para registro de nuevas empresas)
CREATE POLICY "companies_insert_anon" ON companies
  FOR INSERT
  WITH CHECK (true);

-- =============================================
-- POLÍTICAS RLS: employees
-- =============================================
-- Empleados pueden ver a sus compañeros de la misma empresa
CREATE POLICY "employees_select_same_company" ON employees
  FOR SELECT
  USING (empresa_id = get_my_empresa_id());

-- Admins pueden insertar empleados en su empresa
CREATE POLICY "employees_insert_own_company" ON employees
  FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() OR get_my_empresa_id() IS NULL);

-- Admins pueden actualizar empleados de su empresa
CREATE POLICY "employees_update_own_company" ON employees
  FOR UPDATE
  USING (empresa_id = get_my_empresa_id());

-- Admins pueden eliminar empleados de su empresa
CREATE POLICY "employees_delete_own_company" ON employees
  FOR DELETE
  USING (empresa_id = get_my_empresa_id());

-- =============================================
-- POLÍTICAS RLS: attendance
-- =============================================
-- Empleados ven registros de su empresa
CREATE POLICY "attendance_select_own_company" ON attendance
  FOR SELECT
  USING (empresa_id = get_my_empresa_id());

-- Empleados pueden insertar sus propios registros
CREATE POLICY "attendance_insert_own" ON attendance
  FOR INSERT
  WITH CHECK (empresa_id = get_my_empresa_id() AND empleado_id = auth.uid());

-- Admins pueden insertar registros para cualquier empleado de su empresa
CREATE POLICY "attendance_insert_admin" ON attendance
  FOR INSERT
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid()
        AND role = 'admin'
        AND empresa_id = attendance.empresa_id
    )
  );

-- Admins pueden actualizar registros de su empresa
CREATE POLICY "attendance_update_admin" ON attendance
  FOR UPDATE
  USING (
    empresa_id = get_my_empresa_id()
    AND EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
