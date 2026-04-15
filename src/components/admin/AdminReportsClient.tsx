"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";

interface EmployeeSummary {
  id: string;
  nombre: string;
  email: string;
  dias_trabajados: number;
  total_entradas: number;
  total_salidas: number;
  horas_trabajadas: number;
  horas_estimadas: number;
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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [empleados, setEmpleados] = useState<Employee[]>(initialEmpleados);
  const [summary, setSummary] = useState<EmployeeSummary[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingSummary, setExportingSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fechaInicio = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const fechaFin = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

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

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
      });
      const res = await fetch(`/api/attendance/export?${params}`);
      if (!res.ok) {
        const json = await res.json();
        setError(json.error ?? "Error al exportar");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencias_${year}_${String(month).padStart(2, "0")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError("Error al exportar el archivo");
    } finally {
      setExporting(false);
    }
  };

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

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const years = Array.from({ length: 3 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-gray-500 mt-1">
          Resumen de asistencia por empleado y período
        </p>
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
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

          <div className="flex gap-2 sm:ml-auto">
            <Button
              onClick={handleExportExcel}
              loading={exporting}
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
              Detalle
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
              Resumen
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Summary table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">
            Resumen — {monthNames[month - 1]} {year}
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
                    Días trabajados
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Horas estimadas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Horas trabajadas
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {summary.map((emp) => {
                  const diferencia = emp.horas_trabajadas - emp.horas_estimadas;
                  const diferenciaBadgeColor =
                    diferencia > 0
                      ? "bg-green-100 text-green-700"
                      : diferencia < 0
                      ? "bg-red-100 text-red-700"
                      : "bg-gray-100 text-gray-700";

                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {emp.nombre}
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
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded font-mono text-sm font-semibold ${diferenciaBadgeColor}`}>
                          {diferencia > 0 ? "+" : ""}
                          {diferencia.toFixed(1)}h
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
