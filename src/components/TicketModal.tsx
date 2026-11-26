import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  X,
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

  const payloadValue = buildParticipantQRPayload(sequentialId, participant.email);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/30 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <motion.div
        initial={{ y: 60, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 360, damping: 34 }}
        className="glass flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] sm:rounded-[28px]"
      >
        {/* Cabecera */}
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
              <QrCode className="h-5 w-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900 sm:text-base">
                Pase generado · ID {sequentialId}
              </h3>
              <p className="truncate text-xs text-slate-600">
                {participant.fullName} · {participant.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Cuerpo */}
        <div className="flex-1 space-y-5 overflow-y-auto bg-slate-50 p-5 sm:p-6">
          {/* Vista previa de la diapositiva */}
          <section className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-semibold text-slate-700">Diapositiva en Google Slides</p>
              <a
                href={slideDirectUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
              >
                Ver en Google Slides <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex min-h-[260px] items-center justify-center rounded-xl border border-slate-200 bg-white p-3">
              {isGeneratingSlide ? (
                <div className="flex flex-col items-center gap-3 py-16 text-center text-xs text-slate-600">
                  <RefreshCw className="h-7 w-7 animate-spin text-brand-700" />
                  <p className="font-semibold text-slate-800">
                    Creando diapositiva (ID {sequentialId}), rellenando datos y colocando el QR…
                  </p>
                </div>
              ) : slideImageBase64 ? (
                <img
                  src={slideImageBase64}
                  alt={`Entrada ${sequentialId} - ${participant.fullName}`}
                  className="max-h-[420px] w-full rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <p className="py-12 text-center text-xs text-slate-500">
                  Pulsa «Reenviar correo con entrada» para generar la diapositiva de este participante.
                </p>
              )}
            </div>
          </section>

          {emailStatus === 'sent' && statusMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {emailStatus === 'error' && statusMessage && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Datos y QR */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Mail className="h-4 w-4 text-brand-700" /> Datos y envío
                </h4>
                <button
                  onClick={() => setShowSmtpSettings(!showSmtpSettings)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-700 hover:text-brand-800"
                >
                  <Settings className="h-3.5 w-3.5" /> SMTP
                </button>
              </div>
              <dl className="space-y-2 text-xs">
                {[
                  { k: 'Participante', v: participant.fullName, bold: true },
                  { k: 'Correo', v: participant.email },
                  { k: 'ID de entrada', v: sequentialId, mono: true, bold: true },
                  { k: 'Comprobante', v: participant.paymentReference || 'Verificado', mono: true },
                ].map((row) => (
                  <div key={row.k} className="flex justify-between gap-4 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    <dt className="text-slate-500">{row.k}</dt>
                    <dd className={`text-right text-slate-900 ${row.mono ? 'font-mono' : ''} ${row.bold ? 'font-semibold' : ''}`}>
                      {row.v}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <QrCode className="h-4 w-4 text-brand-700" /> Código QR (ID {sequentialId})
              </h4>
              <p className="text-xs text-slate-500">Contenido codificado en el QR del pase.</p>
              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  readOnly
                  value={payloadValue}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 font-mono text-[11px] text-slate-800 focus:outline-none"
                />
                <button
                  onClick={handleCopyPayload}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-800 hover:bg-slate-50"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {copiedToken ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </section>
          </div>

          {showSmtpSettings && (
            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Servidor SMTP externo (opcional)</h4>
                <p className="text-xs text-slate-500">Si está vacío, se usa la cuenta de Gmail conectada.</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: 'Servidor (host)', type: 'text', value: smtpConfig.host, placeholder: 'smtp.gmail.com', onChange: (v: string) => setSmtpConfig({ ...smtpConfig, host: v }) },
                  { label: 'Puerto', type: 'number', value: String(smtpConfig.port), placeholder: '587', onChange: (v: string) => setSmtpConfig({ ...smtpConfig, port: Number(v) }) },
                  { label: 'Usuario SMTP', type: 'text', value: smtpConfig.user, placeholder: '', onChange: (v: string) => setSmtpConfig({ ...smtpConfig, user: v }) },
                  { label: 'Contraseña de aplicación', type: 'password', value: smtpConfig.pass, placeholder: '', onChange: (v: string) => setSmtpConfig({ ...smtpConfig, pass: v }) },
                ].map((field) => (
                  <label key={field.label} className="space-y-1.5">
                    <span className="text-xs font-semibold text-slate-700">{field.label}</span>
                    <input
                      type={field.type}
                      value={field.value}
                      placeholder={field.placeholder}
                      onChange={(e) => field.onChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    />
                  </label>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Pie de acciones */}
        <footer className="flex flex-col-reverse items-stretch justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
          <a
            href={slideDirectUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 sm:justify-start"
          >
            Abrir documento en Google Slides <ExternalLink className="h-3.5 w-3.5" />
          </a>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {slideImageBase64 && (
              <button
                onClick={handleDownloadImage}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Descargar PNG
              </button>
            )}

            <button
              onClick={handleSendOrResendEmail}
              disabled={emailStatus === 'sending' || isGeneratingSlide}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
            >
              {emailStatus === 'sending' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Actualizando y enviando…
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Reenviar correo con entrada
                </>
              )}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  );
};
