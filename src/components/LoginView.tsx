import React, { useState, useEffect } from 'react';
import { Lock, Shield, Wrench, ArrowRight, Eye, EyeOff, KeyRound, ChevronRight, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { User } from '../types';
import { getUsers, setCurrentUser, addActivityLog, getCompanyConfig, subscribeToStorageUpdates } from '../services/storageService';
import { CalibraCineLogo } from './CalibraCineLogo';

interface LoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [, setTick] = useState(0);

  useEffect(() => {
    return subscribeToStorageUpdates((type) => {
      if (!type || type === 'users' || type === 'company_config') {
        setTick((t) => t + 1);
      }
    });
  }, []);

  // Always fetch fresh list of users
  const allUsers = getUsers().filter((u) => !u.status || u.status.toLowerCase() === 'ativo');
  const technicians = allUsers.filter((u) => u.role !== 'admin');
  const admins = allUsers.filter((u) => u.role === 'admin');

  const [selectedAdmin, setSelectedAdmin] = useState<User | null>(null);
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showManualForm, setShowManualForm] = useState(false);

  // Recovery modal state
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [isSendingRecovery, setIsSendingRecovery] = useState(false);
  const [recoveryResult, setRecoveryResult] = useState<{ success: boolean; message: string } | null>(null);

  // Manual email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Handle direct technician/user login without password
  const handleTechnicianSelect = (user: User) => {
    setCurrentUser(user);
    addActivityLog('LOGIN_TECNICO', `Acesso do usuário: ${user.name}`, user);
    onLoginSuccess(user);
  };

  // Handle Admin login with password
  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!selectedAdmin) return;

    // Fetch fresh user data from storage to guarantee we have the latest password
    const latestUsers = getUsers();
    const freshAdmin = latestUsers.find((u) => u.id === selectedAdmin.id) || selectedAdmin;

    const entered = adminPassword.trim();
    const stored = (freshAdmin.password || '').trim();

    // Valid if matches stored password OR matches default admin passwords '257910' or 'admin' or '123'
    const isValid =
      (stored !== '' && entered === stored) ||
      entered === '257910' ||
      entered === 'admin' ||
      entered === '123';

    if (isValid) {
      setCurrentUser(freshAdmin);
      addActivityLog('LOGIN_ADMIN', `Acesso admin autenticado por ${freshAdmin.name}`, freshAdmin);
      onLoginSuccess(freshAdmin);
    } else {
      setErrorMessage('Senha incorreta. Por favor, tente novamente.');
    }
  };

  // Trigger Password Recovery E-mail Dispatch
  const handleTriggerPasswordRecovery = async () => {
    const config = getCompanyConfig();
    const targetEmail = selectedAdmin?.email || config.email || 'admin@calibracine.com';
    setRecoveryEmail(targetEmail);
    setShowRecoveryModal(true);
    setIsSendingRecovery(true);
    setRecoveryResult(null);

    try {
      const response = await fetch('/api/recover-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          smtpConfig: config.smtp,
          companyEmail: config.email,
          companyName: config.name,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setRecoveryResult({
          success: true,
          message: data.message || `E-mail de recuperação enviado para ${targetEmail}`,
        });
      } else {
        setRecoveryResult({
          success: false,
          message: data.error || 'Falha ao enviar e-mail de recuperação.',
        });
      }
    } catch (err: any) {
      setRecoveryResult({
        success: false,
        message: 'Servidor indisponível no momento. Tente novamente mais tarde.',
      });
    } finally {
      setIsSendingRecovery(false);
      addActivityLog(
        'RECUPERACAO_SENHA',
        `Solicitação de recuperação de senha para (${targetEmail})`,
        selectedAdmin || null
      );
    }
  };

  // Handle manual email login
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const latestUsers = getUsers();
    const user = latestUsers.find((u) => u.email.toLowerCase().trim() === email.toLowerCase().trim());
    if (!user) {
      setErrorMessage('E-mail não encontrado no sistema.');
      return;
    }

    if (user.role === 'admin') {
      const entered = password.trim();
      const stored = (user.password || '').trim();
      const isValid =
        (stored !== '' && entered === stored) ||
        entered === '257910' ||
        entered === 'admin' ||
        entered === '123';

      if (!isValid) {
        setErrorMessage('Senha incorreta para Administrador.');
        return;
      }
    }

    setCurrentUser(user);
    addActivityLog('LOGIN_MANUAL', `Acesso manual efetuado por ${user.name}`, user);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative z-10 space-y-6">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <CalibraCineLogo size="lg" showTagline={true} />
          <p className="text-xs text-slate-400 font-medium pt-1">
            Selecione o seu usuário para acessar o painel
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-950/80 border border-rose-800 rounded-xl text-xs font-semibold text-rose-200 text-center animate-fadeIn">
            {errorMessage}
          </div>
        )}

        {!showManualForm ? (
          <div className="space-y-5">
            {/* Section 1: Technicians / Operators */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5 text-blue-400">
                  <Wrench className="w-3.5 h-3.5" />
                  Técnicos ({technicians.length})
                </span>
                <span className="text-[10px] text-slate-500">Acesso Direto</span>
              </div>

              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-1">
                {technicians.length > 0 ? (
                  technicians.map((tech) => (
                    <button
                      key={tech.id}
                      type="button"
                      onClick={() => handleTechnicianSelect(tech)}
                      className="w-full p-3 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-blue-500/50 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-900/50 border border-blue-700/50 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                          {tech.name.charAt(0)}
                        </div>
                        <div className="overflow-hidden">
                          <div className="font-bold text-xs text-slate-200 group-hover:text-white truncate">
                            {tech.name}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {tech.specialty || tech.email}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="p-3 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                    Nenhum técnico cadastrado
                  </div>
                )}
              </div>
            </div>

            {/* Section 2: Administrators */}
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  Administrador ({admins.length})
                </span>
                <span className="text-[10px] text-slate-500">Exige Senha</span>
              </div>

              <div className="grid grid-cols-1 gap-2">
                {admins.map((admin) => (
                  <button
                    key={admin.id}
                    type="button"
                    onClick={() => {
                      setSelectedAdmin(admin);
                      setAdminPassword('');
                      setErrorMessage('');
                    }}
                    className="w-full p-3 bg-amber-950/20 hover:bg-amber-950/40 border border-amber-900/40 hover:border-amber-500/60 rounded-xl text-left transition-all cursor-pointer group flex items-center justify-between gap-3 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-amber-900/50 border border-amber-700/50 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="overflow-hidden">
                        <div className="font-bold text-xs text-amber-200 group-hover:text-amber-100 truncate">
                          {admin.name}
                        </div>
                        <div className="text-[11px] text-amber-400/80 truncate">
                          {admin.email}
                        </div>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 bg-amber-600/80 group-hover:bg-amber-500 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 transition-colors">
                      <KeyRound className="w-3 h-3" />
                      Entrar
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Toggle manual login form option */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowManualForm(true)}
                className="text-xs text-slate-400 hover:text-slate-200 font-medium underline underline-offset-4 cursor-pointer transition-colors"
              >
                Entrar digitando e-mail e senha
              </button>
            </div>
          </div>
        ) : (
          /* Manual Email & Password Form */
          <form onSubmit={handleManualLogin} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                E-mail de Cadastro
              </label>
              <input
                type="email"
                required
                placeholder="seu.email@calibracine.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Senha (Se Admin)
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowManualForm(false)}
                className="text-xs text-slate-400 hover:text-slate-200 font-semibold cursor-pointer"
              >
                ← Voltar para seleção rápida
              </button>

              <button
                type="submit"
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <span>Entrar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800/80 text-center text-[11px] text-slate-500 space-y-0.5">
          <p className="font-semibold text-slate-400">CalibraCine v2.3</p>
          <p>Ronald Ramos • Gestão Técnica de Cinema</p>
        </div>
      </div>

      {/* Admin Password Modal */}
      {selectedAdmin && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  Acesso Administrativo
                </h3>
                <p className="text-xs text-slate-400">
                  {selectedAdmin.name}
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-2.5 bg-rose-950/80 border border-rose-800 rounded-lg text-xs font-semibold text-rose-200">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Digite a senha:
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoFocus
                    placeholder="Sua senha de admin"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleTriggerPasswordRecovery}
                    className="text-[11px] font-semibold text-amber-400 hover:underline flex items-center gap-1.5 cursor-pointer"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Esqueceu a senha? Enviar por e-mail</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAdmin(null);
                    setAdminPassword('');
                    setErrorMessage('');
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer transition-colors"
                >
                  Autenticar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PASSWORD RECOVERY MODAL */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-950 border border-blue-800 text-blue-400 flex items-center justify-center shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-white">
                  Recuperação de Senha
                </h3>
                <p className="text-xs text-slate-400">
                  Instruções para acesso
                </p>
              </div>
            </div>

            {isSendingRecovery ? (
              <div className="p-6 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-blue-400 animate-spin mx-auto" />
                <p className="text-xs text-slate-300 font-semibold">
                  Enviando e-mail de recuperação para {recoveryEmail}...
                </p>
              </div>
            ) : recoveryResult ? (
              <div className="space-y-3">
                <div
                  className={`p-4 border rounded-xl space-y-2 text-xs ${
                    recoveryResult.success
                      ? 'bg-blue-950/30 border-blue-900/60 text-blue-200'
                      : 'bg-amber-950/30 border-amber-900/60 text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold">
                    {recoveryResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <span>{recoveryResult.success ? 'E-mail Processado' : 'Aviso de Envio'}</span>
                  </div>
                  <p className="text-slate-300 leading-relaxed font-medium">
                    {recoveryResult.message}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowRecoveryModal(false)}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
