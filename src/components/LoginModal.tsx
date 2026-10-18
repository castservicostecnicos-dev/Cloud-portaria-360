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
  Key,
  Home,
  User,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { storage } from '../services/storage';
import { User as UserType } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onLoginSuccess: (user: UserType) => void;
  isFullScreen?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  isFullScreen = false,
}) => {
  const [profileType, setProfileType] = useState<'operador' | 'morador'>('morador');
  const [moradorSubTab, setMoradorSubTab] = useState<'login' | 'convite'>('login');

  // Common Login fields
  const [identifier, setIdentifier] = useState(''); // Email or CPF
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Invite self-registration fields
  const [inviteCode, setInviteCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [residentEmail, setResidentEmail] = useState('');
  const [residentPhone, setResidentPhone] = useState('');

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<'login' | 'recover'>('login');

  if (!isOpen) return null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanId = identifier.trim();
    if (!cleanId || !password) {
      setErrorMsg('Informe o e-mail/CPF e a senha de acesso.');
      return;
    }

    const result = storage.authenticate(cleanId, password);
    if (result.success && result.user) {
      setSuccessMsg(`Bem-vindo, ${result.user.name}!`);
      setTimeout(() => {
        onLoginSuccess(result.user!);
        if (onClose) onClose();
      }, 500);
    } else {
      setErrorMsg(result.message || 'Credenciais inválidas.');
    }
  };

  const handleRegisterWithInvite = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanCode = inviteCode.trim().toUpperCase();
    if (!cleanCode) {
      setErrorMsg('Informe o código de convite recebido da portaria.');
      return;
    }

    if (!newPassword || newPassword.length < 4) {
      setErrorMsg('A senha deve conter no mínimo 4 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('A confirmação de senha não confere.');
      return;
    }

    const regResult = storage.registerResidentAccount(
      cleanCode,
      newPassword,
      residentEmail.trim() || undefined,
      residentPhone.trim() || undefined
    );

    if (regResult.success && regResult.user) {
      setSuccessMsg(`Conta ativada com sucesso! Bem-vindo(a), ${regResult.user.name}.`);
      setTimeout(() => {
        onLoginSuccess(regResult.user!);
        if (onClose) onClose();
      }, 800);
    } else {
      setErrorMsg(regResult.message || 'Erro ao ativar convite.');
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
              {profileType === 'morador' ? 'Portal do Morador' : 'Acesso da Portaria'}
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

      {/* Main Profile Tabs Switcher (Morador vs Portaria/ADM) */}
      <div className="grid grid-cols-2 p-1.5 bg-slate-950 border-b border-slate-800 gap-1.5">
        <button
          type="button"
          onClick={() => {
            setProfileType('morador');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            profileType === 'morador'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Home className="w-3.5 h-3.5" />
          <span>Sou Morador</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setProfileType('operador');
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            profileType === 'operador'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Portaria & Síndico</span>
        </button>
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

        {/* Morador Subtabs: Já possuo senha OU Ativar Convite da Portaria */}
        {profileType === 'morador' && mode === 'login' && (
          <div className="flex border-b border-slate-800 pb-2 mb-2 gap-4">
            <button
              type="button"
              onClick={() => {
                setMoradorSubTab('login');
                setErrorMsg(null);
              }}
              className={`text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer ${
                moradorSubTab === 'login'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Já tenho Senha
            </button>
            <button
              type="button"
              onClick={() => {
                setMoradorSubTab('convite');
                setErrorMsg(null);
              }}
              className={`text-xs font-semibold pb-1 border-b-2 transition-all cursor-pointer flex items-center gap-1 ${
                moradorSubTab === 'convite'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Key className="w-3.5 h-3.5 text-purple-400" />
              <span>Ativar Convite da Portaria</span>
            </button>
          </div>
        )}

        {mode === 'login' ? (
          profileType === 'morador' && moradorSubTab === 'convite' ? (
            /* Morador Self-Registration with Invite Code */
            <form onSubmit={handleRegisterWithInvite} className="space-y-3.5">
              <div className="p-3 bg-purple-950/30 border border-purple-800/40 rounded-xl text-[11px] text-purple-200 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-purple-300">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Primeiro Acesso do Morador
                </span>
                <p className="text-slate-300 text-[11px]">
                  Insira o código enviado pela portaria (WhatsApp ou impresso) para ativar sua conta e definir sua senha pessoal.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-purple-400" />
                  <span>Código de Convite da Portaria *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: CONV-101A-9821"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 font-mono uppercase text-xs text-purple-300 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Crie sua Senha *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Mín. 4 dígitos"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Confirmar Senha *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Repita a senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  E-mail para Avisos do Condomínio (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="seu.email@exemplo.com"
                  value={residentEmail}
                  onChange={(e) => setResidentEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 active:scale-[0.99] text-white text-xs font-bold rounded-lg shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Cadastrar Senha & Entrar</span>
                </button>
              </div>

              {/* Sample Code for fast testing */}
              <div className="pt-2 border-t border-slate-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setInviteCode('CONV-102A-8821');
                    setNewPassword('morador123');
                    setConfirmPassword('morador123');
                    setResidentEmail('rodrigo.medeiros@outlook.com');
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  Testar com Convite Demo (Apt 102 - Bloco A)
                </button>
              </div>
            </form>
          ) : (
            /* Standard Login Form (Morador ou Operador) */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {profileType === 'morador' ? 'E-mail ou CPF do Morador' : 'E-mail do Operador / Usuário'}
                  </span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    profileType === 'morador'
                      ? 'Digite seu e-mail ou CPF'
                      : 'Digite seu e-mail de acesso'
                  }
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
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
                  className={`w-full py-2.5 px-4 text-white text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    profileType === 'morador'
                      ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-950/50'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-950/50'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>
                    {profileType === 'morador' ? 'Entrar no Portal do Morador' : 'Entrar na Portaria'}
                  </span>
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5">
              <span className="font-bold text-white block">Recuperação de Senha</span>
              <p className="text-slate-400">
                Se você é morador e esqueceu sua senha, solicite um novo código de convite ou reset diretamente à portaria do condomínio.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Voltar ao Login
            </button>
          </div>
        )}

        <div className="pt-3 border-t border-slate-800/80 text-center">
          <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Portaria360 · Sistema de Gestão e Convivência</span>
          </p>
        </div>
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

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
