import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../App.js';

const USERS = [
  { name: 'Bilel', email: 'bilel@vitritrack.fr', cls: 'bg-blue-100 text-blue-800' },
  { name: 'Oussama', email: 'oussama@vitritrack.fr', cls: 'bg-amber-100 text-amber-800' },
];

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      nav('/');
    } catch (err: any) {
      setError(err.message || 'Connexion impossible');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white border border-slate-200 rounded-xl shadow-md p-6 w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-2">
          <svg width="40" height="40" viewBox="0 0 28 28" fill="none" className="text-slate-800">
            <rect x="2" y="6" width="24" height="16" rx="3" stroke="currentColor" strokeWidth="2" fill="#E6F5F3" />
            <path d="M2 11h24" stroke="#0E8C7F" strokeWidth="1.5" />
            <circle cx="14" cy="17" r="2" fill="#0E8C7F" />
            <path d="M10 4v3M18 4v3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="font-bold text-3xl text-teal-700">VitriTrack</span>
        </div>
        <p className="text-center text-sm text-slate-500 mb-5">Gestion des vitrines réfrigérantes · Bilel &amp; Oussama</p>

        <div className="space-y-2">
          {USERS.map((u) => (
            <button
              key={u.name}
              type="button"
              onClick={() => { setEmail(u.email); setPassword('admin123'); setError(''); }}
              className="w-full flex items-center gap-3 border border-slate-200 rounded-lg px-3 py-2 text-left hover:bg-slate-50"
            >
              <span className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold ${u.cls}`}>{u.name[0]}</span>
              <span>
                <strong className="block">{u.name}</strong>
                <span className="text-xs text-slate-500">{u.email}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 my-4">
          <span className="flex-1 h-px bg-slate-200" />ou par email<span className="flex-1 h-px bg-slate-200" />
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block text-sm font-medium text-slate-700">Email
            <input className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal" type="email" placeholder="bilel@vitritrack.fr" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="block text-sm font-medium text-slate-700">Mot de passe
            <input className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 font-normal" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="bg-red-100 text-red-800 rounded-md px-3 py-2 text-sm">{error}</div>}
          <button disabled={busy} className="w-full bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-semibold rounded-md py-2" type="submit">Se connecter</button>
        </form>
      </div>
    </div>
  );
}
