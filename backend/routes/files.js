// routes/files.js
const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const database = require('../models/database');

const router = express.Router();

// Aplicar middleware de auth
router.use(authMiddleware);

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

// Helper para verificar se container pertence ao usuário
async function verifyContainerOwnership(containerId, userId) {
  const containers = await database.query(
    'SELECT id FROM containers WHERE id = ? AND user_id = ?',
    [containerId, userId]
  );
  return containers.length > 0;
}

// Helper para construir caminho do container
function getContainerPath(containerId) {
  return path.join(process.env.CONTAINERS_PATH || '/root/mozhost/user-data/containers', containerId);
}

// Listar arquivos e pastas de um container
router.get('/:containerId', async (req, res) => {
  try {
    const { containerId } = req.params;
    const { path: subPath = '' } = req.query;

    // Verificar ownership
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
    } else {
      // Garantir que o diretório pai existe
      await fs.ensureDir(path.dirname(fullPath));
      await fs.writeFile(fullPath, content, 'utf8');
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

    // Salvar arquivo
    await fs.writeFile(fullPath, content, 'utf8');

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

// Upload de arquivos
router.post('/:containerId/upload', upload.array('files', 10), async (req, res) => {
  try {
    const { containerId } = req.params;
    const { path: targetPath = '' } = req.body;

    if (!await verifyContainerOwnership(containerId, req.user.userId)) {
      return res.status(404).json({ error: 'Container not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const containerPath = getContainerPath(containerId);
    const uploadPath = path.join(containerPath, targetPath);

    // Verificar segurança
    if (!uploadPath.startsWith(containerPath)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Garantir que diretório existe
    await fs.ensureDir(uploadPath);

    const uploadedFiles = [];

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
        
        await fs.writeFile(newFilePath, file.buffer);
        uploadedFiles.push({
          original: file.originalname,
          saved: newName,
          size: file.size
        });
      } else {
        await fs.writeFile(filePath, file.buffer);
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
        message: 'Maximum file size is 10MB'
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'Too many files',
        message: 'Maximum 10 files per upload'
      });
    }

    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Download de arquivo
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
