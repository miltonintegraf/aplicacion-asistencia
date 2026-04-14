# 🚀 Setup Guía - Fresh Start con Vercel + GitHub

Este documento te guía paso a paso para crear un nuevo repositorio de GitHub y proyecto de Vercel desde cero.

---

## **PASO 1: Crear Nuevo Repositorio en GitHub**

1. Ve a **github.com** → Click en **+** (arriba a la derecha) → **New repository**
2. Llena:
   - **Repository name**: `saas-asistencia` (o el nombre que prefieras)
   - **Description**: "Asistencia y GPS tracking para empleados"
   - **Public/Private**: Elige tu preferencia
   - **Initialize with**: Leave empty (NO README, NO .gitignore)
3. Click **Create repository**

**Copia la URL del nuevo repo** (algo como `https://github.com/tuusuario/saas-asistencia.git`)

---

## **PASO 2: Inicializar Git Localmente**

En tu terminal en la carpeta `c:\Users\milto\saas-asistencia`:

```bash
# Elimina el git anterior
rm -rf .git

# Inicializa nuevo repositorio
git init
git config user.name "miltonrolaguerra-8473"
git config user.email "miltonrola.guerra@gmail.com"

# Agrega los archivos
git add .

# Primer commit
git commit -m "Initial commit: 4-step attendance system with cronometer"

# Cambia el nombre de la rama a main (si es necesario)
git branch -M main

# Conecta con el repositorio remoto (reemplaza con tu URL)
git remote add origin https://github.com/TU_USUARIO/saas-asistencia.git

# Push
git push -u origin main
```

---

## **PASO 3: Crear Nuevo Proyecto en Vercel**

1. Ve a **vercel.com** → Sign in
2. Click **Add New...** → **Project**
3. **Import Git Repository**:
   - Conecta tu GitHub account (si no está conectada)
   - Busca y selecciona `saas-asistencia`
4. **Configure Project**:
   - **Project name**: `saas-asistencia`
   - **Framework Preset**: Next.js (debería autodetectar)
   - **Root Directory**: `./`
5. **Environment Variables** (IMPORTANTE):
   - Agrega las 3 variables de Supabase:
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
     ```
   - (Copia estos valores de tu Supabase → Settings → API)
6. Click **Deploy**

Espera a que el deploy termine. Deberías ver **"Production ✓ Ready"**

---

## **PASO 4: Ejecutar SQL Migration en Supabase**

1. Ve a **Supabase Dashboard** → Tu proyecto → **SQL Editor**
2. Click **New Query**
3. Copia y pega esto:

```sql
-- Expandir tipo_registro
ALTER TABLE attendance DROP CONSTRAINT IF EXISTS attendance_tipo_registro_check;
ALTER TABLE attendance ADD CONSTRAINT attendance_tipo_registro_check
  CHECK (tipo_registro IN (
    'entrada', 'salida',
    'entrada_laboral', 'salida_almuerzo', 'entrada_almuerzo', 'salida_laboral'
  ));

-- Agregar columna de duración de almuerzo
ALTER TABLE attendance
  ADD COLUMN IF NOT EXISTS duracion_colacion_minutos INTEGER
  CHECK (duracion_colacion_minutos IS NULL OR duracion_colacion_minutos IN (30, 45, 60));

-- Índice de performance
CREATE INDEX IF NOT EXISTS idx_attendance_empleado_fecha
  ON attendance (empleado_id, fecha_hora DESC);
```

4. Click **Run** (botón play)

---

## **PASO 5: Verificar que Todo Funciona**

1. Abre tu dominio de Vercel (debería estar listo)
2. Intenta loguear con un empleado
3. Ve a `/employee/dashboard`
4. Deberías ver:
   - ✅ **00:00:00** (cronómetro, no reloj de pared)
   - ✅ **"Sin registros de asistencia hoy"**
   - ✅ **Un botón grande verde "MARCAR ENTRADA"**

5. Haz clic en "MARCAR ENTRADA"
6. Deberías ver:
   - ✅ Cronómetro empezando a contar
   - ✅ Selector de almuerzo (3 botones: 30/45/60 min)
   - ✅ Indicador de progreso (4 pasos)

---

## **TROUBLESHOOTING**

### Si Vercel falla el deploy:
- Ve a **Vercel Dashboard → Deployments**
- Click en el deployment fallido
- Revisa los **Build Logs**
- Asegúrate de que las variables de entorno están configuradas

### Si el cronómetro muestra la hora (no cuenta):
- Hard refresh: `Ctrl + Shift + R`
- Abre DevTools (F12) → Console
- Verifica que no haya errores

### Si no puedes loguear:
- Verifica que tu usuario existe en Supabase
- Revisa que `NEXT_PUBLIC_SUPABASE_URL` esté correcta

---

## **ARCHIVO QUE NECESITAS SABER**

- **[CLAUDE.md](CLAUDE.md)** — Documentación técnica completa
- **[src/lib/types.ts](src/lib/types.ts)** — Tipos del sistema de 4 pasos
- **[src/components/employee/AttendanceButtons.tsx](src/components/employee/AttendanceButtons.tsx)** — Cronómetro + lógica principal

---

## **¿Preguntas?**

Si algo falla, revisa primero:
1. Las variables de entorno en Vercel
2. Los logs del build en Vercel
3. La consola del navegador (F12)
4. El CLAUDE.md para documentación técnica

¡Todo debería funcionar! 🚀
