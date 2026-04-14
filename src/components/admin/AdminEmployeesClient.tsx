"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import type { Employee } from "@/lib/types";

interface EmployeeFormData {
  nombre: string;
  email: string;
  password: string;
  role: "admin" | "employee";
  modalidad: "presencial" | "remoto" | "hibrido";
  dias_presenciales: number[];
}

interface AdminEmployeesClientProps {
  initialEmployees: Employee[];
}

export default function AdminEmployeesClient({ initialEmployees }: AdminEmployeesClientProps) {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees);
  const [modalOpen, setModalOpen] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [form, setForm] = useState<EmployeeFormData>({
    nombre: "",
    email: "",
    password: "",
    role: "employee",
    modalidad: "presencial",
    dias_presenciales: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();

      if (!res.ok) {
        setFormError(json.error ?? "Error al crear empleado");
        return;
      }

      setModalOpen(false);
      setForm({
        nombre: "",
        email: "",
        password: "",
        role: "employee",
        modalidad: "presencial",
        dias_presenciales: [],
      });
      setSuccessMsg("Empleado creado correctamente");
      setTimeout(() => setSuccessMsg(null), 3000);
      setEmployees([...employees, json.data]);
    } catch {
      setFormError("Error de conexión. Por favor intenta nuevamente.");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleActivo = async (emp: Employee) => {
    setTogglingId(emp.id);
    try {
      const res = await fetch(`/api/employees/${emp.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: !emp.activo }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? "Error al actualizar empleado");
        return;
      }

      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, activo: !e.activo } : e))
      );
    } catch {
      setError("Error de conexión");
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
          <p className="text-gray-500 mt-1">
            Gestiona el equipo de tu empresa
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
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
              d="M12 4v16m8-8H4"
            />
          </svg>
          Agregar empleado
        </Button>
      </div>

      {successMsg && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {employees.length === 0 ? (
          <div className="text-center py-20">
            <svg
              className="w-12 h-12 text-gray-300 mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <p className="text-gray-400">No hay empleados registrados</p>
            <Button
              className="mt-4"
              size="sm"
              onClick={() => setModalOpen(true)}
            >
              Agregar primer empleado
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Modalidad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Fecha alta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {employees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-blue-700 font-semibold text-xs">
                            {emp.nombre.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">
                          {emp.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{emp.email}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          emp.role === "admin"
                            ? "bg-purple-100 text-purple-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {emp.role === "admin" ? "Admin" : "Empleado"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          emp.modalidad === "presencial"
                            ? "bg-blue-100 text-blue-700"
                            : emp.modalidad === "remoto"
                              ? "bg-green-100 text-green-700"
                              : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {emp.modalidad === "presencial" && "Presencial"}
                        {emp.modalidad === "remoto" && "Remoto"}
                        {emp.modalidad === "hibrido" && "Híbrido"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          emp.activo
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${emp.activo ? "bg-green-500" : "bg-gray-400"}`}
                        />
                        {emp.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-400 text-xs">
                      {new Date(emp.fecha_creacion).toLocaleDateString("es-AR")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => toggleActivo(emp)}
                        disabled={togglingId === emp.id}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                          emp.activo
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "bg-green-50 text-green-600 hover:bg-green-100"
                        } disabled:opacity-50`}
                      >
                        {togglingId === emp.id ? "Procesando..." : emp.activo ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setFormError(null);
        }}
        title="Agregar empleado"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded text-sm">
              {formError}
            </div>
          )}

          <Input
            label="Nombre"
            required
            value={form.nombre}
            onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
            placeholder="Juan García"
          />

          <Input
            label="Email"
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            placeholder="juan@empresa.com"
          />

          <Input
            label="Contraseña"
            type="password"
            required
            value={form.password}
            onChange={(e) =>
              setForm((p) => ({ ...p, password: e.target.value }))
            }
            placeholder="••••••••"
          />

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Rol
            </label>
            <select
              value={form.role}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  role: e.target.value as "admin" | "employee",
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            >
              <option value="employee">Empleado</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-1.5">
              Modalidad
            </label>
            <select
              value={form.modalidad}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  modalidad: e.target.value as "presencial" | "remoto" | "hibrido",
                }))
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900"
            >
              <option value="presencial">Presencial</option>
              <option value="remoto">Remoto</option>
              <option value="hibrido">Híbrido</option>
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={formLoading}>
              Crear empleado
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
