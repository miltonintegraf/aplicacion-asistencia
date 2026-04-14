"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Company } from "@/lib/types";

interface AdminSettingsClientProps {
  initialCompany: Company | null;
}

export default function AdminSettingsClient({ initialCompany }: AdminSettingsClientProps) {
  const [company, setCompany] = useState<Company | null>(initialCompany);
  const [form, setForm] = useState({
    nombre_empresa: "",
    direccion: "",
    latitud: "",
    longitud: "",
    radio_permitido_metros: "",
    foto_requerida: false,
    firma_requerida: false,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);

  useEffect(() => {
    if (initialCompany) {
      setForm({
        nombre_empresa: initialCompany.nombre_empresa || "",
        direccion: initialCompany.direccion || "",
        latitud: String(initialCompany.latitud || ""),
        longitud: String(initialCompany.longitud || ""),
        radio_permitido_metros: String(initialCompany.radio_permitido_metros || ""),
        foto_requerida: initialCompany.foto_requerida || false,
        firma_requerida: initialCompany.firma_requerida || false,
      });
      setLoading(false);
    }
  }, [initialCompany]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_empresa: form.nombre_empresa,
          direccion: form.direccion,
          latitud: parseFloat(form.latitud),
          longitud: parseFloat(form.longitud),
          radio_permitido_metros: parseInt(form.radio_permitido_metros),
          foto_requerida: form.foto_requerida,
          firma_requerida: form.firma_requerida,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al guardar cambios");
      }

      setSuccess("Configuración guardada correctamente");
      setCompany(json.data);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar cambios");
    } finally {
      setSaving(false);
    }
  };

  const obtenerUbicacion = () => {
    if (!navigator.geolocation) {
      setError("Tu navegador no soporta geolocalización.");
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((prev) => ({
          ...prev,
          latitud: pos.coords.latitude.toString(),
          longitud: pos.coords.longitude.toString(),
        }));
        setGpsLoading(false);
      },
      () => {
        setError("No se pudo obtener la ubicación GPS.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-96">
        <svg
          className="animate-spin w-8 h-8 text-blue-600"
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
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">
          Datos de tu empresa y parámetros del sistema
        </p>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company data */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Datos de la empresa
          </h2>

          <Input
            label="Nombre de la empresa *"
            required
            value={form.nombre_empresa}
            onChange={(e) =>
              setForm((p) => ({ ...p, nombre_empresa: e.target.value }))
            }
            placeholder="Empresa S.A."
          />

          <Input
            label="Dirección"
            value={form.direccion}
            onChange={(e) =>
              setForm((p) => ({ ...p, direccion: e.target.value }))
            }
            placeholder="Av. Principal 123, Ciudad"
          />
        </div>

        {/* GPS settings */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Configuración GPS
          </h2>

          <p className="text-sm text-gray-500">
            Define la ubicación de tu empresa y el radio permitido para que los
            empleados puedan marcar asistencia.
          </p>

          <button
            type="button"
            onClick={obtenerUbicacion}
            disabled={gpsLoading}
            className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm font-medium"
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
                Actualizar a mi ubicación actual
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Latitud"
              type="number"
              step="any"
              value={form.latitud}
              onChange={(e) =>
                setForm((p) => ({ ...p, latitud: e.target.value }))
              }
              placeholder="-34.6037"
            />
            <Input
              label="Longitud"
              type="number"
              step="any"
              value={form.longitud}
              onChange={(e) =>
                setForm((p) => ({ ...p, longitud: e.target.value }))
              }
              placeholder="-58.3816"
            />
          </div>

          <Input
            label="Radio permitido (metros)"
            type="number"
            min="10"
            max="5000"
            required
            value={form.radio_permitido_metros}
            onChange={(e) =>
              setForm((p) => ({ ...p, radio_permitido_metros: e.target.value }))
            }
            helperText="Los empleados deben estar dentro de este radio para marcar asistencia"
          />

          {company?.latitud && company?.longitud && (
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
              <strong>Coordenadas actuales:</strong> {company.latitud},{" "}
              {company.longitud} — Radio: {company.radio_permitido_metros}m
            </div>
          )}
        </div>

        {/* Foto y firma requerida */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">
            Registro de asistencia
          </h2>
          <div className="flex items-start justify-between gap-4">
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
                setForm((p) => ({ ...p, foto_requerida: !p.foto_requerida }))
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
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  Requerir firma al marcar asistencia
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Los empleados deberán firmar con el dedo en cada registro
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((p) => ({ ...p, firma_requerida: !p.firma_requerida }))
                }
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  form.firma_requerida ? "bg-blue-600" : "bg-gray-200"
                }`}
                role="switch"
                aria-checked={form.firma_requerida}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    form.firma_requerida ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={saving} size="lg">
            Guardar cambios
          </Button>
        </div>
      </form>
    </div>
  );
}
