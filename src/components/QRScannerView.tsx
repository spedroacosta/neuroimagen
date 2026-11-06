import React, { useEffect, useRef, useState } from 'react';
import { Participant } from '../types';
import { parseQRPayload } from '../utils/qr';
import { sounds } from '../utils/audio';
import confetti from 'canvas-confetti';
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QrCode, Camera, CheckCircle2, AlertTriangle, XCircle, Search, RefreshCw, Volume2, Users } from 'lucide-react';

interface QRScannerViewProps {
  participants: Participant[];
  onCheckInParticipant: (participantId: string) => { success: boolean; participant?: Participant; reason?: 'valid' | 'already_checked_in' | 'unpaid' | 'not_found' };
  onUndoCheckIn: (participantId: string) => void;
}

export const QRScannerView: React.FC<QRScannerViewProps> = ({
  participants,
  onCheckInParticipant,
  onUndoCheckIn,
}) => {
  const [scanResult, setScanResult] = useState<{
    status: 'idle' | 'valid' | 'already_checked_in' | 'unpaid' | 'not_found';
    participant?: Participant;
    scannedText?: string;
  }>({ status: 'idle' });

  const [searchManual, setSearchManual] = useState('');
  const [cameraActive, setCameraActive] = useState(true);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (!cameraActive) return;

    const config = {
      fps: 10,
      qrbox: { width: 230, height: 230 },
      aspectRatio: 1.0,
      formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
    };

    const scanner = new Html5QrcodeScanner('qr-reader-container', config, false);
    scannerRef.current = scanner;

    scanner.render(
      (decodedText) => {
        handleScanPayload(decodedText);
      },
      () => {}
    );

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch((e) => console.error(e));
      }
    };
  }, [cameraActive]);

  const handleScanPayload = (rawPayload: string) => {
    const { isValid, participantId } = parseQRPayload(rawPayload);

    if (!isValid || !participantId) {
      sounds.playError();
      setScanResult({
        status: 'not_found',
        scannedText: rawPayload,
      });
      return;
    }

    const res = onCheckInParticipant(participantId);

    if (res.reason === 'valid' && res.participant) {
      sounds.playSuccess();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
        });
      } catch {}
      setScanResult({
        status: 'valid',
        participant: res.participant,
        scannedText: rawPayload,
      });
    } else if (res.reason === 'already_checked_in' && res.participant) {
      sounds.playWarning();
      setScanResult({
        status: 'already_checked_in',
        participant: res.participant,
        scannedText: rawPayload,
      });
    } else if (res.reason === 'unpaid' && res.participant) {
      sounds.playError();
      setScanResult({
        status: 'unpaid',
        participant: res.participant,
        scannedText: rawPayload,
      });
    } else {
      sounds.playError();
      setScanResult({
        status: 'not_found',
        scannedText: rawPayload,
      });
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchManual.trim()) {
      handleScanPayload(searchManual.trim());
      setSearchManual('');
    }
  };

  const checkedInCount = participants.filter((p) => p.isCheckedIn).length;
  const verifiedTotal = participants.filter((p) => p.paymentStatus === 'verified').length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Lector QR & Acreditación en Puerta</h2>
            <span className="px-2 py-0.5 text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
              EN VIVO
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Apunta la cámara del celular al código QR impreso o en la pantalla del participante.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-sky-700" />
            <div>
              <span className="text-slate-600">Acreditados:</span>{' '}
              <strong className="text-slate-900 font-mono text-sm">{checkedInCount} / {verifiedTotal}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Camera Scanner View */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-sky-700" />
              Cámara Móvil / Dispositivo
            </h3>

            <button
              onClick={() => setCameraActive(!cameraActive)}
              className="text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-lg border border-slate-200"
            >
              {cameraActive ? 'Pausar Cámara' : 'Activar Cámara'}
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border-2 border-dashed border-slate-300 bg-slate-50 p-2 min-h-[300px] flex items-center justify-center">
            {cameraActive ? (
              <div id="qr-reader-container" className="w-full max-w-sm rounded-lg overflow-hidden" />
            ) : (
              <div className="text-center p-8 space-y-2 text-slate-500">
                <QrCode className="h-10 w-10 mx-auto text-slate-400" />
                <p className="text-xs">La cámara se encuentra pausada.</p>
              </div>
            )}
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-2 pt-2">
            <label className="text-xs font-semibold text-slate-600 block">Búsqueda manual por ID o código:</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchManual}
                  onChange={(e) => setSearchManual(e.target.value)}
                  placeholder="ID de entrada (ej: NEURO-1001)..."
                  className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 min-h-[40px]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-all min-h-[40px]"
              >
                Validar
              </button>
            </div>
          </form>
        </div>

        {/* Scan Result Overlay */}
        <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
          <div>
            <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Resultado de la Entrada</span>
              <Volume2 className="h-4 w-4 text-slate-400" />
            </h3>

            {scanResult.status === 'idle' && (
              <div className="text-center py-14 text-slate-400 space-y-3">
                <QrCode className="h-14 w-14 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">Esperando lectura de código QR...</p>
                <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                  Apunta la cámara al pase de la persona para verificar su acceso al taller.
                </p>
              </div>
            )}

            {/* VALID */}
            {scanResult.status === 'valid' && scanResult.participant && (
              <div className="rounded-xl bg-emerald-50 border-2 border-emerald-500 p-5 text-center space-y-3 shadow-md">
                <div className="h-14 w-14 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-900 font-extrabold text-xs rounded-full border border-emerald-300">
                    ¡ACCESO CONCEDIDO!
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-2">{scanResult.participant.fullName}</h4>
                  <p className="text-xs text-slate-600">{scanResult.participant.email}</p>
                </div>

                <div className="bg-white p-3 rounded-lg border border-emerald-200 text-xs space-y-1 font-mono text-left text-slate-800">
                  <div className="flex justify-between">
                    <span>ID Entrada:</span>
                    <strong className="text-emerald-700">{scanResult.participant.id}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Hora Acreditación:</span>
                    <span>{scanResult.participant.checkedInAt || 'Ahora'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DUPLICATE */}
            {scanResult.status === 'already_checked_in' && scanResult.participant && (
              <div className="rounded-xl bg-amber-50 border-2 border-amber-500 p-5 text-center space-y-3 shadow-md">
                <div className="h-14 w-14 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto">
                  <AlertTriangle className="h-8 w-8" />
                </div>
                <div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-900 font-extrabold text-xs rounded-full border border-amber-300">
                    ⚠️ ENTRADA YA INGRESADA
                  </span>
                  <h4 className="text-lg font-bold text-slate-900 mt-2">{scanResult.participant.fullName}</h4>
                  <p className="text-xs text-amber-800">Este código QR ya fue escaneado anteriormente.</p>
                </div>

                <button
                  onClick={() => onUndoCheckIn(scanResult.participant!.id)}
                  className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 text-xs font-bold rounded-lg"
                >
                  Revertir Ingreso
                </button>
              </div>
            )}

            {/* UNPAID / NOT FOUND */}
            {(scanResult.status === 'unpaid' || scanResult.status === 'not_found') && (
              <div className="rounded-xl bg-rose-50 border-2 border-rose-500 p-5 text-center space-y-3 shadow-md">
                <div className="h-14 w-14 bg-rose-600 text-white rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="h-8 w-8" />
                </div>
                <div>
                  <span className="px-3 py-1 bg-rose-100 text-rose-900 font-extrabold text-xs rounded-full border border-rose-300">
                    🚫 ACCESO NO PERMITIDO
                  </span>
                  <h4 className="text-base font-bold text-slate-900 mt-2">
                    {scanResult.status === 'unpaid' ? 'Pago no verificado' : 'Código QR no reconocido'}
                  </h4>
                </div>
              </div>
            )}
          </div>

          {scanResult.status !== 'idle' && (
            <button
              onClick={() => setScanResult({ status: 'idle' })}
              className="mt-4 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 min-h-[40px]"
            >
              <RefreshCw className="h-4 w-4" /> Escanear Siguiente
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
