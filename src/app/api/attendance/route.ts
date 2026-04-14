import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calcularDistancia } from "@/lib/haversine";
import type { CreateAttendancePayload } from "@/lib/types";

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

    if (empError || !currentEmployee) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const empleado_id = searchParams.get("empleado_id");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "25");
    const offset = (page - 1) * limit;

    let query = supabase
      .from("attendance")
      .select(
        `
        id,
        empleado_id,
        tipo_registro,
        fecha_hora,
        latitud,
        longitud,
        distancia_empresa_metros,
        valido,
        duracion_colacion_minutos,
        employees (
          nombre,
          email
        )
      `,
        { count: "exact" }
      )
      .eq("empresa_id", currentEmployee.empresa_id)
      .order("fecha_hora", { ascending: false });

    // Employees can only see their own records
    if (currentEmployee.role === "employee") {
      query = query.eq("empleado_id", user.id);
    } else if (empleado_id) {
      query = query.eq("empleado_id", empleado_id);
    }

    if (fecha_inicio) {
      query = query.gte("fecha_hora", fecha_inicio);
    }

    if (fecha_fin) {
      query = query.lte("fecha_hora", fecha_fin + "T23:59:59.999Z");
    }

    const { data, error, count } = await query.range(
      offset,
      offset + limit - 1
    );

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener registros: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data,
      pagination: {
        total: count ?? 0,
        page,
        limit,
        pages: Math.ceil((count ?? 0) / limit),
      },
    });
  } catch (err) {
    console.error("GET /api/attendance error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
      .select("empresa_id, activo, modalidad, dias_presenciales")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee) {
      return NextResponse.json(
        { error: "Perfil no encontrado" },
        { status: 404 }
      );
    }

    if (!currentEmployee.activo) {
      return NextResponse.json(
        { error: "Tu cuenta está desactivada. Contacta al administrador." },
        { status: 403 }
      );
    }

    const body: CreateAttendancePayload = await request.json();

    // Validate tipo_registro is one of the 4 new types (don't accept legacy for new submissions)
    const validTypes = ["entrada_laboral", "salida_almuerzo", "entrada_almuerzo", "salida_laboral"];
    if (!body.tipo_registro || !validTypes.includes(body.tipo_registro)) {
      return NextResponse.json(
        { error: "Tipo de registro inválido" },
        { status: 400 }
      );
    }

    // Enforce 4-step sequence: entrada_laboral → salida_almuerzo → entrada_almuerzo → salida_laboral
    const today = new Date();
    const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const { data: todayRecords, error: recordsError } = await supabase
      .from("attendance")
      .select("tipo_registro")
      .eq("empresa_id", currentEmployee.empresa_id)
      .eq("empleado_id", user.id)
      .gte("fecha_hora", dayStart.toISOString())
      .lt("fecha_hora", dayEnd.toISOString())
      .order("fecha_hora", { ascending: true });

    if (recordsError) {
      return NextResponse.json(
        { error: "Error al validar secuencia: " + recordsError.message },
        { status: 500 }
      );
    }

    // Normalize legacy types for sequence checking
    const normalizedRecords = (todayRecords || []).map((r) => {
      if (r.tipo_registro === "entrada") return "entrada_laboral";
      if (r.tipo_registro === "salida") return "salida_laboral";
      return r.tipo_registro;
    });

    const expectedSequence = [
      "entrada_laboral",
      "salida_almuerzo",
      "entrada_almuerzo",
      "salida_laboral",
    ];

    // Check if workday is already completed
    if (normalizedRecords.length === 4) {
      return NextResponse.json(
        { error: "Jornada ya completada. No puedes registrar más entradas/salidas hoy." },
        { status: 422 }
      );
    }

    // Check if the submitted type matches the expected next step
    const expectedNextStep = expectedSequence[normalizedRecords.length];
    if (body.tipo_registro !== expectedNextStep) {
      return NextResponse.json(
        { error: `Secuencia inválida. Se esperaba: ${expectedNextStep}` },
        { status: 422 }
      );
    }

    // Validate duracion_colacion_minutos for salida_almuerzo
    if (body.tipo_registro === "salida_almuerzo") {
      if (
        !body.duracion_colacion_minutos ||
        ![30, 45, 60].includes(body.duracion_colacion_minutos)
      ) {
        return NextResponse.json(
          {
            error:
              "Debes seleccionar duración de colación: 30, 45 o 60 minutos",
          },
          { status: 400 }
        );
      }
    }

    if (
      body.latitud === undefined ||
      body.longitud === undefined ||
      isNaN(body.latitud) ||
      isNaN(body.longitud)
    ) {
      return NextResponse.json(
        { error: "Coordenadas GPS inválidas" },
        { status: 400 }
      );
    }

    // Get company GPS data
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("latitud, longitud, radio_permitido_metros")
      .eq("id", currentEmployee.empresa_id)
      .single();

    if (companyError || !company) {
      return NextResponse.json(
        { error: "No se encontró la información de la empresa" },
        { status: 404 }
      );
    }

    let distancia: number | null = null;
    let valido = true;

    // Determine if employee should be validated by location
    const requiresLocationValidation = (() => {
      if (currentEmployee.modalidad === "remoto") return false;
      if (currentEmployee.modalidad === "presencial") return true;
      if (currentEmployee.modalidad === "hibrido") {
        const today = new Date().getDay();
        return (currentEmployee.dias_presenciales as number[]).includes(today);
      }
      return true;
    })();

    // Validate GPS distance if company has coordinates and employee requires validation
    if (
      requiresLocationValidation &&
      company.latitud !== null &&
      company.longitud !== null
    ) {
      distancia = calcularDistancia(
        body.latitud,
        body.longitud,
        parseFloat(company.latitud as unknown as string),
        parseFloat(company.longitud as unknown as string)
      );

      valido = distancia <= company.radio_permitido_metros;

      if (!valido) {
        return NextResponse.json(
          {
            error: `Estás a ${Math.round(distancia)} metros de la empresa. Debes estar dentro de los ${company.radio_permitido_metros} metros permitidos.`,
            distancia: Math.round(distancia),
            radio: company.radio_permitido_metros,
          },
          { status: 422 }
        );
      }
    }

    const empleado_id = user.id;

    // Upload photo to private storage if provided
    let foto_url: string | null = null;
    if (body.foto_base64) {
      try {
        const serviceClient = await createServiceClient();
        const buffer = Buffer.from(body.foto_base64, "base64");
        const fileName = `${empleado_id}/${Date.now()}.jpg`;
        const { error: uploadError } = await serviceClient.storage
          .from("attendance-photos")
          .upload(fileName, buffer, {
            contentType: "image/jpeg",
            upsert: false,
          });
        if (!uploadError) {
          foto_url = fileName;
        }
      } catch {
        // Photo upload failed — continue without it
      }
    }

    // Build insert payload
    const insertPayload: any = {
      empresa_id: currentEmployee.empresa_id,
      empleado_id: empleado_id,
      tipo_registro: body.tipo_registro,
      latitud: body.latitud,
      longitud: body.longitud,
      distancia_empresa_metros: distancia !== null ? Math.round(distancia) : null,
      valido,
      foto_url,
    };

    // Add duracion_colacion_minutos only for salida_almuerzo
    if (body.tipo_registro === "salida_almuerzo") {
      insertPayload.duracion_colacion_minutos = body.duracion_colacion_minutos;
    }

    const { data: record, error: insertError } = await supabase
      .from("attendance")
      .insert(insertPayload)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: "Error al guardar registro: " + insertError.message },
        { status: 500 }
      );
    }

    // Generate appropriate message based on tipo_registro
    const messageMap: Record<string, string> = {
      entrada_laboral: "Entrada laboral registrada correctamente",
      salida_almuerzo: "Salida de almuerzo registrada correctamente",
      entrada_almuerzo: "Regreso de almuerzo registrado correctamente",
      salida_laboral: "Salida laboral registrada correctamente",
    };

    return NextResponse.json(
      {
        data: record,
        message: messageMap[body.tipo_registro] || "Registro guardado correctamente",
        distancia: distancia !== null ? Math.round(distancia) : null,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST /api/attendance error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
