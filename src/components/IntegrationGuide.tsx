import React from 'react';
import { BookOpen, ExternalLink, CheckCircle2, Database, Presentation, Mail } from 'lucide-react';

export const IntegrationGuide: React.FC = () => {
  return (
    <div className="space-y-6 bg-white">
      <div className="bg-white p-6 rounded-xl border border-slate-200 space-y-2">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-sky-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Funcionamiento en Tiempo Real (Google Forms + Google Slides + Gmail + Firestore)
            </h2>
            <p className="text-xs text-slate-600">
              Resumen de cómo están conectados tus documentos oficiales con esta aplicación.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Database className="h-4 w-4 text-sky-700" />
            1. Google Forms + Firebase Firestore
          </div>
          <p className="text-slate-600 leading-relaxed">
            Al hacer clic en <strong>Sincronizar Google Forms</strong>, la aplicación lee el esquema exacto de preguntas de tu formulario, extrae el <strong>Número de comprobante de pago</strong> y el archivo adjunto en Google Drive (<code>fileUploadAnswers</code>), y los guarda en <strong>Firebase Firestore</strong> para que todos los dispositivos vean exactamente la misma información en tiempo real.
          </p>
          <a
            href="https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 font-semibold underline"
          >
            Abrir Google Form Editable <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Presentation className="h-4 w-4 text-sky-700" />
            2. Plantilla Editable de Google Slides
          </div>
          <p className="text-slate-600 leading-relaxed">
            Cuando verificas un pago, el servidor hace una copia de tu presentación editable en Google Slides, reemplaza las etiquetas (como <code>{`{{NOMBRE}}`}</code>, <code>{`{{CEDULA}}`}</code>, <code>{`{{TICKET_ID}}`}</code>) y coloca la imagen del <strong>Código QR</strong> exactamente en el cuadro donde pusiste <code>{`{{QR}}`}</code>.
          </p>
          <a
            href="https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit?slide=id.p#slide=id.p"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sky-700 font-semibold underline"
          >
            Abrir Plantilla de Google Slides <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2.5">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Mail className="h-4 w-4 text-sky-700" />
            3. Envío Automático por Gmail y Lector QR
          </div>
          <p className="text-slate-600 leading-relaxed">
            La diapositiva personalizada se exporta en alta resolución (PNG y PDF) desde Google Slides y se envía en el acto por correo al participante mediante la API de Gmail. El <strong>5 de diciembre</strong>, al escanear el QR en la puerta, aparece la ventana emergente con el botón <strong>Confirmar Acceso</strong> sincronizado en la nube.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-2 text-xs text-slate-700">
        <div className="font-bold text-slate-900 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Nota sobre límites de envío de Gmail:
        </div>
        <p className="text-slate-600">
          Las cuentas personales <code>@gmail.com</code> permiten enviar hasta 100 correos diarios vía API (o 500 desde Gmail web), y las cuentas institucionales Google Workspace hasta 2.000 diarios. También dispones de configuración SMTP opcional dentro de cada pase si deseas usar un servidor externo.
        </p>
      </div>
    </div>
  );
};
