const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

// Nomes masculinos e femininos comuns no Brasil
const nomesMasculinos = [
  'joão', 'pedro', 'lucas', 'gabriel', 'matheus', 'rafael', 'carlos', 'felipe',
  'bruno', 'andré', 'fernando', 'ricardo', 'rodrigo', 'marcelo', 'thiago',
  'diego', 'henrique', 'daniel', 'leonardo', 'gustavo', 'eduardo', 'julio',
  'sergio', 'paulo', 'antonio', 'jose', 'francisco', 'marcos', 'vitor'
];

const nomesFemininos = [
  'maria', 'ana', 'julia', 'isabela', 'beatriz', 'laura', 'amanda', 'jessica',
  'fernanda', 'camila', 'carolina', 'mariana', 'patricia', 'carla', 'claudia',
  'andrea', 'sandra', 'daniela', 'leticia', 'roberta', 'vanessa', 'renata',
  'gabriela', 'paula', 'cristina', 'lucia', 'rosa', 'rita', 'helena'
];

async function ajustarDadosUsuarios() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Buscar todos os usuários peregrinos
    const users = await client.query(`
      SELECT id, name, sex, created_at
      FROM "users-permissions_user"
      WHERE "userType" = 'pilgrim'
      ORDER BY id
    `);

    console.log(`📋 Total de usuários: ${users.rows.length}\n`);

    let atualizadosSexo = 0;
    let atualizadosData = 0;
    let duvidas = [];

    for (const user of users.rows) {
      const primeiroNome = user.name ? user.name.split(' ')[0].toLowerCase() : '';
      let novoSexo = user.sex;

      // Definir sexo baseado no nome
      if (!user.sex || user.sex === null) {
        if (nomesMasculinos.some(n => primeiroNome.includes(n))) {
          novoSexo = 'Male';
          atualizadosSexo++;
        } else if (nomesFemininos.some(n => primeiroNome.includes(n))) {
          novoSexo = 'Female';
          atualizadosSexo++;
        } else {
          duvidas.push({ id: user.id, name: user.name, primeiroNome });
        }
      }

      // Gerar data aleatória entre jan/2024 e jan/2026
      const dataInicio = new Date('2024-01-01');
      const dataFim = new Date('2026-01-25');
      const timestamp = dataInicio.getTime() + Math.random() * (dataFim.getTime() - dataInicio.getTime());
      const novaData = new Date(timestamp);

      // Atualizar usuário
      await client.query(`
        UPDATE "users-permissions_user"
        SET sex = $1, created_at = $2, updated_at = $2
        WHERE id = $3
      `, [novoSexo, novaData, user.id]);

      atualizadosData++;
    }

    console.log(`✅ ${atualizadosSexo} usuários tiveram o sexo atualizado`);
    console.log(`✅ ${atualizadosData} usuários tiveram a data alterada`);

    if (duvidas.length > 0) {
      console.log(`\n❓ Usuários com nomes duvidosos (${duvidas.length}):\n`);
      duvidas.forEach(d => {
        console.log(`   ID ${d.id}: "${d.name}" (primeiro nome: "${d.primeiroNome}")`);
      });
      console.log('\n⚠️  Por favor, defina o sexo destes usuários manualmente.');
    }

    console.log('\n✨ Ajustes concluídos!\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

ajustarDadosUsuarios();
