import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { generateLateAttendanceNotifications } from "@/lib/notifications/lateAttendance";

export const dynamic = "force-dynamic";

function isCronRequest(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function runLateNotifications(request: NextRequest) {
  try {
    if (isCronRequest(request)) {
      const serviceClient = await createServiceClient();
      const result = await generateLateAttendanceNotifications({
        supabase: serviceClient,
      });
      return NextResponse.json({ data: result });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: currentEmployee, error: employeeError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (employeeError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para generar notificaciones" },
        { status: 403 }
      );
    }

    const result = await generateLateAttendanceNotifications({
      supabase,
      empresaId: currentEmployee.empresa_id,
    });

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("/api/notifications/late error:", err);
    return NextResponse.json(
      { error: "Error interno al generar notificaciones" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!isCronRequest(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return runLateNotifications(request);
}

export async function POST(request: NextRequest) {
  return runLateNotifications(request);
}
