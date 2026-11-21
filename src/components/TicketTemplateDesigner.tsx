import React, { useState, useEffect } from 'react';
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
    <div className="space-y-6 bg-white">
      {/* Header */}
      <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Presentation className="h-6 w-6 text-sky-700 shrink-0" />
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Plantilla Editable de Google Slides Conectada
              </h2>
              <p className="text-xs text-slate-600">
                Por cada participante verificado se crea una nueva diapositiva dentro de este mismo
                documento de Google Slides con sus datos (
                <code className="font-mono font-bold text-slate-900">&lt;&lt;Nombre&gt;&gt;</code>,{' '}
                <code className="font-mono font-bold text-slate-900">&lt;&lt;Correo&gt;&gt;</code>,{' '}
                <code className="font-mono font-bold text-slate-900">&lt;&lt;ID&gt;&gt;</code> = 001,
                002...) y su QR en el recuadro gris.
              </p>
            </div>
          </div>
          <button
            onClick={handleInspectTemplate}
            disabled={inspectLoading || renderingAdapted}
            className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 min-h-[38px] self-start sm:self-auto disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${inspectLoading || renderingAdapted ? 'animate-spin' : ''}`}
            />
            {inspectLoading ? 'Sincronizando Slides...' : 'Recargar Plantilla de Slides'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {inspectData?.title
                  ? `Documento conectado: ${inspectData.title}`
                  : 'Enlace del Documento Editable de Google Slides'}
              </h3>
              <a
                href={config.googleSlidesUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-700 hover:underline font-semibold flex items-center gap-1"
              >
                Abrir presentación en Google Slides <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={slidesUrl}
                onChange={(e) => setSlidesUrl(e.target.value)}
                className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600 min-h-[38px]"
              />
              <button
                onClick={handleInspectTemplate}
                disabled={inspectLoading}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-all min-h-[38px]"
              >
                Actualizar Vínculo
              </button>
            </div>

            {inspectError && (
              <div className="p-3 bg-white border border-rose-300 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                <span>{inspectError}</span>
              </div>
            )}

            {/* Toggle between Master Slide and Live Adapted Slide */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="inline-flex rounded-lg border border-slate-200 p-1 bg-white">
                <button
                  onClick={() => setPreviewMode('adapted')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewMode === 'adapted'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Así queda con Datos y QR (ID: {currentSample.sequentialId})
                </button>
                <button
                  onClick={() => setPreviewMode('master')}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                    previewMode === 'master'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" />
                  Diapositiva 1 (Plantilla Base)
                </button>
              </div>

              {previewMode === 'adapted' && participants.length > 0 && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-600 font-semibold">Probar con:</span>
                  <select
                    value={selectedParticipantId}
                    onChange={(e) => setSelectedParticipantId(e.target.value)}
                    className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-600"
                  >
                    {participants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.fullName} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Slide Preview Box */}
            <div className="rounded-xl overflow-hidden border border-slate-200 bg-white p-3">
              {previewMode === 'adapted' ? (
                renderingAdapted && !adaptedSlideBase64 ? (
                  <div className="py-16 flex flex-col items-center justify-center gap-2 text-xs text-slate-600">
                    <RefreshCw className="h-6 w-6 animate-spin text-sky-700" />
                    <span>
                      Rellenando &lt;&lt;Nombre&gt;&gt;, &lt;&lt;Correo&gt;&gt;, &lt;&lt;ID&gt;&gt; y
                      &lt;&lt;QR&gt;&gt; en tu plantilla de Google Slides...
                    </span>
                  </div>
                ) : adaptedSlideBase64 ? (
                  <div className="space-y-2">
                    <img
                      src={adaptedSlideBase64}
                      alt="Diapositiva adaptada con participante y QR"
                      className="w-full h-auto rounded-lg border border-slate-200"
                    />
                    <p className="text-[11px] text-emerald-800 font-medium text-center">
                      Vista previa del pase generado: <strong>{currentSample.fullName}</strong> •{' '}
                      <strong>{currentSample.email}</strong> •{' '}
                      <strong>ID: {currentSample.sequentialId}</strong>
                    </p>
                  </div>
                ) : null
              ) : inspectData?.thumbnailBase64 ? (
                <img
                  src={inspectData.thumbnailBase64}
                  alt="Plantilla original de Google Slides"
                  className="w-full h-auto rounded-lg border border-slate-200"
                />
              ) : (
                <div className="aspect-video w-full rounded-lg overflow-hidden border border-slate-200 bg-white">
                  <iframe
                    src="https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/embed?start=false&loop=false&delayms=3000"
                    title="Vista previa de Google Slides"
                    className="w-full h-full border-0"
                    allowFullScreen
                  />
                </div>
              )}
            </div>

            {/* Detected Elements inside the User's Google Slide */}
            {inspectData && (
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Campos detectados en la Diapositiva 1 de tu Google Slides:
                </div>
                {inspectData.detectedTexts.length > 0 ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {inspectData.detectedTexts.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 bg-white border border-slate-300 rounded-md font-mono text-[11px] text-slate-800"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Dynamic Placeholders Instructions */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-sky-700" />
            Cómo funciona la creación de cada diapositiva
          </h3>

          <p className="text-xs text-slate-600 leading-relaxed">
            Al verificar el pago de un participante, la aplicación duplica la{' '}
            <strong>Diapositiva 1</strong> dentro de este mismo documento de Google Slides, rellena
            sus datos con el ID secuencial (<code>001</code>, <code>002</code>, <code>003</code>...)
            y coloca su QR en el recuadro gris:
          </p>

          <div className="space-y-2.5">
            {variables.map((v) => (
              <div
                key={v.tag}
                onClick={() => handleCopy(v.tag)}
                className="p-3.5 bg-white rounded-lg border border-slate-200 hover:border-sky-600 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-900">{v.tag}</span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {copiedVar === v.tag ? '¡Copiado!' : 'Activa en tu Slide'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 mt-1">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
