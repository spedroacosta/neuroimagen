import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { EventConfig, Participant } from '../types';
import { getAccessToken } from '../utils/googleAuth';
import {
  generateQRCodeDataUrl,
  buildParticipantQRPayload,
  getSequentialTicketId,
} from '../utils/qr';
import { renderCustomizedSlideToPngBase64 } from '../utils/emailService';
import {
  Presentation,
  ExternalLink,
  Code2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
} from 'lucide-react';

interface TicketTemplateDesignerProps {
  config: EventConfig;
  participants?: Participant[];
  onUpdateConfig: (updated: Partial<EventConfig>) => void;
}

export const TicketTemplateDesigner: React.FC<TicketTemplateDesignerProps> = ({
  config,
  participants = [],
  onUpdateConfig,
}) => {
  const [slidesUrl, setSlidesUrl] = useState(config.googleSlidesUrl);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [inspectData, setInspectData] = useState<{
    title: string;
    templateId: string;
    totalSlidesCount?: number;
    detectedTexts: string[];
    thumbnailBase64: string;
  } | null>(null);

  const [previewMode, setPreviewMode] = useState<'master' | 'adapted'>('adapted');
  const [selectedParticipantId, setSelectedParticipantId] = useState<string>(
    participants[0]?.id || ''
  );
  const [adaptedSlideBase64, setAdaptedSlideBase64] = useState<string>('');
  const [renderingAdapted, setRenderingAdapted] = useState<boolean>(false);

  const variables = [
    {
      tag: '<<Nombre>>',
      desc: 'Se rellena con el nombre y apellido del participante (debajo de "Participante")',
    },
    {
      tag: '<<Correo>>',
      desc: 'Se rellena con el correo electrónico del participante (debajo de "Correo")',
    },
    {
      tag: '<<ID>>',
      desc: 'Se rellena con el orden secuencial de verificación: 001, 002, 003... (debajo de "ID")',
    },
    {
      tag: '<<QR>>',
      desc: 'Se limpia el texto <<QR>> y se inserta el código QR centrado dentro del recuadro gris redondeado',
    },
  ];

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedVar(tag);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const getSampleOrSelectedParticipant = () => {
    const found = participants.find((p) => p.id === selectedParticipantId) || participants[0];
    if (found) {
      const seqId = getSequentialTicketId(found, participants);
      return {
        id: found.id,
        fullName: found.fullName,
        email: found.email,
        sequentialId: seqId,
      };
    }
    return {
      id: '001',
      fullName: 'Pedro Acosta',
      email: 'pedroacosta182002@gmail.com',
      sequentialId: '001',
    };
  };

  const handleRenderAdaptedPreview = async (targetUrl?: string) => {
    setRenderingAdapted(true);
    try {
      const sample = getSampleOrSelectedParticipant();
      const payload = buildParticipantQRPayload(sample.sequentialId, sample.email);
      const qrDataUrl = await generateQRCodeDataUrl(payload);
      const pngBase64 = await renderCustomizedSlideToPngBase64(
        sample,
        targetUrl || slidesUrl,
        qrDataUrl,
        sample.sequentialId
      );
      setAdaptedSlideBase64(pngBase64);
    } catch (err: any) {
      console.error('Error rendering adapted slide preview:', err);
    } finally {
      setRenderingAdapted(false);
    }
  };

  const handleInspectTemplate = async () => {
    setInspectLoading(true);
    setInspectError(null);
    try {
      const token = await getAccessToken();
      const res = await fetch(
        `/api/inspect-slides-template?slidesUrl=${encodeURIComponent(slidesUrl)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo inspeccionar la plantilla de Google Slides.');
      }
      setInspectData(data);
      onUpdateConfig({ googleSlidesUrl: slidesUrl });
      await handleRenderAdaptedPreview(slidesUrl);
    } catch (err: any) {
      setInspectError(err.message || 'Error al conectar con Google Slides.');
    } finally {
      setInspectLoading(false);
    }
  };

  useEffect(() => {
    handleInspectTemplate();
  }, []);

  useEffect(() => {
    if (participants.length > 0 && !selectedParticipantId) {
      setSelectedParticipantId(participants[0].id);
    }
  }, [participants]);

  useEffect(() => {
    if (inspectData) {
      handleRenderAdaptedPreview(slidesUrl);
    }
  }, [selectedParticipantId]);

  const currentSample = getSampleOrSelectedParticipant();

  return (
    <div className="space-y-5">
      {/* Cabecera */}
      <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex min-w-0 gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
            <Presentation className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="space-y-1">
            <h2 className="text-lg font-bold tracking-tight text-slate-900">Plantilla de Google Slides</h2>
            <p className="max-w-3xl text-sm leading-relaxed text-slate-600">
              Por cada participante verificado se crea una diapositiva nueva en este documento con sus datos (
              <code className="font-mono text-xs font-bold text-slate-900">{'<<Nombre>>'}</code>,{' '}
              <code className="font-mono text-xs font-bold text-slate-900">{'<<Correo>>'}</code>,{' '}
              <code className="font-mono text-xs font-bold text-slate-900">{'<<ID>>'}</code>) y su QR en el recuadro gris.
            </p>
          </div>
        </div>

        <button
          onClick={handleInspectTemplate}
          disabled={inspectLoading || renderingAdapted}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${inspectLoading || renderingAdapted ? 'animate-spin' : ''}`} />
          {inspectLoading ? 'Sincronizando…' : 'Recargar plantilla'}
        </button>
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Vista previa */}
        <section className="card space-y-5 p-5 sm:p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-slate-900">
              {inspectData?.title ? `Documento conectado: ${inspectData.title}` : 'Documento de Google Slides'}
            </h3>
            <a
              href={config.googleSlidesUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800"
            >
              Abrir en Google Slides <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={slidesUrl}
              onChange={(e) => setSlidesUrl(e.target.value)}
              aria-label="Enlace de la presentación"
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={handleInspectTemplate}
              disabled={inspectLoading}
              className="rounded-xl bg-ink px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              Actualizar enlace
            </button>
          </div>

          {inspectError && (
            <div className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{inspectError}</span>
            </div>
          )}

          {/* Selector de vista */}
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="no-scrollbar inline-flex w-full gap-1 overflow-x-auto rounded-2xl bg-slate-900/[0.05] p-1 sm:w-auto">
              <button
                onClick={() => setPreviewMode('adapted')}
                aria-pressed={previewMode === 'adapted'}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  previewMode === 'adapted' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {previewMode === 'adapted' && (
                  <motion.span layoutId="tpl-pill" transition={{ type: 'spring', stiffness: 520, damping: 42 }} className="absolute inset-0 rounded-xl bg-white shadow-sm shadow-slate-900/10" />
                )}
                <span className="relative flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                Con datos y QR (ID {currentSample.sequentialId})
                </span>
              </button>
              <button
                onClick={() => setPreviewMode('master')}
                aria-pressed={previewMode === 'master'}
                className={`relative flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-colors ${
                  previewMode === 'master' ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {previewMode === 'master' && (
                  <motion.span layoutId="tpl-pill" transition={{ type: 'spring', stiffness: 520, damping: 42 }} className="absolute inset-0 rounded-xl bg-white shadow-sm shadow-slate-900/10" />
                )}
                <span className="relative flex items-center gap-1.5">
                <Eye className="h-3.5 w-3.5" />
                Plantilla base
                </span>
              </button>
            </div>

            {previewMode === 'adapted' && participants.length > 0 && (
              <label className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-slate-600">Probar con</span>
                <select
                  value={selectedParticipantId}
                  onChange={(e) => setSelectedParticipantId(e.target.value)}
                  className="max-w-[260px] rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-900 focus:border-brand-600 focus:outline-none"
                >
                  {participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.fullName} ({p.email})
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {/* Vista previa de la diapositiva */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
            {previewMode === 'adapted' ? (
              renderingAdapted && !adaptedSlideBase64 ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-xs text-slate-600">
                  <RefreshCw className="h-6 w-6 animate-spin text-brand-700" />
                  <span>Rellenando nombre, correo, ID y QR en tu plantilla…</span>
                </div>
              ) : adaptedSlideBase64 ? (
                <div className="space-y-2.5">
                  <img
                    src={adaptedSlideBase64}
                    alt="Diapositiva adaptada con participante y QR"
                    className="h-auto w-full rounded-lg border border-slate-200 bg-white"
                  />
                  <p className="text-center text-[11px] text-slate-600">
                    Vista previa: <strong className="text-slate-900">{currentSample.fullName}</strong> ·{' '}
                    <strong className="text-slate-900">{currentSample.email}</strong> · ID{' '}
                    <strong className="font-mono text-slate-900">{currentSample.sequentialId}</strong>
                  </p>
                </div>
              ) : null
            ) : inspectData?.thumbnailBase64 ? (
              <img
                src={inspectData.thumbnailBase64}
                alt="Plantilla original de Google Slides"
                className="h-auto w-full rounded-lg border border-slate-200 bg-white"
              />
            ) : (
              <div className="aspect-video w-full overflow-hidden rounded-lg border border-slate-200 bg-white">
                <iframe
                  src="https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/embed?start=false&loop=false&delayms=3000"
                  title="Vista previa de Google Slides"
                  className="h-full w-full border-0"
                  allowFullScreen
                />
              </div>
            )}
          </div>

          {inspectData && (
            <div className="space-y-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
              <p className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Campos detectados en la diapositiva 1
              </p>
              {inspectData.detectedTexts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {inspectData.detectedTexts.map((t, i) => (
                    <span key={i} className="rounded-md border border-slate-300 bg-white px-2.5 py-1 font-mono text-[11px] text-slate-800">
                      {t}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Variables disponibles */}
        <aside className="card space-y-4 p-5 sm:p-6">
          <div className="space-y-1.5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Code2 className="h-4 w-4 text-brand-700" aria-hidden="true" />
              Cómo se crea cada diapositiva
            </h3>
            <p className="text-xs leading-relaxed text-slate-600">
              Se duplica la <strong>diapositiva 1</strong>, se rellenan sus datos con el ID secuencial (001, 002…) y se
              coloca el QR en el recuadro gris. Pulsa una variable para copiarla.
            </p>
          </div>

          <ul className="space-y-2">
            {variables.map((v, i) => (
              <li key={v.tag} className="enter" style={{ animationDelay: `${i * 70}ms` }}>
                <button
                  onClick={() => handleCopy(v.tag)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-brand-600 hover:bg-brand-50/40"
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-brand-800">{v.tag}</span>
                    <span className="text-[11px] font-semibold text-emerald-700">
                      {copiedVar === v.tag ? '¡Copiado!' : 'Copiar'}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] leading-relaxed text-slate-600">{v.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
};
