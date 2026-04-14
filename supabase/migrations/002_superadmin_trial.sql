-- =============================================
-- MIGRACIÓN 002: SuperAdmin + Sistema Trial
-- =============================================

-- 1. Actualizar CHECK constraint en employees para aceptar super_admin
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check
  CHECK (role IN ('admin', 'employee', 'super_admin'));

-- 2. Agregar campos de trial a companies
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS estado_suscripcion TEXT NOT NULL DEFAULT 'trial'
    CHECK (estado_suscripcion IN ('trial', 'active', 'expired', 'cancelled')),
  ADD COLUMN IF NOT EXISTS fecha_inicio_trial TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS dias_trial INTEGER NOT NULL DEFAULT 14,
  ADD COLUMN IF NOT EXISTS foto_requerida BOOLEAN NOT NULL DEFAULT FALSE;

-- 3. Política RLS: super_admin puede ver TODAS las empresas
CREATE POLICY "companies_select_superadmin" ON companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 4. Política RLS: super_admin puede actualizar CUALQUIER empresa
CREATE POLICY "companies_update_superadmin" ON companies
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- 5. Política RLS: super_admin puede ver TODOS los empleados
CREATE POLICY "employees_select_superadmin" ON employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees e2
      WHERE e2.id = auth.uid() AND e2.role = 'super_admin'
    )
  );

-- 6. Política RLS: super_admin puede ver TODOS los registros de asistencia
CREATE POLICY "attendance_select_superadmin" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
