import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function TrialExpiradoPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg
            className="w-10 h-10 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4v2m0 5v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Content */}
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Período de prueba expirado
        </h1>
        <p className="text-gray-600 mb-8">
          Tu período de prueba ha terminado. Para continuar usando el sistema, debes activar una suscripción.
        </p>

        {/* Details */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8 text-left">
          <h2 className="font-semibold text-gray-900 mb-4">¿Qué hacer ahora?</h2>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">1.</span>
              <span>Contacta a nuestro equipo de ventas</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">2.</span>
              <span>Elige el plan que mejor se ajuste a tu empresa</span>
            </li>
            <li className="flex gap-3">
              <span className="text-blue-600 font-bold">3.</span>
              <span>Completa el pago y acceso inmediato</span>
            </li>
          </ul>
        </div>

        {/* Contact info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8">
          <p className="text-sm text-blue-900">
            <span className="font-semibold">Email de contacto:</span>{" "}
            <a href="mailto:ventas@marcaen1minuto.com" className="text-blue-600 hover:underline">
              ventas@marcaen1minuto.com
            </a>
          </p>
        </div>

        {/* Logout button */}
        <Link
          href="/login"
          className="inline-block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          Volver al Login
        </Link>
      </div>
    </div>
  );
}
