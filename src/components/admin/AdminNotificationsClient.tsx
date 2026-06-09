"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface NotificationRow {
  id: string;
  message: string;
  status: "pending" | "read";
  notification_date: string;
  minutes_late: number;
  actual_entry_at: string | null;
  created_at: string;
  employees?: {
    nombre: string;
    email: string;
  } | null;
}

interface AdminNotificationsClientProps {
  initialNotifications: NotificationRow[];
}

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("es-CL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Santiago",
  });
}

export default function AdminNotificationsClient({
  initialNotifications,
}: AdminNotificationsClientProps) {
  const router = useRouter();
  const [generating, setGenerating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pendingCount = initialNotifications.filter((item) => item.status === "pending").length;

  const handleGenerate = async () => {
    setGenerating(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/notifications/late", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudieron actualizar las alertas");

      const created = json.data?.created ?? 0;
      const checked = json.data?.checked ?? 0;
      setMessage(`Alertas actualizadas. Revisados: ${checked}. Avisos detectados: ${created}.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkRead = async (id: string) => {
    setUpdatingId(id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "read" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo actualizar el aviso");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notificaciones</h1>
          <p className="text-gray-500 mt-1">
            Avisos de trabajadores con atraso superior a 10 minutos
          </p>
        </div>
        <Button onClick={handleGenerate} loading={generating}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 9A8 8 0 006.34 4.34L4 6.68M4 15a8 8 0 0013.66 4.66L20 17.32" />
          </svg>
          Actualizar alertas
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Pendientes</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Total avisos</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{initialNotifications.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 p-5">
          <p className="text-xs font-semibold text-gray-500 uppercase">Regla activa</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">10 min</p>
        </div>
      </div>

      {message && (
        <div className="mb-5 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {message}
        </div>
      )}
      {error && (
        <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-md shadow-gray-200/70 overflow-hidden">
        {initialNotifications.length === 0 ? (
          <div className="text-center py-14 px-6">
            <p className="text-gray-900 font-semibold">Sin notificaciones por ahora</p>
            <p className="text-gray-500 text-sm mt-1">
              Al actualizar alertas aparecerán los trabajadores que superen los 10 minutos de atraso.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {initialNotifications.map((item) => (
              <div
                key={item.id}
                className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span
                      className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${
                        item.status === "pending"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {item.status === "pending" ? "Pendiente" : "Revisado"}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(item.notification_date)}</span>
                    <span className="text-xs text-gray-400">Creado {formatDateTime(item.created_at)}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">
                    {item.employees?.nombre ?? "Trabajador"}
                  </p>
                  <p className="text-xs text-gray-400 mb-2">{item.employees?.email ?? ""}</p>
                  <p className="text-sm text-gray-700">{item.message}</p>
                </div>

                {item.status === "pending" && (
                  <Button
                    variant="secondary"
                    onClick={() => handleMarkRead(item.id)}
                    loading={updatingId === item.id}
                  >
                    Marcar revisado
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
