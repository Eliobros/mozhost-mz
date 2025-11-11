// utils/sms.js
const axios = require('axios');

const sendSMS = async ({ phone, message }) => {
  try {
    const response = await axios.post(
      'https://api.mozesms.com/v2/sms/send',
      {
        phone: phone,
        message: message,
        sender_id: 'MozHost' // ou o sender_id que você registrou
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MOZESMS_API_KEY}`
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('SMS send error:', error.response?.data || error.message);
    throw new Error('Failed to send SMS');
  }
};

const formatSMSVerificationMessage = (code) => {
  return `MozHost - Seu código de verificação: ${code}. Válido por 15 minutos.`;
};

module.exports = {
  sendSMS,
  formatSMSVerificationMessage
};
