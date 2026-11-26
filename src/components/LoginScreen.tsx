import React from 'react';
import { motion } from 'motion/react';
import { CalendarDays, MapPin, Database, RefreshCw, Mail, QrCode, ArrowRight } from 'lucide-react';
import { GoogleIcon } from './GoogleIcon';
import { INITIAL_EVENT_CONFIG } from '../utils/sampleData';

interface LoginScreenProps {
  onLogin: () => void;
}

const FLUID = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  { icon: Database, title: 'Base en tiempo real', text: 'Participantes actualizados al instante.' },
  { icon: RefreshCw, title: 'Sincronización con Forms', text: 'Respuestas y comprobantes desde tu formulario.' },
  { icon: Mail, title: 'Pases por Gmail', text: 'Diapositiva con QR enviada automáticamente.' },
  { icon: QrCode, title: 'Control de acceso', text: 'Lector QR para la asistencia del evento.' },
];

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const { eventName, eventDate, eventTime, eventLocation } = INITIAL_EVENT_CONFIG;

  return (
    <section className="relative isolate mx-auto max-w-5xl py-6 sm:py-10">
      <div className="blob -left-20 top-0 h-72 w-72 bg-sky-400/60" />
      <div className="blob -right-16 bottom-0 h-72 w-72 bg-indigo-400/50" style={{ animationDelay: '-7s' }} />

      <div className="grid gap-5 lg:grid-cols-5">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: FLUID }}
          className="card flex flex-col justify-center p-7 sm:p-10 lg:col-span-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-700">Panel de organización</p>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-3xl">
            {eventName}
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Inicia sesión con tu cuenta de Google para acceder a la base de datos en tiempo real, sincronizar las
            respuestas y comprobantes del formulario, editar la plantilla de Slides y enviar los pases con QR por Gmail.
          </p>

          <ul className="mt-8 grid gap-5 sm:grid-cols-2">
            {FEATURES.map(({ icon: Icon, title, text }, i) => (
              <motion.li
                key={title}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: FLUID, delay: 0.25 + i * 0.07 }}
                className="flex gap-3"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-sky-400/15 text-sky-700">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{text}</p>
                </div>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, ease: FLUID, delay: 0.12 }}
          className="relative isolate flex flex-col justify-between gap-10 overflow-hidden rounded-3xl bg-ink p-7 text-white shadow-2xl shadow-slate-900/25 sm:p-8 lg:col-span-2"
        >
          <div className="blob -right-16 -top-16 h-56 w-56 bg-sky-500" />
          <div className="blob -bottom-20 -left-10 h-56 w-56 bg-indigo-500" style={{ animationDelay: '-5s' }} />

          <div className="relative space-y-3 text-sm">
            <p className="inline-flex items-center gap-2 text-slate-200">
              <CalendarDays className="h-4 w-4 text-sky-300" aria-hidden="true" />
              {eventDate} · {eventTime}
            </p>
            <p className="inline-flex items-center gap-2 text-slate-200">
              <MapPin className="h-4 w-4 text-sky-300" aria-hidden="true" />
              {eventLocation}
            </p>
          </div>

          <div className="relative space-y-4">
            <p className="text-sm text-slate-300">Accede con la cuenta de la organización para continuar.</p>
            <motion.button
              onClick={onLogin}
              whileTap={{ scale: 0.97 }}
              className="group flex w-full items-center justify-center gap-2.5 rounded-2xl bg-white px-5 py-3.5 text-sm font-semibold text-ink shadow-lg shadow-black/20 transition-colors hover:bg-slate-100"
            >
              <GoogleIcon />
              <span>Iniciar sesión con Google</span>
              <ArrowRight className="h-4 w-4 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
            </motion.button>
          </div>
        </motion.aside>
      </div>
    </section>
  );
};
