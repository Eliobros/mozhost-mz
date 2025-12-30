// admin/components/Modal.tsx
'use client';

import React, { useState } from 'react';
import { adminAPI } from '../utils/api';

interface ModalProps {
  modal: any;
  onClose: () => void;
  onSuccess: () => void;
}

export const Modal: React.FC<ModalProps> = ({ modal, onClose, onSuccess }) => {
  if (!modal) return null;

  const [formData, setFormData] = useState({
    username: modal.user?.username || '',
    amount: '',
    password: modal.password || '',
    plan: modal.user?.plan || 'free',
    isActive: modal.user?.isActive ?? true,
    useDropdown: true
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (modal.type === 'addCoins') {
        const data = await adminAPI.addCoins(formData);
        alert(`✅ ${data.message}\nNovo saldo: ${data.user.coins} coins`);
        onSuccess();
        onClose();
      } else if (modal.type === 'removeCoins') {
        const data = await adminAPI.removeCoins(formData);
        alert(`✅ ${data.message}\nNovo saldo: ${data.user.coins} coins`);
        onSuccess();
        onClose();
      } else if (modal.type === 'changePlan') {
        const data = await adminAPI.updatePlan(modal.user.id, formData.plan, formData.password);
        alert(`✅ ${data.message}`);
        onSuccess();
        onClose();
      } else if (modal.type === 'toggleStatus') {
        const data = await adminAPI.toggleStatus(modal.user.id, formData.isActive, formData.password);
        alert(`✅ ${data.message}`);
        onSuccess();
        onClose();
      }
    } catch (error: any) {
      alert('❌ ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (modal.type) {
      case 'addCoins': return '💰 Adicionar Coins';
      case 'removeCoins': return '⚠️ Remover Coins';
      case 'changePlan': return '📊 Mudar Plano';
      case 'toggleStatus': return '🔄 Alterar Status';
      default: return 'Modal';
    }
  };

  const getModalColor = () => {
    switch (modal.type) {
      case 'addCoins': return 'bg-green-600 hover:bg-green-700';
      case 'removeCoins': return 'bg-red-600 hover:bg-red-700';
      case 'changePlan': return 'bg-blue-600 hover:bg-blue-700';
      case 'toggleStatus': return 'bg-yellow-600 hover:bg-yellow-700';
      default: return 'bg-gray-600 hover:bg-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <h3 className="text-2xl font-bold text-gray-800">{getModalTitle()}</h3>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Add/Remove Coins Form */}
          {(modal.type === 'addCoins' || modal.type === 'removeCoins') && (
            <>
              <div className="mb-4">
                <label className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                  <input
                    type="checkbox"
                    checked={formData.useDropdown}
                    onChange={(e) => setFormData({...formData, useDropdown: e.target.checked, username: ''})}
                    className="rounded"
                  />
                  Usar lista de usuários
                </label>

                {formData.useDropdown ? (
                  <select
                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  >
                    <option value="">Selecione um usuário</option>
                    {(modal.users || []).map((u: any) => (
                      <option key={u.id} value={u.username}>
                        {u.username} ({u.coins} coins)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Digite o username"
                    className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.username}
                    onChange={(e) => setFormData({...formData, username: e.target.value})}
                    required
                  />
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Quantidade de Coins</label>
                <input
                  type="number"
                  min="1"
                  placeholder="Ex: 500"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  required
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Senha Admin</label>
                <input
                  type="password"
                  placeholder="Digite a senha"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </>
          )}

          {/* Change Plan Form */}
          {modal.type === 'changePlan' && (
            <>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Usuário: <strong className="text-gray-800">{modal.user.username}</strong></p>
                <p className="text-sm text-gray-600 mt-1">Plano atual: <strong className="text-gray-800">{modal.user.plan.toUpperCase()}</strong></p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-3 text-gray-700">Novo Plano</label>
                <div className="space-y-2">
                  {[
                    { value: 'free', label: 'FREE', desc: '2 containers, 512MB RAM' },
                    { value: 'basic', label: 'BASIC', desc: '5 containers, 1GB RAM' },
                    { value: 'pro', label: 'PRO', desc: '10 containers, 2GB RAM' }
                  ].map(plan => (
                    <label 
                      key={plan.value} 
                      className="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input
                        type="radio"
                        name="plan"
                        value={plan.value}
                        checked={formData.plan === plan.value}
                        onChange={(e) => setFormData({...formData, plan: e.target.value})}
                        className="w-4 h-4"
                      />
                      <div>
                        <div className="font-semibold text-gray-800">{plan.label}</div>
                        <div className="text-xs text-gray-500">{plan.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Senha Admin</label>
                <input
                  type="password"
                  placeholder="Digite a senha"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </>
          )}

          {/* Toggle Status Form */}
          {modal.type === 'toggleStatus' && (
            <>
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Usuário: <strong className="text-gray-800">{modal.user.username}</strong></p>
                <p className="text-sm text-gray-600 mt-1">Status atual: <strong className={modal.user.isActive ? 'text-green-600' : 'text-red-600'}>{modal.user.isActive ? '✅ Ativo' : '❌ Inativo'}</strong></p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Novo Status</label>
                <select
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={String(formData.isActive)}
                  onChange={(e) => setFormData({...formData, isActive: e.target.value === 'true'})}
                >
                  <option value="true">✅ Ativo</option>
                  <option value="false">❌ Inativo</option>
                </select>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-semibold mb-2 text-gray-700">Senha Admin</label>
                <input
                  type="password"
                  placeholder="Digite a senha"
                  className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>
            </>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 bg-gray-200 text-gray-700 p-3 rounded-lg hover:bg-gray-300 transition font-semibold disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`flex-1 text-white p-3 rounded-lg font-semibold transition disabled:opacity-50 ${getModalColor()}`}
            >
              {submitting ? '⏳ Processando...' : 
               modal.type === 'addCoins' ? '✅ Adicionar' :
               modal.type === 'removeCoins' ? '⚠️ Remover' :
               modal.type === 'changePlan' ? '📊 Atualizar' :
               '🔄 Alterar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
