import React, { useState } from 'react';
import { BookOpen, Check, Copy, Code, ExternalLink, ShieldAlert } from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  const [copiedScript, setCopiedScript] = useState(false);

  const appsScriptCode = `/**
 * Google Apps Script para sincronizar automáticamente Google Forms con el Taller de Neuroimagen
 * Colócalo en el Editor de Apps Script de tu Google Form o Google Sheet enlazada.
 */
function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
  var email = e.response.getRespondentEmail() || "";
  var nombre = "";
  
  for (var i = 0; i < itemResponses.length; i++) {
    var title = itemResponses[i].getItem().getTitle();
    var response = itemResponses[i].getResponse();
    if (title.toLowerCase().indexOf("nombre") !== -1) {
      nombre = response;
    }
  }
  
  Logger.log("Nuevo inscripto en Taller de Neuroimagen: " + nombre + " (" + email + ")");
}
`;

  const handleCopyScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  return (
    <div className="space-y-6 bg-white">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-sky-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">Sincronización con Google Forms & Guía Técnica</h2>
            <p className="text-xs text-slate-600">
              Instrucciones simples para conectar tu Google Form editable con este panel de control.
            </p>
          </div>
        </div>
      </div>

      {/* Form Link Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900">Formulario Configurado</h3>
        <p className="text-xs text-slate-700">
          Documento vinculado: <strong className="text-slate-900">Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos</strong>
        </p>
        <a
          href="https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-sky-700 hover:text-sky-900 underline font-semibold"
        >
          Abrir Google Form Editable <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>

      {/* Limitations Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600" />
          Límites de Envíos de Correo de Google
        </h3>

        <div className="space-y-2 text-xs text-slate-700">
          <p>
            • Cuentas personales <strong>@gmail.com</strong>: Límite de <strong>100 correos por día</strong> mediante la API de Gmail.
          </p>
          <p>
            • Cuentas de dominio <strong>Google Workspace</strong> (@tuuniversidad.edu): Límite de <strong>2.000 correos por día</strong>.
          </p>
          <p className="text-slate-600 text-[11px] pt-1">
            Si la cantidad de inscriptos del taller supera el límite diario de tu cuenta, los pases pueden enviarse por lotes o descargarse como imagen PNG para enviarlos directamente por WhatsApp.
          </p>
        </div>
      </div>

      {/* Apps Script Code */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Code className="h-4 w-4 text-sky-700" />
            Script de Notificación Automática (Opcional)
          </h3>
          <button
            onClick={handleCopyScript}
            className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded border border-slate-300 flex items-center gap-1"
          >
            {copiedScript ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copiedScript ? 'Copiado' : 'Copiar Script'}
          </button>
        </div>

        <pre className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs font-mono text-slate-800 overflow-x-auto">
          {appsScriptCode}
        </pre>
      </div>

    </div>
  );
};
