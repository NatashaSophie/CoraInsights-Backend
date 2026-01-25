const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

async function inspectTables() {
  try {
    await client.connect();
    
    // Checkpoints
    console.log('📍 Estrutura da tabela CHECKPOINTS:');
    const checkpointsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'checkpoints' 
      ORDER BY ordinal_position;
    `);
    console.table(checkpointsSchema.rows);

    // Components locations
    console.log('\n📍 Estrutura da tabela COMPONENTS_GENERAL_LOCATIONS:');
    const locationsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'components_general_locations' 
      ORDER BY ordinal_position;
    `);
    console.table(locationsSchema.rows);

    // Checkpoints components (tabela de ligação)
    console.log('\n🔗 Estrutura da tabela CHECKPOINTS_COMPONENTS:');
    const checkpointsComponents = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'checkpoints_components' 
      ORDER BY ordinal_position;
    `);
    console.table(checkpointsComponents.rows);

    // Trail parts
    console.log('\n🚶 Estrutura da tabela TRAIL_PARTS:');
    const trailPartsSchema = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'trail_parts' 
      ORDER BY ordinal_position;
    `);
    console.table(trailPartsSchema.rows);

  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await client.end();
  }
}

inspectTables();
