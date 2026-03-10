// utils/sms.js
const axios = require('axios');

const sendSMS = async ({ phone, message }) => {
  try {
    const response = await axios.post(
      'https://hdxqelinqivwgmggolhs.supabase.co/functions/v1/api-gateway/sms/send',
      {
        to: phone,
        message: message,
        sender_id: process.env.TSEMBA_SENDER_ID || 'MOZHOST'
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.TSEMBA_API_KEY
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('SMS send error:', error.response?.data || error.message);
    throw new Error('Failed to send SMS');
  }
};

const formatSMSVerificationMessage = (code, nome) => {
  const saudacao = nome ? `Olá ${nome}, ` : '';
  return `${saudacao}seu código de verificação MozHost: ${code}. Válido por 15 minutos.`;
};

module.exports = {
  sendSMS,
  formatSMSVerificationMessage
};

