// routes/files.js
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const AdmZip = require('adm-zip');
const authMiddleware = require('../middleware/auth');
const database = require('../models/database');
const dockerManager = require('../utils/docker-manager');

const router = express.Router();

// Aplicar middleware de auth
router.use(authMiddleware);

// Helper para escrever arquivo com permissões corretas
async function writeFileWithPermissions(filePath, content, encoding = 'utf8') {
  await fs.writeFile(filePath, content, encoding);
  // Definir permissões 0o666 (rw-rw-rw-) para que todos possam ler/escrever
  await fs.chmod(filePath, 0o666);
}

// Helper: retorna a subpasta de deploy baseada no tipo do container
async function getDeployFolder(containerId) {
  const info = await database.query(
    'SELECT type FROM containers WHERE id = ?',
    [containerId]
  );
  const type = info[0]?.type;
  if (type === 'static') return 'html';
  if (type === 'php') return 'php';
  return '';
}

// Detecta Next.js sem executar código enviado pelo usuário.
function detectNextJsProject(zip) {
  const packageEntry = zip.getEntries().find((entry) => {
    const entryName = entry.entryName.replace(/\\/g, '/').replace(/^\.\//, '');
    return !entry.isDirectory && entryName === 'package.json';
  });

  if (!packageEntry) return false;

  try {
    const packageJson = JSON.parse(packageEntry.getData().toString('utf8'));
    const dependencySections = [
      packageJson.dependencies,
      packageJson.devDependencies,
      packageJson.peerDependencies,
      packageJson.optionalDependencies
    ];

    return dependencySections.some((dependencies) => (
      dependencies && typeof dependencies === 'object' && Object.prototype.hasOwnProperty.call(dependencies, 'next')
    ));
  } catch (_error) {
    return false;
  }
}

function isBuildArtifact(entryName) {
  const normalized = entryName.replace(/\\/g, '/').replace(/^\.\//, '');
  return normalized === '.next' || normalized.startsWith('.next/') ||
    normalized === 'node_modules' || normalized.startsWith('node_modules/');
}

// Upload simples para CLI (não conflita com a interface web)
router.post('/:containerId/cli-upload', [
  body('path').notEmpty().withMessage('Path is required'),
  body('content').isString().withMessage('Content must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const { path: filePath, content } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    const containerPath = getContainerPath(containerId);
    const deployFolder = await getDeployFolder(containerId);
    const fullPath = deployFolder
      ? path.join(containerPath, deployFolder, filePath)
      : path.join(containerPath, filePath);

    // Verificar segurança do caminho
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Garantir que o diretório pai existe
    await fs.ensureDir(path.dirname(fullPath));

    // Verificar cota de armazenamento
    const contentBytes = Buffer.byteLength(content, 'utf8');
    await ensureStorageAllowance(containerId, req.user.userId, contentBytes);

    // Escrever/sobrescrever arquivo COM PERMISSÕES CORRETAS
    await writeFileWithPermissions(fullPath, content, 'utf8');

    res.json({
      message: 'File uploaded successfully',
      path: filePath,
      size: contentBytes
    });

  } catch (error) {
    console.error('Error uploading file (CLI):', error);

    if (error.status === 413) {
      return res.status(413).json({
        error: 'Storage limit exceeded',
        message: error.message,
        details: error.details
      });
    }

    res.status(500).json({
      error: 'Failed to upload file',
      message: error.message
    });
  }
});

// Upload aceitando apenas ZIP (rota /upload-zip)
const upload = multer({
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB por arquivo ZIP
    files: 10
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/zip' ||
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      return cb(null, true);
    } else {
      return cb(new Error('Only ZIP files allowed for this endpoint'), false);
    }
  }
});

// Upload genérico para arquivos e pastas individuais (qualquer tipo)
const genericUpload = multer({
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB por arquivo
    files: 50 // até 50 arquivos por upload
  }
  // Sem fileFilter — cota de armazenamento + path traversal já protegem o sistema
});

/*

// Configurar multer para upload de arquivos
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB por arquivo
    files: 10 // máximo 10 arquivos por upload
  },
  fileFilter: (req, file, cb) => {
    // Filtros de segurança - tipos de arquivo permitidos
    const allowedMimes = [
      'text/plain',
      'text/javascript',
      'application/javascript',
      'text/x-python',
      'application/json',
      'text/html',
      'text/css',
      'text/markdown',
      'application/x-yaml',
      'text/yaml'
    ];

    if (allowedMimes.includes(file.mimetype) || file.originalname.match(/\.(js|py|json|html|css|md|txt|yml|yaml|env)$/)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});
*/
// Helper para verificar se container pertence ao usuário
async function verifyContainerOwnership(containerId, userId) {
  const containers = await database.query(
    'SELECT id FROM containers WHERE id = ? AND user_id = ?',
    [containerId, userId]
  );
  return containers.length > 0;
}

async function hasAccountAccess(userId) {
  const users = await database.query(
    `SELECT suspended_at, free_trial_ends,
            (SELECT b.expires_at FROM billing b
             WHERE b.user_id = users.id AND b.status = 'active' AND b.expires_at > NOW()
             ORDER BY b.expires_at DESC LIMIT 1) AS billing_expires
     FROM users WHERE id = ?`,
    [userId]
  );
  if (!users.length || users[0].suspended_at) return false;
  return !!users[0].billing_expires ||
    (users[0].free_trial_ends && new Date(users[0].free_trial_ends) > new Date());
}

async function requireAccountAccess(userId, res) {
  if (await hasAccountAccess(userId)) return true;
  res.status(402).json({
    error: 'Account suspended',
    message: 'Sua conta está suspensa. Renove o plano para alterar os arquivos.',
    suspended: true
  });
  return false;
}

// Helper para construir caminho do container
function getContainerPath(containerId) {
  return path.join(process.env.CONTAINERS_PATH || '/root/mozhost/user-data/containers', containerId);
}

// Helper: calcular uso atual do container
async function calculateContainerUsageBytes(containerId) {
  const containerPath = getContainerPath(containerId);
  if (!await fs.pathExists(containerPath)) return 0;

  async function walk(dir) {
    let total = 0;
    const items = await fs.readdir(dir);
    for (const item of items) {
      const itemPath = path.join(dir, item);
      try {
        const stats = await fs.stat(itemPath);
        if (stats.isDirectory()) total += await walk(itemPath);
        else total += stats.size;
      } catch (_) {}
    }
    return total;
  }

  return walk(containerPath);
}

// Helper: garantir que não ultrapasse a cota ao adicionar bytes
async function ensureStorageAllowance(containerId, userId, additionalBytes = 0) {
  const userInfo = await database.query(
    'SELECT max_storage_mb FROM users WHERE id = ?',
    [userId]
  );
  const maxStorageMB = userInfo.length > 0 ? userInfo[0].max_storage_mb : 1024;
  const limitBytes = maxStorageMB * 1024 * 1024;

  const usedBytes = await calculateContainerUsageBytes(containerId);
  if (usedBytes + additionalBytes > limitBytes) {
    const remaining = Math.max(0, limitBytes - usedBytes);
    const needed = (usedBytes + additionalBytes) - limitBytes;
    const percent = (usedBytes / limitBytes) * 100;
    const almostFull = percent >= 90;
    const message = almostFull
      ? 'Armazenamento quase cheio. Considere fazer upgrade.'
      : 'Limite de armazenamento atingido.';
    const errorMsg = additionalBytes > 0
      ? `Operação excede o limite por ${Math.ceil(needed / (1024 * 1024))} MB`
      : message;
    const err = new Error(errorMsg);
    err.status = 413;
    err.details = { usedBytes, limitBytes, remainingBytes: remaining };
    throw err;
  }
  return { usedBytes, limitBytes };
}

// Listar arquivos e pastas de um container
router.get('/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { path: subPath = '' } = req.query;

    // Verificar ownership. A leitura permanece disponível durante a retenção.
    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerPath = getContainerPath(containerId);
    const fullPath = path.join(containerPath, subPath);

    // Verificar se não está tentando sair do container
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verificar se caminho existe
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = await fs.stat(fullPath);

    if (stats.isDirectory()) {
      // Listar conteúdo do diretório
      const items = await fs.readdir(fullPath);
      const fileList = [];

      for (const item of items) {
        try {
          const itemPath = path.join(fullPath, item);
          const itemStats = await fs.stat(itemPath);

          fileList.push({
            name: item,
            type: itemStats.isDirectory() ? 'directory' : 'file',
            size: itemStats.size,
            modified: itemStats.mtime,
            path: path.join(subPath, item).replace(/\\/g, '/')
          });
        } catch (itemError) {
          // Item pode ter sido deletado entre readdir e stat
          continue;
        }
      }

      res.json({
        type: 'directory',
        path: subPath,
        items: fileList.sort((a, b) => {
          // Diretórios primeiro, depois arquivos, ambos alfabeticamente
          if (a.type !== b.type) {
            return a.type === 'directory' ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        })
      });

    } else {
      // Retornar conteúdo do arquivo
      const content = await fs.readFile(fullPath, 'utf8');

      res.json({
        type: 'file',
        path: subPath,
        name: path.basename(fullPath),
        size: stats.size,
        modified: stats.mtime,
        content
      });
    }

  } catch (error) {
    console.error('Error listing files:', error);

    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Path not found' });
    }

    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Criar novo arquivo ou pasta
router.post('/:containerId', [
  body('path').notEmpty().withMessage('Path is required'),
  body('type').isIn(['file', 'directory']).withMessage('Type must be file or directory'),
  body('content').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const { path: filePath, type, content = '' } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    const containerPath = getContainerPath(containerId);
    const fullPath = path.join(containerPath, filePath);

    // Verificar segurança do caminho
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verificar se já existe
    if (await fs.pathExists(fullPath)) {
      return res.status(409).json({ error: 'Path already exists' });
    }

    if (type === 'directory') {
      await fs.ensureDir(fullPath);
      await fs.chmod(fullPath, 0o777); // Permissões para diretório
    } else {
      // Garantir que o diretório pai existe
      await fs.ensureDir(path.dirname(fullPath));
      const contentBytes = Buffer.byteLength(content, 'utf8');
      await ensureStorageAllowance(containerId, req.user.userId, contentBytes);
      await writeFileWithPermissions(fullPath, content, 'utf8');
    }

    res.status(201).json({
      message: `${type} created successfully`,
      path: filePath
    });

  } catch (error) {
    console.error('Error creating file/directory:', error);
    res.status(500).json({ error: 'Failed to create file/directory' });
  }
});

// Editar arquivo
router.put('/:containerId/*', [
  body('content').isString().withMessage('Content must be a string')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const filePath = req.params[0]; // Captura o resto do path
    const { content } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    const containerPath = getContainerPath(containerId);
    const fullPath = path.join(containerPath, filePath);

    // Verificar segurança
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Verificar se arquivo existe
    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot edit directory' });
    }

    // Verificar cota (considerar delta opcionalmente; aqui usamos tamanho novo)
    const newBytes = Buffer.byteLength(content, 'utf8');
    await ensureStorageAllowance(containerId, req.user.userId, newBytes);

    // CORRIGIDO: Usar writeFileWithPermissions
    await writeFileWithPermissions(fullPath, content, 'utf8');

    res.json({
      message: 'File saved successfully',
      path: filePath,
      size: Buffer.byteLength(content, 'utf8')
    });

  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: 'Failed to save file' });
  }
});

// Deletar arquivo ou pasta
router.delete('/:containerId/*', async (req, res) => {
  try {
    const { containerId } = req.params;
    const filePath = req.params[0];

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    const containerPath = getContainerPath(containerId);
    const fullPath = path.join(containerPath, filePath);

    // Verificar segurança
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Não permitir deletar arquivos essenciais
    const essentialFiles = ['package.json', 'requirements.txt', 'main.py', 'index.js'];
    const fileName = path.basename(fullPath);

    if (essentialFiles.includes(fileName) && path.dirname(fullPath) === containerPath) {
      return res.status(403).json({
        error: 'Cannot delete essential file',
        message: `${fileName} is required for the container to function`
      });
    }

    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    await fs.remove(fullPath);

    res.json({
      message: 'File/directory deleted successfully',
      path: filePath
    });

  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Renomear/mover arquivo ou pasta
router.patch('/:containerId/*', [
  body('newPath').notEmpty().withMessage('New path is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { containerId } = req.params;
    const oldPath = req.params[0];
    const { newPath } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    const containerPath = getContainerPath(containerId);
    const oldFullPath = path.join(containerPath, oldPath);
    const newFullPath = path.join(containerPath, newPath);

    // Verificar segurança
    if (!oldFullPath.startsWith(containerPath) || !newFullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!await fs.pathExists(oldFullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (await fs.pathExists(newFullPath)) {
      return res.status(409).json({ error: 'Destination already exists' });
    }

    // Garantir que diretório de destino existe
    await fs.ensureDir(path.dirname(newFullPath));

    await fs.move(oldFullPath, newFullPath);

    res.json({
      message: 'File/directory moved successfully',
      oldPath,
      newPath
    });

  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: 'Failed to move file' });
  }
});

// Nova rota: Upload e extração de ZIP
router.post('/:containerId/upload-zip',
  upload.single('zipfile'),
  async (req, res) => {
    try {
      const { containerId } = req.params;
      const { path: targetPath = '', overwrite = 'false' } = req.body;

      if (!await verifyContainerOwnership(containerId, req.user.userId)) {
        return res.status(404).json({ error: 'Container not found' });
      }
      if (!await requireAccountAccess(req.user.userId, res)) return;

      if (!req.file) {
        return res.status(400).json({ error: 'No ZIP file uploaded' });
      }

      // Validar que é ZIP
      if (!req.file.originalname.endsWith('.zip')) {
        return res.status(400).json({ error: 'File must be a ZIP archive' });
      }

      // Ler o manifesto antes de escolher a pasta de destino. Isso permite
      // transformar automaticamente um container static em Next.js quando o
      // deploy é feito pelo CLI.
      const zip = new AdmZip(req.file.buffer);
      const isNextJs = detectNextJsProject(zip);
      const containerInfo = await database.query(
        'SELECT type FROM containers WHERE id = ? AND user_id = ?',
        [containerId, req.user.userId]
      );

      if (isNextJs && containerInfo[0]?.type === 'static') {
        await dockerManager.promoteStaticToNextJs(containerId);
      }

      const containerPath = getContainerPath(containerId);
      const deployFolder = await getDeployFolder(containerId);
      const extractPath = deployFolder
        ? path.join(containerPath, deployFolder, targetPath)
        : path.join(containerPath, targetPath);

      // Segurança
      if (!extractPath.startsWith(containerPath)) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Verificar cota
      await ensureStorageAllowance(containerId, req.user.userId, req.file.size);

      await fs.ensureDir(extractPath);

      const zipEntries = zip.getEntries();

      const extractedFiles = [];
      const skippedFiles = [];

      for (const entry of zipEntries) {
        const entryName = entry.entryName.replace(/\\/g, '/').replace(/^\.\//, '');

        if (isBuildArtifact(entryName)) {
          skippedFiles.push({ name: entryName, reason: 'Build artifact or dependency directory' });
          continue;
        }

        const entryPath = path.join(extractPath, entryName);

        // Path traversal protection
        if (!entryPath.startsWith(extractPath)) {
          skippedFiles.push({ name: entryName, reason: 'Invalid path' });
          continue;
        }

        if (entry.isDirectory) {
          await fs.ensureDir(entryPath);
          await fs.chmod(entryPath, 0o777);
          continue;
        }

        // Verificar se já existe
        const fileExists = await fs.pathExists(entryPath);
        if (fileExists && overwrite === 'false') {
          skippedFiles.push({ name: entry.entryName, reason: 'File already exists' });
          continue;
        }

        await fs.ensureDir(path.dirname(entryPath));

        const fileContent = entry.getData();
        await writeFileWithPermissions(entryPath, fileContent);

        extractedFiles.push({
          name: entry.entryName,
          size: entry.header.size,
          path: path.relative(containerPath, entryPath).replace(/\\/g, '/')
        });
      }

      res.json({
        message: 'ZIP extracted successfully',
        extracted: extractedFiles.length,
        skipped: skippedFiles.length,
        files: extractedFiles,
        skippedFiles: skippedFiles,
        totalSize: req.file.size,
        framework: isNextJs ? 'nextjs' : null,
        runtimePromoted: isNextJs && containerInfo[0]?.type === 'static'
      });

    } catch (error) {
      console.error('Error extracting ZIP:', error);

      if (error.status === 413) {
        return res.status(413).json({
          error: 'Storage limit exceeded',
          message: error.message
        });
      }

      res.status(500).json({
        error: 'Failed to extract ZIP',
        message: error.message
      });
    }
});

// Upload de arquivos individuais (qualquer tipo)
router.post('/:containerId/upload', genericUpload.array('files', 50), async (req, res) => {
  try {
    const { containerId } = req.params;
    const { path: targetPath = '' } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const containerPath = getContainerPath(containerId);
    const deployFolder = await getDeployFolder(containerId);
    const uploadPath = deployFolder
      ? path.join(containerPath, deployFolder, targetPath)
      : path.join(containerPath, targetPath);

    // Verificar segurança
    if (!uploadPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Garantir que diretório existe
    await fs.ensureDir(uploadPath);

    const uploadedFiles = [];

    // Checar cota total antes de gravar todos arquivos
    const totalIncoming = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
    await ensureStorageAllowance(containerId, req.user.userId, totalIncoming);

    for (const file of req.files) {
      const filePath = path.join(uploadPath, file.originalname);

      // Verificar se arquivo já existe
      if (await fs.pathExists(filePath)) {
        // Renomear arquivo com timestamp
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const timestamp = Date.now();
        const newName = `${name}_${timestamp}${ext}`;
        const newFilePath = path.join(uploadPath, newName);

        await writeFileWithPermissions(newFilePath, file.buffer);
        uploadedFiles.push({
          original: file.originalname,
          saved: newName,
          size: file.size
        });
      } else {
        await writeFileWithPermissions(filePath, file.buffer);
        uploadedFiles.push({
          original: file.originalname,
          saved: file.originalname,
          size: file.size
        });
      }
    }

    res.json({
      message: 'Files uploaded successfully',
      files: uploadedFiles,
      count: uploadedFiles.length
    });

  } catch (error) {
    console.error('Error uploading files:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 100MB'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'Too many files',
        message: 'Maximum 50 files per upload'
      });
    }

    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Upload de pasta inteira preservando estrutura (relativePath enviado no body de cada arquivo)
router.post('/:containerId/upload-folder', genericUpload.array('files', 50), async (req, res) => {
  try {
    const { containerId } = req.params;
    const { path: targetPath = '' } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }
    if (!await requireAccountAccess(req.user.userId, res)) return;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const containerPath = getContainerPath(containerId);
    const deployFolder = await getDeployFolder(containerId);
    const baseUploadPath = deployFolder
      ? path.join(containerPath, deployFolder, targetPath)
      : path.join(containerPath, targetPath);

    // Verificar segurança do caminho base
    if (!baseUploadPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await fs.ensureDir(baseUploadPath);

    // Checar cota total antes de gravar
    const totalIncoming = req.files.reduce((sum, f) => sum + (f.size || 0), 0);
    await ensureStorageAllowance(containerId, req.user.userId, totalIncoming);

    const uploadedFiles = [];
    const skippedFiles = [];

    for (const file of req.files) {
      // relativePath vem em file.fieldname ou multipart text part "paths";
      // multer entrega o campo de texto no req.body[nameDoCampo] somente se for arquivo,
      // então aqui usamos file.originalname como caminho relativo confiável fornecido pelo cliente.
      // O frontend envia o caminho relativo no `originalname` (ex: "src/index.js").
      const relativePath = file.originalname.replace(/\\/g, '/').replace(/^\/+/, '');
      const filePath = path.join(baseUploadPath, relativePath);

      // Path traversal protection
      if (!filePath.startsWith(baseUploadPath)) {
        skippedFiles.push({ name: relativePath, reason: 'Invalid path' });
        continue;
      }

      await fs.ensureDir(path.dirname(filePath));
      // Sobrescreve silenciosamente (equivale a arrastar para o gerenciador)
      await writeFileWithPermissions(filePath, file.buffer);

      uploadedFiles.push({
        path: relativePath,
        size: file.size
      });
    }

    res.json({
      message: 'Folder uploaded successfully',
      uploaded: uploadedFiles.length,
      skipped: skippedFiles.length,
      files: uploadedFiles,
      skippedFiles
    });

  } catch (error) {
    console.error('Error uploading folder:', error);

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Maximum file size is 100MB'
      });
    }

    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'Too many files',
        message: 'Maximum 50 files per upload'
      });
    }

    res.status(500).json({ error: 'Failed to upload folder' });
  }
});

// Download de arquivo: permitido durante os 7 dias de retenção.
router.get('/:containerId/download/*', async (req, res) => {
  try {
    const { containerId } = req.params;
    const filePath = req.params[0];

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerPath = getContainerPath(containerId);
    const fullPath = path.join(containerPath, filePath);

    // Verificar segurança
    if (!fullPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!await fs.pathExists(fullPath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const stats = await fs.stat(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot download directory' });
    }

    // Definir headers para download
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(fullPath)}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', stats.size);

    // Stream do arquivo
    const fileStream = fs.createReadStream(fullPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

// Obter informações de uso de armazenamento
router.get('/:containerId/storage', async (req, res) => {
  try {
    const { containerId } = req.params;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerPath = getContainerPath(containerId);

    if (!await fs.pathExists(containerPath)) {
      return res.status(404).json({ error: 'Container path not found' });
    }

    // Calcular uso de armazenamento recursivamente
    async function calculateDirSize(dirPath) {
      let totalSize = 0;
      const items = await fs.readdir(dirPath);

      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        try {
          const stats = await fs.stat(itemPath);

          if (stats.isDirectory()) {
            totalSize += await calculateDirSize(itemPath);
          } else {
            totalSize += stats.size;
          }
        } catch (error) {
          // Item pode ter sido deletado, continuar
          continue;
        }
      }

      return totalSize;
    }

    const totalSize = await calculateDirSize(containerPath);

    // Buscar limite do usuário
    const userInfo = await database.query(
      'SELECT max_storage_mb FROM users WHERE id = ?',
      [req.user.userId]
    );

    const maxStorageMB = userInfo.length > 0 ? userInfo[0].max_storage_mb : 1024;
    const maxStorageBytes = maxStorageMB * 1024 * 1024;

    // Atualizar uso no banco
    await database.query(
      'UPDATE containers SET storage_used_mb = ? WHERE id = ?',
      [Math.ceil(totalSize / (1024 * 1024)), containerId]
    );

    res.json({
      used: totalSize,
      usedMB: Math.ceil(totalSize / (1024 * 1024)),
      limit: maxStorageBytes,
      limitMB: maxStorageMB,
      percentage: (totalSize / maxStorageBytes) * 100,
      available: maxStorageBytes - totalSize
    });

  } catch (error) {
    console.error('Error calculating storage usage:', error);
    res.status(500).json({ error: 'Failed to calculate storage usage' });
  }
});

// Buscar arquivos (pesquisa)
router.get('/:containerId/search', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { q: query, ext: extension } = req.query;

    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query must be at least 2 characters' });
    }

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const containerPath = getContainerPath(containerId);

    // Função recursiva para buscar arquivos
    async function searchFiles(dir, searchQuery, fileExtension = null) {
      const results = [];
      const items = await fs.readdir(dir);

      for (const item of items) {
        try {
          const itemPath = path.join(dir, item);
          const stats = await fs.stat(itemPath);
          const relativePath = path.relative(containerPath, itemPath);

          if (stats.isDirectory()) {
            // Buscar recursivamente em subdiretórios
            const subResults = await searchFiles(itemPath, searchQuery, fileExtension);
            results.push(...subResults);
          } else {
            // Verificar se arquivo corresponde aos critérios
            const matchesName = item.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesExt = !fileExtension || item.toLowerCase().endsWith(fileExtension.toLowerCase());

            if (matchesName && matchesExt) {
              results.push({
                name: item,
                path: relativePath.replace(/\\/g, '/'),
                size: stats.size,
                modified: stats.mtime,
                type: 'file'
              });
            }
          }
        } catch (error) {
          // Pular arquivos inacessíveis
          continue;
        }
      }

      return results;
    }

    const searchResults = await searchFiles(containerPath, query.trim(), extension);

    res.json({
      query,
      extension,
      results: searchResults.slice(0, 50), // Limitar resultados
      total: searchResults.length,
      limited: searchResults.length > 50
    });

  } catch (error) {
    console.error('Error searching files:', error);
    res.status(500).json({ error: 'Failed to search files' });
  }
});

// Download de múltiplos arquivos/pastas como ZIP
router.post('/:containerId/download-zip', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { paths } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    if (!paths || !Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'paths must be a non-empty array' });
    }

    const containerPath = getContainerPath(containerId);
    const archiver = require('archiver');

    // Verificar se todos os paths existem
    for (const filePath of paths) {
      const fullPath = path.join(containerPath, filePath);
      if (!fullPath.startsWith(containerPath)) {
        return res.status(403).json({ error: `Access denied: ${filePath}` });
      }
      if (!await fs.pathExists(fullPath)) {
        return res.status(404).json({ error: `Path not found: ${filePath}` });
      }
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const zipName = `download_${containerId.substring(0, 8)}_${timestamp}.zip`;

    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      // Se já começámos a enviar o stream, não podemos responder com JSON
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to create ZIP' });
      } else {
        res.end();
      }
    });

    archive.pipe(res);

    for (const filePath of paths) {
      const fullPath = path.join(containerPath, filePath);
      const stats = await fs.stat(fullPath);

      if (stats.isDirectory()) {
        // Adicionar diretório inteiro preservando estrutura
        archive.directory(fullPath, filePath);
      } else {
        // Adicionar arquivo individual preservando caminho
        archive.file(fullPath, { name: filePath });
      }
    }

    await archive.finalize();

  } catch (error) {
    console.error('Error creating ZIP download:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to create ZIP download' });
    }
  }
});

// Backup de container (zip)
router.post('/:containerId/backup', async (req, res) => {
  try {
    const { containerId } = req.params;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    const archiver = require('archiver');
    const containerPath = getContainerPath(containerId);
    const backupPath = path.join(process.env.BACKUPS_PATH || '/root/mozhost/user-data/backups');

    await fs.ensureDir(backupPath);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `${containerId}_${timestamp}.zip`;
    const backupFullPath = path.join(backupPath, backupFileName);

    // Criar stream de backup
    const output = fs.createWriteStream(backupFullPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.pipe(output);
    archive.directory(containerPath, false);

    await archive.finalize();

    // Aguardar conclusão
    await new Promise((resolve, reject) => {
      output.on('close', resolve);
      archive.on('error', reject);
    });

    const backupStats = await fs.stat(backupFullPath);

    res.json({
      message: 'Backup created successfully',
      filename: backupFileName,
      size: backupStats.size,
      path: `/api/files/${containerId}/backup/${backupFileName}`
    });

  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

module.exports = router;

