"use client";

interface AlertaTardanza {
  id: string;
  nombre: string;
  minutosLate: number;
  horaEntrada: string;
}

interface AlertaAusente {
  id: string;
  nombre: string;
}

interface AlertaSinSalida {
  id: string;
  nombre: string;
  horaEntrada: string;
}

interface AdminDashboardClientProps {
  tardanzas: AlertaTardanza[];
  ausentes: AlertaAusente[];
  sinSalida: AlertaSinSalida[];
}

export function AdminDashboardAlerts({
  tardanzas,
  ausentes,
  sinSalida,
}: AdminDashboardClientProps) {
  const tieneAlertas = tardanzas.length > 0 || ausentes.length > 0 || sinSalida.length > 0;

  if (!tieneAlertas) {
    return (
      <div className="mb-8 bg-green-50 border border-green-200 rounded-xl p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-green-900 font-semibold">Todo en orden</p>
          <p className="text-green-700 text-sm">Todos los empleados han registrado correctamente su asistencia</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs font-bold">!</span>
        Alertas del día
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Ausentes */}
        {ausentes.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Ausentes</p>
                <p className="text-lg font-bold text-red-600">{ausentes.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              {ausentes.map((emp) => (
                <p key={emp.id} className="text-sm text-gray-600 truncate">
                  • {emp.nombre}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tardanzas */}
        {tardanzas.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Tardanzas</p>
                <p className="text-lg font-bold text-amber-600">{tardanzas.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              {tardanzas.map((emp) => (
                <div key={emp.id} className="text-sm">
                  <p className="text-gray-600 truncate font-medium">{emp.nombre}</p>
                  <p className="text-amber-600 text-xs">{emp.minutosLate} min • {emp.horaEntrada}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sin salida */}
        {sinSalida.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Sin salida</p>
                <p className="text-lg font-bold text-red-600">{sinSalida.length}</p>
              </div>
            </div>
            <div className="space-y-2">
              {sinSalida.map((emp) => (
                <div key={emp.id} className="text-sm">
                  <p className="text-gray-600 truncate font-medium">{emp.nombre}</p>
                  <p className="text-red-600 text-xs">Entró: {emp.horaEntrada}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
