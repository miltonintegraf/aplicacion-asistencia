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

interface CompanyDetailEmployee {
  id: string;
  nombre: string;
  email: string;
  role: "admin" | "employee" | "super_admin";
  activo: boolean;
  modalidad: string;
  fecha_creacion: string;
}

interface CompanyDetail {
  company: CompanyData & {
    direccion: string | null;
    radio_permitido_metros: number;
    foto_requerida: boolean;
    firma_requerida: boolean;
    tolerancia_minutos: number;
  };
  admins: CompanyDetailEmployee[];
  workers: CompanyDetailEmployee[];
  lastAttendance: Array<{
    id: string;
    tipo_registro: string;
    fecha_hora: string;
    valido: boolean;
    employees?: { nombre: string; email: string } | null;
  }>;
}

interface SuperAdminCompaniesClientProps {
  initialCompanies: CompanyData[];
}

const estados = ["all", "trial", "active", "expired", "cancelled"] as const;

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    all: "Todas",
    trial: "Trial",
    active: "Activas",
    expired: "Vencidas",
    cancelled: "Canceladas",
  };
  return labels[status] ?? status;
}

function statusColor(status: string) {
  return {
    trial: "bg-blue-100 text-blue-700",
    active: "bg-green-100 text-green-700",
    expired: "bg-red-100 text-red-700",
    cancelled: "bg-gray-100 text-gray-700",
  }[status] ?? "bg-gray-100 text-gray-700";
}

export default function SuperAdminCompaniesClient({
  initialCompanies,
}: SuperAdminCompaniesClientProps) {
  const [companies, setCompanies] = useState<CompanyData[]>(initialCompanies);
  const [filter, setFilter] = useState<(typeof estados)[number]>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingDias, setEditingDias] = useState<number>(0);
  const [editingEstado, setEditingEstado] = useState<string>("trial");
  const [updating, setUpdating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CompanyDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resetAdmin, setResetAdmin] = useState<CompanyDetailEmployee | null>(null);
  const [temporaryPassword, setTemporaryPassword] = useState("Empresa1234");
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      : companies.filter((company) => company.estado_suscripcion === filter);

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

  const loadDetail = async (companyId: string) => {
    setSelectedId(companyId);
    setDetail(null);
    setDetailLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/super-admin/companies/${companyId}`);
      const data: ApiResponse<CompanyDetail> = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error al cargar empresa");
      setDetail(data.data ?? null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al cargar empresa");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setUpdating(true);
    setMessage(null);
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
      if (!response.ok) throw new Error(data.error ?? "Error al actualizar");
      setEditingId(null);
      setMessage("Empresa actualizada correctamente");
      await refreshCompanies();
      if (selectedId === id) await loadDetail(id);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al actualizar");
    } finally {
      setUpdating(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetAdmin) return;
    setResetting(true);
    setMessage(null);
    try {
      const response = await fetch("/api/super-admin/admins/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_id: resetAdmin.id,
          password: temporaryPassword,
        }),
      });
      const data: ApiResponse = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Error al resetear contraseña");
      setMessage(`Contraseña actualizada para ${resetAdmin.email}`);
      setResetAdmin(null);
      setTemporaryPassword("Empresa1234");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al resetear contraseña");
    } finally {
      setResetting(false);
    }
  };

  const startEdit = (empresa: CompanyData) => {
    setEditingId(empresa.id);
    setEditingDias(empresa.dias_trial);
    setEditingEstado(empresa.estado_suscripcion);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Gestión de Empresas</h1>
        <p className="text-gray-500 mt-1">Soporte, suscripción y administradores</p>
      </div>

      {message && (
        <div className="mb-5 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm text-indigo-700">
          {message}
        </div>
      )}

      <div className="mb-6 flex gap-2 flex-wrap">
        {estados.map((estado) => (
          <button
            key={estado}
            onClick={() => setFilter(estado)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === estado
                ? "bg-indigo-700 text-white"
                : "bg-white text-gray-700 border border-gray-200 hover:border-indigo-300"
            }`}
          >
            {statusLabel(estado)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 overflow-hidden">
          {loading ? (
            <div className="px-6 py-12 text-center text-gray-500">Cargando empresas...</div>
          ) : filteredCompanies.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">No hay empresas en este estado</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left border-b border-gray-100">
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Empresa</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Trial</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Empleados</th>
                    <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompanies.map((empresa) => {
                    const isEditing = editingId === empresa.id;
                    const isSelected = selectedId === empresa.id;

                    return (
                      <tr key={empresa.id} className={isSelected ? "bg-indigo-50/50" : "hover:bg-gray-50/50"}>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => loadDetail(empresa.id)}
                            className="text-left font-medium text-gray-900 hover:text-indigo-700"
                          >
                            {empresa.nombre_empresa}
                          </button>
                          <p className="text-xs text-gray-400">ID {empresa.id.slice(0, 8)}</p>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select
                              value={editingEstado}
                              onChange={(e) => setEditingEstado(e.target.value)}
                              className="px-3 py-1 border border-gray-300 rounded-lg text-sm"
                            >
                              <option value="trial">Trial</option>
                              <option value="active">Activa</option>
                              <option value="expired">Vencida</option>
                              <option value="cancelled">Cancelada</option>
                            </select>
                          ) : (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor(empresa.estado_suscripcion)}`}>
                              {statusLabel(empresa.estado_suscripcion)}
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
                            <div>
                              <p className="text-gray-700">{empresa.dias_trial} días</p>
                              <p className="text-xs text-gray-400">{empresa.dias_restantes} restantes</p>
                            </div>
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
                            <div className="flex gap-3">
                              <button
                                onClick={() => loadDetail(empresa.id)}
                                className="text-indigo-600 hover:text-indigo-800 font-medium text-sm"
                              >
                                Ver
                              </button>
                              <button
                                onClick={() => startEdit(empresa)}
                                className="text-gray-600 hover:text-gray-800 font-medium text-sm"
                              >
                                Editar
                              </button>
                            </div>
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

        <aside className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 min-h-96">
          {!selectedId ? (
            <div className="p-6 text-center text-gray-500">
              Selecciona una empresa para ver detalle y administradores.
            </div>
          ) : detailLoading ? (
            <div className="p-6 text-center text-gray-500">Cargando detalle...</div>
          ) : detail ? (
            <div className="p-6 space-y-6">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {detail.company.nombre_empresa}
                    </h2>
                    <p className="text-sm text-gray-500">
                      {detail.company.direccion || "Sin dirección registrada"}
                    </p>
                  </div>
                  <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(detail.company.estado_suscripcion)}`}>
                    {statusLabel(detail.company.estado_suscripcion)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-5">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Empleados</p>
                    <p className="text-lg font-bold text-gray-900">
                      {detail.admins.length + detail.workers.length}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Radio GPS</p>
                    <p className="text-lg font-bold text-gray-900">
                      {detail.company.radio_permitido_metros}m
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Foto</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {detail.company.foto_requerida ? "Requerida" : "Opcional"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Firma</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {detail.company.firma_requerida ? "Requerida" : "Opcional"}
                    </p>
                  </div>
                </div>
              </div>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Administradores
                </h3>
                {detail.admins.length === 0 ? (
                  <p className="text-sm text-gray-500">Esta empresa no tiene admins.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.admins.map((admin) => (
                      <div
                        key={admin.id}
                        className="rounded-lg border border-gray-100 p-3 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {admin.nombre}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                        </div>
                        <button
                          onClick={() => setResetAdmin(admin)}
                          className="flex-shrink-0 text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                          Reset clave
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">
                  Últimos registros
                </h3>
                {detail.lastAttendance.length === 0 ? (
                  <p className="text-sm text-gray-500">Sin registros recientes.</p>
                ) : (
                  <div className="space-y-2">
                    {detail.lastAttendance.map((record) => (
                      <div key={record.id} className="text-xs rounded-lg bg-gray-50 p-3">
                        <p className="font-medium text-gray-800">
                          {(record.employees as any)?.nombre || "Empleado"}
                        </p>
                        <p className="text-gray-500">
                          {record.tipo_registro} · {new Date(record.fecha_hora).toLocaleString("es-CL")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">No se pudo cargar el detalle.</div>
          )}
        </aside>
      </div>

      {resetAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900">
              Resetear contraseña
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Administrador: {resetAdmin.email}
            </p>

            <div className="mt-5">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Contraseña temporal
              </label>
              <input
                type="text"
                value={temporaryPassword}
                onChange={(e) => setTemporaryPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">
                El administrador podrá entrar con esta clave.
              </p>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setResetAdmin(null)}
                disabled={resetting}
                className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting || temporaryPassword.length < 8}
                className="px-4 py-2 rounded-lg bg-indigo-700 text-white text-sm font-medium hover:bg-indigo-800 disabled:opacity-50"
              >
                {resetting ? "Guardando..." : "Actualizar clave"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
