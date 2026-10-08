import React, { useState } from 'react';
import {
  Mail,
  Lock,
  X,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  RotateCcw,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react';
import { storage } from '../services/storage';
import { User } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: User) => void;
  isFullScreen?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isFullScreen = false,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [recoveredPass, setRecoveredPass] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setErrorMsg('Informe o e-mail e a senha cadastrados.');
      return;
    }

    const result = storage.authenticate(cleanEmail, password);
    if (result.success && result.user) {
      setSuccessMsg(`Bem-vindo, ${result.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(result.user!);
        if (onClose) onClose();
      }, 500);
    } else {
      setErrorMsg(result.message || 'E-mail ou senha incorretos.');
    }
  };

  const handleRecover = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setRecoveredPass(null);

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Informe o e-mail cadastrado para recuperar a senha.');
      return;
    }

    const result = storage.recoverPassword(cleanEmail);
    if (result.success) {
      setSuccessMsg(result.message);
      setRecoveredPass(result.recoveredPassword || null);
    } else {
      setErrorMsg(result.message);
    }
  };

  const condo = storage.getCondo();

  const cardContent = (
    <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 border border-emerald-500/40 flex items-center justify-center overflow-hidden shrink-0 shadow-md">
            <img src="/app-icon.png" alt="Portaria360" className="w-full h-full object-cover" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              {mode === 'login' ? 'Acesso ao Sistema' : 'Recuperação de Senha'}
            </h3>
            <p className="text-[11px] text-slate-400">
              {condo.name || 'Portaria Condominial'}
            </p>
          </div>
        </div>

        {!isFullScreen && onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Body Form */}
      <div className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2 animate-in fade-in duration-150">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {recoveredPass && (
          <div className="p-3 rounded-lg bg-slate-950 border border-emerald-500/60 text-xs space-y-1.5">
            <span className="text-slate-400 block text-[11px]">Sua senha cadastrada:</span>
            <div className="font-mono text-emerald-400 font-bold text-sm bg-slate-900 px-3 py-2 rounded border border-slate-800 flex items-center justify-between">
              <span>{recoveredPass}</span>
              <button
                type="button"
                onClick={() => {
                  setPassword(recoveredPass);
                  setMode('login');
                }}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-sans hover:underline cursor-pointer"
              >
                Preencher no Login
              </button>
            </div>
          </div>
        )}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-mail do Operador / Usuário</span>
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Senha de Acesso</span>
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('recover');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  Esqueceu a senha?
                </button>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 pr-10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>Entrar no Sistema</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRecover} className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed">
              Digite o e-mail cadastrado na portaria para recuperar sua senha de acesso.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>E-mail Cadastrado</span>
              </label>
              <input
                type="email"
                required
                placeholder="seu.email@exemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded-lg transition-colors cursor-pointer"
              >
                Voltar ao Login
              </button>

              <button
                type="submit"
                className="flex-1 py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recuperar Senha</span>
              </button>
            </div>
          </form>
        )}

        <div className="pt-3 border-t border-slate-800/80 text-center space-y-2">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Sistema Seguro de Portaria Condominial · Portaria360</span>
          </p>
          <div className="text-[10px] text-slate-400 bg-slate-950/80 p-2.5 rounded-lg border border-slate-800 text-left space-y-1">
            <span className="font-semibold text-slate-300 block">Credenciais cadastradas na portaria:</span>
            <div className="font-mono text-[10px] space-y-0.5 text-slate-400">
              <p>• Porteiro Manhã: <strong className="text-slate-200">joao.portaria@solardaspalmeiras.com.br</strong> | Senha: <span className="text-emerald-400">portaria@joao</span></p>
              <p>• Porteiro Tarde: <strong className="text-slate-200">marcos.portaria@solardaspalmeiras.com.br</strong> | Senha: <span className="text-emerald-400">portaria@marcos</span></p>
              <p>• ADM Predial: <strong className="text-slate-200">sindico@solardaspalmeiras.com.br</strong> | Senha: <span className="text-emerald-400">admin@solarpalmeiras</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 w-full max-w-md">
          {cardContent}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
      {cardContent}
    </div>
  );
};
