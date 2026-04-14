import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nombre_empresa,
      direccion,
      latitud,
      longitud,
      radio_permitido_metros,
      nombre_admin,
      email,
      password,
      foto_requerida,
    } = body;

    if (!nombre_empresa || !email || !password || !nombre_admin) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const supabase = await createServiceClient();

    // 1. Crear usuario en Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      if (authError?.message?.includes("already been registered")) {
        return NextResponse.json(
          { error: "Este email ya está registrado." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Error al crear la cuenta: " + (authError?.message ?? "Error desconocido") },
        { status: 500 }
      );
    }

    const userId = authData.user.id;

    // 2. Crear la empresa
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .insert({
        nombre_empresa,
        direccion: direccion || null,
        latitud: latitud ? parseFloat(latitud) : null,
        longitud: longitud ? parseFloat(longitud) : null,
        radio_permitido_metros: parseInt(radio_permitido_metros) || 100,
        foto_requerida: foto_requerida === true,
      })
      .select()
      .single();

    if (companyError || !company) {
      // Revertir: eliminar usuario creado
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Error al crear la empresa: " + (companyError?.message ?? "Error desconocido") },
        { status: 500 }
      );
    }

    // 3. Crear el empleado admin
    const { error: empError } = await supabase.from("employees").insert({
      id: userId,
      empresa_id: company.id,
      nombre: nombre_admin,
      email,
      role: "admin",
      activo: true,
    });

    if (empError) {
      // Revertir
      await supabase.from("companies").delete().eq("id", company.id);
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json(
        { error: "Error al crear el perfil: " + empError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, empresa_id: company.id });
  } catch (err) {
    console.error("POST /api/register error:", err);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
