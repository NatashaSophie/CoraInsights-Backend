const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

// Lista de nomes brasileiros para gerar usuários fictícios
const primeiroNomes = [
  'Ana', 'Maria', 'João', 'Pedro', 'José', 'Carlos', 'Paulo', 'Lucas', 'Marcos', 'Bruno',
  'Rafael', 'Gabriel', 'Daniel', 'Felipe', 'Rodrigo', 'Gustavo', 'Thiago', 'Vinicius', 'Leonardo', 'Matheus',
  'Julia', 'Mariana', 'Beatriz', 'Camila', 'Fernanda', 'Amanda', 'Juliana', 'Leticia', 'Patricia', 'Renata',
  'Roberto', 'Fernando', 'Ricardo', 'Antonio', 'Francisco', 'Marcelo', 'Luiz', 'André', 'Eduardo', 'Sergio',
  'Carla', 'Sandra', 'Monica', 'Claudia', 'Lucia', 'Adriana', 'Vanessa', 'Simone', 'Cristina', 'Silvia',
  'Henrique', 'Diego', 'Fabio', 'Cesar', 'Alexandre', 'Leandro', 'Mauricio', 'Flavio', 'Caio', 'Igor',
  'Isabella', 'Larissa', 'Gabriela', 'Carolina', 'Rafaela', 'Bruna', 'Priscila', 'Natalia', 'Daniela', 'Aline'
];

const sobrenomes = [
  'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes',
  'Costa', 'Ribeiro', 'Martins', 'Carvalho', 'Rocha', 'Almeida', 'Nascimento', 'Araujo', 'Melo', 'Barbosa',
  'Cardoso', 'Dias', 'Cavalcanti', 'Castro', 'Teixeira', 'Monteiro', 'Freitas', 'Fernandes', 'Mendes', 'Pinto'
];

const cidades = [
  'Corumbá de Goiás', 'Pirenópolis', 'Jaraguá', 'Itaguari', 'São Francisco de Goiás',
  'Cidade de Goiás', 'Goiânia', 'Anápolis', 'Aparecida de Goiânia', 'Caldas Novas'
];

function gerarNomeCompleto() {
  const primeiro = primeiroNomes[Math.floor(Math.random() * primeiroNomes.length)];
  const sobrenome1 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
  const sobrenome2 = sobrenomes[Math.floor(Math.random() * sobrenomes.length)];
  return `${primeiro} ${sobrenome1} ${sobrenome2}`;
}

function gerarUsername(nome) {
  return nome.toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+/g, '.')
    + Math.floor(Math.random() * 1000);
}

function gerarEmail(username) {
  const dominios = ['gmail.com', 'hotmail.com', 'yahoo.com.br', 'outlook.com', 'email.com'];
  const dominio = dominios[Math.floor(Math.random() * dominios.length)];
  return `${username}@${dominio}`;
}

function gerarTelefone() {
  const ddd = 62; // DDD de Goiás
  const numero = Math.floor(90000000 + Math.random() * 10000000);
  return `(${ddd}) 9${numero}`;
}

function gerarIdade() {
  return Math.floor(18 + Math.random() * 60); // Entre 18 e 77 anos
}

async function seedUsers() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL\n');

    // Verificar estrutura da tabela de usuários
    console.log('📋 Verificando estrutura da tabela users-permissions_user...\n');
    const schemaResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'users-permissions_user' 
      ORDER BY ordinal_position;
    `);
    
    if (schemaResult.rows.length === 0) {
      console.error('❌ Tabela users-permissions_user não encontrada!');
      return;
    }

    console.log('Campos disponíveis:');
    schemaResult.rows.forEach(row => {
      console.log(`  • ${row.column_name} (${row.data_type}) ${row.is_nullable === 'NO' ? '⚠️ obrigatório' : ''}`);
    });

    // Buscar role padrão "Authenticated"
    const roleResult = await client.query(
      `SELECT id FROM "users-permissions_role" WHERE type = 'authenticated' LIMIT 1`
    );
    
    if (roleResult.rows.length === 0) {
      console.error('\n❌ Role "authenticated" não encontrada!');
      return;
    }
    
    const authenticatedRoleId = roleResult.rows[0].id;
    console.log(`\n✓ Role "authenticated" encontrada (ID: ${authenticatedRoleId})\n`);

    console.log('👥 Criando 100 usuários fictícios...\n');

    const password = await bcrypt.hash('Senha@123', 10); // Senha padrão para todos
    let created = 0;
    const errors = [];

    for (let i = 1; i <= 100; i++) {
      try {
        const nome = gerarNomeCompleto();
        const username = gerarUsername(nome);
        const email = gerarEmail(username);
        const telefone = gerarTelefone();
        const idade = gerarIdade();
        const cidade = cidades[Math.floor(Math.random() * cidades.length)];
        
        // Gerar data de nascimento baseada na idade
        const hoje = new Date();
        const anoNascimento = hoje.getFullYear() - idade;
        const mesNascimento = Math.floor(Math.random() * 12) + 1;
        const diaNascimento = Math.floor(Math.random() * 28) + 1;
        const birthdate = `${anoNascimento}-${String(mesNascimento).padStart(2, '0')}-${String(diaNascimento).padStart(2, '0')}`;
        
        // Gerar sexo aleatório
        const sex = Math.random() > 0.5 ? 'M' : 'F';
        
        // Gerar nickname (apelido) baseado no primeiro nome + número único
        const primeiroNome = nome.split(' ')[0];
        const nickname = primeiroNome.toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          + Math.floor(Math.random() * 10000);

        await client.query(
          `INSERT INTO "users-permissions_user" 
          (username, email, provider, password, confirmed, blocked, role, birthdate, sex, name, nickname, created_at, updated_at) 
          VALUES ($1, $2, 'local', $3, true, false, $4, $5, $6, $7, $8, NOW(), NOW())`,
          [username, email, password, authenticatedRoleId, birthdate, sex, nome, nickname]
        );

        created++;
        if (created % 10 === 0) {
          console.log(`  ✓ ${created}/100 usuários criados...`);
        }
      } catch (error) {
        errors.push({ index: i, error: error.message });
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seed de usuários concluído!');
    console.log(`\n📊 Total: ${created}/100 usuários criados`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️  ${errors.length} erros encontrados:`);
      errors.slice(0, 5).forEach(e => {
        console.log(`  • Usuário ${e.index}: ${e.error}`);
      });
    }
    
    console.log('\n🔑 Credenciais padrão para todos os usuários:');
    console.log('   Senha: Senha@123');
    console.log('\n💡 Exemplos de login:');
    console.log('   Username: [conforme gerado] (ex: ana.silva.santos123)');
    console.log('   Email: [conforme gerado] (ex: ana.silva.santos123@gmail.com)');
    console.log('\n🌐 Acesse: http://localhost:1337/admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

seedUsers();
