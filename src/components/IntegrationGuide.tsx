import React from 'react';
import { ExternalLink, Database, Presentation, Mail, Info } from 'lucide-react';

const STEPS = [
  {
    icon: Database,
    title: 'Google Forms + Firestore',
    body: (
      <>
        Al pulsar <strong>Sincronizar</strong>, la aplicación lee las preguntas de tu formulario, extrae el número de
        comprobante y el archivo adjunto en Google Drive (<code>fileUploadAnswers</code>) y los guarda en Firestore. Así
        todos los dispositivos ven la misma información en tiempo real.
      </>
    ),
    link: {
      href: 'https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit',
      label: 'Abrir Google Form editable',
    },
  },
  {
    icon: Presentation,
    title: 'Plantilla de Google Slides',
    body: (
      <>
        Al verificar un pago, el servidor copia tu presentación, reemplaza las etiquetas (
        <code>{`{{NOMBRE}}`}</code>, <code>{`{{CEDULA}}`}</code>, <code>{`{{TICKET_ID}}`}</code>) y coloca el código QR en
        el recuadro marcado con <code>{`{{QR}}`}</code>.
      </>
    ),
    link: {
      href: 'https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit?slide=id.p#slide=id.p',
      label: 'Abrir plantilla de Slides',
    },
  },
  {
    icon: Mail,
    title: 'Envío por Gmail y acceso con QR',
    body: (
      <>
        La diapositiva se exporta (PNG y PDF) y se envía al participante por la API de Gmail. El{' '}
        <strong>5 de diciembre</strong>, al escanear el QR en la puerta, aparece la ventana para confirmar el acceso.
      </>
    ),
  },
];

export const IntegrationGuide: React.FC = () => (
  <div className="space-y-5">
    <section className="card p-5 sm:p-6">
      <h2 className="text-lg font-bold tracking-tight text-slate-900">Cómo funciona la integración</h2>
      <p className="mt-1 text-sm text-slate-600">
        Resumen de cómo se conectan Google Forms, Google Slides, Gmail y la base de datos.
      </p>
    </section>

    <ol className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        return (
          <li key={step.title} className="card flex flex-col gap-4 p-5">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paso {i + 1}</p>
            </div>
            <h3 className="text-sm font-bold text-slate-900">{step.title}</h3>
            <p className="flex-1 text-sm leading-relaxed text-slate-600">{step.body}</p>
            {step.link && (
              <a
                href={step.link.href}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:text-brand-800"
              >
                {step.link.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            )}
          </li>
        );
      })}
    </ol>

    <section className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold text-slate-900">Límites de envío de Gmail</p>
        <p className="text-xs leading-relaxed">
          Las cuentas <code>@gmail.com</code> permiten hasta 100 correos diarios por API (500 desde Gmail web); las cuentas
          de Google Workspace hasta 2.000. Puedes usar un servidor SMTP propio desde la pestaña de verificación.
        </p>
      </div>
    </section>
  </div>
);
