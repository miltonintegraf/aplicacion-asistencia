# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**AsistenciaApp** is a SaaS attendance tracking system with GPS validation for SMEs. Employees mark entry/exit from mobile, admins monitor in real-time and export reports.

**Tech Stack**: Next.js 16 (App Router) + TypeScript + Supabase + Tailwind CSS

---

## Development Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Build for production
npm start            # Run production build
npm run lint         # Run ESLint
```

No test suite currently exists. Manual testing via the app is the primary validation method.

---

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (auth)/               # Public: login, register (no admin layout)
│   ├── admin/                # Admin panel routes + admin layout
│   ├── employee/             # Employee dashboard + layout
│   ├── super-admin/          # SuperAdmin dashboard + layout
│   ├── api/                  # Route handlers (POST, GET, PATCH, DELETE)
│   ├── globals.css           # Tailwind + global styles
│   ├── layout.tsx            # Root layout (metadata, fonts)
│   ├── middleware.ts         # Auth + role-based routing (critical)
│   └── page.tsx              # Landing page
├── components/
│   ├── admin/                # Admin-specific components (mostly client)
│   ├── employee/             # Employee-specific components
│   ├── super-admin/          # SuperAdmin-specific components
│   └── ui/                   # Reusable: Button, Input, Modal, Card
└── lib/
    ├── supabase/
    │   ├── client.ts         # Client-side Supabase (useClient)
    │   └── server.ts         # Server-side Supabase (SSR)
    ├── types.ts              # TypeScript interfaces (Company, Employee, AttendanceRecord, etc.)
    └── haversine.ts          # GPS distance calculation
```

### Three-Tier Architecture

**1. Public tier** (`/` → `/login` → `/register`)
- No authentication required
- `useRouter().push()` to navigate after auth

**2. Admin tier** (`/admin/**`)
- **Layout**: [src/app/admin/layout.tsx](src/app/admin/layout.tsx) provides sidebar + navigation
- **Pages** use Server Components to fetch initial data, then render Client Components
  - Example: [src/app/admin/employees/page.tsx](src/app/admin/employees/page.tsx) → `<AdminEmployeesClient>`
  - This pattern separates data fetching (server) from interactivity (client)
- Routes: `/admin/dashboard`, `/admin/attendance`, `/admin/employees`, `/admin/reports`, `/admin/settings`

**3. Employee tier** (`/employee/**`)
- Single dashboard at `/employee/dashboard`
- [AttendanceButtons](src/components/employee/AttendanceButtons.tsx) component handles entry/exit with GPS

**4. SuperAdmin tier** (`/super-admin/**`)
- Dashboard + companies listing
- View/manage all companies, stats across system

### Routing & Access Control

**Middleware** ([src/middleware.ts](src/middleware.ts)):
- Refreshes Supabase session on every request
- Enforces authentication (redirects to `/login?redirectTo=<path>`)
- **Role-based redirects**:
  - `admin` tries `/employee/*` → redirects to `/admin/dashboard`
  - `employee` tries `/admin/*` → redirects to `/employee/dashboard`
  - `super_admin` tries `/admin/*` or `/employee/*` → redirects to `/super-admin/dashboard`
  - Only `super_admin` can access `/super-admin/**`
- Public routes: `/`, `/login`, `/register`, `/api/*`

---

## Multi-Tenancy & Authentication

### Database Structure

**companies** table
- `id` (UUID, PK)
- `nombre_empresa`, `direccion`, `latitud`, `longitud`, `radio_permitido_metros` (GPS validation)
- `foto_requerida` (boolean), `estado_suscripcion` (trial/active/expired/cancelled)

**employees** table
- `id` (UUID, same as Supabase Auth user ID)
- `empresa_id` (FK to companies, enables multi-tenancy)
- `nombre`, `email` (unique within auth)
- `role` ('admin' | 'employee' | 'super_admin')
- `activo` (soft delete flag)
- `modalidad` ('presencial' | 'remoto' | 'hibrido'), `dias_presenciales` (work schedule)

**attendance** table
- `id`, `empresa_id`, `empleado_id` (FKs)
- `tipo_registro` ('entrada' | 'salida' | 'entrada_laboral' | 'salida_almuerzo' | 'entrada_almuerzo' | 'salida_laboral')
- `fecha_hora`, `latitud`, `longitud`, `distancia_empresa_metros`, `valido` (GPS validation result)
- `duracion_colacion_minutos` (lunch break duration: 30, 45, or 60 minutes)

### Authentication Flow

1. **Supabase Auth** (GoTrue) manages user sessions via cookies (HTTP-only, secure)
2. **Client-side**: [lib/supabase/client.ts](src/lib/supabase/client.ts) creates `supabaseClient` with `createClient()`
3. **Server-side**: [lib/supabase/server.ts](src/lib/supabase/server.ts) creates `supabaseServer` with `createClient()` in middleware or async Server Components
4. **Multi-tenancy**: Always filter by `empresa_id` from `employees` table (Row-Level Security in Supabase enforces this)

---

## Server vs Client Components Pattern

**Page files are Server Components** (the default in Next.js App Router):
```tsx
// src/app/admin/employees/page.tsx (Server Component)
async function getEmployees() { /* fetch from Supabase */ }
export default async function EmployeesPage() {
  const initialEmployees = await getEmployees();
  return <AdminEmployeesClient initialEmployees={initialEmployees} />;
}
```

**Client Components handle interactivity**:
```tsx
// src/components/admin/AdminEmployeesClient.tsx
"use client";
export default function AdminEmployeesClient({ initialEmployees }) {
  const [employees, setEmployees] = useState(initialEmployees);
  // useState, useEffect, event handlers, fetch on client
}
```

**Why this split?**
- Server components avoid exposing sensitive keys to client
- Server components enable efficient data fetching (one round trip vs multiple client fetches)
- Client components provide fast interactivity without full page reloads

---

## API Routes

All API routes require authentication (check `supabase.auth.getUser()` in every handler).

### Common Patterns

1. **Authorization check**: Verify user has `admin` role or is querying own data
2. **Multi-tenancy**: Always scope queries by `empresa_id` from current user's employee record
3. **Error handling**: Return `{ error: "message" }` with appropriate HTTP status (400, 401, 403, 404, 500)
4. **Service role for sensitive ops**: Use `createServiceClient()` (has `SUPABASE_SERVICE_ROLE_KEY`) to create users, bypass RLS, etc.

**Examples**:
- `GET /api/employees` → list company employees (admin-only)
- `POST /api/employees` → create new employee with auth user (admin-only, uses service role)
- `PATCH /api/employees/[id]` → toggle active status
- `GET/POST /api/attendance` → list/create attendance records
- `GET /api/attendance/export` → generate Excel export
- `GET/PATCH /api/company` → fetch/update company settings

---

## Key Files & Patterns

### Type System
All request/response types are in [src/lib/types.ts](src/lib/types.ts):
- `Company`, `Employee`, `AttendanceRecord`, `AttendanceStats`, `User`
- `CreateEmployeePayload`, `UpdateEmployeePayload`, `CreateAttendancePayload`, `UpdateCompanyPayload`
- `ApiResponse<T>` for consistent API responses

### GPS Validation
[src/lib/haversine.ts](src/lib/haversine.ts) calculates distance between two coordinates.
Used in `POST /api/attendance` to validate employee is within `radio_permitido_metros`.

### UI Components
Reusable components in [src/components/ui/](src/components/ui/):
- `Button` (with loading state, variants)
- `Input` (with labels, helpers)
- `Modal` (simple dialog)
- `Card` (styled container)

All use Tailwind classes; no external CSS libraries.

---

## Common Development Tasks

### Adding a new Admin page
1. Create [src/app/admin/NEW_PAGE/page.tsx](src/app/admin/) as a Server Component
   - Fetch data with `createClient()` from Supabase
   - Check user auth + role is admin
   - Pass `initialData` to client component
2. Create [src/components/admin/AdminNEW_PAGEClient.tsx](src/components/admin/) as client component
   - Import with `"use client"`
   - Use `useState`, `fetch()` for mutations
   - Render the UI

### Adding a new API endpoint
1. Create [src/app/api/new-endpoint/route.ts](src/app/api/)
2. Export `async function GET()` or `POST()` or `PATCH()` or `DELETE()`
3. In handler:
   - Get user with `supabase.auth.getUser()`
   - Check auth + role permissions
   - Scope queries by `empresa_id`
   - Return `NextResponse.json({ data: ... })` or `{ error: ... }`

### Filtering by Company (Multi-tenancy)
Every query should include `.eq("empresa_id", company_id)`:
```tsx
const { data: employees } = await supabase
  .from("employees")
  .select("*")
  .eq("empresa_id", currentEmployee.empresa_id);
```

---

## 4-Step Attendance System (Implemented)

### Overview

The attendance system has been upgraded from binary entrada/salida to a sequential 4-step workflow with working-time cronometer and lunch duration tracking.

**Sequential Workflow:**
1. **Entrada Laboral** (Green) — Mark start of workday → Cronometer starts
2. **Salida Almuerzo** (Yellow) → Select lunch duration (30/45/60 min) → Cronometer pauses (amber)
3. **Entrada Almuerzo** (Blue) — Return from lunch → Cronometer resumes
4. **Salida Laboral** (Red) — End of workday → Completed screen shows total worked hours

### Key Features

- **Working-time Cronometer (00:MM:SS)**:
  - Replaces wall clock, ticks only when actively working
  - Pauses (turns amber) during lunch break
  - Shows total worked hours minus lunch on completion
  
- **Lunch Duration Selection**: Employees choose 30/45/60 minutes when marking salida almuerzo

- **Sequence Validation**: Server enforces strict 4-step order, rejects invalid sequences with 422

- **Completed Day Screen**: Shows total worked hours + logout button after salida laboral

- **Backward Compatibility**: Legacy entrada/salida records remain in database, normalized for display

### Database Migration (REQUIRED - Execute in Supabase SQL Editor)

```sql
-- Step 1: Expand tipo_registro constraint
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_tipo_registro_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_tipo_registro_check
  CHECK (tipo_registro IN (
    'entrada', 'salida',
    'entrada_laboral', 'salida_almuerzo', 'entrada_almuerzo', 'salida_laboral'
  ));

-- Step 2: Add lunch duration column
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS duracion_colacion_minutos INTEGER
  CHECK (duracion_colacion_minutos IS NULL OR duracion_colacion_minutos IN (30, 45, 60));

-- Step 3: Create performance index
CREATE INDEX IF NOT EXISTS idx_attendance_empleado_fecha
  ON attendance (empleado_id, fecha_hora DESC);
```

### Modified/Created Files

| File | Changes |
|------|---------|
| [src/lib/types.ts](src/lib/types.ts) | Added `TipoRegistro` type, `duracion_colacion_minutos` field |
| [src/app/api/attendance/route.ts](src/app/api/attendance/route.ts) | POST: 4-step sequence enforcement, lunch duration validation |
| [src/components/employee/AttendanceButtons.tsx](src/components/employee/AttendanceButtons.tsx) | **Complete rewrite**: cronometer, progress indicator, lunch selector |
| [src/app/api/attendance/export/route.ts](src/app/api/attendance/export/route.ts) | 4 columns + worked hours calculation |
| [src/app/admin/attendance/page.tsx](src/app/admin/attendance/page.tsx) | 6-color badges for tipo_registro |
| [src/app/admin/dashboard/page.tsx](src/app/admin/dashboard/page.tsx) | Updated presentes query, badges |
| [src/components/admin/AdminReportsClient.tsx](src/components/admin/AdminReportsClient.tsx) | Counts entrada_laboral/salida_laboral |

### Testing Checklist

- [ ] Execute SQL migration in Supabase (see above)
- [ ] Employee dashboard shows 00:00:00 cronometer, not wall clock
- [ ] Mark entrada_laboral → cronometer starts
- [ ] Select lunch (30/45/60 min) → mark salida almuerzo → cronometer pauses (amber)
- [ ] Mark entrada almuerzo → cronometer resumes
- [ ] Mark salida laboral → completed screen shows total hours
- [ ] Admin attendance page shows new labels (not "Entrada/Salida")
- [ ] Admin dashboard "presentes hoy" includes entrada_laboral
- [ ] Excel export has 4 time columns + worked hours

---

## Known Issues & Refactoring In Progress

- Admin page files ([admin/reports](src/app/admin/reports), [admin/settings](src/app/admin/settings)) have leftover client-side code in the server component files—this should be cleaned up (moved entirely to client components or removed).
- Duplicate `.new.tsx` files exist; consolidate or delete.
- Vercel deployment: If you encounter email/authentication issues during GitHub-Vercel integration, try creating a fresh Vercel project with correct GitHub account credentials

---

## Environment Variables

Requires `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

Get these from Supabase Dashboard → Settings → API.

---

## Deployment

- **Frontend**: Deploy to Vercel (auto-deploy on push to `main`)
- **Backend**: Supabase (no additional deployment needed; migrations applied via SQL Editor)
- **Database**: PostgreSQL on Supabase with RLS enabled for security
