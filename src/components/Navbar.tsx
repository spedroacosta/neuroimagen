import React from 'react';
import { LayoutDashboard, CheckSquare, Presentation, QrCode, BookOpen, Plus, FileSpreadsheet } from 'lucide-react';

interface NavbarProps {
  activeTab: 'dashboard' | 'verification' | 'template' | 'scanner' | 'guide';
  setActiveTab: (tab: 'dashboard' | 'verification' | 'template' | 'scanner' | 'guide') => void;
  pendingCount: number;
  onOpenNewModal: () => void;
  onSyncForms: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  onOpenNewModal,
  onSyncForms,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Title & Brand */}
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-50 border border-sky-200 flex items-center justify-center text-sky-700">
              <QrCode className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
                Taller de Neuroimagen - Promoción 106
              </h1>
              <p className="text-[11px] text-slate-500">Control de Pagos, Pases y Acreditación</p>
            </div>
          </div>

          {/* Navigation Tabs (Desktop) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all min-h-[36px] ${
                activeTab === 'dashboard'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-slate-500" />
              Resumen
            </button>

            <button
              onClick={() => setActiveTab('verification')}
              className={`relative flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all min-h-[36px] ${
                activeTab === 'verification'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5 text-slate-500" />
              Verificar Pagos
              {pendingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white font-bold px-1.5 py-0.2 text-[10px] rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('template')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all min-h-[36px] ${
                activeTab === 'template'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Presentation className="h-3.5 w-3.5 text-slate-500" />
              Plantilla Gafete
            </button>

            <button
              onClick={() => setActiveTab('scanner')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all min-h-[36px] ${
                activeTab === 'scanner'
                  ? 'bg-sky-700 text-white shadow-sm'
                  : 'text-sky-700 hover:bg-sky-50'
              }`}
            >
              <QrCode className="h-3.5 w-3.5" />
              Lector QR
            </button>

            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-semibold rounded transition-all min-h-[36px] ${
                activeTab === 'guide'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-slate-500" />
              Guía
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onSyncForms}
              className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 transition-all min-h-[38px]"
              title="Sincronizar directamente con Google Forms API"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-sky-700" />
              <span className="hidden sm:inline">Sincronizar Google Forms</span>
            </button>

            <button
              onClick={onOpenNewModal}
              className="flex items-center gap-1.5 bg-sky-700 hover:bg-sky-800 text-white px-3.5 py-2 text-xs font-bold rounded-lg shadow-sm transition-all min-h-[38px] active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Nuevo Registro</span>
            </button>
          </div>
        </div>

        {/* Mobile Nav Tabs Bar */}
        <div className="flex md:hidden overflow-x-auto py-2.5 gap-1.5 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'dashboard' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Resumen
          </button>
          <button
            onClick={() => setActiveTab('verification')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeTab === 'verification' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Verificar Pagos
            {pendingCount > 0 && (
              <span className="bg-amber-500 text-white font-bold px-1.5 text-[10px] rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('template')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'template' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Plantilla Gafete
          </button>
          <button
            onClick={() => setActiveTab('scanner')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'scanner' ? 'bg-sky-700 text-white' : 'text-sky-800 bg-sky-50 border border-sky-200'
            }`}
          >
            Lector QR
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all ${
              activeTab === 'guide' ? 'bg-slate-900 text-white' : 'text-slate-700 bg-slate-100'
            }`}
          >
            Guía
          </button>
        </div>

      </div>
    </header>
  );
};
