import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { data: employee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !employee || employee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");

    if (!fecha_inicio || !fecha_fin) {
      return NextResponse.json(
        { error: "fecha_inicio y fecha_fin son requeridos" },
        { status: 400 }
      );
    }

    // Get company settings
    const { data: company } = await supabase
      .from("companies")
      .select("hora_entrada, hora_salida")
      .eq("id", employee.empresa_id)
      .single();

    // Get all attendance records
    const { data: records } = await supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora, duracion_colacion_minutos")
      .eq("empresa_id", employee.empresa_id)
      .gte("fecha_hora", fecha_inicio)
      .lte("fecha_hora", fecha_fin)
      .order("fecha_hora", { ascending: true });

    // Get all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, nombre, email")
      .eq("empresa_id", employee.empresa_id)
      .eq("activo", true)
      .neq("role", "admin");

    // Parse company times
    const [entradaHour, entradaMin] = (company?.hora_entrada || "09:00")
      .split(":")
      .map(Number);
    const [salidaHour, salidaMin] = (company?.hora_salida || "18:00")
      .split(":")
      .map(Number);

    const horaEntradaMinutos = entradaHour * 60 + entradaMin;
    const horaSalidaMinutos = salidaHour * 60 + salidaMin;
    const horasEstimadas = (horaSalidaMinutos - horaEntradaMinutos) / 60;

    interface Summary {
      dias: Set<string>;
      horasTrabajadas: number;
      entradas: number;
      salidas: number;
      ultimaEntrada: string | null;
    }

    const summaryMap: Record<string, Summary> = {};

    for (const emp of employees || []) {
      summaryMap[emp.id] = {
        dias: new Set(),
        horasTrabajadas: 0,
        entradas: 0,
        salidas: 0,
        ultimaEntrada: null,
      };
    }

    for (const record of records || []) {
      if (!summaryMap[record.empleado_id]) {
        summaryMap[record.empleado_id] = {
          dias: new Set(),
          horasTrabajadas: 0,
          entradas: 0,
          salidas: 0,
          ultimaEntrada: null,
        };
      }

      const fecha = record.fecha_hora.split("T")[0];

      if (
        record.tipo_registro === "entrada" ||
        record.tipo_registro === "entrada_laboral"
      ) {
        summaryMap[record.empleado_id].entradas++;
        summaryMap[record.empleado_id].dias.add(fecha);
        summaryMap[record.empleado_id].ultimaEntrada = record.fecha_hora;
      }

      if (
        record.tipo_registro === "salida" ||
        record.tipo_registro === "salida_laboral"
      ) {
        summaryMap[record.empleado_id].salidas++;

        if (summaryMap[record.empleado_id].ultimaEntrada) {
          const entrada = new Date(summaryMap[record.empleado_id].ultimaEntrada!);
          const salida = new Date(record.fecha_hora);
          let horasTrabajadas = (salida.getTime() - entrada.getTime()) / (1000 * 60 * 60);

          if (record.duracion_colacion_minutos) {
            horasTrabajadas -= record.duracion_colacion_minutos / 60;
          }

          summaryMap[record.empleado_id].horasTrabajadas += Math.max(0, horasTrabajadas);
        }
      }
    }

    const result = (employees || [])
      .filter((emp) => summaryMap[emp.id].dias.size > 0)
      .map((emp) => ({
        id: emp.id,
        nombre: emp.nombre,
        email: emp.email,
        dias_trabajados: summaryMap[emp.id].dias.size,
        total_entradas: summaryMap[emp.id].entradas,
        total_salidas: summaryMap[emp.id].salidas,
        horas_estimadas: summaryMap[emp.id].dias.size * horasEstimadas,
        horas_trabajadas: summaryMap[emp.id].horasTrabajadas,
      }));

    return NextResponse.json({ data: result });
  } catch (err) {
    console.error("GET /api/attendance/summary error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
