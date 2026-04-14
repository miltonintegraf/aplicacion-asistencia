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
    const empleado_id = searchParams.get("empleado_id");

    let query = supabase
      .from("attendance")
      .select(
        `
        id,
        empleado_id,
        tipo_registro,
        fecha_hora,
        distancia_empresa_metros,
        valido,
        duracion_colacion_minutos,
        employees (
          nombre,
          email
        )
      `
      )
      .eq("empresa_id", currentEmployee.empresa_id)
      .order("fecha_hora", { ascending: true });

    if (empleado_id) {
      query = query.eq("empleado_id", empleado_id);
    }
    if (fecha_inicio) {
      query = query.gte("fecha_hora", fecha_inicio);
    }
    if (fecha_fin) {
      query = query.lte("fecha_hora", fecha_fin + "T23:59:59.999Z");
    }

    const { data: records, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener datos: " + error.message },
        { status: 500 }
      );
    }

    // Group records by employee and date to get 4-event pairs
    const grouped: Record<
      string,
      {
        empleado: string;
        email: string;
        fecha: string;
        entrada_laboral?: string;
        salida_almuerzo?: string;
        entrada_almuerzo?: string;
        salida_laboral?: string;
        duracion_colacion?: number | null;
        distancia_entrada?: number | null;
        valido_entrada?: boolean;
      }
    > = {};

    // Helper to normalize legacy types
    function normalize(tipo: string): string {
      if (tipo === "entrada") return "entrada_laboral";
      if (tipo === "salida") return "salida_laboral";
      return tipo;
    }

    for (const record of records ?? []) {
      const emp = (record.employees as unknown) as { nombre: string; email: string } | null;
      const fecha = new Date(record.fecha_hora).toLocaleDateString("es-AR");
      const hora = new Date(record.fecha_hora).toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const key = `${record.empleado_id}_${fecha}`;
      const normalizedType = normalize(record.tipo_registro);

      if (!grouped[key]) {
        grouped[key] = {
          empleado: emp?.nombre ?? "Sin nombre",
          email: emp?.email ?? "",
          fecha,
        };
      }

      // Assign to the appropriate timestamp field
      if (normalizedType === "entrada_laboral") {
        grouped[key].entrada_laboral = hora;
        grouped[key].distancia_entrada = record.distancia_empresa_metros;
        grouped[key].valido_entrada = record.valido;
      } else if (normalizedType === "salida_almuerzo") {
        grouped[key].salida_almuerzo = hora;
        grouped[key].duracion_colacion = record.duracion_colacion_minutos;
      } else if (normalizedType === "entrada_almuerzo") {
        grouped[key].entrada_almuerzo = hora;
      } else if (normalizedType === "salida_laboral") {
        grouped[key].salida_laboral = hora;
      }
    }

    // Calculate worked hours for each day
    const groupedWithHours = Object.values(grouped).map((row) => {
      let horasTrabajadas = "-";

      if (row.entrada_laboral && row.salida_laboral) {
        // Both start and end times exist
        const entrada = new Date(`2000-01-01 ${row.entrada_laboral}`);
        const salida = new Date(`2000-01-01 ${row.salida_laboral}`);

        const totalMs = salida.getTime() - entrada.getTime();
        const lunchMs = (row.duracion_colacion ?? 0) * 60 * 1000;
        const workedMs = Math.max(0, totalMs - lunchMs);

        const hours = Math.floor(workedMs / (1000 * 60 * 60));
        const minutes = Math.floor((workedMs % (1000 * 60 * 60)) / (1000 * 60));

        horasTrabajadas = `${hours}h ${minutes}m`;
      }

      return { ...row, horasTrabajadas };
    });

    // Build worksheet data
    const wsData = [
      [
        "Empleado",
        "Email",
        "Fecha",
        "Entrada Laboral",
        "Salida Almuerzo",
        "Entrada Almuerzo",
        "Salida Laboral",
        "Dur. Colación (min)",
        "Horas Trabajadas",
        "Distancia (m)",
        "Válido",
      ],
      ...groupedWithHours.map((row) => [
        row.empleado,
        row.email,
        row.fecha,
        row.entrada_laboral ?? "-",
        row.salida_almuerzo ?? "-",
        row.entrada_almuerzo ?? "-",
        row.salida_laboral ?? "-",
        row.duracion_colacion ?? "-",
        row.horasTrabajadas,
        row.distancia_entrada != null ? Math.round(row.distancia_entrada) : "-",
        row.valido_entrada === true
          ? "Sí"
          : row.valido_entrada === false
            ? "No"
            : "-",
      ]),
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Column widths
    ws["!cols"] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
      { wch: 12 },
      { wch: 10 },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Asistencias");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const fechaStr = new Date().toISOString().split("T")[0];
    const filename = `asistencias_${fechaStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("GET /api/attendance/export error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
