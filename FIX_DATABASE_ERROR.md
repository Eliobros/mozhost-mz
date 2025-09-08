# 🔧 Correção do Erro "Unknown column 'error'"

## 📋 Problema Identificado

O erro acontece porque a tabela `containers` no seu banco de dados não tem o valor `'error'` no ENUM da coluna `status`. 

```
Error: Unknown column 'error' in 'field list'
sqlMessage: "Unknown column 'error' in 'field list'"
```

## ✅ Solução

### Opção 1: Script Automático (Recomendado)

Execute o script que criei para você:

```bash
cd /workspace
./fix_containers_status.sh
```

### Opção 2: Migração Manual

Execute o script de migração diretamente:

```bash
cd /workspace
node run_migration.js
```

### Opção 3: SQL Manual

Se preferir executar diretamente no MySQL:

```sql
-- Conecte no seu banco MySQL e execute:
USE seu_banco_de_dados;

-- Verificar estrutura atual
DESCRIBE containers;

-- Corrigir o ENUM
ALTER TABLE containers 
MODIFY COLUMN status ENUM('stopped', 'running', 'error', 'building') 
DEFAULT 'stopped';

-- Verificar se foi aplicado
SHOW COLUMNS FROM containers LIKE 'status';
```

## 🚀 Após a Correção

1. **Reinicie o backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Teste a funcionalidade**:
   - Crie um novo container
   - Tente iniciar/parar containers
   - Verifique se não há mais erros

## 🔍 Verificação

Para confirmar que está funcionando:

```bash
# No MySQL
SELECT id, name, status FROM containers;
```

Os status possíveis agora são:
- `'stopped'` - Container parado
- `'running'` - Container executando  
- `'error'` - Container com erro
- `'building'` - Container sendo construído

## 💡 Prevenção

Para evitar problemas similares no futuro:

1. **Sempre execute migrações** quando atualizar o código
2. **Use versionamento de banco** para controlar mudanças
3. **Teste em ambiente de desenvolvimento** antes de produção

## 🆘 Se Ainda Houver Problemas

1. Verifique as credenciais do banco no arquivo `.env`
2. Confirme que o MySQL está rodando
3. Verifique os logs do backend para outros erros
4. Entre em contato se precisar de ajuda adicional

---

**Criado por**: Assistant para correção do MozHost
**Data**: $(date)