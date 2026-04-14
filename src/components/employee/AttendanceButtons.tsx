"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

type TipoRegistro = "entrada_laboral" | "salida_almuerzo" | "entrada_almuerzo" | "salida_laboral" | "entrada" | "salida";
type DayStep = "no_records" | "entrada_laboral" | "salida_almuerzo" | "entrada_almuerzo" | "completed";

interface TodayRecord {
  tipo_registro: TipoRegistro;
  fecha_hora: string;
  duracion_colacion_minutos?: number | null;
}

interface AttendanceButtonsProps {
  empleadoId: string;
  fotoRequerida: boolean;
  modalidad: "presencial" | "remoto" | "hibrido";
  diasPresenciales: number[];
}

// Helper: normalize legacy types to new types
function normalize(tipo: TipoRegistro): "entrada_laboral" | "salida_almuerzo" | "entrada_almuerzo" | "salida_laboral" {
  if (tipo === "entrada") return "entrada_laboral";
  if (tipo === "salida") return "salida_laboral";
  return tipo as "entrada_laboral" | "salida_almuerzo" | "entrada_almuerzo" | "salida_laboral";
}

// Helper: determine current step from today's records
function deriveDayStep(records: TodayRecord[]): DayStep {
  if (records.length === 0) return "no_records";

  const normalized = records.map(r => normalize(r.tipo_registro));
  const lastType = normalized[normalized.length - 1];

  if (normalized.length === 4) return "completed";
  if (lastType === "entrada_laboral") return "entrada_laboral";
  if (lastType === "salida_almuerzo") return "salida_almuerzo";
  if (lastType === "entrada_almuerzo") return "entrada_almuerzo";

  return "no_records";
}

// Helper: compute elapsed working time in milliseconds
function computeElapsedMs(records: TodayRecord[], now: Date): number {
  const normalized = records.map(r => normalize(r.tipo_registro));

  if (records.length === 0) return 0;
  if (normalized.length === 4) {
    // Completed day: calculate total time minus lunch
    const start = new Date(records[0].fecha_hora);
    const end = new Date(records[3].fecha_hora);
    const totalMs = end.getTime() - start.getTime();

    // Lunch duration is stored in the salida_almuerzo record
    const lunchRecord = records.find(r => r.tipo_registro === "salida_almuerzo");
    const lunchMs = (lunchRecord?.duracion_colacion_minutos ?? 0) * 60 * 1000;

    return Math.max(0, totalMs - lunchMs);
  }

  const start = new Date(records[0].fecha_hora);

  if (normalized.length === 1) {
    // Only entrada_laboral: elapsed since then (no lunch break)
    return now.getTime() - start.getTime();
  }

  if (normalized.length === 2) {
    // entrada_laboral + salida_almuerzo: paused during lunch
    const salida = new Date(records[1].fecha_hora);
    return salida.getTime() - start.getTime();
  }

  if (normalized.length === 3) {
    // entrada_laboral + salida_almuerzo + entrada_almuerzo: resume timing
    const salida = new Date(records[1].fecha_hora);
    const regreso = new Date(records[2].fecha_hora);

    const lunchRecord = records.find(r => r.tipo_registro === "salida_almuerzo");
    const lunchMs = (lunchRecord?.duracion_colacion_minutos ?? 0) * 60 * 1000;

    const beforeLunch = salida.getTime() - start.getTime();
    const afterLunch = now.getTime() - regreso.getTime();

    return beforeLunch + afterLunch;
  }

  return 0;
}

// Helper: format milliseconds to HH:MM:SS
function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AttendanceButtons({
  empleadoId,
  fotoRequerida,
  modalidad,
  diasPresenciales,
}: AttendanceButtonsProps) {
  const router = useRouter();
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState<TipoRegistro | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "requesting" | "granted" | "denied"
  >("idle");
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [lunchDuration, setLunchDuration] = useState<30 | 45 | 60 | null>(null);

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [pendingTipo, setPendingTipo] = useState<TipoRegistro | null>(null);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Derive day step from records
  const dayStep = deriveDayStep(todayRecords);

  useEffect(() => {
    setCurrentTime(new Date());
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Cronómetro interval: only ticks when working (not during lunch break)
  useEffect(() => {
    if (dayStep === "no_records" || dayStep === "completed" || !currentTime) return;

    const interval = setInterval(() => {
      if (currentTime) {
        const elapsed = computeElapsedMs(todayRecords, new Date());
        setElapsedMs(elapsed);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [dayStep, todayRecords, currentTime]);

  const fetchTodayRecords = useCallback(async () => {
    setLoadingRecords(true);
    try {
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0];
      const res = await fetch(
        `/api/attendance?empleado_id=${empleadoId}&fecha_inicio=${dateStr}&fecha_fin=${dateStr}&limit=10`
      );
      const json = await res.json();
      if (res.ok && json.data && json.data.length > 0) {
        // Reverse to get chronological order (API returns most recent first)
        setTodayRecords(json.data.reverse());
      } else {
        setTodayRecords([]);
      }
    } catch {
      setTodayRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }, [empleadoId]);

  useEffect(() => {
    fetchTodayRecords();
  }, [fetchTodayRecords]);

  // Start camera stream when modal opens and no photo taken yet
  useEffect(() => {
    if (!cameraOpen || capturedPhoto) return;

    let stream: MediaStream;
    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      })
      .then((s) => {
        stream = s;
        setCameraStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch(() => {
        setCameraOpen(false);
        setMessage({
          type: "error",
          text: "No se pudo acceder a la cámara. Verifica los permisos.",
        });
        setPendingCoords(null);
        setPendingTipo(null);
        setLoading(null);
      });

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [cameraOpen, capturedPhoto]);

  const stopStream = (stream: MediaStream | null) => {
    stream?.getTracks().forEach((t) => t.stop());
    setCameraStream(null);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
    setCapturedPhoto(dataUrl);
    stopStream(cameraStream);
  };

  const retakePhoto = () => {
    setCapturedPhoto(null);
  };

  const cancelCamera = () => {
    stopStream(cameraStream);
    setCameraOpen(false);
    setCapturedPhoto(null);
    setPendingCoords(null);
    setPendingTipo(null);
    setLoading(null);
    setGpsStatus("idle");
  };

  const submitAttendance = async (
    tipo: TipoRegistro,
    coords: { lat: number; lng: number },
    foto_base64?: string
  ) => {
    try {
      const payload: any = {
        empleado_id: empleadoId,
        tipo_registro: tipo,
        latitud: coords.lat,
        longitud: coords.lng,
        ...(foto_base64 ? { foto_base64 } : {}),
      };

      // Add lunch duration for salida_almuerzo
      if (tipo === "salida_almuerzo" && lunchDuration) {
        payload.duracion_colacion_minutos = lunchDuration;
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.ok) {
        const hora = new Date(json.data.fecha_hora).toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        setMessage({
          type: "success",
          text: `${json.message}${json.distancia ? ` (${json.distancia}m de la empresa)` : ""}`,
        });
        // Reset lunch duration after successful salida_almuerzo
        if (tipo === "salida_almuerzo") {
          setLunchDuration(null);
        }
        await fetchTodayRecords();
      } else {
        setMessage({
          type: "error",
          text: json.error ?? "No se pudo registrar la asistencia",
        });
      }
    } catch {
      setMessage({
        type: "error",
        text: "Error de conexión. Verifica tu internet e intenta nuevamente.",
      });
    } finally {
      setLoading(null);
      setCapturedPhoto(null);
      setPendingCoords(null);
      setPendingTipo(null);
    }
  };

  const confirmAndSubmit = async () => {
    if (!pendingCoords || !pendingTipo || !capturedPhoto) return;

    setLoading(pendingTipo);
    setCameraOpen(false);

    const foto_base64 = capturedPhoto.split(",")[1];
    await submitAttendance(pendingTipo, pendingCoords, foto_base64);
  };

  const isPresencialDay = () => {
    if (modalidad === "presencial") return true;
    if (modalidad === "remoto") return false;
    if (modalidad === "hibrido") {
      const today = new Date().getDay();
      return diasPresenciales.includes(today);
    }
    return true;
  };

  const requiresGps = isPresencialDay();

  const marcarAsistencia = async (tipo: TipoRegistro) => {
    // Validate lunch duration for salida_almuerzo
    if (tipo === "salida_almuerzo" && !lunchDuration) {
      setMessage({
        type: "error",
        text: "Debes seleccionar duración de colación",
      });
      return;
    }

    setMessage(null);
    setLoading(tipo);

    if (!requiresGps) {
      await submitAttendance(tipo, { lat: 0, lng: 0 });
      return;
    }

    setGpsStatus("requesting");

    if (!navigator.geolocation) {
      setMessage({
        type: "error",
        text: "Tu dispositivo no soporta GPS. Contacta al administrador.",
      });
      setLoading(null);
      setGpsStatus("denied");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setGpsStatus("granted");
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (!fotoRequerida) {
          setPendingCoords(coords);
          setPendingTipo(tipo);
          submitAttendance(tipo, coords);
          return;
        }

        setLoading(null);
        setPendingCoords(coords);
        setPendingTipo(tipo);
        setCameraOpen(true);
      },
      (geoError) => {
        setGpsStatus("denied");
        setLoading(null);
        if (geoError.code === 1) {
          setMessage({
            type: "error",
            text: "Permiso de GPS denegado. Debes permitir el acceso a tu ubicación para marcar asistencia.",
          });
        } else if (geoError.code === 2) {
          setMessage({
            type: "error",
            text: "No se pudo determinar tu ubicación. Verifica que el GPS esté activado.",
          });
        } else {
          setMessage({
            type: "error",
            text: "Tiempo de espera del GPS agotado. Por favor intenta nuevamente.",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleLogout = async () => {
    setLogoutLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  // Completed day screen
  if (!loadingRecords && dayStep === "completed") {
    const totalWorked = computeElapsedMs(todayRecords, new Date());
    return (
      <div className="flex flex-col items-center text-center space-y-6 py-4">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <svg
            className="w-10 h-10 text-green-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">¡Jornada completada!</h2>
          <p className="text-gray-500 mt-3 text-sm">
            Horas trabajadas:{" "}
            <span className="font-semibold text-gray-700 text-lg font-mono">{formatElapsed(totalWorked)}</span>
          </p>
        </div>
        {message && (
          <div className="w-full rounded-xl px-4 py-3 bg-green-50 border border-green-200 text-sm text-green-700 font-medium">
            {message.text}
          </div>
        )}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full py-4 rounded-2xl bg-gray-900 text-white font-bold text-lg hover:bg-gray-800 active:scale-95 transition-all disabled:opacity-60"
        >
          {logoutLoading ? "Cerrando sesión..." : "Cerrar sesión"}
        </button>
        <p className="text-xs text-gray-400">Hasta mañana 👋</p>
      </div>
    );
  }

  // Normal flow
  return (
    <>
      <div className="space-y-6">
        {/* Cronómetro or Wall Clock */}
        <div className="text-center">
          {dayStep === "no_records" ? (
            <>
              <div className="text-5xl font-bold text-gray-900 font-mono tracking-tight">
                {currentTime
                  ? currentTime.toLocaleTimeString("es-AR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : "--:--:--"}
              </div>
              <div className="text-gray-500 mt-2 text-sm">Hora actual</div>
            </>
          ) : (
            <>
              <div
                className={`text-5xl font-bold font-mono tracking-tight ${
                  dayStep === "salida_almuerzo" ? "text-amber-600" : "text-green-600"
                }`}
              >
                {formatElapsed(elapsedMs)}
              </div>
              <div className="text-gray-500 mt-2 text-sm">
                {dayStep === "salida_almuerzo" ? "⏸ En pausa de almuerzo" : "Tiempo trabajado"}
              </div>
            </>
          )}
          <div className="text-gray-500 mt-2 capitalize text-xs">
            {currentTime
              ? currentTime.toLocaleDateString("es-AR", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })
              : ""}
          </div>
        </div>

        {/* 4-step progress indicator */}
        <div className="flex justify-center gap-2">
          {(["entrada_laboral", "salida_almuerzo", "entrada_almuerzo", "salida_laboral"] as const).map(
            (step, idx) => {
              const stepsCompleted = ["entrada_laboral", "salida_almuerzo", "entrada_almuerzo"].includes(
                dayStep
              )
                ? (["entrada_laboral", "salida_almuerzo", "entrada_almuerzo"].indexOf(
                    dayStep as any
                  ) +
                    1 ||
                    0)
                : dayStep === "completed"
                  ? 4
                  : 0;

              const isActive = idx < stepsCompleted;
              const isCurrent = stepsCompleted === idx;

              return (
                <div
                  key={step}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    isActive
                      ? "bg-green-500"
                      : isCurrent
                        ? "bg-amber-500"
                        : "bg-gray-200"
                  }`}
                />
              );
            }
          )}
        </div>

        {/* GPS status indicator */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              gpsStatus === "granted"
                ? "bg-green-500"
                : gpsStatus === "denied"
                  ? "bg-red-500"
                  : gpsStatus === "requesting"
                    ? "bg-yellow-500 animate-pulse"
                    : "bg-gray-300"
            }`}
          />
          <span className="text-sm text-gray-500">
            {gpsStatus === "granted"
              ? "GPS activo"
              : gpsStatus === "denied"
                ? "GPS denegado"
                : gpsStatus === "requesting"
                  ? "Obteniendo ubicación..."
                  : "GPS en espera"}
          </span>
        </div>

        {/* Lunch duration selector - shown when about to mark salida_almuerzo */}
        {dayStep === "entrada_laboral" && (
          <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-100">
            <p className="text-sm font-medium text-blue-900">Elige duración de colación:</p>
            <div className="flex gap-2">
              {[30, 45, 60].map((dur) => (
                <button
                  key={dur}
                  onClick={() => setLunchDuration(dur as 30 | 45 | 60)}
                  className={`flex-1 py-2 rounded-lg font-semibold text-sm transition-all ${
                    lunchDuration === dur
                      ? "bg-blue-500 text-white"
                      : "bg-white text-blue-600 border border-blue-200 hover:bg-blue-100"
                  }`}
                >
                  {dur} min
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Feedback message */}
        {message && (
          <div
            className={`rounded-xl px-5 py-4 flex items-start gap-3 ${
              message.type === "success"
                ? "bg-green-50 border border-green-200"
                : "bg-red-50 border border-red-200"
            }`}
          >
            <div
              className={`w-6 h-6 flex-shrink-0 rounded-full flex items-center justify-center mt-0.5 ${
                message.type === "success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {message.type === "success" ? (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            <p
              className={`text-sm font-medium ${
                message.type === "success" ? "text-green-700" : "text-red-700"
              }`}
            >
              {message.text}
            </p>
          </div>
        )}

        {/* Single action button with context-driven label and color */}
        <button
          onClick={() => {
            const nextStep = {
              no_records: "entrada_laboral",
              entrada_laboral: "salida_almuerzo",
              salida_almuerzo: "entrada_almuerzo",
              entrada_almuerzo: "salida_laboral",
              completed: "",
            }[dayStep];

            if (nextStep) {
              marcarAsistencia(nextStep as TipoRegistro);
            }
          }}
          disabled={
            loading !== null ||
            dayStep === "completed" ||
            (dayStep === "entrada_laboral" && !lunchDuration)
          }
          className={`
            relative flex flex-col items-center justify-center
            h-44 rounded-2xl font-bold text-white text-xl
            transition-all active:scale-95
            ${
              dayStep === "completed"
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : dayStep === "no_records"
                  ? "bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg shadow-green-500/30"
                  : dayStep === "entrada_laboral"
                    ? lunchDuration
                      ? "bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/30"
                      : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : dayStep === "salida_almuerzo"
                      ? "bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg shadow-blue-500/30"
                      : "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/30"
            }
            disabled:opacity-60
          `}
        >
          {loading ? (
            <svg className="animate-spin w-10 h-10 mb-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h-6m0-6h-6m0 6h6" />
            </svg>
          )}
          {loading
            ? "Procesando..."
            : dayStep === "no_records"
              ? "MARCAR ENTRADA"
              : dayStep === "entrada_laboral"
                ? lunchDuration
                  ? `MARCAR SALIDA ALMUERZO (${lunchDuration} min)`
                  : "Elige duración de colación"
                : dayStep === "salida_almuerzo"
                  ? "MARCAR REGRESO ALMUERZO"
                  : dayStep === "entrada_almuerzo"
                    ? "MARCAR SALIDA LABORAL"
                    : "JORNADA COMPLETADA"}
        </button>
      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 bg-black/80">
            <div>
              <p className="text-white font-semibold text-base">
                {capturedPhoto ? "Confirmar foto" : "Sacate una selfie"}
              </p>
              <p className="text-white/50 text-xs mt-0.5">
                {capturedPhoto
                  ? "¿Se ve bien? Confirmá para registrar"
                  : `Para confirmar tu ${pendingTipo}`}
              </p>
            </div>
            <button
              onClick={cancelCamera}
              className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Camera / Preview */}
          <div className="flex-1 relative overflow-hidden">
            {!capturedPhoto ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 w-full h-full object-cover"
              />
            ) : (
              <img
                src={capturedPhoto}
                alt="Vista previa"
                className="absolute inset-0 w-full h-full object-cover"
              />
            )}
          </div>

          {/* Controls */}
          <div className="bg-black px-6 py-8">
            {!capturedPhoto ? (
              <div className="flex items-center justify-center">
                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full bg-white border-4 border-gray-400 hover:scale-95 active:scale-90 transition-transform"
                  aria-label="Tomar foto"
                />
              </div>
            ) : (
              <div className="flex gap-4">
                <button
                  onClick={retakePhoto}
                  className="flex-1 py-3.5 rounded-2xl border border-white/30 text-white font-semibold text-base hover:bg-white/10 transition-colors"
                >
                  Repetir
                </button>
                <button
                  onClick={confirmAndSubmit}
                  className="flex-1 py-3.5 rounded-2xl bg-green-500 hover:bg-green-600 text-white font-bold text-base transition-colors"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>

          {/* Hidden canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </>
  );
}
