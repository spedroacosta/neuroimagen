import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LayoutDashboard,
  ClipboardCheck,
  Presentation,
  QrCode,
  BookOpen,
  RefreshCw,
  LogOut,
  Brain,
  ChevronDown,
} from 'lucide-react';
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

interface TabDef {
  id: AppTab;
  label: string;
  short: string;
  icon: React.ElementType;
}

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Resumen', short: 'Resumen', icon: LayoutDashboard },
  { id: 'verification', label: 'Verificar pagos', short: 'Pagos', icon: ClipboardCheck },
  { id: 'template', label: 'Plantilla Slides', short: 'Slides', icon: Presentation },
  { id: 'scanner', label: 'Lector QR', short: 'QR', icon: QrCode },
  { id: 'guide', label: 'Sincronización y ayuda', short: 'Ayuda', icon: BookOpen },
];

const SPRING = { type: 'spring', stiffness: 520, damping: 42 } as const;
const FLUID = [0.22, 1, 0.36, 1] as const;

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
  const [menuOpen, setMenuOpen] = useState(false);
  const isConnected = Boolean(user && hasWorkspaceToken);
  const initial = (user?.email || '?').charAt(0).toUpperCase();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* ───────── Cabecera superior ───────── */}
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-6 lg:px-8">
        <motion.div
          initial={{ y: -24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: FLUID }}
          className="glass mx-auto flex max-w-7xl items-center gap-3 rounded-[22px] px-3 py-2.5 sm:px-4"
        >
          {/* Marca */}
          <div className="flex min-w-0 items-center gap-3">
            <motion.div
              whileHover={{ rotate: -8, scale: 1.05 }}
              whileTap={{ scale: 0.94 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-ink text-white shadow-lg shadow-slate-900/25"
            >
              <Brain className="h-5 w-5" aria-hidden="true" />
            </motion.div>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-semibold tracking-tight text-slate-900">Taller de Neuroimagen</p>
              <p className="truncate text-[11px] text-slate-500">Promoción 106 · 5 de diciembre</p>
            </div>
          </div>

          {/* Pestañas en escritorio: píldora que se desliza */}
          <nav aria-label="Secciones" className="ml-auto hidden md:block">
            <div className="flex items-center gap-1 rounded-full bg-slate-900/[0.05] p-1">
              {TABS.map((tab) => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    aria-current={active ? 'page' : undefined}
                    className={`relative flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                      active ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {active && (
                      <motion.span
                        layoutId="desk-pill"
                        transition={SPRING}
                        className="absolute inset-0 rounded-full bg-white shadow-sm shadow-slate-900/10"
                      />
                    )}
                    <Icon className="relative h-4 w-4" aria-hidden="true" />
                    <span className="relative whitespace-nowrap">{tab.label}</span>
                    {tab.id === 'verification' && pendingCount > 0 && (
                      <span className="relative rounded-full bg-amber-400 px-1.5 text-[11px] font-bold leading-5 text-slate-900 tabular-nums">
                        {pendingCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Acciones de cuenta */}
          <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0">
            {isConnected ? (
              <>
                <button
                  onClick={onSyncForms}
                  disabled={isSyncing}
                  title="Sincronizar con Google Forms"
                  aria-label="Sincronizar con Google Forms"
                  className="btn-outline h-10 w-10 !px-0 sm:w-auto sm:!px-4"
                >
                  <RefreshCw className={`h-4 w-4 text-brand-700 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando…' : 'Sincronizar'}</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-1.5 rounded-full bg-white/80 py-1 pl-1 pr-2 shadow-sm ring-1 ring-slate-900/5 transition-transform active:scale-95"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-xs font-bold text-white">
                      {initial}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-slate-500 transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  <AnimatePresence>
                    {menuOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                        <motion.div
                          role="menu"
                          initial={{ opacity: 0, y: -8, scale: 0.94 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -8, scale: 0.94 }}
                          transition={{ duration: 0.22, ease: FLUID }}
                          className="glass absolute right-0 top-12 z-50 w-64 origin-top-right rounded-3xl p-2"
                        >
                          <div className="px-3 pb-2 pt-2.5">
                            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                              Sesión iniciada
                            </p>
                            <p className="truncate text-sm font-medium text-slate-900">{user?.email}</p>
                          </div>
                          <div className="my-1 h-px bg-slate-900/5" />
                          <button
                            role="menuitem"
                            disabled={isSyncing}
                            onClick={() => {
                              setMenuOpen(false);
                              onSyncForms();
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-slate-800 transition-colors hover:bg-slate-900/5 disabled:opacity-50"
                          >
                            <RefreshCw className="h-4 w-4 text-brand-700" />
                            {isSyncing ? 'Sincronizando…' : 'Sincronizar Google Forms'}
                          </button>
                          <button
                            role="menuitem"
                            onClick={() => {
                              setMenuOpen(false);
                              onLogout();
                            }}
                            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50"
                          >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                          </button>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <button onClick={onLogin} className="btn-outline">
                <GoogleIcon />
                <span>Conectar Google</span>
              </button>
            )}
          </div>
        </motion.div>
      </header>

      {/* ───────── Barra flotante inferior (móvil) ───────── */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-3 bottom-3 z-40 md:hidden"
        style={{ bottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.7, ease: FLUID, delay: 0.1 }}
          className="glass mx-auto flex max-w-md items-stretch justify-between gap-0.5 rounded-[26px] p-1.5"
        >
          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 rounded-[20px] py-2 transition-colors ${
                  active ? 'text-slate-900' : 'text-slate-500'
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="dock-pill"
                    transition={SPRING}
                    className="absolute inset-0 rounded-[20px] bg-white shadow-md shadow-slate-900/10"
                  />
                )}
                <span className="relative">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                  {tab.id === 'verification' && pendingCount > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-900 tabular-nums">
                      {pendingCount}
                    </span>
                  )}
                </span>
                <span className="relative text-[10px] font-semibold tracking-tight">{tab.short}</span>
              </button>
            );
          })}
        </motion.div>
      </nav>
    </>
  );
};
