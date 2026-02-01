#!/usr/bin/env node

/**
 * Script para testar o fluxo de login e token para os 3 tipos de usuários
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:1337';

// Credenciais de teste para cada tipo de usuário
const testUsers = [
  { email: 'peregrino@cora.com', password: 'peregrino123', type: 'PILGRIM' },
  { email: 'gestor@cora.com', password: 'gestor123', type: 'MANAGER' },
  { email: 'comerciante@cora.com', password: 'comerciante123', type: 'MERCHANT' }
];

async function testLoginAndAnalytics(user) {
  console.log(`\n========================================`);
  console.log(`Testando ${user.type}`);
  console.log(`========================================`);
  
  try {
    // 1. Fazer login
    console.log(`\n1. Fazendo login como ${user.email}...`);
    const loginResponse = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        password: user.password
      })
    });

    if (!loginResponse.ok) {
      console.error(`❌ Erro no login: ${loginResponse.status} ${loginResponse.statusText}`);
      const error = await loginResponse.text();
      console.error('Resposta:', error);
      return;
    }

    const loginData = await loginResponse.json();
    const token = loginData.jwt;
    
    if (!token) {
      console.error('❌ Token não retornado no login');
      return;
    }

    console.log(`✅ Login bem-sucedido`);
    console.log(`Token: ${token.substring(0, 50)}...`);
    console.log(`User ID: ${loginData.user.id}`);
    console.log(`Username: ${loginData.user.username}`);
    console.log(`UserType: ${loginData.user.userType}`);

    // 2. Testar endpoint correto baseado no tipo
    let analyticsEndpoint = '';
    let analyticsParams = '';
    
    switch (user.type) {
      case 'PILGRIM':
        analyticsEndpoint = '/analytics/pilgrim';
        analyticsParams = '?start=2024-01-01&end=2024-12-31';
        break;
      case 'MANAGER':
        analyticsEndpoint = '/analytics/manager';
        analyticsParams = '?start=2024-01-01&end=2024-12-31';
        break;
      case 'MERCHANT':
        analyticsEndpoint = '/analytics/merchant';
        analyticsParams = `?merchantId=1&start=2024-01-01&end=2024-12-31`;
        break;
    }

    // 3. Buscar dados de analytics
    console.log(`\n2. Buscando dados de analytics...`);
    const analyticsResponse = await fetch(`${API_URL}${analyticsEndpoint}${analyticsParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!analyticsResponse.ok) {
      console.error(`❌ Erro ao buscar analytics: ${analyticsResponse.status} ${analyticsResponse.statusText}`);
      const error = await analyticsResponse.text();
      console.error('Resposta:', error);
      return;
    }

    const analyticsData = await analyticsResponse.json();
    console.log(`✅ Analytics buscados com sucesso`);
    console.log(`Dados retornados:`, JSON.stringify(analyticsData, null, 2));

  } catch (error) {
    console.error(`❌ Erro: ${error.message}`);
  }
}

async function runTests() {
  console.log('TESTE DO FLUXO DE LOGIN E ANALYTICS');
  console.log('API URL:', API_URL);
  
  for (const user of testUsers) {
    await testLoginAndAnalytics(user);
  }
  
  console.log(`\n========================================`);
  console.log('Testes concluídos!');
  console.log('========================================\n');
}

// Rodar testes
runTests().catch(console.error);
