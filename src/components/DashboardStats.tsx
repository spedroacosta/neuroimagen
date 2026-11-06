import React from 'react';
import { Participant, Stats } from '../types';
import { Users, Clock, CheckCircle2, QrCode, ExternalLink, Calendar, MapPin, FileSpreadsheet } from 'lucide-react';

interface DashboardStatsProps {
  participants: Participant[];
  stats: Stats;
  onNavigateTab: (tab: 'verification' | 'scanner' | 'template') => void;
  onSyncForms: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  participants,
  stats,
  onNavigateTab,
  onSyncForms,
}) => {
  return (
    <div className="space-y-6">
      
      {/* Light Mode Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
              <Calendar className="h-3.5 w-3.5 text-sky-700" />
              <span>5 de Diciembre, 2026</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug">
              Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                Auditorio Principal de Medicina
              </span>
              <a
                href="https://docs.google.com/forms/d/1nVkOvJnq8r4JGsOmVGwixvnt4hh4GLiqaKp4btEZqEc/edit"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sky-700 hover:text-sky-900 underline font-medium"
              >
                Google Form Editable
                <ExternalLink className="h-3 w-3" />
              </a>
              <a
                href="https://docs.google.com/presentation/d/1mPZXn4DdJpc2VGzZSVoLT8CWd-h_ovpcqvL2RbGXmoY/edit?slide=id.p#slide=id.p"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-slate-600 hover:text-slate-900 underline font-medium"
              >
                Plantilla Gafete Google Slides
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <button
              onClick={() => onNavigateTab('verification')}
              className="w-full sm:w-auto px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-all text-center min-h-[40px]"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Inscriptos en Formulario</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.totalRegistered}</div>
          <p className="mt-1 text-[11px] text-slate-500">Sincronizados con Google Form</p>
        </div>

        <div className="bg-white rounded-xl border border-amber-300 p-5 shadow-sm bg-amber-50/20">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Pendientes de Verificación</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-700">{stats.pendingPayment}</div>
          <p className="mt-1 text-[11px] text-slate-500">Comprobantes por revisar</p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Pagos Verificados & Pases Enviados</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="mt-3 text-2xl font-bold text-emerald-700">{stats.verifiedPayment}</div>
          <p className="mt-1 text-[11px] text-slate-500">Pases emitidos con QR</p>
        </div>

        <div className="bg-white rounded-xl border border-sky-200 p-5 shadow-sm bg-sky-50/20">
          <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
            <span>Acreditados en Entrada</span>
            <QrCode className="h-4 w-4 text-sky-700" />
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.checkedIn}</div>
          <div className="mt-2.5 w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div className="bg-sky-600 h-full rounded-full" style={{ width: `${stats.checkInPercentage}%` }} />
          </div>
        </div>

      </div>

      {/* Sync Banner if list is empty */}
      {participants.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3.5 shadow-sm">
          <FileSpreadsheet className="h-10 w-10 text-sky-700 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No hay datos inventados — Todo se sincroniza con tu Google Form</h3>
          <p className="text-xs text-slate-600 max-w-lg mx-auto">
            Usa el botón de <strong>Sincronizar Google Forms</strong> o pega las respuestas enviadas a tu hoja de cálculo para cargar los registros reales de tu taller.
          </p>
          <button
            onClick={onSyncForms}
            className="px-5 py-2.5 bg-sky-700 hover:bg-sky-800 text-white text-xs font-bold rounded-lg transition-all min-h-[40px]"
          >
            Obtener Respuestas del Formulario Google
          </button>
        </div>
      )}

    </div>
  );
};
