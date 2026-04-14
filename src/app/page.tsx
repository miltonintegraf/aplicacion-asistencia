import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900">
                Marca en 1 minuto
              </span>
            </div>

            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="text-gray-600 hover:text-gray-900 font-medium text-sm transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/register"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Registrar empresa
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-500/30 text-blue-100 text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            100% gratuito para empezar
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Control de asistencia
            <br />
            <span className="text-blue-200">para tu empresa,</span>
            <br />
            desde el celular
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Tus empleados marcan entrada y salida desde su smartphone con
            validación GPS. Sin hardware, sin tarjetas, sin complicaciones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="w-full sm:w-auto bg-white text-blue-700 font-bold px-8 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
            >
              Comenzar gratis
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-xl text-lg hover:border-white/70 hover:bg-white/10 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
          <p className="text-blue-200 text-sm mt-6">
            Sin tarjeta de crédito. Configura en menos de 5 minutos.
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Todo lo que necesitas, nada que no necesitas
            </h2>
            <p className="text-gray-500 text-lg max-w-xl mx-auto">
              Diseñado específicamente para pymes que quieren control sin
              burocracia.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group p-8 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                <svg
                  className="w-7 h-7 text-blue-600 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v3"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Sin hardware
              </h3>
              <p className="text-gray-500 leading-relaxed">
                No necesitas lectores de huella, tarjetas ni terminales. Solo
                los smartphones que tus empleados ya tienen. Ahorra miles en
                equipamiento.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group p-8 rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors">
                <svg
                  className="w-7 h-7 text-green-600 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Validación GPS
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Solo se permite marcar asistencia dentro del radio configurado
                de tu empresa. Evita marcaciones fraudulentas desde casa o
                desde lejos.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group p-8 rounded-2xl border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors">
                <svg
                  className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                Reportes en tiempo real
              </h3>
              <p className="text-gray-500 leading-relaxed">
                Visualiza quién está presente ahora mismo, exporta reportes en
                Excel y analiza tendencias de asistencia por empleado y período.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Listo en 3 pasos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Registra tu empresa",
                desc: "Crea tu cuenta con los datos de tu empresa y configura el radio GPS permitido.",
              },
              {
                step: "2",
                title: "Agrega empleados",
                desc: "Da de alta a tus empleados con email y contraseña. Ellos inician sesión desde su celular.",
              },
              {
                step: "3",
                title: "¡Listo!",
                desc: "Tus empleados marcan entrada/salida. Tú ves reportes en tiempo real desde el panel admin.",
              },
            ].map((item) => (
              <div key={item.step} className="flex gap-5">
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-lg">
                  {item.step}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-6">
            ¿Listo para empezar?
          </h2>
          <p className="text-blue-100 text-lg mb-8">
            Crea tu cuenta gratis y empieza a controlar la asistencia de tu
            equipo hoy mismo.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-blue-700 font-bold px-10 py-4 rounded-xl text-lg hover:bg-blue-50 transition-colors shadow-lg"
          >
            Comenzar gratis ahora
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <span className="text-white font-semibold">Marca en 1 minuto</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} Marca en 1 minuto. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
