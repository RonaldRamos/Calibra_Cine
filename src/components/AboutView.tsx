import React from 'react';
import { CalibraCineLogo } from './CalibraCineLogo';
import {
  Clapperboard,
  ShieldCheck,
  CheckCircle2,
  Mail,
  User,
  Tv,
  Cpu,
  FileText,
  Award,
  Code,
  Sparkles,
} from 'lucide-react';

export const AboutView: React.FC = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-8 shadow-md relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <Clapperboard className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/20 border border-amber-400/30 rounded-full text-amber-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Versão 1.0.0.1 Enterprise</span>
          </div>

          <div className="flex items-center gap-4">
            <CalibraCineLogo size="xl" showTagline={false} />
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl pt-2">
            O <strong>CalibraCine</strong> foi projetado para elevar a excelência operacional em complexos cinematográficos.
            Permite o controle centralizado de equipamentos DCI, projetores Laser/Xenon, servidores de mídia, processadores de áudio imersivo (Dolby Atmos / QSC) e sistemas de automação de sala.
          </p>
        </div>
      </div>

      {/* Creator Card */}
      <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3">
          <Award className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-gray-900 dark:text-slate-100">Criador & Desenvolvimento</h2>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-blue-50/50 dark:bg-slate-850 p-4 rounded-xl border border-blue-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-black text-lg shadow-sm">
              RR
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">Ronald Ramos</h3>
              <p className="text-xs text-gray-600 dark:text-slate-400">Desenvolvedor e Criador do CalibraCine</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-blue-200 dark:border-slate-700">
            <Code className="w-4 h-4" />
            <span>Desenvolvido com Tecnologia de Ponta</span>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl flex items-center justify-center">
            <Tv className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Equipamentos por Cinema</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            Cada cinema possui salas e equipamentos cadastrados especificamente para o seu complexo. Os técnicos visualizam somente os itens pertencentes àquele cinema no momento da manutenção.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Envio Automático de PDF por E-mail</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            Após a finalização e assinatura do relatório, uma cópia em PDF é enviada automaticamente para o e-mail do técnico e uma cópia administrativa para o e-mail do administrador.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Acesso Restrito por Perfil</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            O administrador possui acesso completo a cadastros, dashboard e relatórios. Os demais usuários têm acesso simplificado ao preenchimento de ordens de serviço e histórico.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="w-9 h-9 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-slate-100">Registro Fotográfico e Assinatura</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400 leading-relaxed">
            Até 20 fotos por relatório para evidência de defeitos e peças trocadas, com assinatura digital coletada diretamente na tela do dispositivo mobile ou tablet.
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="text-center py-6 border-t border-gray-200 dark:border-slate-800 text-xs text-gray-500 dark:text-slate-400 space-y-1">
        <p className="font-bold text-gray-800 dark:text-slate-200">CalibraCine v2.3</p>
        <p>Desenvolvido por <strong>Ronald Ramos</strong> • Todos os direitos reservados</p>
      </div>
    </div>
  );
};
