// utils/email.js
const { ApiApi } = require('@getbrevo/brevo');
require('dotenv').config();

const apiInstance = new ApiApi();
apiInstance.setApiKey(process.env.BREVO_API_KEY || '');

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
    if (!process.env.BREVO_API_KEY) {
      console.warn('⚠️  BREVO_API_KEY não configurado, simulando envio de email');
      console.log(`📧 Email simulado para: ${toEmail}`);
      console.log(`📄 Assunto: ${subject}`);
      console.log(`📝 Conteúdo: ${textContent}`);
      return { messageId: 'simulated' };
    }

    const { SendinblueApi } = require('@getbrevo/brevo');
    const api = new SendinblueApi();
    api.setApiKey(process.env.BREVO_API_KEY);

    const sendSmtpEmail = {
      to: [{ email: toEmail, name: toName }],
      sender: { 
        email: process.env.FROM_EMAIL || 'noreply@mozhost.topaziocoin.online', 
        name: process.env.FROM_NAME || 'MozHost' 
      },
      subject: subject,
      htmlContent: htmlContent,
      textContent: textContent
    };

    const result = await api.sendTransacEmail(sendSmtpEmail);
    console.log('✅ Email enviado com sucesso:', result);
    return result;

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error);
    throw new Error('Falha no envio do email: ' + error.message);
  }
}

module.exports = {
  sendEmail,
  generateCode
};