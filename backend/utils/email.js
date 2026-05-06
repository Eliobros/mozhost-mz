// utils/email.js
const axios = require('axios');
require('dotenv').config();

function generateCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1) + min).toString();
}

async function sendEmail({ toEmail, toName, subject, htmlContent, textContent }) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn('⚠️ RESEND_API_KEY não configurado, simulando envio de email');
      console.log(`📧 Email simulado para: ${toEmail}`);
      console.log(`📄 Assunto: ${subject}`);
      console.log(`📝 Conteúdo: ${textContent || htmlContent}`);
      return { messageId: 'simulated', success: true };
    }

    const response = await axios.post('https://api.resend.com/emails', {
      from: 'MozHost <noreply@mozhost.shop>',
      to: toEmail,
      subject: subject,
      html: htmlContent,
      text: textContent
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Email enviado via Resend:', response.data);
    return { messageId: response.data.id, success: true };

  } catch (error) {
    console.error('❌ Erro ao enviar email via Resend:', error.response?.data || error.message);
    throw new Error('Falha no envio do email: ' + (error.response?.data?.message || error.message));
  }
}

module.exports = { sendEmail, generateCode };
