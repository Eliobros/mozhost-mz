// routes/alauda.js
// Proxy Alauda API para MozHost (Opção A)
// Usuário autentica com token MozHost; backend injeta key interna.
// xvideos e payment FORA por decisão de negócio.

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const alauda = require('../services/alaudaService');

router.use(auth);

// ===== GET /api/alauda/status =====
router.get('/status', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const plan = req.user.plan;

    // 👑 Dono: acesso total a tudo, sempre
    if (alauda.isOwner(userId)) {
      const ownerBalance = await alauda.getBalance(userId, plan);
      let ownerOnline = false;
      try {
        const h = await axios.get(`${alauda.ALAUDA_API_URL}/health`, { timeout: 5000 });
        ownerOnline = h.data?.status === 'ok';
      } catch (e) { /* offline */ }
      return res.json({
        success: true,
        has_access: true,
        plan: 'owner',
        is_owner: true,
        balance: ownerBalance,
        alauda_online: ownerOnline
      });
    }

    if (!alauda.hasPlanAccess(plan)) {
      return res.json({
        success: true,
        has_access: false,
        plan,
        message: 'A API está disponível para planos Basic, Pro e Business. Faz upgrade para desbloquear!'
      });
    }

    const balance = await alauda.getBalance(userId, plan);

    // Ping na Alauda pra saber se tá online
    let alaudaOnline = false;
    try {
      const health = await axios.get(`${alauda.ALAUDA_API_URL}/health`, { timeout: 5000 });
      alaudaOnline = health.data?.status === 'ok';
    } catch (e) { /* offline */ }

    res.json({
      success: true,
      has_access: true,
      plan,
      balance,
      alauda_online: alaudaOnline
    });
  } catch (error) {
    console.error('Erro alauda/status:', error.message);
    res.status(500).json({ error: 'Erro ao verificar status da API' });
  }
});

// ===== GET /api/alauda/endpoints =====
// Catálogo de endpoints disponíveis com custos
router.get('/endpoints', (req, res) => {
  const catalog = [
    { service: 'youtube', name: 'YouTube', icon: '▶️', endpoints: [
      { path: '/api/alauda/youtube/search', method: 'POST', body: { query: 'nome do vídeo', max_results: 10 }, cost: alauda.COSTS['youtube.search'], desc: 'Busca vídeos no YouTube' },
      { path: '/api/alauda/youtube/download', method: 'POST', body: { url: 'https://youtube.com/watch?v=...', format: 'mp3', quality: '128' }, cost: alauda.COSTS['youtube.download'], desc: 'Download MP3/MP4' }
    ]},
    { service: 'tiktok', name: 'TikTok', icon: '🎵', endpoints: [
      { path: '/api/alauda/tiktok/download', method: 'POST', body: { url: 'https://tiktok.com/@user/video/...' }, cost: alauda.COSTS['tiktok.download'], desc: 'Download sem marca d\'água' }
    ]},
    { service: 'instagram', name: 'Instagram', icon: '📸', endpoints: [
      { path: '/api/alauda/instagram/download', method: 'POST', body: { url: 'https://instagram.com/p/...' }, cost: alauda.COSTS['instagram.download'], desc: 'Download de posts/reels' }
    ]},
    { service: 'facebook', name: 'Facebook', icon: '📘', endpoints: [
      { path: '/api/alauda/facebook/download', method: 'POST', body: { url: 'https://facebook.com/...' }, cost: alauda.COSTS['facebook.download'], desc: 'Download de vídeos' }
    ]},
    { service: 'spotify', name: 'Spotify', icon: '🎧', endpoints: [
      { path: '/api/alauda/spotify/search', method: 'POST', body: { query: 'nome da música' }, cost: alauda.COSTS['spotify.search'], desc: 'Busca músicas' },
      { path: '/api/alauda/spotify/download', method: 'POST', body: { songId: 'Photograph Ed Sheeran' }, cost: alauda.COSTS['spotify.download'], desc: 'Download de música' }
    ]},
    { service: 'shazam', name: 'Shazam', icon: '🎼', endpoints: [
      { path: '/api/alauda/shazam/identify', method: 'POST', body: { audio_url: '...' }, cost: alauda.COSTS['shazam.identify'], desc: 'Identifica música por áudio' }
    ]},
    { service: 'lyrics', name: 'Lyrics', icon: '📝', endpoints: [
      { path: '/api/alauda/lyrics', method: 'POST', body: { song: 'nome', artist: 'artista' }, cost: alauda.COSTS['lyrics.search'], desc: 'Busca letra de música' }
    ]},
    { service: 'weather', name: 'Clima', icon: '🌤️', endpoints: [
      { path: '/api/alauda/weather', method: 'GET', body: null, cost: alauda.COSTS['weather.current'], desc: 'Previsão do tempo' }
    ]},
    { service: 'currency', name: 'Moeda', icon: '💱', endpoints: [
      { path: '/api/alauda/currency', method: 'GET', body: null, cost: alauda.COSTS['currency.convert'], desc: 'Conversão de moedas' }
    ]}
  ];

  res.json({ success: true, catalog });
});

// ===== POST /api/alauda/usage =====
router.get('/usage', async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const usage = await alauda.getUsage(userId, 100);
    res.json({ success: true, usage });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar uso da API' });
  }
});

// ===== PROXY GENÉRICO =====
// POST /api/alauda/:service/:action
// Ex: POST /api/alauda/youtube/search
//     POST /api/alauda/youtube/download
//     POST /api/alauda/tiktok/download
const axios = require('axios');

router.post('/:service/:action', async (req, res) => {
  const { service, action } = req.params;
  const userId = req.user.userId || req.user.id;
  const plan = req.user.plan;
  const fullPath = `${service}.${action}`;

  // 1. Whitelist de serviços
  if (!alauda.ALLOWED_SERVICES.includes(service)) {
    return res.status(403).json({ error: `Serviço '${service}' não disponível na MozHost` });
  }

  // 2. Plano mínimo (👑 dono passa direto)
  if (!alauda.isOwner(userId) && !alauda.hasPlanAccess(plan)) {
    return res.status(403).json({
      error: 'Upgrade necessário',
      message: 'A API está disponível para planos Basic, Pro e Business'
    });
  }

  // 3. Custo do endpoint
  const cost = alauda.COSTS[fullPath] || 1;

  // 4. Verifica saldo e debita
  await alauda.ensureBalance(userId, plan);
  const ok = await alauda.consume(userId, cost);
  if (!ok) {
    return res.status(402).json({
      error: 'Saldo insuficiente',
      message: `Essa requisição custa ${cost} request(s). Compra mais pacotes na aba API!`,
      cost,
      balance: await alauda.getBalance(userId, plan)
    });
  }

  // 5. Chama a Alauda
  try {
    const data = await alauda.callAlauda('POST', `/${service}/${action}`, req.body);
    await alauda.logUsage(userId, service, `${service}/${action}`, cost, 'success');

    res.json({
      success: true,
      data,
      credits_remaining: (await alauda.getBalance(userId, plan)).requests_remaining
    });
  } catch (error) {
    await alauda.logUsage(userId, service, `${service}/${action}`, cost, 'error');

    // Devolve o crédito se a Alauda falhou
    await alauda.addRequests(userId, cost);

    const status = error.response?.status || 500;
    res.status(status).json({
      error: 'Erro ao processar requisição na Alauda',
      message: error.response?.data?.error || error.message,
      refunded: cost
    });
  }
});

// GET /api/alauda/:service (rota GET genérica pra weather, currency etc)
router.get('/:service', async (req, res) => {
  const { service } = req.params;
  const userId = req.user.userId || req.user.id;
  const plan = req.user.plan;

  if (!alauda.ALLOWED_SERVICES.includes(service)) {
    return res.status(403).json({ error: `Serviço '${service}' não disponível` });
  }
  if (!alauda.isOwner(userId) && !alauda.hasPlanAccess(plan)) {
    return res.status(403).json({ error: 'Upgrade necessário para planos Basic+' });
  }

  const cost = alauda.COSTS[`${service}.current`] || alauda.COSTS[`${service}.convert`] || 1;

  await alauda.ensureBalance(userId, plan);
  const ok = await alauda.consume(userId, cost);
  if (!ok) {
    return res.status(402).json({ error: 'Saldo insuficiente', cost });
  }

  try {
    const data = await alauda.callAlauda('GET', `/${service}`, null, req.query);
    await alauda.logUsage(userId, service, service, cost, 'success');
    res.json({ success: true, data, credits_remaining: (await alauda.getBalance(userId, plan)).requests_remaining });
  } catch (error) {
    await alauda.logUsage(userId, service, service, cost, 'error');
    await alauda.addRequests(userId, cost);
    res.status(error.response?.status || 500).json({
      error: 'Erro ao processar requisição',
      message: error.response?.data?.error || error.message,
      refunded: cost
    });
  }
});

module.exports = router;
