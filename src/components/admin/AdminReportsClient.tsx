"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface EmployeeSummary {
  id: string;
  nombre: string;
  email: string;
  dias_programados: number;
  dias_trabajados: number;
  total_entradas: number;
  total_salidas: number;
  horas_trabajadas: number;
  horas_estimadas: number;
  horas_extra: number;
  horas_debe: number;
  diferencia_horas: number;
  estado: "extra" | "debe" | "completo";
}

interface Employee {
  id: string;
  nombre: string;
  email: string;
}

interface AdminReportsClientProps {
  initialEmpleados: Employee[];
}

export default function AdminReportsClient({ initialEmpleados }: AdminReportsClientProps) {
  const now = new Date();
  const getMonday = (date: Date) => {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return copy;
  };
  const formatDate = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  const [periodMode, setPeriodMode] = useState<"monthly" | "weekly">("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [weekStart, setWeekStart] = useState(formatDate(getMonday(now)));
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [exportingLegal, setExportingLegal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const weekStartDate = new Date(`${weekStart}T00:00:00`);
  const weekEndDate = new Date(weekStartDate);
  weekEndDate.setDate(weekStartDate.getDate() + 6);

  const monthlyStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const monthlyEnd = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const fechaInicio = periodMode === "monthly" ? monthlyStart : weekStart;
  const fechaFin = periodMode === "monthly" ? monthlyEnd : formatDate(weekEndDate);

  const fetchSummary = async () => {
    setLoadingData(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      const res = await fetch(`/api/attendance/summary?${params}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Error al obtener datos");

      setSummary(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [fechaInicio, fechaFin]);

  const handleExportSummary = async () => {
    setExportingSummary(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      const res = await fetch(`/api/attendance/export-summary?${params}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error al exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resumen_horas_${year}_${String(month).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar el resumen");
    } finally {
      setExportingSummary(false);
    }
  };

  const handleExportLegal = async () => {
    setExportingLegal(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      const res = await fetch(`/api/attendance/export-legal?${params}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error al exportar reporte fiscalizable");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte_fiscalizacion_${fechaInicio}_${fechaFin}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar el reporte fiscalizable");
    } finally {
      setExportingLegal(false);
    }
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);
  const totals = summary.reduce(
    (acc, employee) => ({
      esperadas: acc.esperadas + employee.horas_estimadas,
      trabajadas: acc.trabajadas + employee.horas_trabajadas,
      extra: acc.extra + employee.horas_extra,
      debe: acc.debe + employee.horas_debe,
    }),
    { esperadas: 0, trabajadas: 0, extra: 0, debe: 0 }
  );
  const employeesWithDebt = summary.filter((employee) => employee.horas_debe > 0).length;
  const employeesWithExtra = summary.filter((employee) => employee.horas_extra > 0).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Horas trabajadas, horas extra y horas pendientes por trabajador
        </p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
          <div className="flex flex-col gap-3">
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
              <button
                type="button"
                onClick={() => setPeriodMode("monthly")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodMode === "monthly"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setPeriodMode("weekly")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  periodMode === "weekly"
                    ? "bg-white text-blue-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Semanal
              </button>
            </div>

            {periodMode === "monthly" ? (
              <div className="flex gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Mes
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    {monthNames.map((name, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                    Año
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wider">
                  Semana desde
                </label>
                <input
                  type="date"
                  value={weekStart}
                  onChange={(e) => setWeekStart(e.target.value)}
                  className="px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Hasta {fechaFin}
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:ml-auto">
            <Button
              onClick={handleExportLegal}
              loading={exportingLegal}
              disabled={summary.length === 0}
            >
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              Fiscalización
            </Button>
            <Button
              onClick={handleExportSummary}
              loading={exportingSummary}
              disabled={summary.length === 0}
            >
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Resumen Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Horas esperadas</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totals.esperadas.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Horas trabajadas</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{totals.trabajadas.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Con horas extra</p>
          <p className="mt-2 text-2xl font-bold text-green-700">{employeesWithExtra}</p>
          <p className="text-xs text-green-600 mt-1">Total {totals.extra.toFixed(1)}h</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Deben horas</p>
          <p className="mt-2 text-2xl font-bold text-red-700">{employeesWithDebt}</p>
          <p className="text-xs text-red-600 mt-1">Total {totals.debe.toFixed(1)}h</p>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Resumen —{" "}
            {periodMode === "monthly"
              ? `${monthNames[month - 1]} ${year}`
              : `${fechaInicio} al ${fechaFin}`}
          </h2>
        </div>

        {loadingData ? (
          <div className="flex items-center justify-center py-16">
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
        ) : summary.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">
              No hay registros de asistencia para este período
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Empleado
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Días prog.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Días trab.
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Horas estimadas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Horas trabajadas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Extra
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Debe
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((emp) => {
                  const estadoBadgeColor =
                    emp.estado === "extra"
                      ? "bg-green-100 text-green-700"
                      : emp.estado === "debe"
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700";

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{emp.nombre}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-gray-700">
                        {emp.dias_programados}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-700 rounded-full font-semibold text-sm">
                          {emp.dias_trabajados}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-gray-700">
                        {emp.horas_estimadas.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-center font-mono text-sm text-gray-700">
                        {emp.horas_trabajadas.toFixed(1)}h
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-green-50 text-green-700 font-mono text-sm font-semibold">
                          {emp.horas_extra.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-red-50 text-red-700 font-mono text-sm font-semibold">
                          {emp.horas_debe.toFixed(1)}h
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-xs font-semibold ${estadoBadgeColor}`}>
                          {emp.estado === "extra"
                            ? "Extra"
                            : emp.estado === "debe"
                            ? "Debe"
                            : "Completo"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
