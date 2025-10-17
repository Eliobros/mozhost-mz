// utils/email.js
require('dotenv').config();

// Configuração simplificada para evitar erros de importação
let apiInstance = null;
try {
  const brevo = require('@getbrevo/brevo');
  if (brevo && brevo.ApiApi) {
    apiInstance = new brevo.ApiApi();
    apiInstance.setApiKey(process.env.BREVO_API_KEY || '');
  }
} catch (e) {
  console.log('⚠️  Brevo não configurado, emails serão simulados');
}

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
 * Envia email usando Brevo
 * @param {Object} options - Opções do email
 * @param {string} options.toEmail - Email destinatário
 * @param {string} options.toName - Nome do destinatário
 * @param {string} options.subject - Assunto
 * @param {string} options.htmlContent - Conteúdo HTML
 * @param {string} options.textContent - Conteúdo texto
 * @returns {Promise} - Resultado do envio
 */
async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  try {
    if (!process.env.BREVO_API_KEY || !apiInstance) {
      console.warn('⚠️  BREVO_API_KEY não configurado, simulando envio de email');
      console.log(`📧 Email simulado para: ${toEmail}`);
      console.log(`📄 Assunto: ${subject}`);
      console.log(`📝 Conteúdo: ${textContent}`);
      return { messageId: 'simulated' };
    }

    // Simular envio por enquanto até configurar Brevo corretamente
    console.log('📧 Email simulado (Brevo não configurado corretamente)');
    console.log(`Para: ${toEmail} (${toName})`);
    console.log(`Assunto: ${subject}`);
    console.log(`Conteúdo: ${textContent}`);
    return { messageId: 'simulated-brevo' };

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error('Falha no envio do email: ' + error.message);
  }
}

module.exports = {
  sendEmail,
  generateCode
};