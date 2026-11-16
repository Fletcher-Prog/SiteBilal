import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Vitrines from './pages/Vitrines.js';
import VitrineDetail from './pages/VitrineDetail.js';
import Planning from './pages/Planning.js';
import Contrats from './pages/Contrats.js';
import Tresorerie from './pages/Tresorerie.js';
import Lieux from './pages/Lieux.js';
import Actions from './pages/Actions.js';
import Parametres from './pages/Parametres.js';
import Login from './pages/Login.js';
import api from './lib/api.js';
import { hasPerm, canSeeParametres, firstAllowedPath } from './lib/permissions.js';

export interface User { id?: number; name?: string; email?: string; role?: string; permissions?: string[]; [k: string]: any }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  can: (perm: string) => boolean;
}

const AuthContext = createContext<AuthCtx>(null as unknown as AuthCtx);
export const useAuth = () => useContext(AuthContext);

function readUser(): User | null {
  try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; }
}

function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: email.includes('@') ? email.split('@')[0].replace(/^./, (c) => c.toUpperCase()) : email, email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Identifiants invalides');
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    window.location.href = '/login';
  }, []);

  // Les droits peuvent changer côté admin : on les relit à chaque ouverture de l'appli.
  useEffect(() => {
    if (!token) return;
    api.get('/auth/me').then((u: User) => { localStorage.setItem('user', JSON.stringify(u)); setUser(u); }).catch(() => {});
  }, [token]);

  const can = useCallback((perm: string) => hasPerm(user, perm), [user]);

  return <AuthContext.Provider value={{ user, token, login, logout, can }}>{children}</AuthContext.Provider>;
}

function Protected() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

function Guard({ allowed, children }: { allowed: (u: User | null) => boolean; children: ReactNode }) {
  const { user } = useAuth();
  if (allowed(user)) return <>{children}</>;
  const home = firstAllowedPath(user);
  if (home && home !== window.location.pathname) return <Navigate to={home} replace />;
  return <div className="rounded-md bg-amber-50 p-4 text-sm text-amber-800">Votre compte n'a accès à aucune page. Contactez un administrateur.</div>;
}
const need = (perm: string) => (u: User | null) => hasPerm(u, perm);

export default function App() {
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: any) => { e.preventDefault(); setDeferredPrompt(e); setShowInstall(true); };
    window.addEventListener('beforeinstallprompt', handler);
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
    if (isIos && !isStandalone) setShowInstall(true);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(() => { setDeferredPrompt(null); setShowInstall(false); });
    } else {
      alert('Sur Safari, appuyez sur le bouton Partager puis "Sur l\'écran d\'accueil"');
      setShowInstall(false);
    }
  }

  return (
    <AuthProvider>
      {showInstall && (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-3 flex items-center justify-between z-50">
          <span className="text-sm">Installez VitriTrack sur votre appareil</span>
          <div className="flex gap-2">
            <button onClick={() => setShowInstall(false)} className="text-xs opacity-75">Plus tard</button>
            <button onClick={handleInstall} className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium">Installer</button>
          </div>
        </div>
      )}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Protected />}>
          <Route element={<Layout />}>
            <Route path="/" element={<Guard allowed={need('dashboard')}><Dashboard /></Guard>} />
            <Route path="/vitrines" element={<Guard allowed={need('vitrines')}><Vitrines /></Guard>} />
            <Route path="/vitrines/:id" element={<Guard allowed={need('vitrines')}><VitrineDetail /></Guard>} />
            <Route path="/planning" element={<Guard allowed={need('planning')}><Planning /></Guard>} />
            <Route path="/contrats" element={<Guard allowed={need('contrats')}><Contrats /></Guard>} />
            <Route path="/tresorerie" element={<Guard allowed={need('tresorerie')}><Tresorerie /></Guard>} />
            <Route path="/ventes" element={<Navigate to="/vitrines?etat=vendue" replace />} />
            <Route path="/lieux" element={<Guard allowed={need('lieux')}><Lieux /></Guard>} />
            <Route path="/actions" element={<Guard allowed={need('actions')}><Actions /></Guard>} />
            <Route path="/parametres" element={<Guard allowed={canSeeParametres}><Parametres /></Guard>} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
