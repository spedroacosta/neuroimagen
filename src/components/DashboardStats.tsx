import React from 'react';
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

const STATUS_BADGE: Record<PaymentStatus, { label: string; classes: string; dot: string }> = {
  pending: {
    label: 'Pendiente',
    classes: 'bg-amber-50 text-amber-800 ring-amber-200',
    dot: 'bg-amber-500',
  },
  verified: {
    label: 'Verificado',
    classes: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    dot: 'bg-emerald-500',
  },
  rejected: {
    label: 'Rechazado',
    classes: 'bg-rose-50 text-rose-800 ring-rose-200',
    dot: 'bg-rose-500',
  },
};

const TONES = {
  slate: { tile: 'bg-slate-100 text-slate-700', value: 'text-slate-900', bar: 'bg-slate-700' },
  amber: { tile: 'bg-amber-50 text-amber-700', value: 'text-amber-700', bar: 'bg-amber-500' },
  emerald: { tile: 'bg-emerald-50 text-emerald-700', value: 'text-emerald-700', bar: 'bg-emerald-500' },
  brand: { tile: 'bg-brand-50 text-brand-700', value: 'text-slate-900', bar: 'bg-brand-600' },
} as const;

interface KpiCardProps {
  label: string;
  value: number | string;
  caption: string;
  icon: React.ElementType;
  tone: keyof typeof TONES;
  progress?: number;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, caption, icon: Icon, tone, progress }) => {
  const t = TONES[tone];
  return (
    <div className="card flex flex-col p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-slate-600 sm:text-sm">{label}</p>
        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${t.tile}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className={`mt-3 text-2xl font-bold tracking-tight sm:mt-4 sm:text-3xl ${t.value}`}>{value}</p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500 sm:text-xs">{caption}</p>
      {progress !== undefined && (
        <div
          className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className={`h-full rounded-full transition-all ${t.bar}`} style={{ width: `${progress}%` }} />
        </div>
      )}
    </div>
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
    <div className="space-y-6">
      {/* Cabecera del evento */}
      <section className="overflow-hidden rounded-2xl bg-ink text-white">
        <div className="relative p-6 sm:p-8">
          <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-brand-700/30 blur-3xl" />
          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                  {eventDate} · {eventTime}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
                  <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                  {eventLocation}
                </span>
              </div>

              <h2 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">{eventName}</h2>

              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <a
                  href={INITIAL_EVENT_CONFIG.googleFormUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-sky-300 underline-offset-4 hover:text-white hover:underline"
                >
                  Abrir Google Form
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
                <a
                  href={INITIAL_EVENT_CONFIG.googleSlidesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 font-medium text-slate-300 underline-offset-4 hover:text-white hover:underline"
                >
                  Abrir plantilla en Google Slides
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
      </section>

      {/* Indicadores clave */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <KpiCard
          label="Registrados"
          value={stats.totalRegistered}
          caption="Respuestas sincronizadas del formulario"
          icon={Users}
          tone="slate"
        />
        <KpiCard
          label="Por verificar"
          value={stats.pendingPayment}
          caption="Pagos pendientes de revisión manual"
          icon={Clock}
          tone="amber"
        />
        <KpiCard
          label="Verificados"
          value={stats.verifiedPayment}
          caption="Pase con QR creado y enviado por correo"
          icon={CheckCircle2}
          tone="emerald"
        />
        <KpiCard
          label="Asistencia (QR)"
          value={`${stats.checkedIn}`}
          caption={`${stats.checkInPercentage}% de los verificados ya ingresó`}
          icon={QrCode}
          tone="brand"
          progress={stats.checkInPercentage}
        />
      </section>

      {/* Estado vacío o últimos registros */}
      {participants.length === 0 ? (
        <section className="card flex flex-col items-center gap-4 p-10 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <RefreshCw className={`h-6 w-6 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden="true" />
          </span>
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900">Base de datos lista y conectada a tu Google Form</h3>
            <p className="mx-auto max-w-md text-sm text-slate-600">
              Sincroniza para traer las respuestas y comprobantes registrados en el formulario.
            </p>
          </div>
          <button onClick={onSyncForms} disabled={isSyncing} className="btn-brand">
            {isSyncing ? 'Sincronizando respuestas…' : 'Sincronizar respuestas de Google Forms'}
          </button>
        </section>
      ) : (
        <section className="card overflow-hidden">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Últimos registros</h3>
              <p className="text-xs text-slate-500">Mostrando {recent.length} de {participants.length}</p>
            </div>
            <button
              onClick={() => onNavigateTab('verification')}
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
            >
              Ir a verificar pagos
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </header>

          <ul className="divide-y divide-slate-100">
            {recent.map((p) => {
              const badge = STATUS_BADGE[p.paymentStatus];
              const initials = p.fullName
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((w) => w.charAt(0).toUpperCase())
                .join('');
              return (
                <li key={p.id} className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
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

                  <div className="flex items-center justify-between gap-3 pl-12 sm:pl-0">
                    <span className="font-mono text-xs text-slate-600">
                      Ref: {p.paymentReference || 'Sin número'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${badge.classes}`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} aria-hidden="true" />
                      {badge.label}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
};
