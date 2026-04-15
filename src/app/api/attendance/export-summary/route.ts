import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
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
      .select("hora_entrada, hora_salida")
      .eq("id", currentEmployee.empresa_id)
      .single();

    // Get all attendance records
    const { data: records } = await supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora, duracion_colacion_minutos")
      .eq("empresa_id", currentEmployee.empresa_id)
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
      ultimaEntrada: string | null;
    }

    const summaryMap: Record<string, Summary> = {};

    for (const emp of employees || []) {
      summaryMap[emp.id] = {
        dias: new Set(),
        horasTrabajadas: 0,
        ultimaEntrada: null,
      };
    }

    for (const record of records || []) {
      if (!summaryMap[record.empleado_id]) {
        summaryMap[record.empleado_id] = {
          dias: new Set(),
          horasTrabajadas: 0,
          ultimaEntrada: null,
        };
      }

      const fecha = record.fecha_hora.split("T")[0];

      if (
        record.tipo_registro === "entrada" ||
        record.tipo_registro === "entrada_laboral"
      ) {
        summaryMap[record.empleado_id].dias.add(fecha);
        summaryMap[record.empleado_id].ultimaEntrada = record.fecha_hora;
      }

      if (
        record.tipo_registro === "salida" ||
        record.tipo_registro === "salida_laboral"
      ) {
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

    // Build export data
    const resumenData = (employees || [])
      .filter((emp) => summaryMap[emp.id].dias.size > 0)
      .map((emp) => {
        const diasTrabajados = summaryMap[emp.id].dias.size;
        const horasEst = diasTrabajados * horasEstimadas;
        const horasTrab = summaryMap[emp.id].horasTrabajadas;
        const diferencia = horasTrab - horasEst;

        return {
          Empleado: emp.nombre,
          Email: emp.email,
          "Días Trabajados": diasTrabajados,
          "Horas Estimadas": horasEst.toFixed(2),
          "Horas Trabajadas": horasTrab.toFixed(2),
          Diferencia: diferencia.toFixed(2),
          Estado: diferencia > 0 ? "Extra" : diferencia < 0 ? "Debe" : "Completo",
        };
      });

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
      { wch: 18 },
      { wch: 18 },
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
