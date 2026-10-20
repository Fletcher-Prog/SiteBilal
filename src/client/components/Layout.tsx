import { useState, type ReactNode } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../App.js';

const ic = (d: ReactNode) => (
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 shrink-0">{d}</svg>
);

const NAV: { to: string; label: string; short: string; extra?: boolean; icon: ReactNode }[] = [
  { to: '/', label: 'Tableau de bord', short: 'Accueil', icon: ic(<><rect x="2" y="2" width="7" height="7" rx="1.5" /><rect x="11" y="2" width="7" height="4" rx="1.5" /><rect x="2" y="11" width="7" height="7" rx="1.5" /><rect x="11" y="8" width="7" height="10" rx="1.5" /></>) },
  { to: '/vitrines', label: 'Parc vitrines', short: 'Vitrines', icon: ic(<><rect x="3" y="4" width="14" height="12" rx="2" /><path d="M3 8h14M8 16v2M12 16v2" /></>) },
  { to: '/planning', label: 'Planning', short: 'Planning', icon: ic(<><rect x="2" y="3" width="16" height="15" rx="2" /><path d="M2 8h16M7 2v3M13 2v3" /></>) },
  { to: '/contrats', label: 'Contrats', short: 'Contrats', extra: true, icon: ic(<><path d="M5 2h7l4 4v12H5z" /><path d="M12 2v4h4M8 10h5M8 13h5M8 16h3" /></>) },
  { to: '/tresorerie', label: 'Trésorerie', short: 'Tréso', icon: ic(<><rect x="2" y="5" width="16" height="10" rx="2" /><circle cx="10" cy="10" r="2.5" /><path d="M5 8v4M15 8v4" /></>) },
  { to: '/ventes', label: 'Ventes', short: 'Ventes', extra: true, icon: ic(<path d="M10 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L10 14.4l-4.8 2.5.9-5.4L2.2 7.7l5.4-.8L10 2z" />) },
  { to: '/lieux', label: 'Lieux de stockage', short: 'Lieux', extra: true, icon: ic(<><path d="M10 18s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" /><circle cx="10" cy="8" r="2.2" /></>) },
  { to: '/actions', label: 'Actions', short: 'Actions', extra: true, icon: ic(<><path d="M4 3h12v14H4z" /><path d="M7 7h6M7 10h6M7 13h4" /></>) },
  { to: '/parametres', label: 'Paramètres', short: 'Réglages', extra: true, icon: ic(<><circle cx="10" cy="10" r="2.8" /><circle cx="10" cy="10" r="5.6" /><path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4" /></>) },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);
  const name = user?.name || user?.email || 'Utilisateur';
  const role = user?.role || '';
  const initial = name.charAt(0).toUpperCase();

  const desktopCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'bg-teal-600/20 text-teal-300 font-semibold' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
    }`;
  const mobileCls = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] text-[10px] ${
      isActive ? 'text-teal-300 font-semibold' : 'text-gray-400'
    }`;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[230px] bg-gray-900 text-gray-100 flex-col z-40">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="text-teal-300">
            <rect x="2" y="6" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M2 11h24" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="14" cy="17" r="2" fill="currentColor" />
            <path d="M10 4v3M18 4v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-xl text-teal-300">VitriTrack</span>
        </div>
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5 overflow-y-auto">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={desktopCls}>
              {n.icon}
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-3 border-t border-gray-800 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-xs font-semibold">{initial}</div>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold truncate">{name}</div>
            <div className="text-[11px] text-gray-400">{role}</div>
          </div>
        </div>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 flex bg-gray-900 border-t border-gray-800 pb-[env(safe-area-inset-bottom)]">
        {NAV.filter((n) => !n.extra).map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === '/'} className={mobileCls}>
            {n.icon}
            {n.short}
          </NavLink>
        ))}
        <button type="button" aria-label="Plus d'options" onClick={() => setMoreOpen(true)} className="flex flex-col items-center justify-center gap-0.5 flex-1 min-h-[48px] text-[10px] text-gray-400">
          {ic(<><circle cx="5" cy="10" r="1.6" fill="currentColor" /><circle cx="10" cy="10" r="1.6" fill="currentColor" /><circle cx="15" cy="10" r="1.6" fill="currentColor" /></>)}
          Plus
        </button>
      </nav>

      {moreOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/45 z-[150]" onClick={() => setMoreOpen(false)} />
          <div role="dialog" aria-label="Plus d'options" className="md:hidden fixed bottom-0 inset-x-0 z-[200] bg-gray-900 text-gray-100 rounded-t-2xl pt-2 pb-6 max-h-[80vh] overflow-y-auto">
            <div className="w-9 h-1 rounded bg-gray-700 mx-auto mb-2" />
            {NAV.filter((n) => n.extra).map((n) => (
              <NavLink key={n.to} to={n.to} onClick={() => setMoreOpen(false)} className="flex items-center gap-3 min-h-[48px] px-5 text-[15px] font-medium text-gray-100">
                {n.icon}
                {n.label}
              </NavLink>
            ))}
            <div className="h-px bg-gray-800 mx-5 my-2" />
            <div className="flex items-center gap-3 px-5 py-2">
              <div className="w-9 h-9 rounded-full bg-teal-600/20 text-teal-300 flex items-center justify-center text-sm font-semibold">{initial}</div>
              <div>
                <div className="text-sm font-semibold">{name}</div>
                <div className="text-[11px] text-gray-400">{role}</div>
              </div>
            </div>
            <button type="button" onClick={() => { setMoreOpen(false); logout(); }} className="flex items-center gap-3 min-h-[48px] w-full px-5 text-[15px] font-medium text-red-400">
              Déconnexion
            </button>
          </div>
        </>
      )}

      {/* Main */}
      <div className="md:ml-[230px] min-h-screen pb-[76px] md:pb-0">
        <header className="flex items-center justify-between px-4 md:px-7 h-14 bg-white border-b border-slate-200">
          <span className="md:hidden font-bold text-teal-700">VitriTrack</span>
          <span className="hidden md:block" />
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">{name}</span>
            <button type="button" onClick={logout} className="px-3 py-1.5 text-xs font-semibold rounded-md border border-slate-300 bg-slate-100 hover:bg-slate-200 min-h-[36px]">
              Déconnexion
            </button>
          </div>
        </header>
        <main className="px-4 md:px-7 py-5">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
