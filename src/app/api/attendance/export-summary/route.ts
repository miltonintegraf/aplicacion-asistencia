import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildAttendanceSummary } from "@/lib/reports/attendanceSummary";
import * as XLSX from "xlsx";

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

    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para exportar" },
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
      .select("hora_entrada, hora_salida, horarios_laborales")
      .eq("id", currentEmployee.empresa_id)
      .single();

    // Get all attendance records
    const { data: records } = await supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora, duracion_colacion_minutos")
      .eq("empresa_id", currentEmployee.empresa_id)
      .neq("estado_registro", "anulado")
      .gte("fecha_hora", fecha_inicio)
      .lte("fecha_hora", fecha_fin)
      .order("fecha_hora", { ascending: true });

    // Get all active employees
    const { data: employees } = await supabase
      .from("employees")
      .select("id, nombre, email")
      .eq("empresa_id", currentEmployee.empresa_id)
      .eq("activo", true)
      .neq("role", "admin");

    const summary = buildAttendanceSummary({
      employees: employees || [],
      records: records || [],
      company,
      fechaInicio: fecha_inicio,
      fechaFin: fecha_fin,
    });

    // Build export data
    const resumenData = summary.map((emp) => ({
      Empleado: emp.nombre,
      Email: emp.email,
      "Dias Programados": emp.dias_programados,
      "Dias Trabajados": emp.dias_trabajados,
      "Horas Esperadas": emp.horas_estimadas.toFixed(2),
      "Horas Trabajadas": emp.horas_trabajadas.toFixed(2),
      "Horas Extra": emp.horas_extra.toFixed(2),
      "Horas Debe": emp.horas_debe.toFixed(2),
      Diferencia: emp.diferencia_horas.toFixed(2),
      Estado:
        emp.estado === "extra"
          ? "Tiene horas extra"
          : emp.estado === "debe"
          ? "Debe horas"
          : "Completo",
    }));

    // Create workbook
    const wsData = [
      Object.keys(resumenData[0] || {}),
      ...resumenData.map((row) => Object.values(row)),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Resumen");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    return new NextResponse(excelBuffer, {
      headers: {
        "Content-Disposition": `attachment; filename="resumen_horas_${new Date().toISOString().split("T")[0]}.xlsx"`,
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    });
  } catch (err) {
    console.error("GET /api/attendance/export-summary error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
