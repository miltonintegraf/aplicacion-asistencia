"use client";

import { useState } from "react";
import { ApiResponse } from "@/lib/types";

interface CompanyData {
  id: string;
  nombre_empresa: string;
  estado_suscripcion: "trial" | "active" | "expired" | "cancelled";
  fecha_inicio_trial: string;
  dias_trial: number;
  empleados_count: number;
  dias_restantes: number;
}

interface SuperAdminCompaniesClientProps {
  initialCompanies: CompanyData[];
}

export default function SuperAdminCompaniesClient({ initialCompanies }: SuperAdminCompaniesClientProps) {
  const [companies, setCompanies] = useState<CompanyData[]>(initialCompanies);
  const [filter, setFilter] = useState<"all" | "trial" | "active" | "expired" | "cancelled">("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDias, setEditingDias] = useState<number>(0);
  const [editingEstado, setEditingEstado] = useState<string>("trial");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);

  const normalizeCompanies = (companies: CompanyData[]) =>
    companies.map((empresa) => ({
      ...empresa,
      dias_restantes:
        empresa.estado_suscripcion !== "trial"
          ? 0
          : Math.max(
              0,
              empresa.dias_trial -
                Math.floor(
                  (new Date().getTime() - new Date(empresa.fecha_inicio_trial).getTime()) /
                    (1000 * 60 * 60 * 24)
                )
            ),
    }));

  const filteredCompanies =
    filter === "all"
      ? companies
      : companies.filter((c) => c.estado_suscripcion === filter);

  const refreshCompanies = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/super-admin/companies");
      const data: ApiResponse<CompanyData[]> = await response.json();
      if (data.data) {
        setCompanies(normalizeCompanies(data.data));
      }
    } catch (error) {
      console.error("Error loading companies:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setUpdating(true);
    try {
      const response = await fetch("/api/super-admin/companies", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          estado_suscripcion: editingEstado,
          dias_trial: parseInt(editingDias.toString(), 10),
        }),
      });

      const data: ApiResponse = await response.json();
      if (response.ok) {
        setEditingId(null);
        await refreshCompanies();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert("Error al actualizar");
    } finally {
      setUpdating(false);
    }
  };

  const startEdit = (empresa: CompanyData) => {
    setEditingId(empresa.id);
    setEditingDias(empresa.dias_trial);
    setEditingEstado(empresa.estado_suscripcion);
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
        <p className="text-gray-500 mt-1">Total: {filteredCompanies.length} empresas</p>
      </div>

      <div className="mb-6 flex gap-2 flex-wrap">
        {(["all", "trial", "active", "expired", "cancelled"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === f
                ? "bg-indigo-700 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            {f === "all" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="px-6 py-12 text-center text-gray-500">Cargando empresas...</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">No hay empresas en este estado</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left border-b border-gray-100">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empresa</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Días Trial</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Empleados</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCompanies.map((empresa) => {
                  const isEditing = editingId === empresa.id;
                  const estadoColor = {
                    trial: "bg-blue-100 text-blue-700",
                    active: "bg-green-100 text-green-700",
                    expired: "bg-red-100 text-red-700",
                    cancelled: "bg-gray-100 text-gray-700",
                  }[empresa.estado_suscripcion];

                  return (
                    <tr key={empresa.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{empresa.nombre_empresa}</div>
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <select
                            value={editingEstado}
                            onChange={(e) => setEditingEstado(e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="trial">Trial</option>
                            <option value="active">Active</option>
                            <option value="expired">Expired</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${estadoColor}`}>
                            {empresa.estado_suscripcion.charAt(0).toUpperCase() + empresa.estado_suscripcion.slice(1)}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <input
                            type="number"
                            value={editingDias}
                            onChange={(e) => setEditingDias(parseInt(e.target.value, 10))}
                            className="px-3 py-1 border border-gray-300 rounded-lg text-sm w-20"
                          />
                        ) : (
                          <span>{empresa.dias_trial} días</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600">{empresa.empleados_count}</td>
                      <td className="px-6 py-4">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(empresa.id)}
                              disabled={updating}
                              className="text-green-600 hover:text-green-800 font-medium text-sm disabled:opacity-50"
                            >
                              {updating ? "..." : "Guardar"}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              disabled={updating}
                              className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEdit(empresa)}
                            className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                          >
                            Editar
                          </button>
                        )}
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
