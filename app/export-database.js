const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

const EXPORTS_DIR = path.join(__dirname, 'exports');

// Tabelas principais para exportar (exclui tabelas internas do Strapi)
const TABLES_TO_EXPORT = [
  'certificates',
  'checkpoints',
  'checkpoints__estabelecimentos',
  'checkpoints_components',
  'components_general_avaliations',
  'components_general_locations',
  'components_general_places',
  'establishments',
  'establishments_components',
  'trail_parts',
  'trail_routes',
  'trails',
  'users-permissions_user',
  'users-permissions_role',
  'upload_file'
];

function escapeCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }
  
  // Converter objetos (JSONB) para string JSON
  if (typeof value === 'object') {
    value = JSON.stringify(value);
  }
  
  // Converter para string
  value = String(value);
  
  // Se contém vírgula, aspas ou quebra de linha, encapsular em aspas
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    // Escapar aspas duplas duplicando-as
    value = value.replace(/"/g, '""');
    return `"${value}"`;
  }
  
  return value;
}

async function exportTableToCSV(tableName) {
  try {
    // Usar aspas duplas para nomes de tabelas com caracteres especiais
    const query = `SELECT * FROM "${tableName}"`;
    const result = await client.query(query);
    
    if (result.rows.length === 0) {
      console.log(`⚠️  Tabela ${tableName}: sem dados`);
      return { table: tableName, rows: 0, status: 'empty' };
    }
    
    // Obter nomes das colunas
    const columns = result.fields.map(field => field.name);
    
    // Criar CSV
    const csvLines = [];
    
    // Header
    csvLines.push(columns.join(','));
    
    // Dados
    for (const row of result.rows) {
      const values = columns.map(col => escapeCSVValue(row[col]));
      csvLines.push(values.join(','));
    }
    
    const csvContent = csvLines.join('\n');
    
    // Salvar arquivo - substituir caracteres especiais no nome do arquivo
    const safeFileName = tableName.replace(/-/g, '_');
    const filePath = path.join(EXPORTS_DIR, `${safeFileName}.csv`);
    fs.writeFileSync(filePath, csvContent, 'utf8');
    
    console.log(`✅ Tabela ${tableName}: ${result.rows.length} registros exportados`);
    return { table: tableName, rows: result.rows.length, status: 'success' };
    
  } catch (error) {
    console.error(`❌ Erro ao exportar ${tableName}: ${error.message}`);
    return { table: tableName, rows: 0, status: 'error', error: error.message };
  }
}

async function main() {
  console.log('🚀 Iniciando exportação do banco de dados para CSV...\n');
  
  // Garantir que o diretório existe
  if (!fs.existsSync(EXPORTS_DIR)) {
    fs.mkdirSync(EXPORTS_DIR, { recursive: true });
  }
  
  try {
    await client.connect();
    console.log('📦 Conectado ao banco de dados PostgreSQL\n');
    
    const results = [];
    
    for (const table of TABLES_TO_EXPORT) {
      const result = await exportTableToCSV(table);
      results.push(result);
    }
    
    // Resumo
    console.log('\n📊 RESUMO DA EXPORTAÇÃO:');
    console.log('========================');
    const successful = results.filter(r => r.status === 'success');
    const empty = results.filter(r => r.status === 'empty');
    const errors = results.filter(r => r.status === 'error');
    
    console.log(`✅ Tabelas exportadas com sucesso: ${successful.length}`);
    console.log(`⚠️  Tabelas vazias: ${empty.length}`);
    console.log(`❌ Tabelas com erro: ${errors.length}`);
    
    const totalRows = successful.reduce((sum, r) => sum + r.rows, 0);
    console.log(`📝 Total de registros exportados: ${totalRows}`);
    console.log(`\n📁 Arquivos salvos em: ${EXPORTS_DIR}`);
    
  } catch (error) {
    console.error('Erro de conexão:', error.message);
  } finally {
    await client.end();
  }
}

main();
