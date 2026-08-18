import React, { useState } from 'react';
import { Users, Plus, Shield, Wrench, Edit2, KeyRound, CheckCircle, XCircle, Trash2, AlertTriangle } from 'lucide-react';
import { User, Role, UserStatus } from '../types';
import { getUsers, saveUser, deleteUser, addActivityLog, setCurrentUser } from '../services/storageService';

interface UsersViewProps {
  currentUser: User | null;
  onRefresh: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({ currentUser, onRefresh }) => {
  const users = getUsers();
  const isAdmin = currentUser?.role === 'admin';

  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('technician');
  const [phone, setPhone] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [status, setStatus] = useState<UserStatus>('ativo');

  // Password reset state
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  // Deletion modal state
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  const handleConfirmDelete = () => {
    if (!deletingUser) return;
    if (deletingUser.id === currentUser?.id) {
      alert('Você não pode excluir o usuário com o qual está atualmente logado!');
      setDeletingUser(null);
      return;
    }

    deleteUser(deletingUser.id);
    addActivityLog(
      'EXCLUIR_USUARIO',
      `Usuário ${deletingUser.name} (${deletingUser.email}) excluído por ${currentUser?.name}`,
      currentUser
    );
    setDeletingUser(null);
    onRefresh();
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('technician');
    setPhone('');
    setSpecialty('');
    setStatus('ativo');
    setShowModal(true);
  };

  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPhone(u.phone || '');
    setSpecialty(u.specialty || '');
    setStatus(u.status);
    setShowModal(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const userToSave: User = {
      id: editingUser ? editingUser.id : `user-${Date.now()}`,
      name,
      email,
      role,
      password: editingUser?.password || (role === 'admin' ? '257910' : '123'),
      phone,
      specialty,
      status,
      createdAt: editingUser ? editingUser.createdAt : new Date().toISOString(),
    };

    saveUser(userToSave);
    if (currentUser && userToSave.id === currentUser.id) {
      setCurrentUser(userToSave);
    }
    addActivityLog(
      editingUser ? 'EDITAR_USUARIO' : 'CRIAR_USUARIO',
      `Usuário ${userToSave.name} (${userToSave.email} - ${userToSave.role}) salvo por ${currentUser?.name}`,
      currentUser
    );
    setShowModal(false);
    onRefresh();
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (resetModalUser && newPassword) {
      const updatedUser: User = {
        ...resetModalUser,
        password: newPassword,
      };
      saveUser(updatedUser);
      addActivityLog(
        'REDEFINIR_SENHA',
        `Senha do usuário ${resetModalUser.name} redefinida por ${currentUser?.name}`,
        currentUser
      );
      setResetSuccess(true);
      setTimeout(() => {
        setResetSuccess(false);
        setResetModalUser(null);
        setNewPassword('');
        onRefresh();
      }, 1500);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-xs">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
            Controle de Acesso & Equipe
          </span>
          <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">
            Técnicos e Administradores ({users.length})
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie permissões de acesso, especialidades e redefina credenciais do sistema.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-sky-600/20 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Usuário</span>
          </button>
        )}
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {users.map((u) => (
          <div
            key={u.id}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3 shadow-xs hover:border-sky-500/50 transition-all flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-extrabold text-sky-600 dark:text-sky-400 flex items-center justify-center uppercase text-sm">
                    {u.name.substring(0, 2)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">{u.name}</h3>
                    <p className="text-xs text-slate-500">{u.email}</p>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-1 ${
                    u.role === 'admin'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                      : 'bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300'
                  }`}
                >
                  {u.role === 'admin' ? <Shield className="w-3 h-3" /> : <Wrench className="w-3 h-3" />}
                  {u.role === 'admin' ? 'Admin' : 'Técnico'}
                </span>
              </div>

              {u.specialty && (
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Especialidade</span>
                  {u.specialty}
                </div>
              )}

              {u.phone && <div className="text-xs text-slate-500">Tel: {u.phone}</div>}
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                  u.status === 'ativo' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {u.status}
              </span>

              {isAdmin && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setResetModalUser(u)}
                    className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Redefinir Senha"
                  >
                    <KeyRound className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleOpenEdit(u)}
                    className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="Editar Usuário"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeletingUser(u)}
                    className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors cursor-pointer"
                    title="Excluir Usuário"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              {editingUser ? 'Editar Usuário' : 'Cadastrar Novo Usuário'}
            </h3>

            <form onSubmit={handleSave} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">E-mail de Acesso *</label>
                <input
                  type="email"
                  required
                  placeholder="tecnico@cmm.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nível de Acesso *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="technician">Técnico</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as UserStatus)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Telefone</label>
                <input
                  type="text"
                  placeholder="(11) 98888-7777"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Especialidade Técnica
                </label>
                <input
                  type="text"
                  placeholder="Ex: Projeção Laser Barco & Som Dolby Atmos"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl shadow-xs"
                >
                  Salvar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetModalUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Redefinir Senha • {resetModalUser.name}
            </h3>

            {resetSuccess ? (
              <div className="p-3 bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Senha alterada com sucesso!</span>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">Nova Senha *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setResetModalUser(null)}
                    className="px-3 py-1.5 font-semibold text-slate-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl"
                  >
                    Confirmar Nova Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* DELETE CONFIRMATION MODAL */}
      {deletingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/80 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  Excluir Usuário?
                </h3>
                <p className="text-xs text-slate-500">Esta ação não poderá ser desfeita.</p>
              </div>
            </div>

            <p className="text-xs text-slate-700 dark:text-slate-300">
              Tem certeza que deseja remover o usuário <strong className="text-slate-900 dark:text-slate-100">{deletingUser.name}</strong> ({deletingUser.email})?
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                className="px-4 py-2 font-bold text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-xs rounded-xl shadow-xs cursor-pointer"
              >
                Sim, Excluir Usuário
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
