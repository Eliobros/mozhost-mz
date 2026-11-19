// utils/alaudaUrl.js
// Centraliza a montagem das URLs da Alauda API.
//
// A ALAUDA_API_URL aponta para a raiz de PAGAMENTOS
// (ex.: https://alauda-api.mozhost.shop/api/payment), mas as rotas gerais
// (validate, health, youtube, ...) ficam na raiz do host. Concatenar a env
// direto gerava caminhos duplicados como /api/payment/api/validate/key.
//
// A raiz do host é derivada automaticamente (removendo /api/payment ou /api)
// e pode ser sobrescrita com ALAUDA_API_ROOT. A raiz de pagamentos pode ser
// sobrescrita com ALAUDA_PAYMENT_URL.

const DEFAULT_PAYMENT_URL = 'https://alauda-api.mozhost.shop/api/payment';

function trimSlashes(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

const RAW_URL = trimSlashes(process.env.ALAUDA_API_URL || DEFAULT_PAYMENT_URL);

const ALAUDA_API_ROOT = trimSlashes(
  process.env.ALAUDA_API_ROOT || RAW_URL.replace(/\/api(\/payment)?$/i, '')
);

const ALAUDA_PAYMENT_URL = trimSlashes(
  process.env.ALAUDA_PAYMENT_URL || `${ALAUDA_API_ROOT}/api/payment`
);

function withLeadingSlash(path) {
  const value = String(path || '').trim();
  if (!value) return '';
  return value.startsWith('/') ? value : `/${value}`;
}

// Relativo à raiz do host: alaudaRoot('/health') -> .../health
function alaudaRoot(path) {
  return `${ALAUDA_API_ROOT}${withLeadingSlash(path)}`;
}

// Relativo a /api: alaudaApi('/validate/key') -> .../api/validate/key
function alaudaApi(path) {
  const clean = withLeadingSlash(path).replace(/^\/api(?=\/|$)/i, '');
  return `${ALAUDA_API_ROOT}/api${clean}`;
}

// Relativo a /api/payment: alaudaPayment('/mercadopago') -> .../api/payment/mercadopago
function alaudaPayment(path) {
  return `${ALAUDA_PAYMENT_URL}${withLeadingSlash(path)}`;
}

module.exports = {
  ALAUDA_API_ROOT,
  ALAUDA_PAYMENT_URL,
  alaudaRoot,
  alaudaApi,
  alaudaPayment
};
