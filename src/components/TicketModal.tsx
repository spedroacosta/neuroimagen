import React, { useEffect, useRef, useState } from 'react';
import { Participant, EventConfig } from '../types';
import { generateQRCodeDataUrl, buildParticipantQRPayload } from '../utils/qr';
import { renderTicketToCanvas, downloadCanvasImage } from '../utils/ticketCanvas';
import { Download, Mail, CheckCircle2, QrCode, ExternalLink, RefreshCw, Send, Copy } from 'lucide-react';

interface TicketModalProps {
  participant: Participant | null;
  config: EventConfig;
  onClose: () => void;
  onSendEmailConfirmed: (participantId: string) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  participant,
  config,
  onClose,
  onSendEmailConfirmed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isRendering, setIsRendering] = useState<boolean>(true);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [copiedToken, setCopiedToken] = useState<boolean>(false);

  useEffect(() => {
    if (!participant) return;

    let isMounted = true;
    setIsRendering(true);

    const generate = async () => {
      try {
        const payload = buildParticipantQRPayload(participant.id, participant.email);
        const dataUrl = await generateQRCodeDataUrl(payload);
        if (!isMounted) return;
        setQrUrl(dataUrl);

        if (canvasRef.current) {
          await renderTicketToCanvas(canvasRef.current, participant, config, dataUrl);
        }
      } catch (err) {
        console.error('Failed to render ticket modal canvas', err);
      } finally {
        if (isMounted) setIsRendering(false);
      }
    };

    generate();

    return () => {
      isMounted = false;
    };
  }, [participant, config]);

  if (!participant) return null;

  const handleDownloadImage = () => {
    if (canvasRef.current) {
      downloadCanvasImage(canvasRef.current, `Gafete_${participant.fullName.replace(/\s+/g, '_')}_${participant.id}.png`);
    }
  };

  const handleSendEmail = () => {
    setEmailStatus('sending');
    setTimeout(() => {
      setEmailStatus('sent');
      onSendEmailConfirmed(participant.id);
    }, 1000);
  };

  const handleCopyPayload = () => {
    const payload = buildParticipantQRPayload(participant.id, participant.email);
    navigator.clipboard.writeText(payload);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-auto shadow-2xl overflow-hidden relative flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-50 text-sky-800 flex items-center justify-center border border-sky-200">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Gafete de Entrada con Código QR
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                {participant.id} • {participant.fullName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          
          {/* Canvas Preview Container */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
              <span>Vista Previa del Pase (16:9 HD)</span>
              {isRendering && (
                <span className="flex items-center gap-1.5 text-sky-700">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Renderizando...
                </span>
              )}
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white shadow-sm flex items-center justify-center p-2">
              <canvas
                ref={canvasRef}
                className="w-full h-auto rounded-lg shadow-sm max-h-[400px] object-contain border border-slate-200"
              />
            </div>
          </div>

          {/* Details & Token Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <Mail className="h-4 w-4 text-sky-700" />
                Detalles del Asistente
              </h4>

              <div className="space-y-1">
                <div><span className="text-slate-500">Nombre:</span> <strong className="text-slate-900">{participant.fullName}</strong></div>
                <div><span className="text-slate-500">Correo:</span> <strong className="text-slate-900">{participant.email}</strong></div>
                <div><span className="text-slate-500">Evento:</span> Taller de Neuroimagen</div>
              </div>

              {emailStatus === 'sent' && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>¡Correo enviado con éxito!</span>
                </div>
              )}
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-sky-700" />
                Token del Código QR
              </h4>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={buildParticipantQRPayload(participant.id, participant.email)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleCopyPayload}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold min-h-[36px]"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 bg-white">
          <a
            href={config.googleSlidesUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-sky-700 hover:underline font-medium flex items-center gap-1"
          >
            Ver Plantilla Google Slides <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownloadImage}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg border border-slate-200 transition-all min-h-[40px]"
            >
              <Download className="h-4 w-4" />
              Descargar PNG
            </button>

            <button
              onClick={handleSendEmail}
              disabled={emailStatus === 'sending'}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-all min-h-[40px]"
            >
              {emailStatus === 'sending' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Enviando...
                </>
              ) : emailStatus === 'sent' ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" /> ¡Enviado!
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Enviar Correo
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
