'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  QrCode,
  CheckCircle,
  Loader2,
  AlertCircle,
  Phone,
  User,
  Smartphone,
  ArrowLeft,
  RefreshCw,
  Clock
} from 'lucide-react';

export default function QRCodePage() {
  const params = useParams();
  const router = useRouter();
  const containerId = params.id;

  const [qrCode, setQrCode] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, waiting, qr, connecting, connected
  const [botInfo, setBotInfo] = useState(null);
  const [error, setError] = useState(null);
  const [containerName, setContainerName] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  useEffect(() => {
    fetchContainerInfo();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [containerId]);

  const fetchContainerInfo = async () => {
    try {
      const token = localStorage.getItem('mozhost_token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://api.mozhost.shop'}/api/containers/${containerId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setContainerName(data.container.name);
      }
    } catch (error) {
      console.error('Erro ao buscar info do container:', error);
    }
  };

  const connectWebSocket = () => {
    const token = localStorage.getItem('mozhost_token');
    const wsUrl = `wss://api.mozhost.shop/api/qrcode/${containerId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('✅ WebSocket conectado');
      setConnectionStatus('connecting');
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        console.log('📨 Mensagem recebida:', data.type, data);

        switch (data.type) {
          case 'waiting':
            // Novo estado: aguardando geração do QR
            setConnectionStatus('waiting');
            setStatusMessage(data.message || 'Aguardando geração do QR Code...');
            setElapsedTime(data.elapsed || 0);
            setError(null);
            break;

          case 'qr':
            // QR Code recebido
            setQrCode(data.qr);
            setConnectionStatus('qr');
            setStatusMessage('');
            setError(null);
            console.log('📱 QR Code recebido!');
            break;

          case 'connected':
            // Bot conectado com sucesso
            setConnectionStatus('connected');
            setBotInfo({
              number: data.number,
              name: data.name,
              device: data.device,
              timestamp: data.timestamp
            });
            setQrCode(null);
            setStatusMessage('');
            setError(null);
            console.log('✅ Bot conectado:', data.number);
            break;

          case 'disconnected':
            // Bot desconectou
            setConnectionStatus('disconnected');
            setBotInfo(null);
            setQrCode(null);
            setStatusMessage(data.message || 'Bot desconectado');
            console.log('🔴 Bot desconectado');
            break;

          case 'timeout':
            // Timeout atingido
            setError(data.message || 'Tempo esgotado ao gerar QR Code');
            setConnectionStatus('disconnected');
            setQrCode(null);
            console.log('⏱️ Timeout:', data.message);
            break;

          case 'error':
            // Erro genérico
            setError(data.message);
            setConnectionStatus('disconnected');
            console.error('❌ Erro:', data.message);
            break;

          default:
            console.log('⚠️ Tipo de mensagem desconhecido:', data.type);
        }
      } catch (error) {
        console.error('❌ Erro ao processar mensagem:', error);
        setError('Erro ao processar mensagem do servidor');
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setError('Erro na conexão WebSocket');
      setConnectionStatus('disconnected');
    };

    ws.onclose = (event) => {
      console.log('🔴 WebSocket fechado:', event.code, event.reason);
      
      // Só reconectar se não foi fechamento intencional
      if (event.code !== 1000) {
        setStatusMessage('Conexão perdida. Reconectando...');
        
        // Reconectar após 3 segundos
        reconnectTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            console.log('🔄 Tentando reconectar...');
            connectWebSocket();
          }
        }, 3000);
      }
    };
  };

  const handleReconnect = () => {
    console.log('🔄 Reconectando manualmente...');
    
    setQrCode(null);
    setBotInfo(null);
    setError(null);
    setStatusMessage('Reconectando...');
    setConnectionStatus('connecting');

    if (wsRef.current) {
      wsRef.current.close();
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    setTimeout(connectWebSocket, 500);
  };

  const handleBackToContainers = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    router.push('#containers');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={handleBackToContainers}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para Containers
          </button>

          <h1 className="text-3xl font-bold text-gray-900">
            QR Code WhatsApp
          </h1>
          <p className="text-gray-600 mt-2">
            Container: <span className="font-semibold">{containerName || 'Carregando...'}</span>
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Status Disconnected */}
          {connectionStatus === 'disconnected' && (
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-10 h-10 text-gray-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Bot Desconectado
              </h2>
              <p className="text-gray-600 mb-2">
                {statusMessage || 'Inicie o container para gerar o QR Code'}
              </p>
              {error && (
                <p className="text-red-600 text-sm mb-6">
                  {error}
                </p>
              )}
              <button
                onClick={handleReconnect}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                <RefreshCw className="w-5 h-5 mr-2" />
                Tentar Reconectar
              </button>
            </div>
          )}

          {/* Status Connecting */}
          {connectionStatus === 'connecting' && (
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Conectando ao Bot...
              </h2>
              <p className="text-gray-600">
                {statusMessage || 'Aguarde enquanto iniciamos a conexão'}
              </p>
            </div>
          )}

          {/* Status Waiting (NOVO!) */}
          {connectionStatus === 'waiting' && (
            <div className="text-center">
              <div className="relative">
                <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
                <Clock className="w-6 h-6 text-blue-400 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Aguardando QR Code
              </h2>
              <p className="text-gray-600 mb-2">
                {statusMessage || 'O bot está iniciando...'}
              </p>
              {elapsedTime > 0 && (
                <p className="text-sm text-gray-500">
                  Tempo decorrido: {elapsedTime}s
                </p>
              )}
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  💡 <strong>Isso é normal:</strong> O bot pode levar até 30 segundos para gerar o QR Code na primeira vez.
                </p>
              </div>
            </div>
          )}

          {/* Status QR Code */}
          {connectionStatus === 'qr' && qrCode && (
            <div className="text-center">
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <QrCode className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Escaneie o QR Code
                </h2>
                <p className="text-gray-600">
                  Abra o WhatsApp no seu celular e escaneie o código abaixo
                </p>
              </div>

              {/* QR Code Display */}
              <div className="bg-white p-6 rounded-xl border-4 border-blue-600 inline-block mb-6 shadow-lg">
                <img
                  src={qrCode}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                <h3 className="font-semibold text-blue-900 mb-2">📱 Como escanear:</h3>
                <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                  <li>Abra o WhatsApp no seu celular</li>
                  <li>Toque em Mais opções (⋮) → Aparelhos conectados</li>
                  <li>Toque em "Conectar um aparelho"</li>
                  <li>Aponte seu celular para esta tela</li>
                </ol>
              </div>

              <div className="mt-4 flex items-center justify-center text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Aguardando leitura do QR Code...
              </div>
            </div>
          )}

          {/* Status Connected */}
          {connectionStatus === 'connected' && botInfo && (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                ✅ Bot Conectado!
              </h2>
              <p className="text-gray-600 mb-8">
                Seu bot está online e pronto para uso
              </p>

              {/* Bot Info */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 text-left space-y-4">
                {botInfo.name && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <User className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600">Nome do WhatsApp</p>
                      <p className="text-lg font-semibold text-gray-900 truncate">
                        {botInfo.name}
                      </p>
                    </div>
                  </div>
                )}

                {botInfo.number && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Phone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600">Número Conectado</p>
                      <p className="text-lg font-semibold text-gray-900 truncate">
                        {botInfo.number}
                      </p>
                    </div>
                  </div>
                )}

                {botInfo.device && (
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                      <Smartphone className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-600">Dispositivo</p>
                      <p className="text-lg font-semibold text-gray-900 truncate">
                        {botInfo.device}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  💡 <strong>Dica:</strong> Mantenha o container rodando para o bot ficar online!
                </p>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && connectionStatus !== 'disconnected' && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-red-800 font-medium">
                    {error}
                  </p>
                  <button
                    onClick={handleReconnect}
                    className="text-red-600 hover:text-red-700 text-sm font-medium mt-2 inline-flex items-center"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Tentar novamente
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Problemas para conectar?{' '}
            <button
              onClick={handleReconnect}
              className="text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Clique aqui para tentar novamente
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

