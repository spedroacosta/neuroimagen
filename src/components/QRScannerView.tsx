import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { Participant } from '../types';
import { parseQRPayload, getSequentialTicketId, extractSequentialId } from '../utils/qr';
import { sounds } from '../utils/audio';
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

  return (
    <div className="space-y-6 bg-white">
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Lector QR de Entrada (5 de diciembre)
          </h2>
          <p className="text-xs text-slate-600">
            Escanea el QR del participante. Se abrirá una ventana emergente con sus datos y un botón para confirmar su acceso al evento.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-700" />
            <div>
              <span className="text-slate-600">Acreditados en tiempo real:</span>{' '}
              <strong className="text-slate-900 font-mono text-sm">
                {checkedInCount} / {verifiedTotal}
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Camera View (Pure White Container) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-sky-700" />
              Cámara del Dispositivo
            </h3>

            <div className="flex items-center gap-2">
              {cameraState === 'active' && (
                <button
                  onClick={toggleCameraFacing}
                  className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-300 flex items-center gap-1"
                >
                  <SwitchCamera className="h-3.5 w-3.5" /> Cambiar Cámara
                </button>
              )}

              <button
                onClick={() => (cameraState === 'active' ? stopCamera() : startCamera(facingMode))}
                className="text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-300"
              >
                {cameraState === 'active' ? 'Pausar Cámara' : 'Iniciar Cámara'}
              </button>
            </div>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${cameraState === 'active' ? 'block' : 'hidden'}`}
            />
            <canvas ref={canvasRef} className="hidden" />

            {cameraState === 'active' && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-52 h-52 border-2 border-sky-600 rounded-xl relative">
                  <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-900 font-bold bg-white/90 px-2 py-0.5 rounded border border-slate-200">
                    Enfoca el código QR
                  </div>
                </div>
              </div>
            )}

            {cameraState === 'starting' && (
              <div className="text-center p-6 text-slate-600 space-y-2 bg-white">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-sky-700" />
                <p className="text-xs font-semibold">Activando cámara...</p>
              </div>
            )}

            {cameraState === 'off' && (
              <div className="text-center p-6 text-slate-500 space-y-2 bg-white">
                <QrCode className="h-10 w-10 mx-auto text-slate-400" />
                <p className="text-xs">Cámara en pausa.</p>
                <button
                  onClick={() => startCamera(facingMode)}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg"
                >
                  Activar Cámara
                </button>
              </div>
            )}

            {cameraState === 'error' && (
              <div className="text-center p-6 text-rose-800 space-y-2 max-w-sm bg-white">
                <AlertCircle className="h-10 w-10 mx-auto text-rose-600" />
                <p className="text-xs font-semibold">{cameraErrorMsg}</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2 pt-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Verificación manual por ID, Cédula o Nombre:
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchManual}
                  onChange={(e) => setSearchManual(e.target.value)}
                  placeholder="Escribe ID, cédula o nombre exacto..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 min-h-[40px]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all min-h-[40px]"
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* Right Status & Checked-in List */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Estado de Acreditación</h3>

            {scanResultNotice ? (
              <div className="space-y-3">
                {scanResultNotice.type === 'success' && (
                  <div className="bg-white border border-emerald-300 rounded-xl p-4 text-center space-y-1.5">
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-900">
                      {scanResultNotice.participantName}
                    </h4>
                    <p className="text-xs font-semibold text-emerald-800">
                      {scanResultNotice.message}
                    </p>
                  </div>
                )}

                {scanResultNotice.type === 'not_found' && (
                  <div className="bg-white border border-rose-300 rounded-xl p-4 text-center space-y-1.5">
                    <XCircle className="h-8 w-8 text-rose-600 mx-auto" />
                    <p className="text-xs font-bold text-rose-900">{scanResultNotice.message}</p>
                  </div>
                )}

                <button
                  onClick={() => setScanResultNotice(null)}
                  className="w-full py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-300"
                >
                  Limpiar aviso
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 space-y-2 border border-slate-200 rounded-xl">
                <QrCode className="h-10 w-10 mx-auto text-slate-400" />
                <p className="text-xs font-semibold text-slate-700">Listo para escanear</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Cuando la cámara detecte un QR, aparecerá una ventana emergente para confirmar el acceso del participante.
                </p>
              </div>
            )}

            {/* Recent Checked-In Participants */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-700">
                Participantes ingresados ({checkedInCount}):
              </h4>
              <div className="divide-y divide-slate-200 border border-slate-200 rounded-xl max-h-64 overflow-y-auto text-xs">
                {participants.filter((p) => p.isCheckedIn).length === 0 ? (
                  <div className="p-4 text-center text-slate-400">
                    Aún no se han registrado ingresos.
                  </div>
                ) : (
                  participants
                    .filter((p) => p.isCheckedIn)
                    .map((p) => {
                      const seqId = getSequentialTicketId(p, participants);
                      const isRemoving = removingCheckInId === p.id;
                      return (
                        <div
                          key={p.id}
                          className="p-3 flex items-center justify-between gap-2 bg-white hover:bg-slate-50/60 transition-colors"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono text-[11px] px-1.5 py-0.5 bg-white border border-slate-300 rounded text-slate-800">
                                ID: {seqId}
                              </span>
                              <span className="truncate">{p.fullName}</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Hora: {p.checkedInAt} {p.checkedInBy ? `• Por: ${p.checkedInBy}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className="px-2 py-0.5 text-[10px] font-bold border border-emerald-300 text-emerald-800 rounded bg-white">
                              Ingresó
                            </span>
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
                                    message: `Ingreso eliminado (ID: ${seqId}). Su código QR vuelve a estar disponible para escanear.`,
                                  });
                                } finally {
                                  setRemovingCheckInId(null);
                                }
                              }}
                              className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 transition-colors disabled:opacity-50"
                              title="Eliminar participante ingresado y reactivar su QR"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isRemoving ? 'Eliminando...' : 'Eliminar'}
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* POP-UP MODAL WINDOW FOR STAFF CONFIRMATION (Ventana emergente con botón para confirmar acceso) */}
      {pendingScanParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-sky-700" />
                <h3 className="text-base font-bold text-slate-900">
                  Confirmar Acceso al Taller
                </h3>
              </div>
              <button
                onClick={() => setPendingScanParticipant(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {pendingScanParticipant.reason === 'valid' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2">
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-white text-emerald-800 border border-emerald-300 rounded">
                    PAGO VERIFICADO — ENTRADA VÁLIDA
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">
                    {pendingScanParticipant.participant.fullName}
                  </h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>Correo: {pendingScanParticipant.participant.email}</div>
                    {pendingScanParticipant.participant.cedula && (
                      <div>Cédula/Doc: {pendingScanParticipant.participant.cedula}</div>
                    )}
                    <div>
                      Comprobante Nº:{' '}
                      <span className="font-mono font-semibold text-slate-900">
                        {pendingScanParticipant.participant.paymentReference || 'Verificado'}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      ID: {getSequentialTicketId(pendingScanParticipant.participant, participants)}
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => setPendingScanParticipant(null)}
                    disabled={isConfirmingAccess}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs rounded-xl border border-slate-300 min-h-[42px]"
                  >
                    Cancelar
                  </button>

                  <button
                    onClick={handleConfirmAccess}
                    disabled={isConfirmingAccess}
                    className="flex-1 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 min-h-[42px] disabled:opacity-50"
                  >
                    <Check className="h-4 w-4" />
                    {isConfirmingAccess ? 'Confirmando...' : 'Confirmar Acceso'}
                  </button>
                </div>
              </div>
            )}

            {pendingScanParticipant.reason === 'already_checked_in' && (
              <div className="space-y-4">
                <div className="bg-white border border-amber-300 rounded-xl p-4 text-center space-y-2">
                  <AlertTriangle className="h-8 w-8 text-amber-600 mx-auto" />
                  <span className="inline-block px-2.5 py-0.5 text-[10px] font-bold bg-white text-amber-900 border border-amber-300 rounded">
                    ENTRADA YA UTILIZADA
                  </span>
                  <h4 className="text-lg font-bold text-slate-900">
                    {pendingScanParticipant.participant.fullName}
                  </h4>
                  <p className="text-xs text-slate-700">
                    Este participante ya ingresó a las{' '}
                    <strong>{pendingScanParticipant.participant.checkedInAt}</strong>.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={async () => {
                      await onUndoCheckIn(pendingScanParticipant.participant.id);
                      setPendingScanParticipant(null);
                    }}
                    className="flex-1 py-2.5 bg-white hover:bg-amber-50 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 min-h-[42px]"
                  >
                    Revertir Ingreso
                  </button>
                  <button
                    onClick={() => setPendingScanParticipant(null)}
                    className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl min-h-[42px]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            )}

            {pendingScanParticipant.reason === 'unpaid' && (
              <div className="space-y-4 text-center">
                <div className="bg-white border border-rose-300 rounded-xl p-4 space-y-2">
                  <XCircle className="h-8 w-8 text-rose-600 mx-auto" />
                  <h4 className="text-lg font-bold text-slate-900">
                    {pendingScanParticipant.participant.fullName}
                  </h4>
                  <p className="text-xs text-rose-900 font-semibold">
                    El pago de este participante aún no ha sido verificado.
                  </p>
                </div>

                <button
                  onClick={() => setPendingScanParticipant(null)}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl min-h-[42px]"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
