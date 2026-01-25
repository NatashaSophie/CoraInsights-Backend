const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

// Coordenadas reais em UTM dos checkpoints
const coordinates = [
  { name: 'Cidade de Corumbá', x: 734787.00, y: 8238207.00 },
  { name: 'Salto de Corumbá', x: 739357.72, y: 8246492.05 },
  { name: 'Pico dos Pireneus', x: 731742.36, y: 8252932.40 },
  { name: 'Pirenópolis', x: 718588.40, y: 8246313.70 },
  { name: 'Caxambu', x: 709533.80, y: 8228565.09 },
  { name: 'Radiolândia', x: 701790.00, y: 8221894.00 },
  { name: 'São Francisco de Goiás', x: 686197.00, y: 8237256.00 },
  { name: 'Jaraguá', x: 677868.00, y: 8256762.00 }, // Corrigi o erro de digitação (82567-62)
  { name: 'Vila Aparecida', x: 667390.00, y: 8247014.00 },
  { name: 'Itaguari', x: 649478.67, y: 8239423.42 },
  { name: 'São Benedito', x: 629498.00, y: 8238838.00 },
  { name: 'Calcilândia', x: 616611.00, y: 8241991.00 },
  { name: 'Ferreiro', x: 596070.79, y: 8240566.44 },
  { name: 'Cidade de Goiás', x: 592202.00, y: 8238832.00 }
];

async function updateCoordinates() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL\n');
    console.log('🗺️  Atualizando coordenadas dos checkpoints (UTM)...\n');

    let updated = 0;

    for (const coord of coordinates) {
      // Buscar o checkpoint pelo nome
      const checkpointResult = await client.query(
        `SELECT id FROM checkpoints WHERE name = $1`,
        [coord.name]
      );

      if (checkpointResult.rows.length === 0) {
        console.log(`  ⚠️  Checkpoint não encontrado: ${coord.name}`);
        continue;
      }

      const checkpointId = checkpointResult.rows[0].id;

      // Buscar o location_id vinculado através da tabela de componentes
      const componentResult = await client.query(
        `SELECT component_id FROM checkpoints_components 
         WHERE checkpoint_id = $1 AND field = 'location'`,
        [checkpointId]
      );

      if (componentResult.rows.length === 0) {
        console.log(`  ⚠️  Location não encontrada para: ${coord.name}`);
        continue;
      }

      const locationId = componentResult.rows[0].component_id;

      // Atualizar as coordenadas
      await client.query(
        `UPDATE components_general_locations SET x = $1, y = $2 WHERE id = $3`,
        [coord.x, coord.y, locationId]
      );

      console.log(`  ✓ ${coord.name}`);
      console.log(`    Latitude: ${coord.x} E / Longitude: ${coord.y} S`);
      updated++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Coordenadas atualizadas com sucesso!');
    console.log(`\n📊 ${updated}/${coordinates.length} checkpoints atualizados`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

updateCoordinates();
