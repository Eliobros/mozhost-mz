// backend/config/constants.js
// Constantes compartilhadas em todo o backend para evitar dessincronização.

module.exports = {
  // IP público do servidor exibido ao usuário para registros DNS tipo A
  // e usado pelo DNS monitor para validar propagação.
  // Lê de process.env.SERVER_IP em produção; valor de fallback abaixo é apenas
  // para desenvolvimento local — configure no .env antes de subir.
  SERVER_IP: process.env.SERVER_IP || '45.76.123.45',

  // Custo em coins para criar um database novo
  DATABASE_COST_COINS: parseInt(process.env.DATABASE_COST_COINS, 10) || 5,

  // Limite padrão de domínios custom por usuário
  DEFAULT_MAX_CUSTOM_DOMAINS: parseInt(process.env.MAX_CUSTOM_DOMAINS, 10) || 10,
};
