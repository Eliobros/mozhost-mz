// utils/admin.js
// Identificação centralizada de administradores da MozHost.
//
// Não existe coluna is_admin na tabela users; a admin é determinada por
// uma lista de IDs (padrão: 6, como usado no authenticateAdmin).
// Pode ser sobrescrita no .env: ADMIN_USER_IDS=6,12,99

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '6')
  .split(',')
  .map((s) => parseInt(String(s).trim(), 10))
  .filter((n) => Number.isInteger(n) && n > 0);

/**
 * Verifica se um userId é administrador.
 * @param {number|string} userId
 * @returns {boolean}
 */
function isAdminUser(userId) {
  const id = parseInt(userId, 10);
  return Number.isInteger(id) && ADMIN_USER_IDS.includes(id);
}

module.exports = { isAdminUser, ADMIN_USER_IDS };
