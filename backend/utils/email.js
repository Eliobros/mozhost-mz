// utils/email.js
const axios = require('axios');
require('dotenv').config();

/**
 * Gera um código numérico aleatório
 * @param {number} length - Tamanho do código
 * @returns {string} - Código gerado
 */
function generateCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

/**
 * Envia email usando NeuraTech API
 * @param {Object} options - Opções do email
 * @param {string} options.toEmail - Email destinatário
 * @param {string} options.toName - Nome do destinatário (opcional)
 * @param {string} options.subject - Assunto
 * @param {string} options.htmlContent - Conteúdo HTML
 * @param {string} options.textContent - Conteúdo texto (fallback)
 * @returns {Promise} - Resultado do envio
 */
async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  try {
    if (!process.env.EMAIL_API_KEY) {
      console.warn('⚠️  EMAIL_API_KEY não configurado, simulando envio de email');
      console.log(`📧 Email simulado para: ${toEmail}`);
      console.log(`📄 Assunto: ${subject}`);
      console.log(`📝 Conteúdo: ${textContent || htmlContent}`);
      return { messageId: 'simulated', success: true };
    }

    const response = await axios.post('https://api.neuratechmz.tech/api/send', {
      api_key: process.env.EMAIL_API_KEY,
      to: toEmail,
      subject: subject,
      message: htmlContent || textContent, // Prioriza HTML, fallback para texto
      prefix: 'mozhost' // Identificador da MozHost
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email enviado com sucesso via NeuraTech:', response.data);
    return {
      messageId: response.data.id || 'sent',
      success: true,
      data: response.data
    };

  } catch (error) {
    console.error('❌ Erro ao enviar email via NeuraTech:', error.response?.data || error.message);
    throw new Error('Falha no envio do email: ' + (error.response?.data?.message || error.message));
  }
}

module.exports = {
  sendEmail,
  generateCode
};
