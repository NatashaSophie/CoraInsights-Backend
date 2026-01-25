/**
 * Script para criar usuários de teste para o CoraInsights
 * Execute: node seed-corainsights-users.js
 */

const axios = require('axios');

const API_URL = 'http://127.0.0.1:1337';

// Credenciais do admin (você precisará criar um admin no Strapi primeiro)
const ADMIN_EMAIL = 'admin@corainsights.com';
const ADMIN_PASSWORD = 'Admin@123';

const users = [
  // 10 PEREGRINOS
  {
    username: 'peregrino1@cora.com',
    email: 'peregrino1@cora.com',
    password: 'Peregrino@123',
    name: 'João Silva',
    nickname: 'joao_silva',
    birthdate: '1990-05-15',
    sex: 'Male',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino2@cora.com',
    email: 'peregrino2@cora.com',
    password: 'Peregrino@123',
    name: 'Maria Santos',
    nickname: 'maria_santos',
    birthdate: '1985-08-22',
    sex: 'Female',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino3@cora.com',
    email: 'peregrino3@cora.com',
    password: 'Peregrino@123',
    name: 'Pedro Oliveira',
    nickname: 'pedro_oliveira',
    birthdate: '1992-03-10',
    sex: 'Male',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino4@cora.com',
    email: 'peregrino4@cora.com',
    password: 'Peregrino@123',
    name: 'Ana Costa',
    nickname: 'ana_costa',
    birthdate: '1988-11-30',
    sex: 'Female',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino5@cora.com',
    email: 'peregrino5@cora.com',
    password: 'Peregrino@123',
    name: 'Carlos Mendes',
    nickname: 'carlos_mendes',
    birthdate: '1995-07-18',
    sex: 'Male',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino6@cora.com',
    email: 'peregrino6@cora.com',
    password: 'Peregrino@123',
    name: 'Juliana Ferreira',
    nickname: 'juliana_ferreira',
    birthdate: '1991-02-25',
    sex: 'Female',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino7@cora.com',
    email: 'peregrino7@cora.com',
    password: 'Peregrino@123',
    name: 'Roberto Lima',
    nickname: 'roberto_lima',
    birthdate: '1987-09-14',
    sex: 'Male',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino8@cora.com',
    email: 'peregrino8@cora.com',
    password: 'Peregrino@123',
    name: 'Fernanda Alves',
    nickname: 'fernanda_alves',
    birthdate: '1993-12-05',
    sex: 'Female',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino9@cora.com',
    email: 'peregrino9@cora.com',
    password: 'Peregrino@123',
    name: 'Lucas Martins',
    nickname: 'lucas_martins',
    birthdate: '1994-06-20',
    sex: 'Male',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },
  {
    username: 'peregrino10@cora.com',
    email: 'peregrino10@cora.com',
    password: 'Peregrino@123',
    name: 'Beatriz Souza',
    nickname: 'beatriz_souza',
    birthdate: '1989-04-08',
    sex: 'Female',
    userType: 'pilgrim',
    confirmed: true,
    blocked: false
  },

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
  console.log('🚀 Iniciando criação de usuários de teste...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const userData of users) {
    try {
      const response = await axios.post(`${API_URL}/auth/local/register`, userData);
      
      console.log(`✅ Usuário criado: ${userData.email} (${userData.userType})`);
      successCount++;
      
      // Delay para evitar rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      if (error.response?.data?.message?.[0]?.messages?.[0]?.message?.includes('Email is already taken')) {
        console.log(`⚠️  Usuário já existe: ${userData.email}`);
      } else {
        console.error(`❌ Erro ao criar ${userData.email}:`, JSON.stringify(error.response?.data, null, 2) || error.message);
        errorCount++;
      }
    }
  }

  console.log(`\n📊 Resumo:`);
  console.log(`   ✅ Criados com sucesso: ${successCount}`);
  console.log(`   ❌ Erros: ${errorCount}`);
  console.log(`\n🔐 CREDENCIAIS DE LOGIN:\n`);
  
  console.log(`📱 PEREGRINOS (10):`);
  users.filter(u => u.userType === 'pilgrim').forEach((u, i) => {
    console.log(`   ${i + 1}. Email: ${u.email} | Senha: ${u.password} | Nome: ${u.name}`);
  });
  
  console.log(`\n👔 GESTOR (1):`);
  users.filter(u => u.userType === 'manager').forEach(u => {
    console.log(`   Email: ${u.email} | Senha: ${u.password} | Nome: ${u.name}`);
  });
  
  console.log(`\n🏪 COMERCIANTES (3):`);
  users.filter(u => u.userType === 'merchant').forEach((u, i) => {
    console.log(`   ${i + 1}. Email: ${u.email} | Senha: ${u.password} | Nome: ${u.name}`);
    console.log(`      Negócio: ${u.businessName} (${u.businessType})`);
  });
  
  console.log(`\n✨ Pronto! Todos os usuários foram criados.`);
  console.log(`\n🌐 Acesse: http://localhost:3000/login`);
}

createUsers().catch(error => {
  console.error('❌ Erro fatal:', error);
  process.exit(1);
});
