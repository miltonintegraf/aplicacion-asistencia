import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { CreateEmployeePayload } from "@/lib/types";

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get user's empresa_id and verify admin
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

    if (currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const { data: employees, error } = await supabase
      .from("employees")
      .select("id, nombre, email, activo, role, modalidad, dias_presenciales, fecha_creacion")
      .eq("empresa_id", currentEmployee.empresa_id)
      .order("fecha_creacion", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener empleados: " + error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: employees });
  } catch (err) {
    console.error("GET /api/employees error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const serviceSupabase = await createServiceClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Get current user's empresa_id and verify admin
    const { data: currentEmployee, error: empError } = await supabase
      .from("employees")
      .select("empresa_id, role")
      .eq("id", user.id)
      .single();

    if (empError || !currentEmployee || currentEmployee.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const body: CreateEmployeePayload = await request.json();

    if (!body.nombre || !body.email || !body.password) {
      return NextResponse.json(
        { error: "Nombre, email y contraseña son requeridos" },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Create auth user using service role (bypasses email confirmation)
    const { data: authData, error: createAuthError } =
      await serviceSupabase.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
      });

    if (createAuthError || !authData.user) {
      if (createAuthError?.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email ya está registrado" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error:
            "Error al crear usuario: " +
            (createAuthError?.message ?? "Error desconocido"),
        },
        { status: 500 }
      );
    }

    // Insert employee record using service role (bypasses RLS)
    const { data: newEmployee, error: insertError } = await serviceSupabase
      .from("employees")
      .insert({
        id: authData.user.id,
        empresa_id: currentEmployee.empresa_id,
        nombre: body.nombre,
        email: body.email,
        role: body.role ?? "employee",
        activo: true,
        modalidad: body.modalidad ?? "presencial",
        dias_presenciales: body.dias_presenciales ?? [],
      })
      .select("id, nombre, email, activo, role, modalidad, dias_presenciales, fecha_creacion")
      .single();

    if (insertError) {
      // Rollback auth user if employee insert fails
      await serviceSupabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        { error: "Error al crear empleado: " + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: newEmployee }, { status: 201 });
  } catch (err) {
    console.error("POST /api/employees error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
