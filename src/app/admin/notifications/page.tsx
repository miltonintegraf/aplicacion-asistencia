import { redirect } from "next/navigation";
import { createClient, getEmployee, getUser } from "@/lib/supabase/server";
import AdminNotificationsClient from "@/components/admin/AdminNotificationsClient";

export default async function AdminNotificationsPage() {
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee || employee.role !== "admin") redirect("/login");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("attendance_notifications")
    .select(
      `
      id,
      message,
      status,
      notification_date,
      minutes_late,
      actual_entry_at,
      created_at,
      employees (
        nombre,
        email
      )
    `
    )
    .eq("empresa_id", employee.empresa_id)
    .order("status", { ascending: true })
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <AdminNotificationsClient
      initialNotifications={(notifications ?? []) as any}
    />
  );
}
