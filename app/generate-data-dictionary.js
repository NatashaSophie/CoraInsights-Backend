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

// Descrições das tabelas principais
const TABLE_DESCRIPTIONS = {
  'certificates': 'Armazena os certificados emitidos para os peregrinos que completaram o caminho.',
  'checkpoints': 'Pontos de controle ao longo do caminho, marcando locais importantes.',
  'checkpoints__estabelecimentos': 'Tabela de ligação entre checkpoints e estabelecimentos.',
  'checkpoints_components': 'Componentes associados aos checkpoints (como localizações).',
  'components_general_avaliations': 'Avaliações e comentários dos usuários.',
  'components_general_locations': 'Coordenadas geográficas (X, Y) para componentes.',
  'components_general_places': 'Lugares genéricos do sistema.',
  'components_general_places_components': 'Componentes associados a lugares.',
  'core_store': 'Armazenamento interno de configurações do Strapi.',
  'establishments': 'Estabelecimentos comerciais (hotéis, restaurantes, etc.) ao longo do caminho.',
  'establishments_components': 'Componentes associados aos estabelecimentos.',
  'i18n_locales': 'Configurações de internacionalização.',
  'strapi_users_roles': 'Ligação entre usuários e seus papéis (roles).',
  'trail_parts': 'Trechos individuais que compõem o caminho completo.',
  'trail_routes': 'Rotas percorridas pelos usuários, representando cada trecho completado.',
  'trails': 'Jornadas completas dos usuários no caminho.',
  'upload_file': 'Arquivos enviados ao sistema (imagens, documentos).',
  'upload_file_morph': 'Ligação entre arquivos e outras entidades do sistema.',
  'users-permissions_permission': 'Permissões de acesso para cada ação da API.',
  'users-permissions_role': 'Papéis (roles) dos usuários: Peregrino, Comerciante, Gestor, etc.',
  'users-permissions_user': 'Usuários da aplicação (peregrinos, comerciantes, gestores).'
};

// Descrições das colunas comuns
const COLUMN_DESCRIPTIONS = {
  'id': 'Identificador único do registro (chave primária)',
  'created_at': 'Data e hora de criação do registro',
  'updated_at': 'Data e hora da última atualização',
  'created_by': 'ID do usuário que criou o registro',
  'updated_by': 'ID do usuário que atualizou o registro',
  'published_at': 'Data e hora de publicação do registro',
  'name': 'Nome do registro',
  'email': 'Endereço de e-mail',
  'username': 'Nome de usuário para login',
  'password': 'Senha criptografada do usuário',
  'nickname': 'Apelido do usuário',
  'birthdate': 'Data de nascimento',
  'sex': 'Sexo do usuário (M/F)',
  'userType': 'Tipo de usuário (peregrino, comerciante, gestor)',
  'role': 'ID do papel (role) do usuário',
  'confirmed': 'Indica se o e-mail foi confirmado',
  'blocked': 'Indica se o usuário está bloqueado',
  'provider': 'Provedor de autenticação (local, google, etc.)',
  'resetPasswordToken': 'Token para redefinição de senha',
  'confirmationToken': 'Token para confirmação de e-mail',
  'merchantApproved': 'Indica se o comerciante foi aprovado',
  'merchantApprovedBy': 'ID do gestor que aprovou o comerciante',
  'merchantApprovedAt': 'Data e hora da aprovação do comerciante',
  'merchantRejectedReason': 'Motivo da rejeição do comerciante',
  'trail': 'ID da jornada (trail) associada',
  'route': 'ID do trecho (trail_part) associado',
  'user': 'ID do usuário associado',
  'finishedAt': 'Data e hora de conclusão',
  'startedAt': 'Data e hora de início',
  'trackedPath': 'Caminho rastreado em formato JSON (coordenadas GPS)',
  'mapUrl': 'URL do mapa estático do percurso',
  'modality': 'Modalidade do percurso (a pé, bicicleta, etc.)',
  'inversePaths': 'Indica se o caminho é percorrido na direção inversa',
  'certificate': 'ID do certificado associado',
  'difficulty': 'Nível de dificuldade do trecho',
  'time': 'Tempo estimado para completar o trecho',
  'distance': 'Distância do trecho em quilômetros',
  'description': 'Descrição detalhada',
  'slug': 'Identificador amigável para URLs',
  'fromCheckpoint': 'ID do checkpoint de origem',
  'toCheckpoint': 'ID do checkpoint de destino',
  'address': 'Endereço do estabelecimento',
  'phone': 'Telefone de contato',
  'category': 'Categoria do estabelecimento',
  'owner': 'ID do usuário proprietário do estabelecimento',
  'openingHours': 'Horário de funcionamento',
  'services': 'Serviços oferecidos (em formato JSON)',
  'isActive': 'Indica se o estabelecimento está ativo',
  'code': 'Código único do certificado',
  'file': 'Caminho ou URL do arquivo do certificado',
  'x': 'Coordenada X (longitude)',
  'y': 'Coordenada Y (latitude)',
  'rate': 'Nota da avaliação',
  'comment': 'Comentário da avaliação',
  'field': 'Nome do campo associado',
  'order': 'Ordem de exibição',
  'component_type': 'Tipo do componente',
  'component_id': 'ID do componente',
  'checkpoint_id': 'ID do checkpoint',
  'establishment_id': 'ID do estabelecimento',
  'upload_file_id': 'ID do arquivo',
  'related_id': 'ID da entidade relacionada',
  'related_type': 'Tipo da entidade relacionada',
  'type': 'Tipo do registro',
  'controller': 'Nome do controlador da API',
  'action': 'Nome da ação da API',
  'enabled': 'Indica se a permissão está habilitada',
  'policy': 'Política de segurança aplicada'
};

async function generateDataDictionary() {
  console.log('📚 Gerando dicionário de dados...\n');
  
  try {
    await client.connect();
    
    // Obter todas as tabelas
    const tablesResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'pg_%'
        AND table_name NOT LIKE 'sql_%'
      ORDER BY table_name;
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    
    let markdown = '# Dicionário de Dados - Caminho de Cora\n\n';
    markdown += `**Gerado em:** ${new Date().toLocaleString('pt-BR')}\n\n`;
    markdown += `**Banco de Dados:** PostgreSQL (strapi)\n\n`;
    markdown += `**Total de Tabelas:** ${tables.length}\n\n`;
    markdown += '---\n\n';
    markdown += '## Índice\n\n';
    
    // Índice
    for (const table of tables) {
      markdown += `- [${table}](#${table.replace(/-/g, '').replace(/_/g, '')})\n`;
    }
    
    markdown += '\n---\n\n';
    
    // Detalhes de cada tabela
    for (const table of tables) {
      console.log(`📝 Processando tabela: ${table}`);
      
      const schemaResult = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = $1
        ORDER BY ordinal_position;
      `, [table]);
      
      // Contar registros
      const countResult = await client.query(`SELECT COUNT(*) as count FROM "${table}"`);
      const rowCount = countResult.rows[0].count;
      
      markdown += `## ${table}\n\n`;
      markdown += `**Descrição:** ${TABLE_DESCRIPTIONS[table] || 'Tabela do sistema.'}\n\n`;
      markdown += `**Total de Registros:** ${rowCount}\n\n`;
      
      markdown += '| Coluna | Tipo | Nulo | Descrição |\n';
      markdown += '|--------|------|------|----------|\n';
      
      for (const col of schemaResult.rows) {
        const colName = col.column_name;
        const dataType = col.data_type;
        const nullable = col.is_nullable === 'YES' ? 'Sim' : 'Não';
        const description = COLUMN_DESCRIPTIONS[colName] || '-';
        
        markdown += `| ${colName} | ${dataType} | ${nullable} | ${description} |\n`;
      }
      
      markdown += '\n---\n\n';
    }
    
    // Salvar arquivo
    const filePath = path.join(EXPORTS_DIR, 'DICIONARIO_DE_DADOS.md');
    fs.writeFileSync(filePath, markdown, 'utf8');
    
    console.log(`\n✅ Dicionário de dados gerado com sucesso!`);
    console.log(`📁 Arquivo salvo em: ${filePath}`);
    
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

generateDataDictionary();
