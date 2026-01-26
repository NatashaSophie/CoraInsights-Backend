/**
 * Script para aprovar todos os comerciantes pendentes
 * Execute: node approve-merchants.js
 */

const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',
  port: 5432,
  database: 'strapi',
  user: 'postgres',
  password: 'postgres'
});

async function approveMerchants() {
  try {
    await client.connect();
    console.log('🚀 Conectado ao banco de dados\n');

    // Listar comerciantes não aprovados
    const pendingResult = await client.query(`
      SELECT id, email, name, "businessName", "merchantApproved"
      FROM users_permissions_user 
      WHERE "userType" = 'merchant'
      ORDER BY id
    `);

    console.log('📋 COMERCIANTES NO BANCO:\n');
    pendingResult.rows.forEach(merchant => {
      const status = merchant.merchantApproved ? '✅ Aprovado' : '⏳ Pendente';
      console.log(`${status} - ${merchant.email} (${merchant.name})`);
      console.log(`   Negócio: ${merchant.businessName || 'N/A'}\n`);
    });

    // Aprovar todos os comerciantes pendentes
    const updateResult = await client.query(`
      UPDATE users_permissions_user 
      SET "merchantApproved" = true,
          "updated_at" = NOW()
      WHERE "userType" = 'merchant' 
      AND "merchantApproved" = false
      RETURNING id, email, name
    `);

    if (updateResult.rows.length > 0) {
      console.log('\n✅ COMERCIANTES APROVADOS:\n');
      updateResult.rows.forEach(merchant => {
        console.log(`✓ ${merchant.email} (${merchant.name})`);
      });
      console.log(`\n🎉 Total de ${updateResult.rows.length} comerciante(s) aprovado(s)!`);
    } else {
      console.log('\n✓ Todos os comerciantes já estão aprovados!');
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await client.end();
  }
}

approveMerchants();
