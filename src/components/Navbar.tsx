import React from 'react';
import { LayoutDashboard, ClipboardCheck, Presentation, QrCode, BookOpen, RefreshCw, LogOut, Brain } from 'lucide-react';
import { User } from 'firebase/auth';
import { GoogleIcon } from './GoogleIcon';

export type AppTab = 'dashboard' | 'verification' | 'template' | 'scanner' | 'guide';

interface NavbarProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  pendingCount: number;
  onSyncForms: () => void;
  isSyncing: boolean;
  user: User | null;
  hasWorkspaceToken: boolean;
  onLogin: () => void;
  onLogout: () => void;
}

const TABS: { id: AppTab; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Resumen', icon: LayoutDashboard },
  { id: 'verification', label: 'Verificar pagos', icon: ClipboardCheck },
  { id: 'template', label: 'Plantilla Slides', icon: Presentation },
  { id: 'scanner', label: 'Lector QR', icon: QrCode },
  { id: 'guide', label: 'Sincronización y ayuda', icon: BookOpen },
];

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
  const isConnected = Boolean(user && hasWorkspaceToken);
  const initial = (user?.email || '?').charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Fila superior: marca + acciones de cuenta */}
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink text-white">
              <Brain className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-tight text-slate-900">Taller de Neuroimagen</p>
              <p className="truncate text-xs text-slate-500">Promoción 106 · 5 de diciembre</p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isConnected ? (
              <>
                <button
                  onClick={onSyncForms}
                  disabled={isSyncing}
                  title="Sincronizar con Google Forms"
                  aria-label="Sincronizar con Google Forms"
                  className="btn-outline px-3 sm:px-4"
                >
                  <RefreshCw className={`h-4 w-4 text-brand-700 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando…' : 'Sincronizar'}</span>
                </button>

                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-1 sm:pr-1.5">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {initial}
                  </span>
                  <span className="hidden max-w-[180px] truncate text-xs text-slate-600 xl:block">{user?.email}</span>
                  <button
                    onClick={onLogout}
                    title="Cerrar sesión"
                    aria-label="Cerrar sesión"
                    className="grid h-7 w-7 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <button onClick={onLogin} className="btn-outline">
                <GoogleIcon />
                <span>Conectar Google</span>
              </button>
            )}
          </div>
        </div>

        {/* Navegación por pestañas con indicador inferior */}
        <nav aria-label="Secciones" className="no-scrollbar -mb-px flex items-end gap-1 overflow-x-auto">
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-3 pb-3 pt-2 text-sm font-semibold transition-colors ${
                  active
                    ? 'border-brand-700 text-brand-800'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800'
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span>{tab.label}</span>
                {tab.id === 'verification' && pendingCount > 0 && (
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-bold leading-5 ${
                      active ? 'bg-amber-400 text-slate-950' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
