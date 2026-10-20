import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Vitrines from './pages/Vitrines.js';
import VitrineDetail from './pages/VitrineDetail.js';
import Planning from './pages/Planning.js';
import Contrats from './pages/Contrats.js';
import Tresorerie from './pages/Tresorerie.js';
import Ventes from './pages/Ventes.js';
import Lieux from './pages/Lieux.js';
import Actions from './pages/Actions.js';
import Parametres from './pages/Parametres.js';
import Login from './pages/Login.js';

export interface User { id?: number; name?: string; email?: string; role?: string; [k: string]: any }
interface AuthCtx {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
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

  return <AuthContext.Provider value={{ user, token, login, logout }}>{children}</AuthContext.Provider>;
}

function Protected() {
  const { token } = useAuth();
  return token ? <Outlet /> : <Navigate to="/login" replace />;
}

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
            <Route path="/" element={<Dashboard />} />
            <Route path="/vitrines" element={<Vitrines />} />
            <Route path="/vitrines/:id" element={<VitrineDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/contrats" element={<Contrats />} />
            <Route path="/tresorerie" element={<Tresorerie />} />
            <Route path="/ventes" element={<Ventes />} />
            <Route path="/lieux" element={<Lieux />} />
            <Route path="/actions" element={<Actions />} />
            <Route path="/parametres" element={<Parametres />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
