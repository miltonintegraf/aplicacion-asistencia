import { getUser, getEmployee, createClient } from "@/lib/supabase/server";
import { StatsCard } from "@/components/admin/StatsCard";
import { AdminDashboardAlerts } from "@/components/admin/AdminDashboardClient";
import { redirect } from "next/navigation";

export default async function AdminDashboardPage() {
  // These are cached — zero network cost if layout already called them
  const { user } = await getUser();
  if (!user) redirect("/login");

  const { employee } = await getEmployee(user.id);
  if (!employee) redirect("/login");

  const empresa_id = employee.empresa_id;

  // Today's date range
  const today = new Date();
  const todayStart = new Date(today.setHours(0, 0, 0, 0)).toISOString();
  const todayEnd = new Date(today.setHours(23, 59, 59, 999)).toISOString();

  const supabase = await createClient();

  // Calculate last 5 days for tardiness pattern detection
  const last5DaysStart = new Date(today);
  last5DaysStart.setDate(last5DaysStart.getDate() - 5);
  const last5DaysStartStr = last5DaysStart.toISOString();

  // Run all queries in parallel
  const [
    { count: totalEmpleados, data: allEmpleados },
    { data: entradas },
    { data: registrosHoy },
    { data: company },
    { data: entradasUltimos5Dias },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, nombre, email", { count: "exact" })
      .eq("empresa_id", empresa_id)
      .eq("activo", true)
      .neq("role", "admin"),

    supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora")
      .eq("empresa_id", empresa_id)
      .in("tipo_registro", ["entrada", "entrada_laboral"])
      .gte("fecha_hora", todayStart)
      .lte("fecha_hora", todayEnd),

    supabase
      .from("attendance")
      .select(
        `
        id,
        tipo_registro,
        fecha_hora,
        distancia_empresa_metros,
        valido,
        employees (nombre, email)
      `
      )
      .eq("empresa_id", empresa_id)
      .gte("fecha_hora", todayStart)
      .lte("fecha_hora", todayEnd)
      .order("fecha_hora", { ascending: false }),

    supabase
      .from("companies")
      .select("nombre_empresa, hora_entrada, hora_salida, tolerancia_minutos")
      .eq("id", empresa_id)
      .single(),

    supabase
      .from("attendance")
      .select("empleado_id, tipo_registro, fecha_hora")
      .eq("empresa_id", empresa_id)
      .in("tipo_registro", ["entrada", "entrada_laboral"])
      .gte("fecha_hora", last5DaysStartStr)
      .lte("fecha_hora", todayEnd)
      .order("fecha_hora", { ascending: false }),
  ]);

  const presentesHoy = new Set(entradas?.map((e) => e.empleado_id)).size;
  const ausentesHoy = Math.max(0, (totalEmpleados ?? 0) - presentesHoy);

  // Calculate alerts
  interface AlertaTardanza {
    id: string;
    nombre: string;
    minutosLate: number;
    horaEntrada: string;
  }
  interface AlertaAusente {
    id: string;
    nombre: string;
  }
  interface AlertaSinSalida {
    id: string;
    nombre: string;
    horaEntrada: string;
  }
  interface AlertaAtrasosSeguidos {
    id: string;
    nombre: string;
    diasAtrasos: number;
  }

  const tardanzas: AlertaTardanza[] = [];
  const ausentes: AlertaAusente[] = [];
  const sinSalida: AlertaSinSalida[] = [];
  const atrasosSeguidos: AlertaAtrasosSeguidos[] = [];

  if (company && allEmpleados && entradas) {
    const horaEntradaStr = company.hora_entrada || "09:00";
    const horaSalidaStr = company.hora_salida || "18:00";
    const toleranciaMinutos = company.tolerancia_minutos || 15;

    // Parse company times
    const [entradaHour, entradaMin] = horaEntradaStr.split(":").map(Number);
    const [salidaHour, salidaMin] = horaSalidaStr.split(":").map(Number);

    const horaEntradaEsperada = new Date();
    horaEntradaEsperada.setHours(entradaHour, entradaMin, 0, 0);

    const horaSalidaEsperada = new Date();
    horaSalidaEsperada.setHours(salidaHour, salidaMin, 0, 0);

    const ahora = new Date();

    // Track employee entries and exits TODAY
    const empleadoEntradaHoy = new Map<string, { fecha_hora: string; tipo_registro: string }>();
    const empleadoSalidaHoy = new Map<string, boolean>();

    for (const reg of entradas) {
      if (["entrada", "entrada_laboral"].includes(reg.tipo_registro)) {
        empleadoEntradaHoy.set(reg.empleado_id, { fecha_hora: reg.fecha_hora, tipo_registro: reg.tipo_registro });
      }
    }

    for (const reg of registrosHoy ?? []) {
      if (["salida", "salida_laboral"].includes(reg.tipo_registro)) {
        const empName = (reg.employees as any)?.nombre;
        const emp = allEmpleados?.find((e) => e.nombre === empName);
        if (emp) {
          empleadoSalidaHoy.set(emp.id, true);
        }
      }
    }

    // Build map of last entry per day for last 5 days (for tardiness pattern detection)
    const entradaPorDia = new Map<string, Map<string, { fecha_hora: string }>>();
    for (const reg of entradasUltimos5Dias || []) {
      const fecha = reg.fecha_hora.split("T")[0];
      if (!entradaPorDia.has(fecha)) {
        entradaPorDia.set(fecha, new Map());
      }
      const mapaEmpleados = entradaPorDia.get(fecha)!;
      mapaEmpleados.set(reg.empleado_id, { fecha_hora: reg.fecha_hora });
    }

    // Check each employee
    for (const emp of allEmpleados) {
      const tieneEntradaHoy = empleadoEntradaHoy.has(emp.id);

      if (!tieneEntradaHoy) {
        // Ausente: no marcó entrada hoy
        ausentes.push({ id: emp.id, nombre: emp.nombre });
      } else {
        // Has entrada today, check for tardanza
        const entradaReg = empleadoEntradaHoy.get(emp.id)!;
        const horaEntradaReal = new Date(entradaReg.fecha_hora);
        const horaEntradaFormato = horaEntradaReal.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        });

        const horaEsperada = new Date();
        horaEsperada.setHours(entradaHour, entradaMin, 0, 0);

        const minutosLate = Math.floor(
          (horaEntradaReal.getTime() - horaEsperada.getTime()) / (1000 * 60)
        );

        if (minutosLate > toleranciaMinutos) {
          tardanzas.push({
            id: emp.id,
            nombre: emp.nombre,
            minutosLate,
            horaEntrada: horaEntradaFormato,
          });

          // Check for consecutive tardiness (3+ days in last 5 days)
          let diasAtrasos = 0;
          let consecutivos = 0;
          const fechasOrdenadas = Array.from(entradaPorDia.keys()).sort().reverse();

          for (const fecha of fechasOrdenadas) {
            const mapaEmpleados = entradaPorDia.get(fecha)!;
            if (mapaEmpleados.has(emp.id)) {
              const entradaEnEseFecha = mapaEmpleados.get(emp.id)!;
              const horaEntradaEnEseFecha = new Date(entradaEnEseFecha.fecha_hora);
              const horaEsperadaEnEseFecha = new Date();
              const [year, month, day] = fecha.split("-");
              horaEsperadaEnEseFecha.setFullYear(parseInt(year), parseInt(month) - 1, parseInt(day));
              horaEsperadaEnEseFecha.setHours(entradaHour, entradaMin, 0, 0);

              const minutosLateEnEseFecha = Math.floor(
                (horaEntradaEnEseFecha.getTime() - horaEsperadaEnEseFecha.getTime()) / (1000 * 60)
              );

              if (minutosLateEnEseFecha > toleranciaMinutos) {
                consecutivos++;
                if (consecutivos >= 3) {
                  diasAtrasos = consecutivos;
                  break;
                }
              } else {
                consecutivos = 0; // Reset si no hay atraso
              }
            } else {
              consecutivos = 0; // Reset si no hay registro
            }
          }

          if (diasAtrasos >= 3) {
            atrasosSeguidos.push({
              id: emp.id,
              nombre: emp.nombre,
              diasAtrasos,
            });
          }
        }

        // Check sin salida: if past expected exit time + 40 min and no exit marked
        const horaSinSalidaAlerta = new Date(horaSalidaEsperada.getTime() + 40 * 60 * 1000);
        if (ahora > horaSinSalidaAlerta && !empleadoSalidaHoy.has(emp.id)) {
          sinSalida.push({
            id: emp.id,
            nombre: emp.nombre,
            horaEntrada: horaEntradaFormato,
          });
        }
      }
    }
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("es-AR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Bienvenido, {employee.nombre}
        </h1>
        <p className="text-gray-500 mt-1 capitalize">{dateStr}</p>
        {company && (
          <p className="text-sm text-blue-600 font-medium mt-1">
            {company.nombre_empresa}
          </p>
        )}
      </div>

      {/* Alerts */}
      <AdminDashboardAlerts
        tardanzas={tardanzas}
        ausentes={ausentes}
        sinSalida={sinSalida}
        atrasosSeguidos={atrasosSeguidos}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <StatsCard
          label="Total empleados"
          value={totalEmpleados ?? 0}
          color="blue"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Presentes hoy"
          value={presentesHoy}
          color="green"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Ausentes hoy"
          value={ausentesHoy}
          color="red"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatsCard
          label="Registros hoy"
          value={registrosHoy?.length ?? 0}
          color="purple"
          icon={
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          }
        />
      </div>

    </div>
  );
}
