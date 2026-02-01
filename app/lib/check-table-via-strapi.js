// Script para listar colunas da tabela usando Strapi
async function checkTableColumnsViaStrapi() {
  // Este script deve ser executado dentro do contexto do Strapi
  try {
    // Consultar a tabela diretamente
    const result = await strapi.connections.default.raw(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'users-permissions_user'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Colunas da tabela users-permissions_user:');
    result.rows.forEach(col => {
      console.log(`  ${col.column_name} (${col.data_type})`);
    });

    // Listar um amostra de usuários com TODAS as colunas
    const users = await strapi.connections.default.raw(`
      SELECT * FROM "users-permissions_user" LIMIT 3
    `);

    console.log('\n📊 Amostra de usuários completa:');
    if (users.rows.length > 0) {
      const keys = Object.keys(users.rows[0]);
      console.log('Colunas:', keys.join(', '));
      users.rows.forEach((user, idx) => {
        console.log(`\nUser ${idx + 1}:`);
        keys.forEach(key => {
          console.log(`  ${key}: ${user[key]}`);
        });
      });
    }
  } catch (error) {
    console.error('Erro:', error);
  }
}

module.exports = checkTableColumnsViaStrapi;
