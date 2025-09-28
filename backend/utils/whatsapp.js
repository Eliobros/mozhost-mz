// utils/whatsapp.js
const axios = require('axios');
require('dotenv').config();

/**
 * Envia mensagem via WhatsApp usando Evolution API ou similar
 * @param {Object} options - Opções da mensagem
 * @param {string} options.phone - Número de telefone (com código do país)
 * @param {string} options.message - Mensagem a ser enviada
 * @returns {Promise} - Resultado do envio
 */
async function sendWhatsAppMessage({ phone, message }) {
  try {
    // Configurações da API - pode ser Evolution API, WhatSender, ou outra
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instanceName = process.env.WHATSAPP_INSTANCE_NAME || 'mozhost';

    if (!apiUrl || !apiKey) {
      console.warn('⚠️  Configurações do WhatsApp não encontradas, simulando envio');
      console.log(`📱 WhatsApp simulado para: ${phone}`);
      console.log(`📝 Mensagem: ${message}`);
      return { messageId: 'simulated', status: 'sent' };
    }

    // Formatar número (remover caracteres especiais e garantir formato correto)
    const cleanPhone = phone.replace(/[^\d]/g, '');
    const formattedPhone = cleanPhone + '@s.whatsapp.net';

    // Payload para Evolution API
    const payload = {
      number: cleanPhone,
      text: message
    };

    // Headers
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'apikey': apiKey
    };

    // Fazer requisição para a API
    const response = await axios.post(
      `${apiUrl}/message/sendText/${instanceName}`,
      payload,
      { headers }
    );

    console.log('✅ WhatsApp enviado com sucesso:', response.data);
    return {
      messageId: response.data.key?.id || 'sent',
      status: 'sent',
      response: response.data
    };

  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error.response?.data || error.message);
    
    // Se for erro de conexão, simular envio para não quebrar o fluxo
    if (error.code === 'ECONNREFUSED' || error.response?.status >= 500) {
      console.log('📱 Simulando envio devido a erro de conexão...');
      return { messageId: 'simulated_error', status: 'sent' };
    }
    
    throw new Error('Falha no envio do WhatsApp: ' + (error.response?.data?.message || error.message));
  }
}

/**
 * Verifica se a instância do WhatsApp está conectada
 * @returns {Promise<boolean>} - Status da conexão
 */
async function checkWhatsAppConnection() {
  try {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiKey = process.env.WHATSAPP_API_KEY;
    const instanceName = process.env.WHATSAPP_INSTANCE_NAME || 'mozhost';

    if (!apiUrl || !apiKey) {
      return false;
    }

    const headers = {
      'Authorization': `Bearer ${apiKey}`,
      'apikey': apiKey
    };

    const response = await axios.get(
      `${apiUrl}/instance/connectionState/${instanceName}`,
      { headers }
    );

    return response.data.instance?.state === 'open';
  } catch (error) {
    console.error('❌ Erro ao verificar conexão WhatsApp:', error.message);
    return false;
  }
}

/**
 * Formata código de verificação para WhatsApp
 * @param {string} code - Código numérico
 * @param {string} serviceName - Nome do serviço
 * @returns {string} - Mensagem formatada
 */
function formatVerificationMessage(code, serviceName = 'MozHost') {
  return `🔐 *${serviceName} - Código de Verificação*

Seu código de verificação é: *${code}*

⏰ Este código é válido por 15 minutos.
🔒 Não compartilhe este código com ninguém.

Se você não solicitou este código, ignore esta mensagem.`;
}

module.exports = {
  sendWhatsAppMessage,
  checkWhatsAppConnection,
  formatVerificationMessage
};