import React, { useEffect, useState } from 'react';
import { motion, animate } from 'motion/react';
import { Participant, PaymentStatus, Stats } from '../types';
import { INITIAL_EVENT_CONFIG } from '../utils/sampleData';
import {
  Users,
  Clock,
  CheckCircle2,
  QrCode,
  ExternalLink,
  CalendarDays,
  MapPin,
  RefreshCw,
  ArrowRight,
  ClipboardCheck,
} from 'lucide-react';

interface DashboardStatsProps {
  participants: Participant[];
  stats: Stats;
  onNavigateTab: (tab: 'verification' | 'scanner' | 'template') => void;
  onSyncForms: () => void;
  isSyncing: boolean;
}

const FLUID = [0.22, 1, 0.36, 1] as const;

const STATUS_BADGE: Record<PaymentStatus, { label: string; classes: string; dot: string }> = {
  pending: { label: 'Pendiente', classes: 'bg-amber-50/80 text-amber-800 ring-amber-200', dot: 'bg-amber-500' },
  verified: { label: 'Verificado', classes: 'bg-emerald-50/80 text-emerald-800 ring-emerald-200', dot: 'bg-emerald-500' },
  rejected: { label: 'Rechazado', classes: 'bg-rose-50/80 text-rose-800 ring-rose-200', dot: 'bg-rose-500' },
};

const TONES = {
  slate: { tile: 'bg-slate-900/[0.06] text-slate-700', value: 'text-slate-900', bar: 'from-slate-500 to-slate-800' },
  amber: { tile: 'bg-amber-400/15 text-amber-700', value: 'text-amber-700', bar: 'from-amber-400 to-amber-600' },
  emerald: { tile: 'bg-emerald-400/15 text-emerald-700', value: 'text-emerald-700', bar: 'from-emerald-400 to-emerald-600' },
  brand: { tile: 'bg-sky-400/15 text-sky-700', value: 'text-slate-900', bar: 'from-sky-400 to-indigo-500' },
} as const;

/** Número que cuenta hasta su valor con una animación suave. */
const CountUp: React.FC<{ value: number; suffix?: string }> = ({ value, suffix = '' }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.9,
      ease: FLUID,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value]);
  return (
    <>
      {display}
      {suffix}
    </>
  );
};

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  caption: string;
  icon: React.ElementType;
  tone: keyof typeof TONES;
  progress?: number;
  index: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, suffix, caption, icon: Icon, tone, progress, index }) => {
  const t = TONES[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: FLUID, delay: 0.08 * index }}
      whileHover={{ y: -3 }}
      className="card flex flex-col p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-slate-500 sm:text-sm">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${t.tile}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-4 text-3xl font-semibold tracking-tight tabular-nums sm:text-4xl ${t.value}`}>
        <CountUp value={value} suffix={suffix} />
      </p>
      <p className="mt-1.5 text-xs leading-snug text-slate-500">{caption}</p>
      {progress !== undefined && (
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-900/[0.06]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${t.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: FLUID, delay: 0.3 }}
          />
        </div>
      )}
    </motion.div>
  );
};

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  participants,
  stats,
  onNavigateTab,
  onSyncForms,
  isSyncing,
}) => {
  const { eventName, eventDate, eventTime, eventLocation } = INITIAL_EVENT_CONFIG;
  const recent = participants.slice(0, 6);

  return (
    <div className="space-y-5 pb-4">
      {/* Cabecera del evento con luz de color */}
      <motion.section
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: FLUID }}
        className="relative isolate overflow-hidden rounded-[28px] bg-ink text-white shadow-2xl shadow-slate-900/20"
      >
        <div className="blob -right-24 -top-28 h-72 w-72 bg-sky-500" />
        <div className="blob -bottom-32 left-10 h-72 w-72 bg-indigo-500" style={{ animationDelay: '-6s' }} />
        <div className="blob right-1/3 top-1/3 h-48 w-48 bg-emerald-400/60" style={{ animationDelay: '-11s' }} />

        <div className="relative p-6 sm:p-9">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-5">
              <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-200">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-md">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {eventDate} · {eventTime}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 ring-1 ring-white/15 backdrop-blur-md">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {eventLocation}
                </span>
              </div>

              <h2 className="text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">{eventName}</h2>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                <a
                  href={INITIAL_EVENT_CONFIG.googleFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-sky-300 transition-colors hover:text-white"
                >
                  Abrir Google Form
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <a
                  href={INITIAL_EVENT_CONFIG.googleSlidesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-300 transition-colors hover:text-white"
                >
                  Abrir plantilla en Slides
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 sm:flex-row lg:flex-col xl:flex-row">
              <button onClick={() => onNavigateTab('verification')} className="btn-light">
                <ClipboardCheck className="h-4 w-4" aria-hidden="true" />
                Verificar pagos ({stats.pendingPayment})
              </button>
              <button onClick={() => onNavigateTab('scanner')} className="btn-brand">
                <QrCode className="h-4 w-4" aria-hidden="true" />
                Abrir lector QR
              </button>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Indicadores */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard index={0} label="Registrados" value={stats.totalRegistered} caption="Respuestas sincronizadas del formulario" icon={Users} tone="slate" />
        <KpiCard index={1} label="Por verificar" value={stats.pendingPayment} caption="Pagos pendientes de revisión" icon={Clock} tone="amber" />
        <KpiCard index={2} label="Verificados" value={stats.verifiedPayment} caption="Pase con QR enviado por correo" icon={CheckCircle2} tone="emerald" />
        <KpiCard
          index={3}
          label="Asistencia (QR)"
          value={stats.checkedIn}
          caption={`${stats.checkInPercentage}% de los verificados ya ingresó`}
          icon={QrCode}
          tone="brand"
          progress={stats.checkInPercentage}
        />
      </section>

      {/* Estado vacío o lista reciente */}
      {participants.length === 0 ? (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: FLUID, delay: 0.3 }}
          className="card flex flex-col items-center gap-5 p-10 text-center"
        >
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-sky-400/15 text-sky-700">
            <RefreshCw className={`h-6 w-6 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-slate-900">Base de datos lista y conectada a tu Google Form</h3>
            <p className="mx-auto max-w-md text-sm text-slate-600">
              Sincroniza para traer las respuestas y comprobantes registrados en el formulario.
            </p>
          </div>
          <button onClick={onSyncForms} disabled={isSyncing} className="btn-brand">
            {isSyncing ? 'Sincronizando respuestas…' : 'Sincronizar respuestas de Google Forms'}
          </button>
        </motion.section>
      ) : (
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: FLUID, delay: 0.3 }}
          className="card overflow-hidden"
        >
          <header className="flex items-center justify-between gap-3 border-b border-slate-900/5 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Últimos registros</h3>
              <p className="text-xs text-slate-500">
                Mostrando {recent.length} de {participants.length}
              </p>
            </div>
            <button
              onClick={() => onNavigateTab('verification')}
              className="group inline-flex items-center gap-1 text-sm font-semibold text-sky-700 transition-colors hover:text-sky-900"
            >
              Ver todos
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </button>
          </header>

          <ul className="divide-y divide-slate-900/5">
            {recent.map((p, i) => {
              const badge = STATUS_BADGE[p.paymentStatus];
              const initials = p.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w.charAt(0).toUpperCase())
                .join('');
              return (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, ease: FLUID, delay: 0.35 + i * 0.05 }}
                  className="flex flex-col gap-3 px-5 py-3.5 transition-colors hover:bg-white/60 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-xs font-semibold text-slate-700">
                      {initials || '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{p.fullName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {p.email}
                        {p.phone ? ` · ${p.phone}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 pl-13 sm:pl-0">
                    <span className="font-mono text-xs text-slate-500">Ref {p.paymentReference || 'Sin número'}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset backdrop-blur-sm ${badge.classes}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                      {badge.label}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>
        </motion.section>
      )}
    </div>
  );
};
