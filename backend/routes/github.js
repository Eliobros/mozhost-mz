
// routes/github.js
// Integração GitHub OAuth + Deploy automático via webhook

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { execFile } = require('child_process');
const { promisify } = require('util');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const path = require('path');
const os = require('os');
const fs = require('fs-extra');
const auth = require('../middleware/auth');
const database = require('../models/database');
const Docker = require('dockerode');
const dockerManager = require('../utils/docker-manager');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const execFileAsync = promisify(execFile);

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL
  || `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/auth/github/callback`;


// ===== FUNÇÕES AUXILIARES =====

async function githubRequest(endpoint, token, method = 'GET', body = null) {
  const response = await axios({
    method,
    url: `https://api.github.com${endpoint}`,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28'
    },
    data: body
  });
  return response.data;
}

const VALID_BRANCH = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,200}$/;
const VALID_REPO_NAME = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

function normalizeRepoUrl(repoUrl) {
  let parsed;
  try {
    parsed = new URL(repoUrl);
  } catch (_error) {
    throw new Error('repo_url inválida');
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'github.com') {
    throw new Error('repo_url deve ser um repositório GitHub (https://github.com/...)');
  }
  return `${parsed.origin}${parsed.pathname.replace(/\.git$/, '')}`;
}

function validateBranch(branch) {
  if (!VALID_BRANCH.test(branch) || branch.includes('..')) {
    throw new Error('branch inválida');
  }
  return branch;
}

function repoUrlWithToken(repoUrl, token) {
  const url = new URL(repoUrl);
  url.username = 'oauth2';
  url.password = token;
  return url.toString();
}

// Pasta do host que está montada dentro do container, por tipo de runtime.
function getDeployTargetPath(containerId, containerType) {
  const base = path.join(dockerManager.containersPath, containerId);
  if (containerType === 'static') return path.join(base, 'html');
  if (containerType === 'php') return path.join(base, 'php'); // ./php:/var/www/html
  return base; // node/python/api/bots: pasta montada em /app/code
}

function isPermissionError(error) {
  return error?.code === 'EACCES' || error?.code === 'EPERM';
}

const PERMISSION_HINT = (target) =>
  `Sem permissão para escrever em ${target}. No servidor, como root: ` +
  `chown -R ${process.getuid()}:${process.getgid()} ${dockerManager.containersPath} ` +
  'e garanta permissão de travessia nos diretórios pais (chmod o+x), ' +
  'ou libere sudo sem senha para chown/mkdir do usuário do backend.';

/**
 * Algumas pastas dos containers foram criadas pelo Docker daemon (root), então
 * o processo do MozHost não consegue limpar nem copiar arquivos nelas. Tenta
 * corrigir a posse com `sudo -n` (sem prompt de senha) e repete a cópia.
 */
async function fixTargetOwnership(target) {
  const owner = `${process.getuid()}:${process.getgid()}`;
  await execFileAsync('sudo', ['-n', 'mkdir', '-p', target]);
  await execFileAsync('sudo', ['-n', 'chown', '-R', owner, target]);
  console.log(`🔧 Posse corrigida via sudo: ${target} → ${owner}`);
}

async function copyRepoFiles(tmpDir, target, containerType) {
  await fs.ensureDir(target);
  const preserve = (containerType === 'static' || containerType === 'php') ? [] : ['.env.host'];
  for (const entry of await fs.readdir(target)) {
    if (preserve.includes(entry)) continue;
    await fs.remove(path.join(target, entry));
  }
  await fs.copy(tmpDir, target, {
    filter: (src) => path.basename(src) !== '.git'
  });
}

/**
 * O clone abaixo coloca o token do usuário na URL. Quando existe
 * `credential.helper=store` (padrão em muitas VPS), o git grava esse token em
 * ~/.git-credentials — e, como ele usa a primeira entrada que casa com o host,
 * o token de um usuário passava a ser usado em TODAS as operações git do
 * servidor. Aqui removemos as entradas "oauth2" (o usuário que o MozHost usa na
 * URL) para que nenhum token de usuário fique persistido no disco.
 */
async function scrubPlatformGitCredentials() {
  const credentialsPath = path.join(os.homedir(), '.git-credentials');
  try {
    const content = await fs.readFile(credentialsPath, 'utf8');
    const lines = content.split('\n');
    const kept = lines.filter((line) => !line.includes('://oauth2:'));
    if (kept.length === lines.length) return;

    const body = kept.filter(Boolean).join('\n');
    await fs.writeFile(credentialsPath, body ? `${body}\n` : '', { mode: 0o600 });
    await fs.chmod(credentialsPath, 0o600).catch(() => {});
    console.warn('🧹 Credenciais temporárias do MozHost removidas de ~/.git-credentials');
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('⚠️ Não foi possível limpar ~/.git-credentials:', error.message);
    }
  }
}

/**
 * Clona o repositório no HOST e sincroniza os arquivos na pasta montada no
 * container. Não usamos `git` dentro do container porque as imagens python e
 * php não o possuem. O `.git` (que contém o token do usuário) não é copiado.
 */
async function cloneRepoToHost(containerId, containerType, repoUrl, branch, token) {
  const target = getDeployTargetPath(containerId, containerType);
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mozhost-git-'));

  try {
    await execFileAsync('git', [
      // credential.helper= (vazio) desliga os helpers só neste comando: o token
      // da URL é usado uma vez e não é gravado nem reaproveitado de outro usuário.
      '-c', 'credential.helper=',
      'clone', '--depth', '1', '--single-branch', '--branch', branch,
      repoUrlWithToken(repoUrl, token), tmpDir
    ], {
      maxBuffer: 20 * 1024 * 1024,
      env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
    });

    try {
      await copyRepoFiles(tmpDir, target, containerType);
    } catch (error) {
      if (!isPermissionError(error)) throw error;
      try {
        await fixTargetOwnership(target);
      } catch (sudoError) {
        console.error(`❌ Não foi possível corrigir a posse de ${target}:`, sudoError.message);
        throw new Error(PERMISSION_HINT(target));
      }
      try {
        await copyRepoFiles(tmpDir, target, containerType);
      } catch (retryError) {
        if (!isPermissionError(retryError)) throw retryError;
        throw new Error(PERMISSION_HINT(target));
      }
    }

    return target;
  } catch (error) {
    if (error.message?.startsWith('Sem permissão')) throw error;
    const detail = String(error.stderr || error.message || 'erro desconhecido')
      .replaceAll(token, '***')
      .trim()
      .split('\n')
      .slice(-3)
      .join(' ');
    throw new Error(`Falha ao clonar ${repoUrl}@${branch}: ${detail}`);
  } finally {
    await fs.remove(tmpDir).catch(() => {});
    await scrubPlatformGitCredentials();
  }
}

async function restartDeployedContainer(containerType, dockerContainerId) {
  // static e php usam bind mount: os arquivos novos já estão valendo.
  if (containerType === 'static' || containerType === 'php') return;
  try {
    await docker.getContainer(dockerContainerId).restart();
  } catch (error) {
    throw new Error(`Arquivos sincronizados, mas falhou ao reiniciar o container: ${error.message}`);
  }
}

function verifyWebhookSignature(req) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET || 'mozhost_secret';
  const signature = req.get('x-hub-signature-256');
  if (!signature || !req.rawBody) return false;

  const expected = `sha256=${crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex')}`;
  const received = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
}

// ===== OAUTH WEB =====

router.get('/auth', auth, (req, res) => {
  // Sem GITHUB_CLIENT_ID o GitHub devolve 404 ao usuário; falhamos cedo com erro claro.
  if (!GITHUB_CLIENT_ID) {
    console.error('GitHub OAuth não configurado: GITHUB_CLIENT_ID ausente no backend');
    return res.status(503).json({ success: false, error: 'GitHub OAuth não configurado no servidor (GITHUB_CLIENT_ID ausente)' });
  }
  const userId = req.user.userId || req.user.id;
  // Fluxo de CONEXÃO (aba Connections): usa o MESMO OAuth App e o MESMO
  // callback do login (GITHUB_CALLBACK_URL). O callback em routes/auth.js
  // diferencia os dois fluxos pela claim `action` assinada no state.
  // Prefixo "connect." para o callback saber que este state é do fluxo de
  // conexão (e não do login) antes mesmo de validar a assinatura.
  const state = `connect.${jwt.sign(
    { userId, action: 'connect', source: 'web' },
    process.env.JWT_SECRET,
    { expiresIn: '10m' }
  )}`;
  // redirect_uri precisa ser idêntico ao registrado no OAuth App.
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo%20admin:repo_hook&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(GITHUB_CALLBACK_URL)}`;
  res.json({ success: true, url });
});

// ===== DEVICE FLOW (CLI) =====

router.post('/device/start', auth, async (req, res) => {
  try {
    const response = await axios.post('https://github.com/login/device/code', {
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo admin:repo_hook'
    }, {
      headers: { Accept: 'application/json' }
    });

    const { device_code, user_code, verification_uri, expires_in, interval } = response.data;

    res.json({
      success: true,
      device_code,
      user_code,
      verification_uri,
      expires_in,
      interval,
      message: `Acesse ${verification_uri} e insira o código: ${user_code}`
    });

  } catch (error) {
    console.error('Erro device flow:', error);
    res.status(500).json({ error: 'Erro ao iniciar autenticação' });
  }
});

router.post('/device/poll', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { device_code } = req.body;

    if (!device_code) return res.status(400).json({ error: 'device_code é obrigatório' });

    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      device_code,
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token, error: oauthError } = tokenRes.data;

    if (oauthError === 'authorization_pending') return res.json({ success: false, status: 'pending' });
    if (oauthError === 'slow_down') return res.json({ success: false, status: 'slow_down' });
    if (oauthError === 'expired_token') return res.status(400).json({ error: 'Código expirado. Inicie novamente.' });
    if (!access_token) return res.status(400).json({ error: 'Falha ao obter token' });

    const githubUser = await githubRequest('/user', access_token);

    const existing = await database.query('SELECT id FROM github_accounts WHERE user_id = ?', [userId]);

    if (existing.length) {
      await database.query(
        'UPDATE github_accounts SET access_token = ?, github_id = ?, github_username = ?, updated_at = NOW() WHERE user_id = ?',
        [access_token, String(githubUser.id), githubUser.login, userId]
      );
    } else {
      await database.query(
        'INSERT INTO github_accounts (user_id, github_id, github_username, access_token) VALUES (?, ?, ?, ?)',
        [userId, String(githubUser.id), githubUser.login, access_token]
      );
    }

    console.log(`✅ GitHub CLI conectado: user ${userId} → @${githubUser.login}`);

    res.json({ success: true, status: 'connected', github_username: githubUser.login });

  } catch (error) {
    console.error('Erro device poll:', error);
    res.status(500).json({ error: 'Erro ao verificar autorização' });
  }
});

// ===== REPOSITÓRIOS =====

router.get('/repos', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const accounts = await database.query('SELECT * FROM github_accounts WHERE user_id = ?', [userId]);
    if (!accounts.length) return res.status(404).json({ error: 'GitHub não conectado' });

    const repos = await githubRequest('/user/repos?per_page=100&sort=updated', accounts[0].access_token);

    res.json({
      success: true,
      repos: repos.map(r => ({
        id: r.id,
        name: r.name,
        full_name: r.full_name,
        url: r.clone_url,
        private: r.private,
        default_branch: r.default_branch,
        updated_at: r.updated_at
      }))
    });

  } catch (error) {
    console.error('Erro ao listar repos:', error);
    res.status(500).json({ error: 'Erro ao listar repositórios' });
  }
});

router.get('/repos/:owner/:repo/branches', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { owner, repo } = req.params;

    const accounts = await database.query('SELECT * FROM github_accounts WHERE user_id = ?', [userId]);
    if (!accounts.length) return res.status(404).json({ error: 'GitHub não conectado' });

    const branches = await githubRequest(`/repos/${owner}/${repo}/branches`, accounts[0].access_token);

    res.json({
      success: true,
      branches: branches.map(b => ({ name: b.name, sha: b.commit.sha }))
    });

  } catch (error) {
    console.error('Erro ao listar branches:', error);
    res.status(500).json({ error: 'Erro ao listar branches' });
  }
});

// POST /api/github/connect
router.post('/connect', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { container_id, repo_url, repo_name, branch = 'main' } = req.body;

    if (!container_id || !repo_url || !repo_name) {
      return res.status(400).json({ error: 'container_id, repo_url e repo_name são obrigatórios' });
    }

    const containers = await database.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [container_id, userId]
    );
    if (!containers.length) return res.status(404).json({ error: 'Container não encontrado' });

    const accounts = await database.query('SELECT * FROM github_accounts WHERE user_id = ?', [userId]);
    if (!accounts.length) return res.status(404).json({ error: 'GitHub não conectado' });

    if (!VALID_REPO_NAME.test(repo_name)) {
      return res.status(400).json({ error: 'repo_name inválido (use owner/repo)' });
    }

    let normalizedRepoUrl;
    let safeBranch;
    try {
      normalizedRepoUrl = normalizeRepoUrl(repo_url);
      safeBranch = validateBranch(branch);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    if (new URL(normalizedRepoUrl).pathname.replace(/^\//, '') !== repo_name) {
      return res.status(400).json({ error: 'repo_url não corresponde ao repo_name informado' });
    }

    const { access_token } = accounts[0];
    const containerType = containers[0].type;
    const [owner, repo] = repo_name.split('/');
    const webhookUrl = `${process.env.BACKEND_URL || 'https://api.mozhost.shop'}/api/github/webhook`;
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET || 'mozhost_secret';

    let webhookId = null;
    try {
      const webhook = await githubRequest(`/repos/${owner}/${repo}/hooks`, access_token, 'POST', {
        name: 'web',
        active: true,
        events: ['push'],
        config: { url: webhookUrl, content_type: 'json', secret: webhookSecret }
      });
      webhookId = String(webhook.id);
    } catch (webhookError) {
      console.error('Erro ao criar webhook:', webhookError.message);
    }

    await cloneRepoToHost(container_id, containerType, normalizedRepoUrl, safeBranch, access_token);
    await restartDeployedContainer(containerType, containers[0].docker_container_id);

    const existing = await database.query(
      'SELECT id FROM github_repos WHERE container_id = ?',
      [container_id]
    );

    if (existing.length) {
      await database.query(
        'UPDATE github_repos SET repo_url = ?, repo_name = ?, branch = ?, webhook_id = ?, auto_deploy = 1 WHERE container_id = ?',
        [normalizedRepoUrl, repo_name, safeBranch, webhookId, container_id]
      );
    } else {
      await database.query(
        'INSERT INTO github_repos (user_id, container_id, repo_url, repo_name, branch, webhook_id, auto_deploy) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [userId, container_id, normalizedRepoUrl, repo_name, safeBranch, webhookId]
      );
    }

    console.log(`✅ GitHub repo conectado: ${repo_name}@${safeBranch} → container ${container_id} (${containerType})`);

    res.json({
      success: true,
      message: `Repositório ${repo_name} conectado ao container com sucesso!`,
      branch: safeBranch,
      webhook_registered: !!webhookId
    });

  } catch (error) {
    console.error('Erro ao conectar repo:', error);
    const safeMessage = error.message?.startsWith('Falha ao clonar') || error.message?.startsWith('Sem permissão')
      ? error.message
      : 'Erro ao conectar repositório';
    res.status(500).json({ error: safeMessage });
  }
});

// ===== WEBHOOK =====

router.post('/webhook', async (req, res) => {
  if (!verifyWebhookSignature(req)) {
    console.warn('⚠️ Webhook GitHub rejeitado: assinatura inválida');
    return res.status(401).send('invalid signature');
  }

  try {
    const payload = req.body;
    const repoFullName = payload.repository?.full_name;
    const branch = payload.ref?.replace('refs/heads/', '');
    const commitSha = payload.after;
    const commitMessage = payload.head_commit?.message;

    if (!repoFullName || !branch) return res.sendStatus(200);

    console.log(`📥 GitHub webhook: ${repoFullName}@${branch} - ${commitSha}`);

    const repos = await database.query(
      `SELECT gr.*, c.docker_container_id, c.type as container_type
       FROM github_repos gr
       JOIN containers c ON gr.container_id = c.id
       WHERE gr.repo_name = ? AND gr.branch = ? AND gr.auto_deploy = 1`,
      [repoFullName, branch]
    );

    if (!repos.length) return res.sendStatus(200);

    res.sendStatus(200);

    for (const repo of repos) {
      const deployLog = await database.query(
        'INSERT INTO deploy_logs (user_id, container_id, repo_id, commit_sha, commit_message, status, triggered_by) VALUES (?, ?, ?, ?, ?, "running", "push")',
        [repo.user_id, repo.container_id, repo.id, commitSha, commitMessage]
      );
      const deployId = deployLog.insertId;

      try {
        const accounts = await database.query('SELECT access_token FROM github_accounts WHERE user_id = ?', [repo.user_id]);
        if (!accounts.length) throw new Error('GitHub token não encontrado');

        const { access_token } = accounts[0];
        const repoUrl = normalizeRepoUrl(repo.repo_url);
        const safeBranch = validateBranch(repo.branch);

        const targetPath = await cloneRepoToHost(
          repo.container_id, repo.container_type, repoUrl, safeBranch, access_token
        );
        await restartDeployedContainer(repo.container_type, repo.docker_container_id);

        const pullOutput = `Arquivos sincronizados em ${targetPath}`;

        await database.query(
          'UPDATE deploy_logs SET status = "success", log = ?, finished_at = NOW() WHERE id = ?',
          [pullOutput, deployId]
        );

        await database.query('UPDATE github_repos SET last_deploy_at = NOW() WHERE id = ?', [repo.id]);

        console.log(`✅ Deploy success: ${repoFullName}@${branch} → container ${repo.container_id} (${repo.container_type})`);

      } catch (deployError) {
        console.error(`❌ Deploy failed: ${deployError.message}`);
        await database.query(
          'UPDATE deploy_logs SET status = "failed", log = ?, finished_at = NOW() WHERE id = ?',
          [deployError.message, deployId]
        );
      }
    }

  } catch (error) {
    console.error('Erro webhook GitHub:', error);
    res.sendStatus(500);
  }
});

// GET /api/github/status
router.get('/status', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const accounts = await database.query(
      'SELECT github_username, created_at FROM github_accounts WHERE user_id = ?',
      [userId]
    );

    // Última sincronização = deploy mais recente (push recebido ou deploy
    // concluído) entre os repositórios conectados deste usuário.
    let lastSyncAt = null;
    if (accounts.length) {
      const [repoRow] = await database.query(
        'SELECT MAX(last_deploy_at) AS last_deploy FROM github_repos WHERE user_id = ?',
        [userId]
      );
      const [logRow] = await database.query(
        'SELECT MAX(created_at) AS last_deploy FROM deploy_logs WHERE user_id = ?',
        [userId]
      );
      const timestamps = [repoRow?.last_deploy, logRow?.last_deploy]
        .filter(Boolean)
        .map((value) => new Date(value).getTime())
        .filter((value) => !Number.isNaN(value));
      if (timestamps.length) lastSyncAt = new Date(Math.max(...timestamps)).toISOString();
    }

    res.json({
      success: true,
      connected: accounts.length > 0,
      github_username: accounts[0]?.github_username || null,
      last_sync_at: lastSyncAt
    });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

// GET /api/github/deploys/:container_id
router.get('/deploys/:container_id', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { container_id } = req.params;

    const deploys = await database.query(
      'SELECT id, commit_sha, commit_message, status, triggered_by, created_at, finished_at FROM deploy_logs WHERE container_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 20',
      [container_id, userId]
    );

    res.json({ success: true, deploys });

  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar deploys' });
  }
});

// DELETE /api/github/disconnect
router.delete('/disconnect', auth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    await database.query('DELETE FROM github_accounts WHERE user_id = ?', [userId]);
    res.json({ success: true, message: 'GitHub desconectado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao desconectar GitHub' });
  }
});

module.exports = router;
