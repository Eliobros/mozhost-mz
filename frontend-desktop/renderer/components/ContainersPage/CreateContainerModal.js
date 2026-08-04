import React from 'react';
import { X, Coins, Loader2 } from 'lucide-react';

const CreateContainerModal = ({ 
  form, 
  setForm, 
  onSubmit, 
  onClose, 
  coins, 
  requiredCoins,
  isCreating = false // ← NOVA PROP
}) => {
  // Bots que exigem token (Telegram / Discord)
  const needsToken = form.template === 'bot-telegram' || form.template === 'bot-discord';
  const tokenKey = needsToken
    ? (form.template === 'bot-telegram' ? 'TELEGRAM_BOT_TOKEN' : 'DISCORD_BOT_TOKEN')
    : null;
  const hasToken = !!((tokenKey && form.environment?.[tokenKey]) || '').toString().trim();

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Criar Novo Container</h3>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600"
            disabled={isCreating} // ← Desabilita X durante criação
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-sm">
            <div className="inline-flex items-center bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md px-3 py-1">
              <Coins className="w-4 h-4 mr-2" />
              Coins disponíveis: <span className="font-semibold ml-1">{coins}</span>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              É necessário <span className="font-semibold">{requiredCoins} coins</span> para criar um container.
            </p>
            {coins < requiredCoins && (
              <p className="mt-2 text-xs text-red-600">
                Você não possui coins suficientes. <a href="https://api.whatsapp.com/send?phone=258862840075&text=Ola+quero+comprar+coins" target="_blank" rel="noopener noreferrer" className="underline">Comprar coins</a>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Container
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={isCreating} // ← Desabilita input
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder="meu-bot-telegram"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use apenas letras, números, hífens e underscores
            </p>
          </div>

          {/* Seleção: API ou BOT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              O que deseja criar?
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, projectType: 'api', type: 'api', template: 'api' })}
                disabled={isCreating}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  form.projectType === 'api'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-2xl mb-2">🚀</div>
                <div className="font-medium text-sm">API</div>
                <div className="text-xs text-gray-500 mt-1">REST API básica</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, projectType: 'bot', type: 'bot-baileys', template: 'bot-baileys', environment: {} })}
                disabled={isCreating}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  form.projectType === 'bot'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-2xl mb-2">🤖</div>
                <div className="font-medium text-sm">BOT</div>
                <div className="text-xs text-gray-500 mt-1">WhatsApp • Telegram • Discord</div>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, projectType: 'static', type: 'static', template: 'static' })}
                disabled={isCreating}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  form.projectType === 'static'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <div className="text-2xl mb-2">🌐</div>
                <div className="font-medium text-sm">Site</div>
                <div className="text-xs text-gray-500 mt-1">HTML, CSS, JS</div>
              </button>
            </div>
          </div>

          {/* Template de BOT (apenas se BOT selecionado) */}
          {form.projectType === 'bot' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escolha o Template
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'bot-baileys', template: 'bot-baileys', environment: {} })}
                  disabled={isCreating}
                  className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                    form.template === 'bot-baileys'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-3">📱</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">WhatsApp (Baileys)</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Multi-device • Mais leve • Ideal para iniciantes
                      </div>
                    </div>
                    {form.template === 'bot-baileys' && (
                      <div className="text-green-500">✓</div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({ ...form, type: 'bot-wwebjs', template: 'bot-wwebjs', environment: {} })}
                  disabled={isCreating}
                  className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                    form.template === 'bot-wwebjs'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-300 hover:border-green-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-3">💬</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">WhatsApp (WWEB.JS)</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Recursos avançados • Stickers • Grupos
                      </div>
                    </div>
                    {form.template === 'bot-wwebjs' && (
                      <div className="text-green-500">✓</div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    type: 'bot-telegram',
                    template: 'bot-telegram',
                    environment: { TELEGRAM_BOT_TOKEN: form.environment?.TELEGRAM_BOT_TOKEN || '' }
                  })}
                  disabled={isCreating}
                  className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                    form.template === 'bot-telegram'
                      ? 'border-sky-500 bg-sky-50'
                      : 'border-gray-300 hover:border-sky-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-3">✈️</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Telegram</div>
                      <div className="text-xs text-gray-600 mt-1">
                        Comandos com / • Polling • Rápido de configurar
                      </div>
                    </div>
                    {form.template === 'bot-telegram' && (
                      <div className="text-sky-500">✓</div>
                    )}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    type: 'bot-discord',
                    template: 'bot-discord',
                    environment: { DISCORD_BOT_TOKEN: form.environment?.DISCORD_BOT_TOKEN || '' }
                  })}
                  disabled={isCreating}
                  className={`w-full p-3 border-2 rounded-lg text-left transition-all ${
                    form.template === 'bot-discord'
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-300 hover:border-indigo-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-start">
                    <div className="text-2xl mr-3">🎮</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">Discord</div>
                      <div className="text-xs text-gray-600 mt-1">
                        discord.js • Mensagens • Servidores
                      </div>
                    </div>
                    {form.template === 'bot-discord' && (
                      <div className="text-indigo-500">✓</div>
                    )}
                  </div>
                </button>
              </div>

              {/* Campo de Token (Telegram / Discord) */}
              {(form.template === 'bot-telegram' || form.template === 'bot-discord') && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {form.template === 'bot-telegram'
                      ? 'Token do Bot do Telegram'
                      : 'Token do Bot do Discord'}
                  </label>
                  <input
                    type="password"
                    value={form.environment?.[form.template === 'bot-telegram' ? 'TELEGRAM_BOT_TOKEN' : 'DISCORD_BOT_TOKEN'] || ''}
                    onChange={(e) => setForm({
                      ...form,
                      environment: {
                        ...(form.environment || {}),
                        [form.template === 'bot-telegram' ? 'TELEGRAM_BOT_TOKEN' : 'DISCORD_BOT_TOKEN']: e.target.value
                      }
                    })}
                    disabled={isCreating}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder={form.template === 'bot-telegram'
                      ? '123456789:AAHxxxx...'
                      : 'MTIzNDU2Nzg5...'}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {form.template === 'bot-telegram' ? (
                      <>Crie seu bot com{' '}
                        <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">@BotFather</a>
                        {' '}e cole o token aqui.</>
                    ) : (
                      <>Gere o token em{' '}
                        <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Discord Developer Portal</a>
                        {' '}e cole aqui.</>
                    )}
                  </p>
                  {!hasToken && (
                    <p className="mt-1 text-xs text-red-600">
                      ⚠️ Informe o token para o bot funcionar.
                    </p>
                  )}
                </div>
              )}

              <p className="mt-2 text-xs text-gray-500">
                ✨ Bots vêm prontos com comandos básicos (!ping, !menu, !info)
              </p>
            </div>
          )}

          {/* Tipo de linguagem (apenas se API selecionado) */}
          {form.projectType === 'api' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Linguagem
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value, template: e.target.value })}
                disabled={isCreating}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="api">Node.js (Express)</option>
                <option value="python">Python (Flask)</option>
                <option value="php">PHP + MySQL</option>
              </select>
            </div>
          )}

          {/* ✨ LOADING MESSAGE */}
          {isCreating && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    🚀 Criando seu {form.projectType === 'bot' ? 'bot' : 'container'}...
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    Por favor aguarde, isso pode levar alguns segundos.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isCreating} // ← Desabilita cancelar
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={coins < requiredCoins || isCreating || (needsToken && !hasToken)} // ← Desabilita se criando / token vazio
              className={`px-4 py-2 text-white text-sm font-medium rounded-md flex items-center ${
                coins < requiredCoins || isCreating || (needsToken && !hasToken)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                `Criar ${form.projectType === 'bot' ? 'Bot' : 'Container'}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContainerModal;
