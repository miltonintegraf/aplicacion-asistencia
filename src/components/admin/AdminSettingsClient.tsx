"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import type { Company, HorariosLaborales } from "@/lib/types";

interface AdminSettingsClientProps {
  initialCompany: Company | null;
}

const diasSemana = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miercoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sabado" },
  { key: "domingo", label: "Domingo" },
] as const;

function buildDefaultSchedule(entrada = "09:00", salida = "18:00"): HorariosLaborales {
  return diasSemana.reduce((acc, dia, index) => {
    acc[dia.key] = { activo: index < 5, entrada, salida };
    return acc;
  }, {} as HorariosLaborales);
}

function normalizeSchedule(company: Company | null): HorariosLaborales {
  const fallbackEntrada = company?.hora_entrada || "09:00";
  const fallbackSalida = company?.hora_salida || "18:00";
  return {
    ...buildDefaultSchedule(fallbackEntrada, fallbackSalida),
    ...(company?.horarios_laborales || {}),
  };
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
    tolerancia_minutos: "15",
    horarios_laborales: buildDefaultSchedule(),
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
        tolerancia_minutos: String(initialCompany.tolerancia_minutos || "15"),
        horarios_laborales: normalizeSchedule(initialCompany),
      });
    }
    setLoading(false);
  }, [initialCompany]);

  const updateHorario = (dia: string, changes: Partial<HorariosLaborales[string]>) => {
    setForm((prev) => ({
      ...prev,
      horarios_laborales: {
        ...prev.horarios_laborales,
        [dia]: { ...prev.horarios_laborales[dia], ...changes },
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const primerDiaActivo = Object.values(form.horarios_laborales).find((dia) => dia.activo);

    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre_empresa: form.nombre_empresa,
          direccion: form.direccion,
          latitud: form.latitud ? parseFloat(form.latitud) : null,
          longitud: form.longitud ? parseFloat(form.longitud) : null,
          radio_permitido_metros: parseInt(form.radio_permitido_metros),
          foto_requerida: form.foto_requerida,
          firma_requerida: form.firma_requerida,
          hora_entrada: primerDiaActivo?.entrada || "09:00",
          hora_salida: primerDiaActivo?.salida || "18:00",
          horarios_laborales: form.horarios_laborales,
          tolerancia_minutos: parseInt(form.tolerancia_minutos),
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Error al guardar cambios");
      }

      setSuccess("Configuracion guardada correctamente");
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
      setError("Tu navegador no soporta geolocalizacion.");
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
        setError("No se pudo obtener la ubicacion GPS.");
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-96">
        <svg className="animate-spin w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Configuracion</h1>
        <p className="text-gray-500 mt-1">Datos de tu empresa y parametros del sistema</p>
      </div>

      {error && <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">Datos de la empresa</h2>
          <Input label="Nombre de la empresa *" required value={form.nombre_empresa} onChange={(e) => setForm((p) => ({ ...p, nombre_empresa: e.target.value }))} placeholder="Empresa S.A." />
          <Input label="Direccion" value={form.direccion} onChange={(e) => setForm((p) => ({ ...p, direccion: e.target.value }))} placeholder="Av. Principal 123, Ciudad" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">Configuracion GPS</h2>
          <p className="text-sm text-gray-500">Define la ubicacion de tu empresa y el radio permitido para marcar asistencia.</p>
          <button type="button" onClick={obtenerUbicacion} disabled={gpsLoading} className="flex items-center gap-2 px-4 py-2.5 border border-blue-300 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 text-sm font-medium">
            {gpsLoading ? "Obteniendo ubicacion..." : "Actualizar a mi ubicacion actual"}
          </button>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Latitud" type="number" step="any" value={form.latitud} onChange={(e) => setForm((p) => ({ ...p, latitud: e.target.value }))} placeholder="-34.6037" />
            <Input label="Longitud" type="number" step="any" value={form.longitud} onChange={(e) => setForm((p) => ({ ...p, longitud: e.target.value }))} placeholder="-58.3816" />
          </div>
          <Input label="Radio permitido (metros)" type="number" min="10" max="5000" required value={form.radio_permitido_metros} onChange={(e) => setForm((p) => ({ ...p, radio_permitido_metros: e.target.value }))} helperText="Los empleados deben estar dentro de este radio para marcar asistencia" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">Registro de asistencia</h2>
          <div className="flex items-start justify-between gap-4">
            <div><p className="text-sm font-medium text-gray-700">Requerir foto al marcar asistencia</p><p className="text-xs text-gray-400 mt-0.5">Los empleados deberan tomarse una selfie al registrar entrada o salida</p></div>
            <button type="button" onClick={() => setForm((p) => ({ ...p, foto_requerida: !p.foto_requerida }))} className={("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ") + (form.foto_requerida ? "bg-blue-600" : "bg-gray-200")} role="switch" aria-checked={form.foto_requerida}><span className={("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ") + (form.foto_requerida ? "translate-x-5" : "translate-x-0")} /></button>
          </div>
          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-sm font-medium text-gray-700">Requerir firma al marcar asistencia</p><p className="text-xs text-gray-400 mt-0.5">Los empleados deberan firmar con el dedo en cada registro</p></div>
              <button type="button" onClick={() => setForm((p) => ({ ...p, firma_requerida: !p.firma_requerida }))} className={("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ") + (form.firma_requerida ? "bg-blue-600" : "bg-gray-200")} role="switch" aria-checked={form.firma_requerida}><span className={("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ") + (form.firma_requerida ? "translate-x-5" : "translate-x-0")} /></button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3"><h2 className="text-base font-semibold text-gray-900">Horario laboral por dia</h2><p className="text-sm text-gray-500 mt-1">Define entrada y salida para cada dia. Los dias desactivados no cuentan como jornada laboral.</p></div>
          <div className="space-y-3">
            {diasSemana.map((dia) => {
              const horario = form.horarios_laborales[dia.key];
              return (
                <div key={dia.key} className={("grid grid-cols-1 md:grid-cols-[160px_1fr] gap-3 rounded-lg border p-4 ") + (horario.activo ? "border-blue-100 bg-blue-50/40" : "border-gray-100 bg-gray-50")}>
                  <div className="flex items-center justify-between md:justify-start md:gap-3">
                    <button type="button" onClick={() => updateHorario(dia.key, { activo: !horario.activo })} className={("relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ") + (horario.activo ? "bg-blue-600" : "bg-gray-300")} role="switch" aria-checked={horario.activo}><span className={("pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ") + (horario.activo ? "translate-x-5" : "translate-x-0")} /></button>
                    <div><p className="text-sm font-semibold text-gray-900">{dia.label}</p><p className="text-xs text-gray-500">{horario.activo ? "Trabaja" : "No trabaja"}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Entrada" type="time" value={horario.entrada} disabled={!horario.activo} onChange={(e) => updateHorario(dia.key, { entrada: e.target.value })} />
                    <Input label="Salida" type="time" value={horario.salida} disabled={!horario.activo} onChange={(e) => updateHorario(dia.key, { salida: e.target.value })} />
                  </div>
                </div>
              );
            })}
          </div>
          <Input label="Minutos de tolerancia" type="number" min="0" max="60" value={form.tolerancia_minutos} onChange={(e) => setForm((p) => ({ ...p, tolerancia_minutos: e.target.value }))} helperText="Ej: 15 min = quien entra hasta 15 minutos despues no se considera tarde" />
        </div>

        <div className="flex justify-end"><Button type="submit" loading={saving} size="lg">Guardar cambios</Button></div>
      </form>
    </div>
  );
}
