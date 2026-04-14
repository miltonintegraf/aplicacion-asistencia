import { createServiceClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { user_id } = await request.json();
  const supabase = await createServiceClient();

  const { data, error } = await supabase
    .from("employees")
    .select("role")
    .eq("id", user_id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data });
}
