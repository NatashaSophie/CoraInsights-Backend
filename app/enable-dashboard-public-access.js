/**
 * Enable public access to /dashboards/public endpoint
 * Run with: node enable-dashboard-public-access.js
 */

const axios = require('axios');

const STRAPI_URL = 'http://localhost:1337';
const ADMIN_JWT_TOKEN = process.env.ADMIN_JWT_TOKEN || '';

async function enablePublicAccess() {
  try {
    console.log('Habilitando acesso público ao endpoint /dashboards/public...\n');

    // 1. Buscar o ID da role "Public"
    console.log('1. Buscando ID da role Public...');
    const rolesResponse = await axios.get(`${STRAPI_URL}/admin/roles`, {
      headers: {
        Authorization: `Bearer ${ADMIN_JWT_TOKEN}`
      }
    }).catch(e => {
      console.log('   ⚠️  Não foi possível buscar roles via admin API');
      console.log('   Você precisa configurar as permissões manualmente no painel admin do Strapi');
      return null;
    });

    if (!rolesResponse) {
      console.log('\n📝 Para habilitar o acesso público:');
      console.log('   1. Acesse http://localhost:1337/admin');
      console.log('   2. Vá para Settings > User & Permissions > Roles');
      console.log('   3. Clique em "Public"');
      console.log('   4. Encontre "Dashboard" > "find-public"');
      console.log('   5. Marque a caixa para permitir acesso');
      console.log('   6. Salve as mudanças');
      return;
    }

    const publicRole = rolesResponse.data.data.find(r => r.type === 'public');
    if (!publicRole) {
      console.log('❌ Role "Public" não encontrada');
      return;
    }

    console.log(`✓ Role Public encontrada (ID: ${publicRole.id})\n`);

    // 2. Atualizar permissões
    console.log('2. Atualizando permissões...');
    const updateResponse = await axios.put(
      `${STRAPI_URL}/admin/roles/${publicRole.id}`,
      {
        permissions: {
          'api::dashboard.dashboard.find': true,
        }
      },
      {
        headers: {
          Authorization: `Bearer ${ADMIN_JWT_TOKEN}`
        }
      }
    );

    console.log('✓ Permissões atualizadas com sucesso!');
    console.log('\n✅ Acesso público habilitado para /dashboards/public');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.log('\n📝 Para habilitar o acesso público manualmente:');
    console.log('   1. Acesse http://localhost:1337/admin');
    console.log('   2. Vá para Settings > User & Permissions > Roles');
    console.log('   3. Clique em "Public"');
    console.log('   4. Encontre "Dashboard" > "find"');
    console.log('   5. Marque a caixa para permitir acesso');
    console.log('   6. Salve as mudanças');
  }
}

enablePublicAccess();
