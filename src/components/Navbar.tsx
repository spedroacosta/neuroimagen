import React from 'react';
import { LayoutDashboard, CheckSquare, Presentation, QrCode, BookOpen, RefreshCw, LogOut } from 'lucide-react';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'dashboard' | 'verification' | 'template' | 'scanner' | 'guide';
  setActiveTab: (tab: 'dashboard' | 'verification' | 'template' | 'scanner' | 'guide') => void;
  pendingCount: number;
  onSyncForms: () => void;
  isSyncing: boolean;
  user: User | null;
  hasWorkspaceToken: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  pendingCount,
  onSyncForms,
  isSyncing,
  user,
  hasWorkspaceToken,
  onLogin,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-3 gap-3">
          {/* Exact Official Workshop Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              Taller de Neuroimagen, el arte de diagnosticar a tiempo - Promoción 106 de Médicos Cirujanos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fecha del taller: <strong className="text-slate-700">5 de diciembre</strong>
            </p>
          </div>

          {/* Right Auth & Sync Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {user && hasWorkspaceToken ? (
              <>
                <button
                  onClick={onSyncForms}
                  disabled={isSyncing}
                  className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 px-3 py-2 text-xs font-semibold rounded-lg border border-slate-300 transition-all min-h-[38px] disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 text-sky-700 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Google Forms'}</span>
                </button>
                <div className="hidden lg:flex items-center gap-2 pl-2 border-l border-slate-200 text-xs text-slate-600">
                  <span className="truncate max-w-[160px]">{user.email}</span>
                  <button
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
                    title="Cerrar sesión"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 bg-white hover:bg-slate-50 text-slate-800 px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs transition-all min-h-[38px]"
              >
                <svg className="h-4 w-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                <span>Conectar cuenta de Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Navigation Bar (Desktop & Mobile unified scrollable clean tabs) */}
        <nav className="flex items-center gap-1 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[38px] ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            Resumen
          </button>

          <button
            onClick={() => setActiveTab('verification')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[38px] ${
              activeTab === 'verification'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            Verificar Pagos
            {pendingCount > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full ${
                  activeTab === 'verification' ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('template')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[38px] ${
              activeTab === 'template'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Presentation className="h-3.5 w-3.5" />
            Plantilla Google Slides
          </button>

          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[38px] ${
              activeTab === 'scanner'
                ? 'bg-sky-700 text-white'
                : 'text-sky-700 hover:bg-sky-50'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Lector QR (5 de diciembre)
          </button>

          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-all min-h-[38px] ${
              activeTab === 'guide'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Sincronización y Ayuda
          </button>
        </nav>
      </div>
    </header>
  );
};
