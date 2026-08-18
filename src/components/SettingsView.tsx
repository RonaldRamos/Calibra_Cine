import React, { useState, useRef } from 'react';
import {
  Settings,
  Building,
  Upload,
  Download,
  Database,
  CheckCircle,
  AlertTriangle,
  Moon,
  Sun,
  Globe,
  Mail,
  Send,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CompanyConfig, User, SMTPConfig } from '../types';
import {
  getCompanyConfig,
  saveCompanyConfig,
  exportDatabaseJSON,
  importDatabaseJSON,
  addActivityLog,
} from '../services/storageService';

interface SettingsViewProps {
  currentUser: User | null;
  onRefresh: () => void;
  isDarkMode?: boolean;
  onToggleTheme?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onRefresh,
  isDarkMode,
  onToggleTheme,
}) => {
  const [config, setConfig] = useState<CompanyConfig>(getCompanyConfig());
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const smtpConfig: SMTPConfig = config.smtp || {
    host: '',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromName: config.name || 'CalibraCine',
    fromEmail: config.email || '',
  };

  const handleSmtpChange = (field: keyof SMTPConfig, value: any) => {
    setConfig({
      ...config,
      smtp: {
        ...smtpConfig,
        [field]: value,
      },
    });
  };

  const handleOfficialEmailChange = (newEmail: string) => {
    const oldEmail = config.email;
    const currentSmtp = config.smtp || {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      user: newEmail,
      pass: '',
      fromName: config.name || 'CalibraCine',
      fromEmail: newEmail,
    };

    const shouldSyncFromEmail =
      !currentSmtp.fromEmail ||
      currentSmtp.fromEmail === oldEmail ||
      currentSmtp.fromEmail.includes('calibracine.com') ||
      currentSmtp.fromEmail.includes('nao-responda');

    const shouldSyncUser =
      !currentSmtp.user ||
      currentSmtp.user === oldEmail ||
      currentSmtp.user.includes('calibracine.com') ||
      currentSmtp.user.includes('nao-responda');

    setConfig({
      ...config,
      email: newEmail,
      smtp: {
        ...currentSmtp,
        fromEmail: shouldSyncFromEmail ? newEmail : currentSmtp.fromEmail,
        user: shouldSyncUser ? newEmail : currentSmtp.user,
      },
    });
  };

  const handleTestSmtp = async () => {
    setTestingSmtp(true);
    setSmtpTestResult(null);

    try {
      const res = await fetch('/api/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtpConfig: config.smtp,
          companyEmail: config.email,
          companyName: config.name,
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setSmtpTestResult({
          success: true,
          message: data.message || 'Conexão com o servidor SMTP testada com sucesso!',
        });
      } else {
        setSmtpTestResult({
          success: false,
          message: data.error || 'Falha na conexão SMTP.',
        });
      }
    } catch (err: any) {
      setSmtpTestResult({
        success: false,
        message: err.message || 'Erro de rede ao testar servidor SMTP.',
      });
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveCompanyConfig(config);
    addActivityLog('CONFIG_SISTEMA', `Configurações da empresa atualizadas por ${currentUser?.name}`, currentUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onRefresh();
  };

  const handleExportBackup = () => {
    const jsonStr = exportDatabaseJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `CMM_Backup_Database_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content && importDatabaseJSON(content)) {
        alert('Banco de dados restaurado com sucesso!');
        onRefresh();
      } else {
        alert('Falha ao importar o arquivo de backup. Formato JSON inválido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
          Preferências Gerais
        </span>
        <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Configurações do Sistema</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Defina o cabeçalho dos relatórios em PDF, gerencie backups e escolha o tema visual.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          <span>Configurações salvas com sucesso!</span>
        </div>
      )}

      {/* Company Info Form */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          Dados da Empresa (Impressos no Cabeçalho do PDF)
        </h3>

        <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome da Empresa *</label>
              <input
                type="text"
                required
                value={config.name}
                onChange={(e) => setConfig({ ...config, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">CNPJ *</label>
              <input
                type="text"
                required
                value={config.cnpj}
                onChange={(e) => setConfig({ ...config, cnpj: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone Suporte</label>
              <input
                type="text"
                value={config.phone}
                onChange={(e) => setConfig({ ...config, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                E-mail Oficial (Destinatário Padrão & Remetente)
              </label>
              <input
                type="email"
                value={config.email}
                onChange={(e) => handleOfficialEmailChange(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold mt-1 block">
                Sempre que alterado, este e-mail atualiza os envios automáticos de relatórios e o remetente/usuário do servidor SMTP.
              </span>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Endereço Sede</label>
            <input
              type="text"
              value={config.address}
              onChange={(e) => setConfig({ ...config, address: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      {/* SMTP Email Server Configuration */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-emerald-500" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Servidor de E-mail (SMTP)
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
            Envio Automático de Relatórios PDF
          </span>
        </div>

        <p className="text-xs text-slate-500 dark:text-slate-400">
          Configure as credenciais SMTP da sua empresa (Gmail, Outlook, SendGrid, Amazon SES, etc) para disparar relatórios técnicos diretamente para os clientes ou gestores de cinema.
        </p>

        {smtpTestResult && (
          <div
            className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              smtpTestResult.success
                ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
            }`}
          >
            {smtpTestResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{smtpTestResult.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Servidor SMTP (Host)</label>
            <input
              type="text"
              placeholder="smtp.gmail.com"
              value={smtpConfig.host}
              onChange={(e) => handleSmtpChange('host', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Porta</label>
              <input
                type="number"
                placeholder="587"
                value={smtpConfig.port}
                onChange={(e) => handleSmtpChange('port', Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">SSL/TLS</label>
              <select
                value={smtpConfig.secure ? 'true' : 'false'}
                onChange={(e) => handleSmtpChange('secure', e.target.value === 'true')}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
              >
                <option value="false">STARTTLS (587)</option>
                <option value="true">SSL / TLS (465)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Usuário / E-mail de Autenticação</label>
            <input
              type="email"
              placeholder="seu-email@gmail.com"
              value={smtpConfig.user}
              onChange={(e) => handleSmtpChange('user', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Senha do E-mail / Senha de App</label>
            <input
              type="password"
              placeholder="Senha de 16 letras gerada no Google"
              value={smtpConfig.pass}
              onChange={(e) => handleSmtpChange('pass', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome do Remetente</label>
            <input
              type="text"
              placeholder="CalibraCine Suporte"
              value={smtpConfig.fromName}
              onChange={(e) => handleSmtpChange('fromName', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail do Remetente</label>
            <input
              type="email"
              placeholder="seu-email@gmail.com"
              value={smtpConfig.fromEmail}
              onChange={(e) => handleSmtpChange('fromEmail', e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Instructions box for Gmail configuration */}
        <div className="bg-amber-50/80 dark:bg-amber-950/40 p-4 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-950 dark:text-amber-200 space-y-2.5">
          <p className="font-bold text-amber-900 dark:text-amber-100 flex items-center gap-1.5 text-sm">
            💡 Como liberar a Senha de App na sua conta do Google:
          </p>
          <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
            A mensagem <em>"A configuração não está disponível para sua conta"</em> aparece porque o Google exige que a <strong>Verificação em 2 Etapas</strong> esteja ativada antes de permitir a criação de Senhas de App.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <a
              href="https://myaccount.google.com/signinoptions/two-step-verification"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] font-bold text-amber-900 dark:text-amber-200 flex flex-col gap-0.5 shadow-2xs"
            >
              <span>1️⃣ Passo 1 (Obrigatório):</span>
              <span className="text-sky-600 dark:text-sky-400 font-extrabold underline">Ativar Verificação em 2 Etapas ↗</span>
            </a>

            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2.5 bg-white dark:bg-slate-900 hover:bg-slate-50 border border-amber-300 dark:border-amber-700 rounded-lg text-[11px] font-bold text-amber-900 dark:text-amber-200 flex flex-col gap-0.5 shadow-2xs"
            >
              <span>2️⃣ Passo 2:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold underline">Gerar Senha de App (16 letras) ↗</span>
            </a>
          </div>

          <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400 pt-1 border-t border-amber-200/80 dark:border-amber-800/80 space-y-0.5">
            <p>• Digite qualquer nome no Google (ex: <code>CalibraCine</code>) e clique em <strong>Criar</strong>.</p>
            <p>• Copie a senha amarela de 16 letras gerada e cole no campo <strong>Senha do E-mail</strong> acima.</p>
          </div>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleTestSmtp}
            disabled={testingSmtp}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {testingSmtp ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Testando conexão...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5 text-emerald-600" />
                <span>Testar Conexão SMTP</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer"
          >
            Salvar Configurações SMTP
          </button>
        </div>
      </div>

      {/* Backup & Database JSON Restore */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          Backup e Restauração de Dados
        </h3>

        <p className="text-xs text-slate-500">
          Exporte todo o banco de dados do CMM (cinemas, salas, relatórios, cadastros e logs) para um arquivo JSON de segurança ou restaure dados gravados.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleExportBackup}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Fazer Backup do Banco (JSON)</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center gap-2 border border-slate-700 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Restaurar Backup JSON</span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportBackup}
            className="hidden"
          />
        </div>
      </div>
    </div>
  );
};
