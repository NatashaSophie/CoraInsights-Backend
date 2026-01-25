const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

// 20 estabelecimentos fictícios distribuídos ao longo da trilha
const establishments = [
  // Região de Corumbá de Goiás
  {
    name: 'Pousada Águas do Cerrado',
    category: 'Hospedagem',
    address: 'Rua da Matriz, 125 - Centro, Corumbá de Goiás - GO',
    email: 'contato@aguasdocerrado.com.br',
    phone: '(62) 3334-1234',
    x: 734650.00,
    y: 8238100.00
  },
  {
    name: 'Restaurante Sabor Goiano',
    category: 'Restaurante',
    address: 'Praça da Matriz, 45 - Centro, Corumbá de Goiás - GO',
    email: 'saborgoiano@email.com',
    phone: '(62) 3334-2345',
    x: 734800.00,
    y: 8238250.00
  },
  {
    name: 'Farmácia Santa Cruz',
    category: 'Farmácia',
    address: 'Av. Principal, 230 - Centro, Corumbá de Goiás - GO',
    email: 'farmacia.santacruz@email.com',
    phone: '(62) 3334-3456',
    x: 734900.00,
    y: 8238300.00
  },
  
  // Região de Pirenópolis
  {
    name: 'Hotel Fazenda Vale dos Pireneus',
    category: 'Hospedagem',
    address: 'Rodovia GO-225, Km 12 - Zona Rural, Pirenópolis - GO',
    email: 'reservas@valedospireneus.com.br',
    phone: '(62) 3331-5678',
    x: 718400.00,
    y: 8246200.00
  },
  {
    name: 'Café Colonial Dom Pedro',
    category: 'Café',
    address: 'Rua do Rosário, 87 - Centro Histórico, Pirenópolis - GO',
    email: 'cafedompedro@email.com',
    phone: '(62) 3331-6789',
    x: 718600.00,
    y: 8246400.00
  },
  {
    name: 'Artesanato Cerrado Vivo',
    category: 'Artesanato',
    address: 'Rua do Bonfim, 156 - Centro, Pirenópolis - GO',
    email: 'cerradovivo@email.com',
    phone: '(62) 3331-7890',
    x: 718500.00,
    y: 8246350.00
  },
  {
    name: 'Supermercado Bom Preço',
    category: 'Supermercado',
    address: 'Av. Sizenando Jayme, 340 - Centro, Pirenópolis - GO',
    email: 'bompreco@email.com',
    phone: '(62) 3331-8901',
    x: 718700.00,
    y: 8246450.00
  },
  
  // Região de Caxambu
  {
    name: 'Pousada Rural Caxambu',
    category: 'Hospedagem',
    address: 'Povoado de Caxambu, s/n - Zona Rural, Pirenópolis - GO',
    email: 'pousadacaxambu@email.com',
    phone: '(62) 99876-5432',
    x: 709500.00,
    y: 8228600.00
  },
  {
    name: 'Bar e Restaurante Tropeiro',
    category: 'Restaurante',
    address: 'Povoado de Caxambu - Pirenópolis - GO',
    email: 'tropeiro@email.com',
    phone: '(62) 99765-4321',
    x: 709550.00,
    y: 8228550.00
  },
  
  // Região de São Francisco de Goiás
  {
    name: 'Hotel São Francisco',
    category: 'Hospedagem',
    address: 'Rua Goiás, 89 - Centro, São Francisco de Goiás - GO',
    email: 'hotelsaofrancisco@email.com',
    phone: '(62) 3373-1234',
    x: 686150.00,
    y: 8237200.00
  },
  {
    name: 'Pizzaria Bella Itália',
    category: 'Restaurante',
    address: 'Praça Central, 23 - Centro, São Francisco de Goiás - GO',
    email: 'bellaitalia@email.com',
    phone: '(62) 3373-2345',
    x: 686200.00,
    y: 8237300.00
  },
  {
    name: 'Posto de Combustível Rota 225',
    category: 'Posto de Gasolina',
    address: 'Rodovia GO-225 - São Francisco de Goiás - GO',
    email: 'rota225@email.com',
    phone: '(62) 3373-3456',
    x: 686250.00,
    y: 8237150.00
  },
  
  // Região de Jaraguá
  {
    name: 'Pousada Serra de Jaraguá',
    category: 'Hospedagem',
    address: 'Av. Coronel Gomes, 567 - Centro, Jaraguá - GO',
    email: 'serradejaragua@email.com',
    phone: '(62) 3376-4567',
    x: 677850.00,
    y: 8256800.00
  },
  {
    name: 'Churrascaria Boi na Brasa',
    category: 'Restaurante',
    address: 'Rua Goiás, 234 - Centro, Jaraguá - GO',
    email: 'boinabrasa@email.com',
    phone: '(62) 3376-5678',
    x: 677900.00,
    y: 8256750.00
  },
  {
    name: 'Mercado Central de Jaraguá',
    category: 'Supermercado',
    address: 'Praça do Mercado, 1 - Centro, Jaraguá - GO',
    email: 'mercadocentral@email.com',
    phone: '(62) 3376-6789',
    x: 677800.00,
    y: 8256700.00
  },
  
  // Região de Itaguari
  {
    name: 'Pamonharia da Vovó',
    category: 'Restaurante',
    address: 'Rua Principal, 78 - Centro, Itaguari - GO',
    email: 'pamonhariadavovo@email.com',
    phone: '(62) 3383-7890',
    x: 649450.00,
    y: 8239400.00
  },
  {
    name: 'Boutique Lingerie Luxo',
    category: 'Loja',
    address: 'Av. Goiás, 145 - Centro, Itaguari - GO',
    email: 'lingerieluxo@email.com',
    phone: '(62) 3383-8901',
    x: 649500.00,
    y: 8239450.00
  },
  
  // Região de São Benedito
  {
    name: 'Vinícola Goiás',
    category: 'Vinícola',
    address: 'Fazenda São Benedito - São Benedito, GO',
    email: 'contato@vinicolagoias.com.br',
    phone: '(62) 99654-3210',
    x: 629480.00,
    y: 8238850.00
  },
  
  // Região de Cidade de Goiás
  {
    name: 'Pousada Casa da Ponte',
    category: 'Hospedagem',
    address: 'Rua da Ponte, 12 - Centro Histórico, Cidade de Goiás - GO',
    email: 'casadaponte@email.com',
    phone: '(62) 3371-9012',
    x: 592180.00,
    y: 8238800.00
  },
  {
    name: 'Restaurante Flor de Goiás',
    category: 'Restaurante',
    address: 'Praça do Coreto, 5 - Centro Histórico, Cidade de Goiás - GO',
    email: 'flordegoias@email.com',
    phone: '(62) 3371-0123',
    x: 592220.00,
    y: 8238850.00
  }
];

async function seedEstablishments() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL\n');
    console.log('🏪 Criando estabelecimentos...\n');

    let created = 0;

    for (const establishment of establishments) {
      // Inserir componente de localização
      const locationResult = await client.query(
        `INSERT INTO components_general_locations (x, y) VALUES ($1, $2) RETURNING id`,
        [establishment.x, establishment.y]
      );
      const locationId = locationResult.rows[0].id;

      // Inserir estabelecimento
      const establishmentResult = await client.query(
        `INSERT INTO establishments 
        (name, category, address, email, phone, created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
        RETURNING id`,
        [
          establishment.name,
          establishment.category,
          establishment.address,
          establishment.email,
          establishment.phone
        ]
      );
      const establishmentId = establishmentResult.rows[0].id;

      // Vincular localização ao estabelecimento
      await client.query(
        `INSERT INTO establishments_components 
        (field, "order", component_type, component_id, establishment_id) 
        VALUES ('location', 1, 'components_general_locations', $1, $2)`,
        [locationId, establishmentId]
      );

      console.log(`  ✓ ${establishment.name} (${establishment.category})`);
      created++;
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Estabelecimentos criados com sucesso!');
    console.log(`\n📊 Total: ${created} estabelecimentos`);
    console.log('\n📋 Categorias:');
    
    const categories = {};
    establishments.forEach(e => {
      categories[e.category] = (categories[e.category] || 0) + 1;
    });
    
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  • ${cat}: ${count}`);
    });
    
    console.log('\n🌐 Acesse: http://localhost:1337/admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

seedEstablishments();
