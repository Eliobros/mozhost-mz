-- Script para corrigir a estrutura da tabela containers
-- Execute este script no seu banco MySQL

-- 1. Verificar estrutura atual da tabela
DESCRIBE containers;

-- 2. Alterar o ENUM para incluir 'error' se não existir
ALTER TABLE containers MODIFY COLUMN status ENUM('stopped', 'running', 'error', 'building') DEFAULT 'stopped';

-- 3. Verificar se foi aplicado corretamente
SHOW COLUMNS FROM containers LIKE 'status';

-- 4. Verificar containers existentes
SELECT id, name, status FROM containers;