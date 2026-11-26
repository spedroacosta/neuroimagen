import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Participant } from '../types';
import { parseQRPayload, getSequentialTicketId, extractSequentialId } from '../utils/qr';
import { sounds } from '../utils/audio';
import { Dialog } from './Dialog';
import {
  QrCode,
  Camera,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Search,
  RefreshCw,
  Users,
  SwitchCamera,
  AlertCircle,
  Check,
  X,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface QRScannerViewProps {
  participants: Participant[];
  onCheckInParticipant: (participantId: string) => Promise<{
    success: boolean;
    participant?: Participant;
    reason?: 'valid' | 'already_checked_in' | 'unpaid' | 'not_found';
  }>;
  onUndoCheckIn: (participantId: string) => Promise<void>;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  participants,
  onCheckInParticipant,
  onUndoCheckIn,
}) => {
  // Pop-up modal state for explicit staff confirmation
  const [pendingScanParticipant, setPendingScanParticipant] = useState<{
    participant: Participant;
    reason: 'valid' | 'already_checked_in' | 'unpaid';
  } | null>(null);

  const [isConfirmingAccess, setIsConfirmingAccess] = useState(false);
  const [removingCheckInId, setRemovingCheckInId] = useState<string | null>(null);

  const [scanResultNotice, setScanResultNotice] = useState<{
    type: 'success' | 'not_found';
    message: string;
    participantName?: string;
  } | null>(null);

  const [searchManual, setSearchManual] = useState('');
  const [cameraState, setCameraState] = useState<'off' | 'starting' | 'active' | 'error'>('off');
  const [cameraErrorMsg, setCameraErrorMsg] = useState('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraState('starting');
    setCameraErrorMsg('');

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraState('active');
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      setCameraState('error');
      setCameraErrorMsg(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permiso de cámara denegado. Habilita el acceso a la cámara en tu navegador.'
          : 'No se pudo iniciar la cámara del dispositivo.'
      );
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraState('off');
  };

  const toggleCameraFacing = () => {
    const nextMode = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  const tickScan = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && !pendingScanParticipant) {
          const now = Date.now();
          if (now - lastScannedTimeRef.current > 2000) {
            lastScannedTimeRef.current = now;
            handleIdentifyPayload(code.data);
          }
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(tickScan);
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, []);

  const handleIdentifyPayload = (rawPayload: string) => {
    const { isValid, participantId } = parseQRPayload(rawPayload);

    if (!isValid || !participantId) {
      sounds.playError();
      setScanResultNotice({
        type: 'not_found',
        message: 'Código QR no reconocido.',
      });
      return;
    }

    const q = participantId.toLowerCase();
    const paddedQ = /^\d+$/.test(q) ? q.padStart(3, '0') : q;

    const found = participants.find((p) => {
      const seqId =
        p.paymentStatus === 'verified'
          ? getSequentialTicketId(p, participants).toLowerCase()
          : (extractSequentialId(p) || '').toLowerCase();
      return (
        seqId === q ||
        seqId === paddedQ ||
        p.id.toLowerCase() === q ||
        p.responseId.toLowerCase() === q ||
        p.fullName.toLowerCase() === q ||
        (p.cedula && p.cedula.toLowerCase() === q)
      );
    });

    if (!found) {
      sounds.playError();
      setScanResultNotice({
        type: 'not_found',
        message: `No se encontró ningún participante registrado con "${participantId}".`,
      });
      return;
    }

    if (found.paymentStatus !== 'verified') {
      sounds.playError();
      setPendingScanParticipant({
        participant: found,
        reason: 'unpaid',
      });
      return;
    }

    if (found.isCheckedIn) {
      sounds.playWarning();
      setPendingScanParticipant({
        participant: found,
        reason: 'already_checked_in',
      });
      return;
    }

    // Open Pop-up Modal for Staff Confirmation (no confetti)
    setPendingScanParticipant({
      participant: found,
      reason: 'valid',
    });
  };

  const handleConfirmAccess = async () => {
    if (!pendingScanParticipant) return;
    setIsConfirmingAccess(true);

    try {
      const res = await onCheckInParticipant(pendingScanParticipant.participant.id);
      if (res.success && res.participant) {
        sounds.playSuccess();
        setScanResultNotice({
          type: 'success',
          message: 'Acceso confirmado y guardado en la base de datos en tiempo real.',
          participantName: res.participant.fullName,
        });
      }
      setPendingScanParticipant(null);
    } finally {
      setIsConfirmingAccess(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchManual.trim()) {
      handleIdentifyPayload(searchManual.trim());
      setSearchManual('');
    }
  };

  const checkedInCount = participants.filter((p) => p.isCheckedIn).length;
  const verifiedTotal = participants.filter((p) => p.paymentStatus === 'verified').length;

  const checkedInList = participants.filter((p) => p.isCheckedIn);

  return (
    <div className="space-y-5">
      {/* Cabecera con contador en vivo */}
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold tracking-tight text-slate-900">Lector de entrada · 5 de diciembre</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-slate-600">
            Escanea el QR del participante. Verás sus datos y un botón para confirmar el acceso.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-brand-700">
            <Users className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand-800">Acreditados en vivo</p>
            <p className="font-mono text-xl font-bold leading-tight text-slate-900 tabular-nums">
              {checkedInCount}
              <span className="text-sm font-semibold text-slate-500"> / {verifiedTotal}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Cámara y entrada manual */}
        <section className="card space-y-4 p-5 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Camera className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Cámara
            </h3>

            <div className="flex items-center gap-2">
              {cameraState === 'active' && (
                <button
                  onClick={toggleCameraFacing}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <SwitchCamera className="h-3.5 w-3.5" /> Cambiar
                </button>
              )}
              <button
                onClick={() => (cameraState === 'active' ? stopCamera() : startCamera(facingMode))}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                  cameraState === 'active'
                    ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    : 'bg-brand-700 text-white hover:bg-brand-800'
                }`}
              >
                {cameraState === 'active' ? 'Pausar' : 'Iniciar cámara'}
              </button>
            </div>
          </div>

          <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-900">
            <video ref={videoRef} className={`h-full w-full object-cover ${cameraState === 'active' ? 'block' : 'hidden'}`} />
            <canvas ref={canvasRef} className="hidden" />

            {cameraState === 'active' && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-56 w-56 sm:h-64 sm:w-64">
                  {/* Esquinas del visor */}
                  <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-white" />
                  <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-white" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-white" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-white" />
                </div>
                <span className="absolute bottom-3 rounded-full bg-black/60 px-3 py-1 text-[11px] font-medium text-white">
                  Enfoca el código QR
                </span>
              </div>
            )}

            {cameraState === 'starting' && (
              <div className="flex flex-col items-center gap-2 p-6 text-sm text-slate-200">
                <RefreshCw className="h-7 w-7 animate-spin" />
                <p className="font-medium">Activando cámara…</p>
              </div>
            )}

            {cameraState === 'off' && (
              <div className="flex flex-col items-center gap-3 p-6 text-center text-slate-300">
                <QrCode className="h-10 w-10 text-slate-500" />
                <p className="text-sm">Cámara en pausa</p>
                <button
                  onClick={() => startCamera(facingMode)}
                  className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-900 hover:bg-slate-100"
                >
                  Activar cámara
                </button>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="flex max-w-sm flex-col items-center gap-2 p-6 text-center text-rose-100">
                <AlertCircle className="h-10 w-10 text-rose-400" />
                <p className="text-sm font-semibold">{cameraErrorMsg}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2 border-t border-slate-200 pt-4">
            <label htmlFor="manual-search" className="text-xs font-semibold text-slate-700">
              Verificación manual por ID, cédula o nombre
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="manual-search"
                  type="text"
                  value={searchManual}
                  onChange={(e) => setSearchManual(e.target.value)}
                  placeholder="ID, cédula o nombre exacto…"
                  className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-ink px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Buscar
              </button>
            </div>
          </form>
        </section>

        {/* Estado y lista de ingresos */}
        <section className="card flex flex-col gap-5 p-5 lg:col-span-5">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Estado de acreditación</h3>

            {scanResultNotice ? (
              <div
                className={`space-y-3 rounded-xl border p-5 text-center ${
                  scanResultNotice.type === 'success'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-rose-200 bg-rose-50'
                }`}
              >
                {scanResultNotice.type === 'success' ? (
                  <>
                    <CheckCircle2 className="mx-auto h-9 w-9 text-emerald-600" aria-hidden="true" />
                    <p className="text-base font-bold text-slate-900">{scanResultNotice.participantName}</p>
                    <p className="text-xs font-semibold text-emerald-800">{scanResultNotice.message}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="mx-auto h-9 w-9 text-rose-600" aria-hidden="true" />
                    <p className="text-sm font-semibold text-rose-900">{scanResultNotice.message}</p>
                  </>
                )}
                <button
                  onClick={() => setScanResultNotice(null)}
                  className="w-full rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  Limpiar aviso
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-8 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-500">
                  <QrCode className="h-5 w-5" aria-hidden="true" />
                </span>
                <p className="text-sm font-semibold text-slate-800">Listo para escanear</p>
                <p className="max-w-xs text-xs text-slate-500">
                  Al detectar un QR aparecerá una ventana para confirmar el acceso.
                </p>
              </div>
            )}
          </div>

          <div className="flex min-h-0 flex-1 flex-col space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">Ingresos registrados</h4>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700 tabular-nums">
                {checkedInCount}
              </span>
            </div>

            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {checkedInList.length === 0 ? (
                <li className="p-6 text-center text-xs text-slate-500">Aún no se han registrado ingresos.</li>
              ) : (
                checkedInList.map((p) => {
                  const seqId = getSequentialTicketId(p, participants);
                  const isRemoving = removingCheckInId === p.id;
                  return (
                    <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-white">
                            {seqId}
                          </span>
                          <span className="truncate text-sm font-semibold text-slate-900">{p.fullName}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-slate-500">
                          {p.checkedInAt}
                          {p.checkedInBy ? ` · ${p.checkedInBy}` : ''}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isRemoving}
                        onClick={async () => {
                          setRemovingCheckInId(p.id);
                          try {
                            await onUndoCheckIn(p.id);
                            setScanResultNotice({
                              type: 'success',
                              participantName: p.fullName,
                              message: `Ingreso eliminado (ID ${seqId}). Su QR vuelve a estar disponible.`,
                            });
                          } finally {
                            setRemovingCheckInId(null);
                          }
                        }}
                        title="Eliminar ingreso y reactivar su QR"
                        className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 transition-colors hover:bg-rose-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {isRemoving ? 'Eliminando…' : 'Quitar'}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        </section>
      </div>

      {/* Ventana de confirmación de acceso */}
      {pendingScanParticipant && (
        <Dialog title="Confirmar acceso al taller" onClose={() => setPendingScanParticipant(null)}>
          {pendingScanParticipant.reason === 'valid' && (
            <div className="space-y-5">
              <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                  Pago verificado · entrada válida
                </span>
                <p className="text-lg font-bold text-slate-900">{pendingScanParticipant.participant.fullName}</p>
                <dl className="space-y-1 text-xs text-slate-700">
                  <div>
                    <dt className="inline text-slate-500">Correo: </dt>
                    <dd className="inline">{pendingScanParticipant.participant.email}</dd>
                  </div>
                  {pendingScanParticipant.participant.cedula && (
                    <div>
                      <dt className="inline text-slate-500">Cédula: </dt>
                      <dd className="inline">{pendingScanParticipant.participant.cedula}</dd>
                    </div>
                  )}
                  <div>
                    <dt className="inline text-slate-500">Comprobante: </dt>
                    <dd className="inline font-mono font-semibold">
                      {pendingScanParticipant.participant.paymentReference || 'Verificado'}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-slate-500">ID de entrada: </dt>
                    <dd className="inline font-mono font-bold">
                      {getSequentialTicketId(pendingScanParticipant.participant, participants)}
                    </dd>
                  </div>
                </dl>
              </div>

              <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  onClick={() => setPendingScanParticipant(null)}
                  disabled={isConfirmingAccess}
                  className="flex-1 rounded-xl border border-slate-300 bg-white py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmAccess}
                  disabled={isConfirmingAccess}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-700 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  {isConfirmingAccess ? 'Confirmando…' : 'Confirmar acceso'}
                </button>
              </div>
            </div>
          )}

          {pendingScanParticipant.reason === 'already_checked_in' && (
            <div className="space-y-5">
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-amber-600" aria-hidden="true" />
                <span className="inline-block rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-amber-900 ring-1 ring-inset ring-amber-200">
                  Entrada ya utilizada
                </span>
                <p className="text-lg font-bold text-slate-900">{pendingScanParticipant.participant.fullName}</p>
                <p className="text-xs text-slate-700">
                  Ya ingresó a las <strong>{pendingScanParticipant.participant.checkedInAt}</strong>.
                </p>
              </div>
              <div className="flex flex-col-reverse gap-2.5 sm:flex-row">
                <button
                  onClick={async () => {
                    await onUndoCheckIn(pendingScanParticipant.participant.id);
                    setPendingScanParticipant(null);
                  }}
                  className="flex-1 rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-50"
                >
                  Revertir ingreso
                </button>
                <button
                  onClick={() => setPendingScanParticipant(null)}
                  className="flex-1 rounded-xl bg-ink py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Cerrar
                </button>
              </div>
            </div>
          )}

          {pendingScanParticipant.reason === 'unpaid' && (
            <div className="space-y-5 text-center">
              <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
                <XCircle className="mx-auto h-8 w-8 text-rose-600" aria-hidden="true" />
                <p className="text-lg font-bold text-slate-900">{pendingScanParticipant.participant.fullName}</p>
                <p className="text-xs font-semibold text-rose-900">El pago de este participante aún no ha sido verificado.</p>
              </div>
              <button
                onClick={() => setPendingScanParticipant(null)}
                className="w-full rounded-xl bg-ink py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Cerrar
              </button>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
};
