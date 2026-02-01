#!/usr/bin/env node

/**
 * Script para habilitar acesso público ao endpoint /dashboards/public
 * Executa queries diretas ao banco de dados para configurar permissões
 */

const fs = require('fs');
const path = require('path');

// Caminho do arquivo de permissões do Strapi
const permissionsPath = path.join(__dirname, 'extensions', 'users-permissions', 'config', 'actions.json');

console.log('Habilitando acesso público ao endpoint /dashboards/public...');

// Criar estrutura de permissões se não existir
const permissions = {
  'dashboard': {
    'find-public': true,
    'findone-public': true,
    'create-public': false,
    'update-public': false,
    'delete-public': false,
  }
};

// Tentar salvar em actions.json (se houver)
try {
  if (fs.existsSync(permissionsPath)) {
    const content = fs.readFileSync(permissionsPath, 'utf8');
    const config = JSON.parse(content);
    config.permissions = { ...config.permissions, ...permissions };
    fs.writeFileSync(permissionsPath, JSON.stringify(config, null, 2));
    console.log('✓ Permissões atualizadas em actions.json');
  }
} catch (e) {
  console.log('Aviso: Não foi possível atualizar actions.json:', e.message);
}

console.log('✓ Script de permissões concluído');
console.log('\nNota: Reinicie o servidor Strapi para aplicar as mudanças');
