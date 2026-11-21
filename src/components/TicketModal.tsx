import React, { useEffect, useState } from 'react';
import { Participant, EventConfig } from '../types';
import {
  generateQRCodeDataUrl,
  buildParticipantQRPayload,
  getSequentialTicketId,
} from '../utils/qr';
import { generateSlideTicketAndSendEmail, SmtpConfig } from '../utils/emailService';
import {
  Download,
  Mail,
  CheckCircle2,
  QrCode,
  ExternalLink,
  RefreshCw,
  Send,
  Copy,
  Settings,
  AlertCircle,
} from 'lucide-react';

interface TicketModalProps {
  participant: Participant | null;
  allParticipants: Participant[];
  config: EventConfig;
  initialSlideImageBase64?: string | null;
  onClose: () => void;
  onTicketGeneratedAndSent: (
    participantId: string,
    generatedSlideId: string,
    emailSent: boolean
  ) => void;
}

export const TicketModal: React.FC<TicketModalProps> = ({
  participant,
  allParticipants,
  config,
  initialSlideImageBase64,
  onClose,
  onTicketGeneratedAndSent,
}) => {
  const [slideImageBase64, setSlideImageBase64] = useState<string>(initialSlideImageBase64 || '');
  const [generatedSlideId, setGeneratedSlideId] = useState<string>(
    participant?.generatedSlideId || ''
  );
  const [isGeneratingSlide, setIsGeneratingSlide] = useState<boolean>(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>(
    initialSlideImageBase64 ? 'sent' : 'idle'
  );
  const [statusMessage, setStatusMessage] = useState<string>(
    initialSlideImageBase64
      ? '¡Diapositiva creada en tu Google Slides y correo enviado exitosamente al participante!'
      : ''
  );
  const [copiedToken, setCopiedToken] = useState<boolean>(false);
  const [showSmtpSettings, setShowSmtpSettings] = useState<boolean>(false);

  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>(() => {
    const saved = localStorage.getItem('neuroimagen_smtp');
    return saved
      ? JSON.parse(saved)
      : {
          host: '',
          port: 587,
          user: '',
          pass: '',
          senderName: 'Promoción 106 de Médicos Cirujanos',
        };
  });

  useEffect(() => {
    localStorage.setItem('neuroimagen_smtp', JSON.stringify(smtpConfig));
  }, [smtpConfig]);

  const sequentialId = participant
    ? getSequentialTicketId(participant, allParticipants)
    : '001';

  useEffect(() => {
    if (!participant || initialSlideImageBase64) return;

    let isMounted = true;
    setIsGeneratingSlide(true);
    setStatusMessage('');

    const loadRealSlidePreview = async () => {
      try {
        const seqId = getSequentialTicketId(participant, allParticipants);
        const payload = buildParticipantQRPayload(seqId, participant.email);
        const qrDataUrl = await generateQRCodeDataUrl(payload);
        const res = await generateSlideTicketAndSendEmail(
          participant,
          config,
          qrDataUrl,
          seqId,
          false,
          smtpConfig.user && smtpConfig.pass
            ? { ...smtpConfig, host: smtpConfig.host || 'smtp.gmail.com' }
            : null
        );
        if (!isMounted) return;
        if (res.slideImageBase64) {
          setSlideImageBase64(res.slideImageBase64);
        }
        if (res.generatedSlideId) {
          setGeneratedSlideId(res.generatedSlideId);
          onTicketGeneratedAndSent(participant.id, res.generatedSlideId, false);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setEmailStatus('error');
        setStatusMessage(
          err.message || 'No se pudo generar la vista previa desde Google Slides.'
        );
      } finally {
        if (isMounted) setIsGeneratingSlide(false);
      }
    };

    loadRealSlidePreview();

    return () => {
      isMounted = false;
    };
  }, [participant?.id]);

  if (!participant) return null;

  const slideDirectUrl = generatedSlideId.startsWith('pase_')
    ? `https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit#slide=id.${generatedSlideId}`
    : config.googleSlidesUrl;

  const handleDownloadImage = () => {
    if (!slideImageBase64) return;
    const link = document.createElement('a');
    link.download = `Entrada_${sequentialId}_${participant.fullName.replace(/\s+/g, '_')}.png`;
    link.href = slideImageBase64;
    link.click();
  };

  const handleSendOrResendEmail = async () => {
    setEmailStatus('sending');
    setStatusMessage('');

    try {
      const payload = buildParticipantQRPayload(sequentialId, participant.email);
      const qrDataUrl = await generateQRCodeDataUrl(payload);

      const res = await generateSlideTicketAndSendEmail(
        participant,
        config,
        qrDataUrl,
        sequentialId,
        true,
        smtpConfig.user && smtpConfig.pass
          ? { ...smtpConfig, host: smtpConfig.host || 'smtp.gmail.com' }
          : null
      );

      if (res.slideImageBase64) {
        setSlideImageBase64(res.slideImageBase64);
      }
      if (res.generatedSlideId) {
        setGeneratedSlideId(res.generatedSlideId);
      }

      if (res.emailSent) {
        setEmailStatus('sent');
        setStatusMessage(
          `¡Diapositiva actualizada en Google Slides (ID: ${sequentialId}) y correo enviado con éxito a ${participant.email}!`
        );
        onTicketGeneratedAndSent(
          participant.id,
          res.generatedSlideId || generatedSlideId || `pase_${sequentialId}`,
          true
        );
      } else {
        setEmailStatus('error');
        setStatusMessage(res.error || 'No se pudo completar el envío del correo.');
      }
    } catch (err: any) {
      console.error('Send email error:', err);
      setEmailStatus('error');
      setStatusMessage(err.message || 'Error al generar o enviar el correo.');
    }
  };

  const handleCopyPayload = () => {
    const payload = buildParticipantQRPayload(sequentialId, participant.email);
    navigator.clipboard.writeText(payload);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full my-auto shadow-xl overflow-hidden relative flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-white text-sky-800 flex items-center justify-center border border-slate-200">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Pase Generado en Google Slides — ID: {sequentialId}
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                ID: {sequentialId} • {participant.fullName} ({participant.email})
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
          {/* Real Google Slides Exported Image Display */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
              <span>
                Diapositiva del participante (ID: <strong>{sequentialId}</strong>) en Google Slides
              </span>
              <a
                href={slideDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 hover:underline flex items-center gap-1"
              >
                Ver esta diapositiva en tu documento de Google Slides{' '}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white min-h-[260px] flex items-center justify-center p-3">
              {isGeneratingSlide ? (
                <div className="py-16 flex flex-col items-center justify-center gap-3 text-xs text-slate-600">
                  <RefreshCw className="h-7 w-7 animate-spin text-sky-700" />
                  <p className="font-semibold text-slate-800">
                    Creando diapositiva en Google Slides (ID: {sequentialId}), rellenando datos y
                    colocando el código QR...
                  </p>
                </div>
              ) : slideImageBase64 ? (
                <img
                  src={slideImageBase64}
                  alt={`Entrada ${sequentialId} - ${participant.fullName}`}
                  className="w-full h-auto rounded-lg max-h-[420px] object-contain border border-slate-200"
                />
              ) : (
                <div className="py-12 text-center text-xs text-slate-500">
                  Haz clic en &quot;Reenviar Correo con Entrada&quot; para generar la diapositiva de
                  este participante.
                </div>
              )}
            </div>
          </div>

          {/* Status Feedback Banner */}
          {emailStatus === 'sent' && statusMessage && (
            <div className="p-3.5 bg-white border border-emerald-300 rounded-xl text-emerald-800 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {emailStatus === 'error' && statusMessage && (
            <div className="p-3.5 bg-white border border-rose-300 rounded-xl text-rose-800 text-xs flex items-center gap-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Details & QR Payload Box */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-slate-900 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-sky-700" />
                  Datos del Pase y Envío por Gmail
                </h4>
                <button
                  onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                  className="text-[11px] font-semibold text-sky-700 hover:underline flex items-center gap-1"
                >
                  <Settings className="h-3.5 w-3.5" /> SMTP Opcional
                </button>
              </div>
              <div className="space-y-1">
                <div>
                  <span className="text-slate-500">Participante:</span>{' '}
                  <strong className="text-slate-900">{participant.fullName}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Correo:</span>{' '}
                  <strong className="text-slate-900">{participant.email}</strong>
                </div>
                <div>
                  <span className="text-slate-500">ID Secuencial:</span>{' '}
                  <strong className="font-mono text-slate-900">{sequentialId}</strong>
                </div>
                <div>
                  <span className="text-slate-500">Comprobante Nº:</span>{' '}
                  <span className="font-mono">{participant.paymentReference || 'Verificado'}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-2 text-xs text-slate-700">
              <h4 className="font-bold text-slate-900 flex items-center gap-2">
                <QrCode className="h-4 w-4 text-sky-700" />
                Código QR Único (ID: {sequentialId})
              </h4>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={buildParticipantQRPayload(sequentialId, participant.email)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[11px] text-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleCopyPayload}
                  className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg font-bold min-h-[36px] flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedToken ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          </div>

          {/* Optional SMTP Settings */}
          {showSmtpSettings && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs space-y-3">
              <h4 className="font-bold text-slate-900">
                Configuración de Servidor SMTP Externo (Opcional — Por defecto se usa tu cuenta de
                Gmail conectada)
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 font-semibold mb-1 block">
                    Servidor SMTP (Host):
                  </label>
                  <input
                    type="text"
                    value={smtpConfig.host}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                    placeholder="smtp.gmail.com (por defecto)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold mb-1 block">Puerto:</label>
                  <input
                    type="number"
                    value={smtpConfig.port}
                    onChange={(e) =>
                      setSmtpConfig({ ...smtpConfig, port: Number(e.target.value) })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold mb-1 block">Usuario SMTP:</label>
                  <input
                    type="text"
                    value={smtpConfig.user}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, user: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-semibold mb-1 block">
                    Contraseña de Aplicación:
                  </label>
                  <input
                    type="password"
                    value={smtpConfig.pass}
                    onChange={(e) => setSmtpConfig({ ...smtpConfig, pass: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-slate-900"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-4 border-t border-slate-200 bg-white">
          <a
            href={slideDirectUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-sky-700 hover:underline font-semibold flex items-center gap-1"
          >
            Abrir Documento de Google Slides <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            {slideImageBase64 && (
              <button
                onClick={handleDownloadImage}
                className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs rounded-lg border border-slate-300 transition-all min-h-[40px]"
              >
                <Download className="h-4 w-4" />
                Descargar PNG
              </button>
            )}

            <button
              onClick={handleSendOrResendEmail}
              disabled={emailStatus === 'sending' || isGeneratingSlide}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-all min-h-[40px] disabled:opacity-50"
            >
              {emailStatus === 'sending' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Actualizando Slide y Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Reenviar Correo con Entrada
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
