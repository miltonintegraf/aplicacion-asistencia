"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    nombre_empresa: "",
    direccion: "",
    email: "",
    password: "",
    confirm_password: "",
    latitud: "",
    longitud: "",
    radio_permitido_metros: "100",
    nombre_admin: "",
    foto_requerida: false,
  });

  const updateForm = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        updateForm("latitud", pos.coords.latitude.toString());
        updateForm("longitud", pos.coords.longitude.toString());
        setGpsLoading(false);
      },
      () => {
        setError(
          "No se pudo obtener la ubicación. Permite el acceso al GPS o ingresa las coordenadas manualmente."
        );
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.password !== form.confirm_password) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (form.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    // 1. Crear empresa + usuario via API (usa service role, omite RLS)
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nombre_empresa: form.nombre_empresa,
        direccion: form.direccion,
        latitud: form.latitud,
        longitud: form.longitud,
        radio_permitido_metros: form.radio_permitido_metros,
        nombre_admin: form.nombre_admin,
        email: form.email,
        password: form.password,
        foto_requerida: form.foto_requerida,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setLoading(false);
      setError(data.error ?? "Error al registrar. Intenta de nuevo.");
      return;
    }

    // 2. Iniciar sesión automáticamente
    const supabase = createClient();
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    });

    setLoading(false);

    if (loginError) {
      setError("Empresa creada. Ahora inicia sesión manualmente.");
      router.push("/login");
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push("/admin/dashboard");
    }, 2000);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Empresa registrada!
          </h2>
          <p className="text-gray-500">Redirigiendo al panel de administración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="w-full max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
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
            <span className="text-2xl font-bold text-gray-900">
              Marca en 1 minuto
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-gray-900">
            Registrar empresa
          </h1>
          <p className="mt-2 text-gray-500">
            Crea tu cuenta y empieza a controlar la asistencia de tu equipo
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Datos de la empresa */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Datos de la empresa
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nombre de la empresa *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre_empresa}
                    onChange={(e) =>
                      updateForm("nombre_empresa", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Empresa S.A."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Dirección
                  </label>
                  <input
                    type="text"
                    value={form.direccion}
                    onChange={(e) => updateForm("direccion", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Av. Principal 123, Ciudad"
                  />
                </div>

                {/* GPS */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Ubicación GPS de la empresa
                  </label>
                  <button
                    type="button"
                    onClick={obtenerUbicacion}
                    disabled={gpsLoading}
                    className="w-full mb-3 flex items-center justify-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {gpsLoading ? (
                      <>
                        <svg
                          className="animate-spin w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                          />
                        </svg>
                        Obteniendo ubicación...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        Usar mi ubicación actual
                      </>
                    )}
                  </button>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Latitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.latitud}
                        onChange={(e) => updateForm("latitud", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="-34.6037"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">
                        Longitud
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={form.longitud}
                        onChange={(e) => updateForm("longitud", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        placeholder="-58.3816"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Radio permitido (metros)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="5000"
                    value={form.radio_permitido_metros}
                    onChange={(e) =>
                      updateForm("radio_permitido_metros", e.target.value)
                    }
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Los empleados deben estar dentro de este radio para marcar
                    asistencia
                  </p>
                </div>

                {/* Toggle foto requerida */}
                <div className="flex items-start justify-between gap-4 pt-2">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Requerir foto al marcar asistencia
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Los empleados deberán tomarse una selfie al registrar entrada o salida
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        foto_requerida: !prev.foto_requerida,
                      }))
                    }
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                      form.foto_requerida ? "bg-blue-600" : "bg-gray-200"
                    }`}
                    role="switch"
                    aria-checked={form.foto_requerida}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                        form.foto_requerida ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Datos del admin */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Cuenta de administrador
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tu nombre completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre_admin}
                    onChange={(e) => updateForm("nombre_admin", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan García"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Correo electrónico *
                  </label>
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => updateForm("email", e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@empresa.com"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      value={form.password}
                      onChange={(e) => updateForm("password", e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Mín. 6 caracteres"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Confirmar contraseña *
                    </label>
                    <input
                      type="password"
                      required
                      value={form.confirm_password}
                      onChange={(e) =>
                        updateForm("confirm_password", e.target.value)
                      }
                      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Creando empresa...
                </>
              ) : (
                "Crear empresa y cuenta"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          ¿Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="text-blue-600 font-medium hover:underline"
          >
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
