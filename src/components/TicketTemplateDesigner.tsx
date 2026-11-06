import React, { useState } from 'react';
import { EventConfig } from '../types';
import { Presentation, ExternalLink, Code2, Sliders } from 'lucide-react';

interface TicketTemplateDesignerProps {
  config: EventConfig;
  onUpdateConfig: (updated: Partial<EventConfig>) => void;
}

export const TicketTemplateDesigner: React.FC<TicketTemplateDesignerProps> = ({ config, onUpdateConfig }) => {
  const [slidesUrl, setSlidesUrl] = useState(config.googleSlidesUrl);
  const [copiedVar, setCopiedVar] = useState<string | null>(null);

  const variables = [
    { tag: '{{NOMBRE}}', desc: 'Nombre completo del participante inscripto' },
    { tag: '{{EMAIL}}', desc: 'Correo electrónico del asistente' },
    { tag: '{{TICKET_ID}}', desc: 'Código de entrada único (ej: NEURO-1001)' },
    { tag: '{{TIPO_ENTRADA}}', desc: 'Categoría o nivel (General, VIP, etc.)' },
    { tag: '{{QR_CODE}}', desc: 'Imagen o contenedor del código QR único' },
    { tag: '{{FECHA_EVENTO}}', desc: '5 de Diciembre, 2026' },
  ];

  const handleCopy = (tag: string) => {
    navigator.clipboard.writeText(tag);
    setCopiedVar(tag);
    setTimeout(() => setCopiedVar(null), 1500);
  };

  const handleSaveUrl = () => {
    onUpdateConfig({ googleSlidesUrl: slidesUrl });
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <Presentation className="h-6 w-6 text-sky-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Plantilla de Google Slides para Gafete</h2>
            <p className="text-xs text-slate-500">
              Personaliza tu diseño en Google Slides e integra etiquetas automáticas para fusionar los datos del participante y su código QR.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Plantilla Activa</span>
              <a
                href={config.googleSlidesUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-sky-700 hover:underline font-semibold flex items-center gap-1"
              >
                Abrir Google Slides <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </h3>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 block">URL del Documento de Presentación:</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={slidesUrl}
                  onChange={(e) => setSlidesUrl(e.target.value)}
                  className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-600"
                />
                <button
                  onClick={handleSaveUrl}
                  className="px-4 py-2 bg-sky-700 hover:bg-sky-800 text-white font-bold text-xs rounded-lg transition-all min-h-[36px]"
                >
                  Guardar
                </button>
              </div>
            </div>

            {/* Embedded Presentation */}
            <div className="rounded-lg overflow-hidden border border-slate-200 bg-slate-900 aspect-video relative">
              <iframe
                src={`https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/embed?start=false&loop=false&delayms=3000`}
                title="Vista previa de Google Slides"
                className="w-full h-full border-0"
                allowFullScreen
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="h-4 w-4 text-sky-700" />
              Parámetros Imprimibles del Taller
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-slate-600 font-semibold mb-1 block">Título del Taller:</label>
                <input
                  type="text"
                  value={config.eventName}
                  onChange={(e) => onUpdateConfig({ eventName: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-semibold mb-1 block">Fecha:</label>
                <input
                  type="text"
                  value={config.eventDate}
                  onChange={(e) => onUpdateConfig({ eventDate: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:border-sky-600"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Variables helper */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Code2 className="h-4 w-4 text-sky-700" />
            Etiquetas Dinámicas
          </h3>

          <p className="text-xs text-slate-600">
            Copia estas etiquetas e insértalas dentro de las cajas de texto de tu presentación de Google Slides:
          </p>

          <div className="space-y-2">
            {variables.map((v) => (
              <div
                key={v.tag}
                onClick={() => handleCopy(v.tag)}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-sky-500 cursor-pointer transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-sky-900">
                    {v.tag}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {copiedVar === v.tag ? '¡Copiado!' : 'Copiar'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
