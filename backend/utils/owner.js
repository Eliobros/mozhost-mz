// utils/owner.js
// 👑 Dono da plataforma — fica fora do ciclo de billing e das checagens de
// suspensão (mesma convenção de alaudaService.js: OWNER_USER_ID, fallback 6).
const OWNER_ID = Number(process.env.OWNER_USER_ID || 6);

function isOwner(userId) {
  const id = Number(userId);
  return Number.isFinite(id) && id === OWNER_ID;
}

module.exports = { OWNER_ID, isOwner };
