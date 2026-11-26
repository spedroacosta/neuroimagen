import React from 'react';
import { CalendarDays, MapPin, Database, RefreshCw, Mail, QrCode } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { INITIAL_EVENT_CONFIG } from '../utils/sampleData';

interface LoginScreenProps {
  onLogin: () => void;
}

const FEATURES = [
  {
    icon: Database,
    title: 'Base en tiempo real',
    text: 'Participantes guardados y actualizados al instante.',
  },
  {
    icon: RefreshCw,
    title: 'Sincronización con Forms',
    text: 'Respuestas y comprobantes traídos desde tu formulario.',
  },
  {
    icon: Mail,
    title: 'Pases por Gmail',
    text: 'Diapositiva con QR creada y enviada automáticamente.',
  },
  {
    icon: QrCode,
    title: 'Control de acceso',
    text: 'Lector QR que registra la asistencia el día del evento.',
  },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { eventName, eventDate, eventTime, eventLocation } = INITIAL_EVENT_CONFIG;

  return (
    <section className="mx-auto grid max-w-5xl gap-6 py-4 lg:grid-cols-5">
      <div className="card flex flex-col justify-center p-6 sm:p-8 lg:col-span-3">
        <p className="text-xs font-bold uppercase tracking-wider text-brand-700">Panel de organización</p>
        <h2 className="mt-2 text-xl font-bold leading-snug tracking-tight text-slate-900 sm:text-2xl">{eventName}</h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          Inicia sesión con tu cuenta de Google para acceder a la base de datos en tiempo real, sincronizar las
          respuestas y comprobantes de tu Google Form, editar la plantilla de Google Slides y enviar los pases con QR
          por Gmail.
        </p>

        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-700">
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{title}</p>
                <p className="text-xs leading-relaxed text-slate-500">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="flex flex-col justify-between gap-8 rounded-2xl bg-ink p-6 text-white sm:p-8 lg:col-span-2">
        <div className="space-y-3 text-sm">
          <p className="inline-flex items-center gap-2 text-slate-200">
            <CalendarDays className="h-4 w-4 text-sky-300" aria-hidden="true" />
            {eventDate} · {eventTime}
          </p>
          <p className="inline-flex items-center gap-2 text-slate-200">
            <MapPin className="h-4 w-4 text-sky-300" aria-hidden="true" />
            {eventLocation}
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-slate-300">Accede con la cuenta de la organización para continuar.</p>
          <button onClick={onLogin} className="btn-light w-full">
            <GoogleIcon />
            <span>Iniciar sesión con Google</span>
          </button>
        </div>
      </aside>
    </section>
  );
};
