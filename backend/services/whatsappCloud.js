const provider = process.env.WHATSAPP_PROVIDER;

module.exports =
  provider === 'twilio' ? require('./whatsappTwilio')
  : provider === 'evolution' ? require('./whatsappEvolution')
  : require('./whatsappMeta');
