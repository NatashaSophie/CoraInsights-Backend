/**
 * Script para testar login via GraphQL
 */

const axios = require('axios');

const endpoint = 'http://127.0.0.1:1337/graphql';

const LOGIN_QUERY = `
  mutation login($email: String!, $password: String!) {
    login(input: { identifier: $email, password: $password }) {
      jwt
      user {
        id
        username
        email
        role {
          id
          name
          type
        }
      }
    }
  }
`;

async function testLogin() {
  try {
    console.log('🔐 Testando login via GraphQL...\n');
    console.log(`Endpoint: ${endpoint}\n`);

    const variables = {
      email: 'gestor@cora.com',
      password: 'Gestor@123'
    };

    console.log('Credenciais:');
    console.log(`  Email: ${variables.email}`);
    console.log(`  Senha: ${variables.password}\n`);

    const response = await axios.post(endpoint, {
      query: LOGIN_QUERY,
      variables: variables
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.data.errors) {
      console.error('❌ ERRO NA QUERY:\n');
      console.error(JSON.stringify(response.data.errors, null, 2));
      return;
    }

    console.log('✅ LOGIN BEM-SUCEDIDO!\n');
    console.log('Resposta:');
    console.log(JSON.stringify(response.data, null, 2));

  } catch (error) {
    console.error('❌ ERRO NO LOGIN:\n');
    console.error('Mensagem:', error.message);
    if (error.response) {
      console.error('\nResposta do servidor:');
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testLogin();
