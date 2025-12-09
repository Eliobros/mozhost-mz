const express = require('express');
const router = express.Router();
const si = require('systeminformation');
const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
const database = require('../models/database'); // IMPORTANTE: Importar o database
const authenticateToken = require('../middleware/auth');

// Métricas gerais do sistema
router.get('/system/metrics', authenticateToken, async (req, res) => {
  try {
    const [cpu, mem, disk, network, osInfo] = await Promise.all([
      si.currentLoad(),
      si.mem(),
      si.fsSize(),
      si.networkStats(),
      si.osInfo()
    ]);

    // Pega o disco principal (normalmente o primeiro ou filtra por mountpoint '/')
    const mainDisk = disk.find(d => d.mount === '/') || disk[0];

    res.json({
      timestamp: new Date().toISOString(),
      cpu: parseFloat(cpu.currentLoad.toFixed(2)),
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        percent: parseFloat(((mem.used / mem.total) * 100).toFixed(2))
      },
      storage: {
        total: mainDisk.size,
        used: mainDisk.used,
        free: mainDisk.available,
        percent: parseFloat(((mainDisk.used / mainDisk.size) * 100).toFixed(2))
      },
      network: {
        rx: parseFloat((network[0].rx_sec / 1024 / 1024).toFixed(2)), // MB/s
        tx: parseFloat((network[0].tx_sec / 1024 / 1024).toFixed(2)), // MB/s
        total: parseFloat(((network[0].rx_sec + network[0].tx_sec) / 1024 / 1024).toFixed(2))
      },
      system: {
        platform: osInfo.platform,
        distro: osInfo.distro,
        release: osInfo.release,
        hostname: osInfo.hostname
      }
    });
  } catch (error) {
    console.error('Erro ao buscar métricas do sistema:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas do sistema' });
  }
});

// Métricas de todos os containers do usuário
router.get('/containers/metrics', authenticateToken, async (req, res) => {
  try {
    // Buscar todos os containers do usuário no banco
    const containers = await database.query(
      'SELECT * FROM containers WHERE user_id = ?',
      [req.user.id]
    );
    
    const metricsPromises = containers.map(async (containerData) => {
      try {
        // Se não tem docker_container_id, retorna info básica
        if (!containerData.docker_container_id) {
          return {
            id: containerData.id,
            name: containerData.name,
            status: containerData.status,
            cpu: 0,
            memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 }
          };
        }

        const container = docker.getContainer(containerData.docker_container_id);
        const info = await container.inspect();
        
        if (info.State.Status !== 'running') {
          return {
            id: containerData.id,
            name: containerData.name,
            status: info.State.Status,
            cpu: 0,
            memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 }
          };
        }

        const stats = await container.stats({ stream: false });
        
        // Cálculo de CPU
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                        (stats.precpu_stats.cpu_usage?.total_usage || 0);
        const systemDelta = stats.cpu_stats.system_cpu_usage - 
                           (stats.precpu_stats.system_cpu_usage || 0);
        const cpuPercent = systemDelta > 0 
          ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 
          : 0;

        // Cálculo de memória
        const memUsed = stats.memory_stats.usage || 0;
        const memLimit = stats.memory_stats.limit || 1;
        const memPercent = (memUsed / memLimit) * 100;

        return {
          id: containerData.id,
          name: containerData.name,
          status: info.State.Status,
          cpu: parseFloat(cpuPercent.toFixed(2)),
          memory: {
            used: memUsed,
            limit: memLimit,
            usedMB: parseFloat((memUsed / 1024 / 1024).toFixed(2)),
            limitMB: parseFloat((memLimit / 1024 / 1024).toFixed(2)),
            percent: parseFloat(memPercent.toFixed(2))
          },
          network: stats.networks ? {
            rx: stats.networks.eth0?.rx_bytes || 0,
            tx: stats.networks.eth0?.tx_bytes || 0
          } : null
        };
      } catch (error) {
        console.error(`Erro ao buscar stats do container ${containerData.id}:`, error.message);
        return {
          id: containerData.id,
          name: containerData.name,
          status: 'error',
          error: error.message,
          cpu: 0,
          memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 }
        };
      }
    });

    const metrics = await Promise.all(metricsPromises);
    
    res.json({
      timestamp: new Date().toISOString(),
      containers: metrics,
      total: containers.length,
      running: containers.filter(c => c.status === 'running').length
    });
  } catch (error) {
    console.error('Erro ao buscar métricas dos containers:', error);
    res.status(500).json({ error: 'Erro ao buscar métricas dos containers' });
  }
});

// Métricas de um container específico
router.get('/containers/:id/stats', authenticateToken, async (req, res) => {
  try {
    // Buscar o container no banco de dados pelo UUID
    const containers = await database.query(
      'SELECT * FROM containers WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );

    if (!containers || containers.length === 0) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }

    const containerData = containers[0];
    
    // Verificar se tem docker_container_id
    if (!containerData.docker_container_id) {
      return res.json({
        id: req.params.id,
        name: containerData.name,
        status: containerData.status,
        message: 'Container ainda não foi iniciado no Docker',
        cpu: 0,
        memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 }
      });
    }

    // Buscar no Docker usando o docker_container_id real
    const container = docker.getContainer(containerData.docker_container_id);
    const info = await container.inspect();
    
    if (info.State.Status !== 'running') {
      return res.json({
        id: req.params.id,
        docker_id: containerData.docker_container_id,
        name: containerData.name,
        status: info.State.Status,
        cpu: 0,
        memory: { used: 0, limit: 0, percent: 0, usedMB: 0, limitMB: 0 }
      });
    }

    const stats = await container.stats({ stream: false });
    
    // Cálculo de CPU
    const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                    (stats.precpu_stats.cpu_usage?.total_usage || 0);
    const systemDelta = stats.cpu_stats.system_cpu_usage - 
                       (stats.precpu_stats.system_cpu_usage || 0);
    const cpuPercent = systemDelta > 0 
      ? (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100 
      : 0;

    // Cálculo de memória
    const memUsed = stats.memory_stats.usage || 0;
    const memLimit = stats.memory_stats.limit || 1;
    const memPercent = (memUsed / memLimit) * 100;

    res.json({
      id: req.params.id,
      docker_id: containerData.docker_container_id,
      name: containerData.name,
      status: info.State.Status,
      cpu: parseFloat(cpuPercent.toFixed(2)),
      memory: {
        used: memUsed,
        limit: memLimit,
        usedMB: parseFloat((memUsed / 1024 / 1024).toFixed(2)),
        limitMB: parseFloat((memLimit / 1024 / 1024).toFixed(2)),
        percent: parseFloat(memPercent.toFixed(2))
      },
      network: stats.networks ? {
        rx: stats.networks.eth0?.rx_bytes || 0,
        tx: stats.networks.eth0?.tx_bytes || 0
      } : null,
      uptime: info.State.StartedAt
    });
  } catch (error) {
    console.error(`Erro ao buscar stats do container ${req.params.id}:`, error);
    
    // Retorna erro mas não quebra a aplicação
    res.status(500).json({ 
      error: 'Erro ao buscar stats do container',
      message: error.message 
    });
  }
});

// Histórico de métricas (pode ser implementado com banco de dados depois)
router.get('/history', authenticateToken, async (req, res) => {
  // TODO: Implementar armazenamento de histórico em DB
  res.json({
    message: 'Histórico de métricas - implementar com banco de dados',
    timeRange: req.query.range || '1h'
  });
});

module.exports = router;
