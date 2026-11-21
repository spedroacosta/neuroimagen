import React from 'react';
import { Participant, Stats } from '../types';
import { Users, Clock, CheckCircle2, QrCode, ExternalLink, Calendar, RefreshCw } from 'lucide-react';

interface DashboardStatsProps {
  participants: Participant[];
  stats: Stats;
  onNavigateTab: (tab: 'verification' | 'scanner' | 'template') => void;
  onSyncForms: () => void;
  isSyncing: boolean;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  participants,
  stats,
  onNavigateTab,
  onSyncForms,
  isSyncing,
}) => {
  return (
    <div className="space-y-6 bg-white">
      {/* Main Sober Event Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-white text-slate-700 text-xs font-semibold border border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-sky-700" />
              <span>Fecha del taller: 5 de diciembre</span>
            </div>

            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-snug">
              Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <a
                href="https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sky-700 hover:text-sky-900 underline font-medium"
              >
                Abrir Google Form Editable
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit?slide=id.p#slide=id.p"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-slate-700 hover:text-slate-900 underline font-medium"
              >
                Abrir Plantilla Editable en Google Slides
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5">
            <button
              onClick={() => onNavigateTab('verification')}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all text-center min-h-[40px]"
            >
              Verificar Pagos ({stats.pendingPayment})
            </button>
            <button
              onClick={() => onNavigateTab('scanner')}
              className="w-full sm:w-auto px-4 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg transition-all text-center min-h-[40px]"
            >
              Lector QR
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards (Pure White) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Registrados en Formulario</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.totalRegistered}</div>
          <p className="mt-1 text-[11px] text-slate-500">Sincronizados con Firebase y Forms</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Pagos por Verificar</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700">{stats.pendingPayment}</div>
          <p className="mt-1 text-[11px] text-slate-500">Pendientes de revisión manual</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Verificados y Correo Enviado</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">{stats.verifiedPayment}</div>
          <p className="mt-1 text-[11px] text-slate-500">Con entrada Google Slides + QR enviada</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
            <span>Asistencia Confirmada (QR)</span>
            <QrCode className="h-4 w-4 text-sky-700" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">
            {stats.checkedIn}{' '}
            <span className="text-xs font-normal text-slate-500">({stats.checkInPercentage}%)</span>
          </div>
          <div className="mt-2.5 w-full bg-white h-2 rounded-full overflow-hidden border border-slate-200">
            <div className="bg-sky-600 h-full rounded-full" style={{ width: `${stats.checkInPercentage}%` }} />
          </div>
        </div>
      </div>

      {/* Sync Prompt when no participants yet */}
      {participants.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3.5">
          <RefreshCw className={`h-8 w-8 text-sky-700 mx-auto ${isSyncing ? 'animate-spin' : ''}`} />
          <h3 className="text-base font-bold text-slate-900">
            Base de datos lista y conectada a tu Google Form
          </h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            Haz clic en el botón de abajo para traer todas las respuestas reales registradas en tu documento editable de Google Forms.
          </p>
          <button
            onClick={onSyncForms}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg transition-all min-h-[40px] disabled:opacity-50"
          >
            {isSyncing ? 'Sincronizando respuestas...' : 'Sincronizar Respuestas de Google Forms'}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Últimos Registros Sincronizados</h3>
            <button
              onClick={() => onNavigateTab('verification')}
              className="text-xs font-semibold text-sky-700 hover:underline"
            >
              Ir a Verificar Pagos →
            </button>
          </div>
          <div className="divide-y divide-slate-200 text-xs">
            {participants.slice(0, 5).map((p) => (
              <div key={p.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-900">{p.fullName}</div>
                  <div className="text-slate-500">
                    {p.email} {p.phone ? `• ${p.phone}` : ''} •{' '}
                    <span className="font-mono text-slate-700">
                      Comprobante: {p.paymentReference || 'Sin número'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {p.paymentStatus === 'pending' && (
                    <span className="px-2.5 py-1 rounded border border-amber-300 bg-white text-amber-800 text-[11px] font-semibold">
                      Pendiente de verificar
                    </span>
                  )}
                  {p.paymentStatus === 'verified' && (
                    <span className="px-2.5 py-1 rounded border border-emerald-300 bg-white text-emerald-800 text-[11px] font-semibold">
                      Verificado y Enviado
                    </span>
                  )}
                  {p.paymentStatus === 'rejected' && (
                    <span className="px-2.5 py-1 rounded border border-rose-300 bg-white text-rose-800 text-[11px] font-semibold">
                      Rechazado
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
