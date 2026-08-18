import React, { useState } from 'react';
import { User as UserIcon, Shield, Wrench, CheckCircle, KeyRound, Mail, Phone } from 'lucide-react';
import { User } from '../types';
import { saveUser, setCurrentUser, addActivityLog } from '../services/storageService';

interface ProfileViewProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onRefresh }) => {
  if (!currentUser) return null;

  const [name, setName] = useState(currentUser.name);
  const [email, setEmail] = useState(currentUser.email);
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [specialty, setSpecialty] = useState(currentUser.specialty || '');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedUser: User = {
      ...currentUser,
      name,
      email,
      phone,
      specialty,
    };

    saveUser(updatedUser);
    setCurrentUser(updatedUser);
    addActivityLog('EDITAR_PERFIL', `Perfil e e-mail atualizados por ${updatedUser.name} (${updatedUser.email})`, updatedUser);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
    onRefresh();
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword) {
      const updatedUser: User = {
        ...currentUser,
        password: newPassword,
      };
      saveUser(updatedUser);
      setCurrentUser(updatedUser);
      addActivityLog('ALTERAR_SENHA', `Senha alterada pelo próprio usuário ${updatedUser.name}`, updatedUser);
      setPasswordSuccess(true);
      setNewPassword('');
      setTimeout(() => setPasswordSuccess(false), 2000);
      onRefresh();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-black text-xl flex items-center justify-center uppercase shadow-lg shadow-sky-500/20">
            {currentUser.name.substring(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{currentUser.name}</h2>
              <span
                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                  currentUser.role === 'admin'
                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                    : 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300'
                }`}
              >
                {currentUser.role === 'admin' ? 'Administrador' : 'Técnico'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser.email}</p>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Perfil atualizado com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-3 text-xs pt-2">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail Cadastrado / Acesso *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone de Contato</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Especialidade / Certificações</label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
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

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
          Alterar Senha Pessoal
        </h3>

        {passwordSuccess && (
          <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            <span>Sua senha foi redefinida com sucesso!</span>
          </div>
        )}

        <form onSubmit={handleChangePassword} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs cursor-pointer border border-slate-700"
            >
              Atualizar Senha
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
