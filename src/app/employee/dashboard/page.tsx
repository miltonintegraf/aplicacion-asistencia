import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AttendanceButtons } from "@/components/employee/AttendanceButtons";
import { LogoutButton } from "@/components/employee/LogoutButton";

export default async function EmployeeDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: employee } = await supabase
    .from("employees")
    .select("nombre, email, activo, role, empresa_id, modalidad, dias_presenciales")
    .eq("id", user.id)
    .single();

  if (!employee) {
    redirect("/login");
  }

  if (employee.role === "admin") {
    redirect("/admin/dashboard");
  }

  if (!employee.activo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
              />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Cuenta desactivada
          </h2>
          <p className="text-gray-500">
            Tu cuenta ha sido desactivada. Contacta al administrador de tu
            empresa.
          </p>
        </div>
      </div>
    );
  }

  const { data: company } = await supabase
    .from("companies")
    .select("nombre_empresa, foto_requerida")
    .eq("id", employee.empresa_id)
    .single();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Marca en 1 minuto</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">
                {employee.nombre}
              </p>
              {company && (
                <p className="text-xs text-gray-400">{company.nombre_empresa}</p>
              )}
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-lg mx-auto px-4 py-8">
        {/* Welcome */}
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900">
            Hola, {employee.nombre.split(" ")[0]}
          </h1>
          <p className="text-gray-500 mt-1">Registra tu asistencia</p>
        </div>

        {/* Attendance card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <AttendanceButtons
            empleadoId={user.id}
            fotoRequerida={company?.foto_requerida ?? false}
            modalidad={employee?.modalidad ?? "presencial"}
            diasPresenciales={employee?.dias_presenciales ?? []}
          />
        </div>

        {/* Info footer */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Se requiere permiso de GPS para registrar asistencia.
          <br />
          Asegúrate de estar en la ubicación de tu empresa.
        </p>
      </main>
    </div>
  );
}
