import React from 'react';
import { X, Coins } from 'lucide-react';

const CreateContainerModal = ({ form, setForm, onSubmit, onClose, coins, requiredCoins }) => {
  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Criar Novo Container</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="meu-bot-whatsapp"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use apenas letras, números, hífens e underscores
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Aplicação
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="nodejs">Node.js</option>
              <option value="python">Python</option>
              <option value="php">PHP</option>
            </select>
            <p className="mt-1 text-xs text-gray-500">
              {form.type === 'nodejs' ? 'Para bots em JavaScript/TypeScript' : 
               form.type === 'python' ? 'Para bots em Python' : 
               'Para aplicações PHP'}
            </p>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={coins < requiredCoins}
              className={`px-4 py-2 text-white text-sm font-medium rounded-md ${
                coins < requiredCoins 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700'
              }`}
            >
              Criar Container
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContainerModal;
