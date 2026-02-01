// Script para atualizar a coluna role baseado em userType
// Este script será executado no contexto do Strapi

async function updateUserRoles() {
  console.log('[MIGRATION] Iniciando atualização de roles...');

  try {
    // Primeiro, vamos verificar as roles existentes
    const rolesResult = await strapi.connections.default.raw(`
      SELECT id, name FROM "users-permissions_role" ORDER BY id
    `);

    console.log('[MIGRATION] Roles disponíveis:');
    rolesResult.rows.forEach(role => {
      console.log(`  ID: ${role.id}, Name: ${role.name}`);
    });

    // Agora vamos atualizar os usuários baseado em userType
    // Assumindo que:
    // - userType 'pilgrim' deve ter role 1 (Authenticated)
    // - userType 'manager' deve ter role 2
    // - userType 'merchant' deve ter role 3

    console.log('\n[MIGRATION] Atualizando roles baseado em userType...');

    // Update pilgrim -> role 1
    const updatePilgrim = await strapi.connections.default.raw(`
      UPDATE "users-permissions_user" 
      SET role = 1 
      WHERE "userType" = 'pilgrim' OR "userType" = 'peregrino'
    `);
    console.log(`[MIGRATION] Peregrinos atualizados: ${updatePilgrim.rowCount}`);

    // Update manager -> role 2
    const updateManager = await strapi.connections.default.raw(`
      UPDATE "users-permissions_user" 
      SET role = 2 
      WHERE "userType" = 'manager' OR "userType" = 'gestor'
    `);
    console.log(`[MIGRATION] Gestores atualizados: ${updateManager.rowCount}`);

    // Update merchant -> role 3
    const updateMerchant = await strapi.connections.default.raw(`
      UPDATE "users-permissions_user" 
      SET role = 3 
      WHERE "userType" = 'merchant' OR "userType" = 'comerciante'
    `);
    console.log(`[MIGRATION] Comerciantes atualizados: ${updateMerchant.rowCount}`);

    // Verificar o resultado
    console.log('\n[MIGRATION] Verificando atualização:');
    const checkResult = await strapi.connections.default.raw(`
      SELECT "userType", role, COUNT(*) as count 
      FROM "users-permissions_user" 
      GROUP BY "userType", role 
      ORDER BY role
    `);

    checkResult.rows.forEach(row => {
      console.log(`  ${row.userType} -> role ${row.role}: ${row.count} usuários`);
    });

    console.log('[MIGRATION] ✅ Atualização concluída com sucesso!');

  } catch (error) {
    console.error('[MIGRATION] ❌ Erro ao atualizar roles:', error.message);
    throw error;
  }
}

module.exports = updateUserRoles;
