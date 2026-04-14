# AsistenciaApp — Control de asistencia SaaS para pymes

Sistema de control de asistencia con validación GPS para pequeñas y medianas empresas. Los empleados marcan entrada y salida desde su smartphone; los administradores monitorizan en tiempo real y exportan reportes.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend + API | Next.js 14 (App Router) + TypeScript |
| Base de datos + Auth | Supabase (PostgreSQL + GoTrue) |
| Estilos | Tailwind CSS |
| Deploy | Vercel (frontend) + Supabase (backend) |
| Exportación | xlsx |

---

## Requisitos previos

- Node.js 18+
- Cuenta en [Supabase](https://supabase.com)
- Cuenta en [Vercel](https://vercel.com) (para deploy)

---

## Configuración local

### 1. Clonar e instalar

```bash
git clone <url-del-repo>
cd saas-asistencia
npm install
```

### 2. Variables de entorno

Copia el archivo de ejemplo y completa los valores:

```bash
cp .env.local.example .env.local
```

Edita `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Obtén estos valores en: Supabase Dashboard → Settings → API.

### 3. Configurar Supabase

En el Supabase Dashboard:

1. Ve a **SQL Editor**
2. Copia y ejecuta el contenido de `supabase/migrations/001_initial_schema.sql`
3. Verifica que las tablas `companies`, `employees` y `attendance` se hayan creado

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

---

## Flujo de uso

### Administrador
1. Registra la empresa en `/register` con GPS y radio permitido
2. Inicia sesión → redirigido a `/admin/dashboard`
3. Agrega empleados desde `/admin/employees`
4. Monitoriza asistencia en `/admin/attendance`
5. Exporta reportes desde `/admin/reports`
6. Actualiza configuración GPS en `/admin/settings`

### Empleado
1. Inicia sesión con las credenciales creadas por el admin
2. Es redirigido a `/employee/dashboard`
3. Pulsa "MARCAR ENTRADA" o "MARCAR SALIDA"
4. El sistema solicita GPS y valida la distancia a la empresa

---

## Deploy en Vercel + Supabase

### Supabase (producción)
1. Crear un nuevo proyecto en [app.supabase.com](https://app.supabase.com)
2. Ejecutar la migración SQL en el SQL Editor
3. Copiar las keys de API (Settings → API)

### Vercel
1. Importar el repositorio en [vercel.com/new](https://vercel.com/new)
2. Agregar las variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
3. Deploy automático en cada push a `main`

---

## Endpoints de API

### `GET/POST /api/employees`
- **GET**: Lista empleados de la empresa autenticada
- **POST**: Crea un nuevo empleado (requiere rol admin)

### `PATCH/DELETE /api/employees/[id]`
- **PATCH**: Actualiza nombre, email o estado activo del empleado
- **DELETE**: Desactiva el empleado (soft delete)

### `GET/POST /api/attendance`
- **GET**: Lista registros de asistencia con filtros (`empleado_id`, `fecha_inicio`, `fecha_fin`, `page`, `limit`)
- **POST**: Registra entrada/salida con validación GPS

### `GET /api/attendance/export`
- Exporta registros en formato Excel (.xlsx)
- Parámetros: `fecha_inicio`, `fecha_fin`, `empleado_id`

### `GET/PATCH /api/company`
- **GET**: Obtiene datos de la empresa del usuario autenticado
- **PATCH**: Actualiza datos de la empresa (requiere rol admin)

---

## Esquema de base de datos

### `companies`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador único |
| nombre_empresa | TEXT | Nombre de la empresa |
| direccion | TEXT | Dirección física |
| latitud | NUMERIC | Coordenada GPS latitud |
| longitud | NUMERIC | Coordenada GPS longitud |
| radio_permitido_metros | INTEGER | Radio en metros para validar asistencia |
| fecha_creacion | TIMESTAMPTZ | Fecha de registro |

### `employees`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Mismo UUID que Supabase Auth |
| empresa_id | UUID FK | Referencia a companies |
| nombre | TEXT | Nombre completo |
| email | TEXT UNIQUE | Email de acceso |
| activo | BOOLEAN | Estado de la cuenta |
| role | TEXT | 'admin' o 'employee' |
| fecha_creacion | TIMESTAMPTZ | Fecha de alta |

### `attendance`
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | UUID PK | Identificador único |
| empresa_id | UUID FK | Referencia a companies |
| empleado_id | UUID FK | Referencia a employees |
| tipo_registro | TEXT | 'entrada' o 'salida' |
| fecha_hora | TIMESTAMPTZ | Timestamp del registro |
| latitud | NUMERIC | Coordenada GPS del empleado |
| longitud | NUMERIC | Coordenada GPS del empleado |
| distancia_empresa_metros | NUMERIC | Distancia calculada con Haversine |
| valido | BOOLEAN | true si estaba dentro del radio |

---

## Seguridad

- **Row Level Security (RLS)** habilitado en todas las tablas
- Multi-tenancy: cada empresa solo puede ver sus propios datos
- Roles: `admin` accede al panel completo, `employee` solo a su dashboard
- GPS validation: la distancia se valida en el servidor con la fórmula Haversine
- Soft deletes: los empleados nunca se eliminan, solo se desactivan

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/          # Login y registro (sin layout de admin)
│   ├── (admin)/         # Panel administrador
│   ├── (employee)/      # Dashboard empleado
│   ├── api/             # API Routes
│   └── layout.tsx       # Root layout
├── components/
│   ├── admin/           # Componentes del panel admin
│   ├── employee/        # Componentes del empleado
│   └── ui/              # Componentes reutilizables
└── lib/
    ├── supabase/        # Clientes Supabase (client/server)
    ├── types.ts         # Interfaces TypeScript
    └── haversine.ts     # Cálculo de distancia GPS
```
