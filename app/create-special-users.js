/**
 * Script para criar gestor e comerciantes diretamente no banco
 * Execute: node create-special-users.js
 */

const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'strapi',
  password: 'strapi'
});

const users = [
  // 1 GESTOR
  {
    username: 'gestor@cora.com',
    email: 'gestor@cora.com',
    password: 'Gestor@123',
    name: 'Ricardo Gestão',
    nickname: 'ricardo_gestao',
    birthdate: '1980-01-15',
    sex: 'Male',
    userType: 'manager',
    organizationType: 'government',
    organizationName: 'Secretaria de Turismo de Goiás',
    confirmed: true,
    blocked: false
  },
  // 3 COMERCIANTES (Aprovados)
  {
    username: 'comerciante1@cora.com',
    email: 'comerciante1@cora.com',
    password: 'Comerciante@123',
    name: 'Paulo Restaurante',
    nickname: 'paulo_restaurante',
    birthdate: '1975-05-20',
    sex: 'Male',
    userType: 'merchant',
    businessName: 'Restaurante Sabor de Goiás',
    businessType: 'Restaurante',
    businessAddress: 'Rua da Trilha, 100, Centro, Cidade de Goiás',
    businessPhone: '(62) 3371-1001',
    merchantApproved: true,
    confirmed: true,
    blocked: false
  },
  {
    username: 'comerciante2@cora.com',
    email: 'comerciante2@cora.com',
    password: 'Comerciante@123',
    name: 'Sandra Pousada',
    nickname: 'sandra_pousada',
    birthdate: '1982-09-12',
    sex: 'Female',
    userType: 'merchant',
    businessName: 'Pousada Caminho das Águas',
    businessType: 'Pousada',
    businessAddress: 'Av. Cora Coralina, 250, Centro, Cidade de Goiás',
    businessPhone: '(62) 3371-2002',
    merchantApproved: true,
    confirmed: true,
    blocked: false
  },
  {
    username: 'comerciante3@cora.com',
    email: 'comerciante3@cora.com',
    password: 'Comerciante@123',
    name: 'José Artesanato',
    nickname: 'jose_artesanato',
    birthdate: '1978-03-25',
    sex: 'Male',
    userType: 'merchant',
    businessName: 'Loja de Artesanato Goiano',
    businessType: 'Artesanato',
    businessAddress: 'Praça do Coreto, 50, Centro, Cidade de Goiás',
    businessPhone: '(62) 3371-3003',
    merchantApproved: true,
    confirmed: true,
    blocked: false
  }
];

async function createUsers() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    for (const userData of users) {
      try {
        // Hash da senha
        const hashedPassword = await bcrypt.hash(userData.password, 10);

        // Verificar se já existe
        const checkResult = await client.query(
          'SELECT id FROM users_permissions_user WHERE email = $1',
          [userData.email]
        );

        if (checkResult.rows.length > 0) {
          console.log(`⚠️  Usuário já existe: ${userData.email}`);
          continue;
        }

        // Inserir usuário
        const insertQuery = `
          INSERT INTO users_permissions_user (
            username, email, password, name, nickname, birthdate, sex,
            "userType", "organizationType", "organizationName",
            "businessName", "businessType", "businessAddress", "businessPhone",
            "merchantApproved", confirmed, blocked, provider,
            created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
            NOW(), NOW()
          ) RETURNING id
        `;

        const result = await client.query(insertQuery, [
          userData.username,
          userData.email,
          hashedPassword,
          userData.name,
          userData.nickname,
          userData.birthdate,
          userData.sex,
          userData.userType,
          userData.organizationType || null,
          userData.organizationName || null,
          userData.businessName || null,
          userData.businessType || null,
          userData.businessAddress || null,
          userData.businessPhone || null,
          userData.merchantApproved || false,
          userData.confirmed,
          userData.blocked,
          'local'
        ]);

        console.log(`✅ Usuário criado: ${userData.email} (${userData.userType}) - ID: ${result.rows[0].id}`);
      } catch (error) {
        console.error(`❌ Erro ao criar ${userData.email}:`, error.message);
      }
    }

    console.log(`\n✨ Processo concluído!`);
    console.log(`\n🔐 CREDENCIAIS DE LOGIN:\n`);
    
    console.log(`👔 GESTOR (1):`);
    users.filter(u => u.userType === 'manager').forEach(u => {
      console.log(`   Email: ${u.email} | Senha: ${u.password} | Nome: ${u.name}`);
      console.log(`   Organização: ${u.organizationName} (${u.organizationType})`);
    });
    
    console.log(`\n🏪 COMERCIANTES (3):`);
    users.filter(u => u.userType === 'merchant').forEach((u, i) => {
      console.log(`   ${i + 1}. Email: ${u.email} | Senha: ${u.password} | Nome: ${u.name}`);
      console.log(`      Negócio: ${u.businessName} (${u.businessType})`);
      console.log(`      Aprovado: ✅`);
    });

  } catch (error) {
    console.error('❌ Erro fatal:', error);
  } finally {
    await client.end();
  }
}

createUsers();
