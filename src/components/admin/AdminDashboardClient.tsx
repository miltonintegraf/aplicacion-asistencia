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
    <div className="mb-8 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
        <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
          <span className="w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 text-xs font-bold">!</span>
          Alertas del día
        </h2>
      </div>

      <div className="divide-y divide-gray-100">
        {/* Ausentes */}
        {ausentes.length > 0 && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-red-100 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                Ausentes ({ausentes.length})
              </p>
            </div>
            <div className="ml-7 space-y-1">
              {ausentes.map((emp) => (
                <p key={emp.id} className="text-sm text-gray-600">
                  • {emp.nombre}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Tardanzas */}
        {tardanzas.length > 0 && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                Tardanzas ({tardanzas.length})
              </p>
            </div>
            <div className="ml-7 space-y-2">
              {tardanzas.map((emp) => (
                <div key={emp.id} className="text-sm text-gray-600">
                  <p>
                    • <span className="font-medium text-gray-900">{emp.nombre}</span>{" "}
                    <span className="text-amber-600 font-semibold">{emp.minutosLate} min tarde</span>
                  </p>
                  <p className="text-xs text-gray-400 ml-5">Entrada: {emp.horaEntrada}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sin salida */}
        {sinSalida.length > 0 && (
          <div className="px-6 py-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-5 h-5 bg-red-100 rounded flex items-center justify-center">
                <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                Sin salida marcada ({sinSalida.length})
              </p>
            </div>
            <div className="ml-7 space-y-2">
              {sinSalida.map((emp) => (
                <div key={emp.id} className="text-sm text-gray-600">
                  <p>
                    • <span className="font-medium text-gray-900">{emp.nombre}</span>
                  </p>
                  <p className="text-xs text-gray-400 ml-5">Entró: {emp.horaEntrada}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
