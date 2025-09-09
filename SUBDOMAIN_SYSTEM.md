# 🌐 Sistema de Subdomínios MozHost

## 🎯 Como Funciona

Cada container criado no MozHost ganha automaticamente uma URL de acesso:
```
https://usuario-container.mozhost.topaziocoin.online
```

### Exemplos:
- Usuário "joao" criou container "meubot" → `joao-meubot.mozhost.topaziocoin.online`
- Usuário "maria" criou container "api-vendas" → `maria-api-vendas.mozhost.topaziocoin.online`

## 🔧 Configuração Necessária

### 1. DNS (Obrigatório)
No painel do seu provedor de DNS:

```dns
Tipo: A
Nome: mozhost
Valor: SEU_IP_SERVIDOR
TTL: 300

Tipo: CNAME  
Nome: *.mozhost
Valor: mozhost.topaziocoin.online
TTL: 300
```

### 2. Nginx (Proxy Reverso)
```bash
# Executar o script de configuração
./setup_subdomains.sh
```

### 3. Backend (Roteamento)
```bash
# Instalar dependência
npm install http-proxy-middleware

# Reiniciar backend
cd backend && npm start
```

## 🚀 Fluxo de Funcionamento

1. **Usuário acessa**: `joao-meubot.mozhost.topaziocoin.online`
2. **DNS resolve**: Para o IP do seu servidor
3. **Nginx recebe**: E envia para `localhost:3001/proxy/joao-meubot`
4. **Backend processa**: Encontra container do usuário "joao" com nome "meubot"
5. **Proxy redireciona**: Para a porta do container (ex: localhost:4001)
6. **Container responde**: Aplicação do usuário responde normalmente

## 📋 Estrutura dos Arquivos

```
backend/
├── routes/proxy.js          # Sistema de proxy dinâmico
├── utils/docker-manager.js  # Gera subdomínios automaticamente
└── server.js               # Registra rota /proxy

nginx_subdomain_config.conf  # Configuração do Nginx
setup_subdomains.sh         # Script de instalação
```

## 🔍 Debugging

### Verificar se DNS está funcionando:
```bash
nslookup teste.mozhost.topaziocoin.online
# Deve retornar o IP do seu servidor
```

### Verificar logs do Nginx:
```bash
sudo tail -f /var/log/nginx/containers_access.log
sudo tail -f /var/log/nginx/containers_error.log
```

### Testar proxy diretamente:
```bash
curl http://SEU_IP:3001/proxy/joao-meubot/_info
# Retorna informações do container
```

### Verificar containers ativos:
```bash
# No MySQL
SELECT name, port, domain, status FROM containers WHERE status = 'running';
```

## 🛡️ Segurança

### Headers de Segurança (Nginx):
```nginx
add_header X-Frame-Options DENY;
add_header X-Content-Type-Options nosniff;
add_header X-XSS-Protection "1; mode=block";
```

### Rate Limiting:
```nginx
limit_req_zone $binary_remote_addr zone=containers:10m rate=10r/s;
limit_req zone=containers burst=20 nodelay;
```

## 🔒 SSL/HTTPS

### Configurar Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d mozhost.topaziocoin.online -d *.mozhost.topaziocoin.online
```

### Renovação automática:
```bash
sudo crontab -e
# Adicionar:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📊 Monitoramento

### Logs importantes:
- `/var/log/nginx/containers_access.log` - Acessos aos containers
- `/var/log/nginx/containers_error.log` - Erros de proxy
- Backend logs - Resolução de containers

### Métricas:
- Número de requests por container
- Tempo de resposta
- Containers mais acessados
- Erros de proxy

## 🚨 Troubleshooting

### Container não responde:
1. Verificar se está rodando: `docker ps`
2. Verificar porta: `netstat -tlnp | grep PORTA`
3. Verificar logs: `docker logs CONTAINER_ID`

### Subdomínio não resolve:
1. Verificar DNS: `nslookup SUBDOMAIN.mozhost.topaziocoin.online`
2. Verificar Nginx: `sudo nginx -t`
3. Verificar logs: `sudo tail -f /var/log/nginx/error.log`

### Erro 502 Bad Gateway:
1. Container não está rodando
2. Aplicação não responde na porta correta
3. Firewall bloqueando conexão

## 💡 Funcionalidades Futuras

- [ ] SSL automático por container
- [ ] Domínios customizados (usuario.com → container)
- [ ] Load balancing entre containers
- [ ] CDN integration
- [ ] Analytics de acesso
- [ ] Rate limiting por usuário

## 🎯 Exemplos de Uso

### API REST:
```javascript
// Container do usuário "dev" chamado "api"
// Acessível em: dev-api.mozhost.topaziocoin.online

app.get('/users', (req, res) => {
  res.json({ users: [...] });
});
```

### Bot WhatsApp:
```javascript
// Container "whatsbot" do usuário "empresa"  
// Webhook: empresa-whatsbot.mozhost.topaziocoin.online/webhook

app.post('/webhook', (req, res) => {
  // Processar mensagem
  res.sendStatus(200);
});
```

### Site/Landing Page:
```javascript
// Container "site" do usuário "freelancer"
// Acesso: freelancer-site.mozhost.topaziocoin.online

app.get('/', (req, res) => {
  res.render('index');
});
```