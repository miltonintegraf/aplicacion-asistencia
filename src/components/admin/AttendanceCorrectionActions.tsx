"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

interface AttendanceCorrectionActionsProps {
  record: {
    id: string;
    tipo_registro: string;
    fecha_hora: string;
    estado_registro?: string | null;
    duracion_colacion_minutos?: number | null;
  };
}

const typeOptions = [
  { value: "entrada_laboral", label: "Entrada Laboral" },
  { value: "salida_almuerzo", label: "Salida Almuerzo" },
  { value: "entrada_almuerzo", label: "Regreso Almuerzo" },
  { value: "salida_laboral", label: "Salida Laboral" },
];

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function AttendanceCorrectionActions({ record }: AttendanceCorrectionActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"correct" | "void">("correct");
  const [tipoRegistro, setTipoRegistro] = useState(record.tipo_registro);
  const [fechaHora, setFechaHora] = useState(toDatetimeLocal(record.fecha_hora));
  const [duracionColacion, setDuracionColacion] = useState(String(record.duracion_colacion_minutos ?? 60));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isVoided = record.estado_registro === "anulado";

  const submit = async () => {
    setError("");

    if (reason.trim().length < 10) {
      setError("Escribe un motivo de al menos 10 caracteres.");
      return;
    }

    setLoading(true);
    try {
      const payload =
        mode === "void"
          ? { action: "void", reason }
          : {
              action: "correct",
              tipo_registro: tipoRegistro,
              fecha_hora: fechaHora,
              duracion_colacion_minutos:
                tipoRegistro === "salida_almuerzo" ? Number(duracionColacion) : null,
              reason,
            };

      const res = await fetch(`/api/attendance/${record.id}/correct`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "No se pudo guardar la corrección.");
        return;
      }

      setOpen(false);
      setReason("");
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        disabled={isVoided}
        onClick={() => setOpen(true)}
        className="text-blue-600 hover:text-blue-800 disabled:text-gray-300 disabled:cursor-not-allowed font-medium"
      >
        Corregir
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white shadow-xl border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Corregir marcación</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <span className="sr-only">Cerrar</span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("correct")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "correct"
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Corregir datos
                </button>
                <button
                  type="button"
                  onClick={() => setMode("void")}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
                    mode === "void"
                      ? "border-red-600 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  Anular marca
                </button>
              </div>

              {mode === "correct" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                    <select
                      value={tipoRegistro}
                      onChange={(e) => setTipoRegistro(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    >
                      {typeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Fecha y hora</label>
                    <input
                      type="datetime-local"
                      value={fechaHora}
                      onChange={(e) => setFechaHora(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                    />
                  </div>

                  {tipoRegistro === "salida_almuerzo" && (
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Colación</label>
                      <select
                        value={duracionColacion}
                        onChange={(e) => setDuracionColacion(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                      >
                        <option value="30">30 minutos</option>
                        <option value="45">45 minutos</option>
                        <option value="60">60 minutos</option>
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Motivo obligatorio
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 resize-none"
                  placeholder="Ejemplo: trabajador olvidó marcar salida y se corrige según respaldo informado por jefatura."
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                variant={mode === "void" ? "danger" : "primary"}
                loading={loading}
                onClick={submit}
              >
                {mode === "void" ? "Anular" : "Guardar corrección"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
