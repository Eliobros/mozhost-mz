
// routes/github.js
// Integração GitHub OAuth + Deploy automático via webhook

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { execSync } = require('child_process');
const auth = require('../middleware/auth');
const database = require('../models/database');
const Docker = require('dockerode');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;

const USER_DATA_PATH = process.env.USER_DATA_PATH || '/root/mozhost/user-data';

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

async function execInContainer(container, cmd) {
  return new Promise(async (resolve, reject) => {
    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start();
    let output = '';

    stream.on('data', chunk => output += chunk.toString());
    stream.on('end', () => resolve(output));
    stream.on('error', reject);
  });
}

function getAppPath(containerType) {
  return containerType === 'static' ? '/usr/share/nginx/html' : '/app/code';
}

function getHostHtmlPath(containerId) {
  return `${USER_DATA_PATH}/containers/${containerId}/html`;
}

function cloneToHost(repoUrlWithToken, branch, containerId) {
  const hostHtmlPath = getHostHtmlPath(containerId);
  const tmpDir = `/tmp/mozhost_${containerId}_${Date.now()}`;
  execSync(`rm -rf ${tmpDir} && git clone -b ${branch} ${repoUrlWithToken} ${tmpDir} && rm -rf ${hostHtmlPath}/* ${hostHtmlPath}/.* 2>/dev/null; cp -r ${tmpDir}/. ${hostHtmlPath}/ && rm -rf ${tmpDir}`);
  return `Clonado para ${hostHtmlPath}`;
}

// ===== OAUTH WEB =====

router.get('/auth', auth, (req, res) => {
  const userId = req.user.userId || req.user.id;
  const state = Buffer.from(JSON.stringify({ userId, source: 'web' })).toString('base64');
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=repo,admin:repo_hook&state=${state}&redirect_uri=${GITHUB_CALLBACK_URL}`;
  res.json({ success: true, url });
});

router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    if (!code) return res.status(400).json({ error: 'Code não fornecido' });

    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { userId } = stateData;

    const tokenRes = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL
    }, {
      headers: { Accept: 'application/json' }
    });

    const { access_token } = tokenRes.data;
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

    console.log(`✅ GitHub conectado: user ${userId} → @${githubUser.login}`);

    const frontendUrl = process.env.FRONTEND_URL || 'https://mozhost.topaziocoin.online';
    res.redirect(`${frontendUrl}/connections?github=success`);

  } catch (error) {
    console.error('Erro callback GitHub:', error);
    res.status(500).json({ error: 'Erro ao conectar GitHub' });
  }
});

// ===== DEVICE FLOW (CLI) =====

router.post('/device/start', auth, async (req, res) => {
  try {
    const response = await axios.post('https://github.com/login/device/code', {
      client_id: GITHUB_CLIENT_ID,
      scope: 'repo,admin:repo_hook'
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

    const repoUrlWithToken = repo_url.replace('https://', `https://oauth2:${access_token}@`);

    if (containerType === 'static') {
      // Clonar no host direto na pasta html que está montada no container
      cloneToHost(repoUrlWithToken, branch, container_id);
    } else {
      // Clonar dentro do container via execInContainer
      const container = docker.getContainer(containers[0].docker_container_id);
      await execInContainer(container, ['sh', '-c',
        `rm -rf /app/code/* /app/code/.git 2>/dev/null; git clone -b ${branch} ${repoUrlWithToken} /tmp/mozhost_repo && cp -r /tmp/mozhost_repo/. /app/code/ && rm -rf /tmp/mozhost_repo`
      ]);
      await container.restart();
    }

    const existing = await database.query(
      'SELECT id FROM github_repos WHERE container_id = ?',
      [container_id]
    );

    if (existing.length) {
      await database.query(
        'UPDATE github_repos SET repo_url = ?, repo_name = ?, branch = ?, webhook_id = ?, auto_deploy = 1 WHERE container_id = ?',
        [repo_url, repo_name, branch, webhookId, container_id]
      );
    } else {
      await database.query(
        'INSERT INTO github_repos (user_id, container_id, repo_url, repo_name, branch, webhook_id, auto_deploy) VALUES (?, ?, ?, ?, ?, ?, 1)',
        [userId, container_id, repo_url, repo_name, branch, webhookId]
      );
    }

    console.log(`✅ GitHub repo conectado: ${repo_name}@${branch} → container ${container_id} (${containerType})`);

    res.json({
      success: true,
      message: `Repositório ${repo_name} conectado ao container com sucesso!`,
      branch,
      webhook_registered: !!webhookId
    });

  } catch (error) {
    console.error('Erro ao conectar repo:', error);
    res.status(500).json({ error: 'Erro ao conectar repositório' });
  }
});

// ===== WEBHOOK =====

router.post('/webhook', async (req, res) => {
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
        const repoUrlWithToken = repo.repo_url.replace('https://', `https://oauth2:${access_token}@`);

        let pullOutput;

        if (repo.container_type === 'static') {
          // Clone no host direto na pasta html montada no container
          pullOutput = cloneToHost(repoUrlWithToken, repo.branch, repo.container_id);
        } else {
          const container = docker.getContainer(repo.docker_container_id);

          pullOutput = await execInContainer(container, ['bash', '-c',
            `cd /app/code && git pull origin ${repo.branch}`
          ]);

          await execInContainer(container, ['bash', '-c',
            `cd /app/code && [ -f package.json ] && npm install --production || true`
          ]);
          await execInContainer(container, ['bash', '-c',
            `cd /app/code && [ -f requirements.txt ] && pip install -r requirements.txt || true`
          ]);

          await container.restart();
        }

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

    res.json({
      success: true,
      connected: accounts.length > 0,
      github_username: accounts[0]?.github_username || null
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
