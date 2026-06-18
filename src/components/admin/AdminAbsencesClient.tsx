"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Employee {
  id: string;
  nombre: string;
  email: string;
}

interface Holiday {
  id: string;
  fecha: string;
  nombre: string;
  tipo: string;
}

interface Absence {
  id: string;
  empleado_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo: string;
  motivo: string;
  employees?: {
    nombre: string;
    email: string;
  } | null;
}

interface AdminAbsencesClientProps {
  employees: Employee[];
  holidays: Holiday[];
  absences: Absence[];
}

const absenceTypes = [
  { value: "permiso", label: "Permiso" },
  { value: "licencia", label: "Licencia" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "dia_administrativo", label: "Día administrativo" },
  { value: "otro", label: "Otro" },
];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AdminAbsencesClient({
  employees,
  holidays,
  absences,
}: AdminAbsencesClientProps) {
  const router = useRouter();
  const [holidayForm, setHolidayForm] = useState({
    fecha: "",
    nombre: "",
    tipo: "feriado",
  });
  const [absenceForm, setAbsenceForm] = useState({
    empleado_id: employees[0]?.id ?? "",
    fecha_inicio: "",
    fecha_fin: "",
    tipo: "permiso",
    motivo: "",
  });
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const submitHoliday = async () => {
    setError("");
    setMessage("");
    setLoading("holiday");
    try {
      const res = await fetch("/api/holidays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(holidayForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar el feriado");

      setHolidayForm({ fecha: "", nombre: "", tipo: "feriado" });
      setMessage("Feriado guardado correctamente");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  };

  const submitAbsence = async () => {
    setError("");
    setMessage("");
    setLoading("absence");
    try {
      const res = await fetch("/api/absences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(absenceForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo guardar la ausencia");

      setAbsenceForm({
        empleado_id: employees[0]?.id ?? "",
        fecha_inicio: "",
        fecha_fin: "",
        tipo: "permiso",
        motivo: "",
      });
      setMessage("Ausencia guardada correctamente");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  };

  const deleteItem = async (kind: "holidays" | "absences", id: string) => {
    setError("");
    setMessage("");
    setLoading(id);
    try {
      const res = await fetch(`/api/${kind}/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo eliminar");
      setMessage(kind === "holidays" ? "Feriado eliminado" : "Ausencia eliminada");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Ausencias y feriados</h1>
        <p className="text-gray-500 mt-1">
          Justifica días no trabajados para que no aparezcan como horas adeudadas.
        </p>
      </div>

      {message && (
        <div className="mb-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-200/70">
          <h2 className="border-b border-gray-100 pb-3 text-base font-semibold text-gray-900">
            Agregar feriado o cierre
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="date"
                value={holidayForm.fecha}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, fecha: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={holidayForm.tipo}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, tipo: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              >
                <option value="feriado">Feriado</option>
                <option value="cierre_empresa">Cierre empresa</option>
                <option value="otro">Otro</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Nombre</label>
              <input
                value={holidayForm.nombre}
                onChange={(e) => setHolidayForm((prev) => ({ ...prev, nombre: e.target.value }))}
                placeholder="Ej: Fiestas Patrias"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submitHoliday} loading={loading === "holiday"}>
              Guardar feriado
            </Button>
          </div>
        </section>

        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-md shadow-gray-200/70">
          <h2 className="border-b border-gray-100 pb-3 text-base font-semibold text-gray-900">
            Justificar ausencia
          </h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Trabajador</label>
              <select
                value={absenceForm.empleado_id}
                onChange={(e) => setAbsenceForm((prev) => ({ ...prev, empleado_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              >
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Desde</label>
              <input
                type="date"
                value={absenceForm.fecha_inicio}
                onChange={(e) => setAbsenceForm((prev) => ({ ...prev, fecha_inicio: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Hasta</label>
              <input
                type="date"
                value={absenceForm.fecha_fin}
                onChange={(e) => setAbsenceForm((prev) => ({ ...prev, fecha_fin: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Tipo</label>
              <select
                value={absenceForm.tipo}
                onChange={(e) => setAbsenceForm((prev) => ({ ...prev, tipo: e.target.value }))}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              >
                {absenceTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">Motivo</label>
              <textarea
                rows={3}
                value={absenceForm.motivo}
                onChange={(e) => setAbsenceForm((prev) => ({ ...prev, motivo: e.target.value }))}
                placeholder="Ej: Licencia médica presentada por el trabajador"
                className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
              />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={submitAbsence} loading={loading === "absence"}>
              Guardar ausencia
            </Button>
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-200/70 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Feriados y cierres</h2>
          </div>
          {holidays.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No hay feriados cargados.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {holidays.map((holiday) => (
                <div key={holiday.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <p className="font-medium text-gray-900">{holiday.nombre}</p>
                    <p className="text-sm text-gray-500">{formatDate(holiday.fecha)} · {holiday.tipo}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loading === holiday.id}
                    onClick={() => deleteItem("holidays", holiday.id)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200 bg-white shadow-md shadow-gray-200/70 overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Ausencias justificadas</h2>
          </div>
          {absences.length === 0 ? (
            <div className="px-6 py-10 text-center text-sm text-gray-400">No hay ausencias cargadas.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {absences.map((absence) => (
                <div key={absence.id} className="flex items-center justify-between gap-4 px-6 py-4">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{absence.employees?.nombre ?? "Trabajador"}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(absence.fecha_inicio)} al {formatDate(absence.fecha_fin)} · {absence.tipo}
                    </p>
                    <p className="truncate text-sm text-gray-400">{absence.motivo}</p>
                  </div>
                  <button
                    type="button"
                    disabled={loading === absence.id}
                    onClick={() => deleteItem("absences", absence.id)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    Eliminar
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
