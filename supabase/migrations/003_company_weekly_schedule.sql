-- Horarios laborales por dia para calcular jornadas, atrasos y horas extra
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS horarios_laborales JSONB NOT NULL DEFAULT '{
    "lunes": {"activo": true, "entrada": "09:00", "salida": "18:00"},
    "martes": {"activo": true, "entrada": "09:00", "salida": "18:00"},
    "miercoles": {"activo": true, "entrada": "09:00", "salida": "18:00"},
    "jueves": {"activo": true, "entrada": "09:00", "salida": "18:00"},
    "viernes": {"activo": true, "entrada": "09:00", "salida": "18:00"},
    "sabado": {"activo": false, "entrada": "09:00", "salida": "18:00"},
    "domingo": {"activo": false, "entrada": "09:00", "salida": "18:00"}
  }'::jsonb;
