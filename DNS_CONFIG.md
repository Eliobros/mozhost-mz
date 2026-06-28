# 🌐 Configuração DNS para Subdomínios MozHost

## 📋 Registros DNS Necessários

No painel do seu provedor de DNS (onde você registrou topaziocoin.online), adicione:

### 1. Registro A Principal
```
Tipo: A
Nome: mozhost
Valor: SEU_IP_DO_SERVIDOR (ex: 50.116.46.130)
TTL: 300
```

### 2. Registro CNAME Wildcard (IMPORTANTE!)
```
Tipo: CNAME
Nome: *.mozhost
Valor: mozhost.shop
TTL: 300
```

## ✅ Resultado
Após configurar, qualquer subdomínio funcionará:
- `api1.mozhost.shop` → SEU_IP_SERVIDOR
- `botwhats.mozhost.shop` → SEU_IP_SERVIDOR
- `qualquercoisa.mozhost.shop` → SEU_IP_SERVIDOR

## 🔍 Como testar
```bash
# Teste se o wildcard DNS está funcionando
nslookup teste123.mozhost.shop
# Deve retornar o IP do seu servidor
```

## 📝 Exemplos por Provedor

### Cloudflare
1. Acesse o painel do Cloudflare
2. Vá em "DNS" > "Records"
3. Adicione os registros acima

### Namecheap
1. Acesse "Domain List" > "Manage"
2. Vá em "Advanced DNS"
3. Adicione os registros

### GoDaddy
1. Acesse "My Products" > "DNS"
2. Adicione os registros na zona DNS

## ⚠️ Importante
- O wildcard (*) deve apontar para o domínio principal
- TTL baixo (300) facilita testes
- Pode levar até 24h para propagar globalmente