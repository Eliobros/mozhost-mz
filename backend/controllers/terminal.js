// controllers/terminal.js (Versão com fallback correto)
const Docker = require('dockerode');
const database = require('../models/database');

const docker = new Docker({ socketPath: '/var/run/docker.sock' });

/**
 * WebSocket handler para terminal interativo
 */
const handleTerminalWebSocket = async (ws, req) => {
  const { containerId } = req.params;
  const userId = req.user?.id || req.user?.userId;

  console.log(`[Terminal WS] Nova conexão - User: ${userId}, Container: ${containerId}`);

  try {
    // Verificar se o container pertence ao usuário no BANCO DE DADOS
    const containers = await database.query(
      'SELECT id, docker_container_id, user_id, name, status FROM containers WHERE id = ?',
      [containerId]
    );

    if (containers.length === 0) {
      console.error('[Terminal WS] Container não encontrado no banco');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: '❌ Container não encontrado' 
      }));
      ws.close();
      return;
    }

    const containerData = containers[0];

    // Verificar ownership
    if (containerData.user_id !== userId) {
      console.error(`[Terminal WS] Acesso negado - Container pertence ao user ${containerData.user_id}, não ${userId}`);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: '❌ Acesso negado a este container' 
      }));
      ws.close();
      return;
    }

    // Verificar se está rodando
    if (containerData.status !== 'running') {
      console.error('[Terminal WS] Container não está rodando');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `❌ Container está ${containerData.status}, não rodando` 
      }));
      ws.close();
      return;
    }

    console.log(`[Terminal WS] Container verificado: ${containerData.name}`);

    // Pegar o container do Docker
    const dockerContainerId = containerData.docker_container_id;
    const container = docker.getContainer(dockerContainerId);

    // Verificar se existe no Docker
    let containerInfo;
    try {
      containerInfo = await container.inspect();
    } catch (error) {
      console.error('[Terminal WS] Container não existe no Docker:', error.message);
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: '❌ Container não encontrado no Docker' 
      }));
      ws.close();
      return;
    }

    // Verificar se está realmente rodando
    if (!containerInfo.State.Running) {
      console.error('[Terminal WS] Container não está rodando no Docker');
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: '❌ Container não está rodando' 
      }));
      ws.close();
      return;
    }

    console.log(`[Terminal WS] Criando exec para container ${dockerContainerId}`);

    // Tentar diferentes shells em ordem de preferência
    const shellsToTry = ['/bin/sh', '/bin/ash', 'sh', 'bash'];
    let exec = null;
    let shellUsed = null;

    for (const shell of shellsToTry) {
      try {
        console.log(`[Terminal WS] Tentando shell: ${shell}`);
        
        const execOptions = {
          AttachStdin: true,
          AttachStdout: true,
          AttachStderr: true,
          Tty: true,
          Cmd: [shell]
        };

        exec = await container.exec(execOptions);
        
        // Testar se o exec foi criado com sucesso
        const stream = await exec.start({
          hijack: true,
          stdin: true,
          Tty: true
        });

        // Se chegou aqui, o shell funciona!
        shellUsed = shell;
        console.log(`[Terminal WS] Shell ${shell} funcionou!`);

        // Configurar o stream
        setupStream(stream, ws);

        // Mensagem de boas-vindas
        ws.send(JSON.stringify({ 
          type: 'output', 
          data: `\r\n\x1b[32m✓ Conectado ao container ${containerData.name}!\x1b[0m\r\n` +
                `\x1b[90mShell: ${shellUsed}\x1b[0m\r\n\r\n`
        }));

        // Handlers do WebSocket
        ws.on('message', (message) => {
          try {
            const data = JSON.parse(message);
            if (data.type === 'input' && data.data) {
              stream.write(data.data);
            }
          } catch (error) {
            console.error('[Terminal WS] Erro ao processar mensagem:', error);
          }
        });

        ws.on('close', () => {
          console.log('[Terminal WS] WebSocket fechado pelo cliente');
          try {
            stream.end();
          } catch (error) {
            console.error('[Terminal WS] Erro ao fechar stream:', error);
          }
        });

        ws.on('error', (error) => {
          console.error('[Terminal WS] Erro no WebSocket:', error);
          try {
            stream.end();
          } catch (err) {
            console.error('[Terminal WS] Erro ao fechar stream após erro:', err);
          }
        });

        return; // Sucesso! Sair da função

      } catch (error) {
        console.log(`[Terminal WS] Shell ${shell} falhou: ${error.message}`);
        // Tentar próximo shell
        continue;
      }
    }

    // Se chegou aqui, nenhum shell funcionou
    console.error('[Terminal WS] Nenhum shell disponível no container');
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: '❌ Nenhum shell disponível no container (tentado: bash, sh, ash)' 
    }));
    ws.close();

  } catch (error) {
    console.error('[Terminal WS] Erro ao iniciar terminal:', error);
    try {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Erro: ${error.message}` 
      }));
      ws.close();
    } catch (e) {
      console.error('[Terminal WS] Erro ao enviar mensagem final de erro:', e);
    }
  }
};

/**
 * Configurar stream do Docker
 */
function setupStream(stream, ws) {
  stream.on('data', (chunk) => {
    try {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(JSON.stringify({ 
          type: 'output', 
          data: chunk.toString('utf-8')
        }));
      }
    } catch (error) {
      console.error('[Terminal WS] Erro ao enviar dados:', error);
    }
  });

  stream.on('error', (error) => {
    console.error('[Terminal WS] Erro no stream:', error);
    try {
      ws.send(JSON.stringify({ 
        type: 'error', 
        message: `Erro no stream: ${error.message}` 
      }));
    } catch (e) {
      console.error('[Terminal WS] Erro ao enviar mensagem de erro:', e);
    }
  });

  stream.on('end', () => {
    console.log('[Terminal WS] Stream encerrado');
    ws.close();
  });
}

/**
 * Rota HTTP alternativa para executar comandos (fallback)
 */
const executeCommand = async (req, res) => {
  const { containerId } = req.params;
  const { command } = req.body;
  const userId = req.user?.id || req.user?.userId;

  console.log(`[Terminal HTTP] User ${userId} executando: ${command}`);

  if (!command) {
    return res.status(400).json({ error: 'Comando não fornecido' });
  }

  try {
    // Verificar ownership
    const containers = await database.query(
      'SELECT id, docker_container_id, user_id, status FROM containers WHERE id = ?',
      [containerId]
    );

    if (containers.length === 0) {
      return res.status(404).json({ error: 'Container não encontrado' });
    }

    const containerData = containers[0];

    if (containerData.user_id !== userId) {
      return res.status(403).json({ error: 'Acesso negado' });
    }

    if (containerData.status !== 'running') {
      return res.status(400).json({ error: 'Container não está rodando' });
    }

    // Executar comando
    const container = docker.getContainer(containerData.docker_container_id);
    const exec = await container.exec({
      Cmd: ['/bin/sh', '-c', command],
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });

    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString('utf-8').replace(/[\x00-\x08]/g, '');
    });

    stream.on('end', async () => {
      const inspectExec = await exec.inspect();
      res.json({ 
        output: output.trim() || '(sem output)',
        exitCode: inspectExec.ExitCode
      });
    });

  } catch (error) {
    console.error('[Terminal HTTP] Erro:', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  handleTerminalWebSocket,
  executeCommand
};
