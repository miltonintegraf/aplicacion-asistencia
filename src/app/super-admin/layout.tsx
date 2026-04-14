import { redirect } from "next/navigation";
import { getUser, getEmployee } from "@/lib/supabase/server";
import { Sidebar } from "@/components/super-admin/Sidebar";

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUser();

  if (!user) {
    redirect("/login");
  }

  const { employee } = await getEmployee(user.id);

  if (!employee || employee.role !== "super_admin") {
    redirect("/login");
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userEmail={employee.email} userName={employee.nombre} />
      <main className="flex-1 overflow-y-auto lg:ml-0">
        <div className="pt-16 lg:pt-0 min-h-full">{children}</div>
      </main>
    </div>
  );
}
