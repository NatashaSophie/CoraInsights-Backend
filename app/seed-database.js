const axios = require('axios');

const API_URL = 'http://localhost:1337';

// Cores para output
const colors = {
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const log = (msg, color = 'reset') => console.log(`${colors[color]}${msg}${colors.reset}`);

// Dados de exemplo
const checkpointsData = [
  {
    name: 'Praça do Ferreira',
    location: { x: -3.7283, y: -38.5266 }
  },
  {
    name: 'Mercado Central',
    location: { x: -3.7268, y: -38.5284 }
  },
  {
    name: 'Catedral Metropolitana',
    location: { x: -3.7312, y: -38.5297 }
  },
  {
    name: 'Centro Dragão do Mar',
    location: { x: -3.7194, y: -38.5192 }
  },
  {
    name: 'Praia de Iracema',
    location: { x: -3.7167, y: -38.5124 }
  },
  {
    name: 'Parque do Cocó',
    location: { x: -3.7638, y: -38.5002 }
  }
];

const establishmentsData = [
  {
    name: 'Café Santa Clara',
    address: 'Rua Major Facundo, 500',
    email: 'contato@cafesantaclara.com',
    phone: '(85) 3254-8899',
    category: 'Café',
    location: { x: -3.7275, y: -38.5271 }
  },
  {
    name: 'Restaurante Coco Bambu',
    address: 'Av. Desembargador Moreira, 2001',
    email: 'fortaleza@cocobambu.com',
    phone: '(85) 3264-3030',
    category: 'Restaurante',
    location: { x: -3.7342, y: -38.5123 }
  },
  {
    name: 'Livraria Livraria Cultura',
    address: 'Shopping Iguatemi, Av. Washington Soares',
    email: 'iguatemi@livrariacultura.com.br',
    phone: '(85) 3392-9000',
    category: 'Livraria',
    location: { x: -3.7602, y: -38.4891 }
  },
  {
    name: 'Artesanato Ceará',
    address: 'Mercado Central, Loja 45',
    email: 'artesanato@ceara.com',
    phone: '(85) 3252-1234',
    category: 'Artesanato',
    location: { x: -3.7271, y: -38.5287 }
  }
];

async function seedDatabase() {
  try {
    log('\n🌱 Iniciando seed do banco de dados...', 'cyan');
    log('━'.repeat(60), 'cyan');

    // 1. Criar Checkpoints
    log('\n📍 Criando checkpoints...', 'yellow');
    const checkpoints = [];
    for (const checkpoint of checkpointsData) {
      try {
        const response = await axios.post(`${API_URL}/checkpoints`, checkpoint);
        checkpoints.push(response.data);
        log(`  ✓ Checkpoint criado: ${checkpoint.name}`, 'green');
      } catch (error) {
        log(`  ✗ Erro ao criar checkpoint ${checkpoint.name}: ${error.response?.data?.message || error.message}`, 'red');
      }
    }

    // 2. Criar Establishments
    log('\n🏪 Criando estabelecimentos...', 'yellow');
    const establishments = [];
    for (const establishment of establishmentsData) {
      try {
        const response = await axios.post(`${API_URL}/establishments`, establishment);
        establishments.push(response.data);
        log(`  ✓ Estabelecimento criado: ${establishment.name}`, 'green');
      } catch (error) {
        log(`  ✗ Erro ao criar estabelecimento ${establishment.name}: ${error.response?.data?.message || error.message}`, 'red');
      }
    }

    // 3. Criar Trail Parts (trechos de trilha)
    log('\n🚶 Criando trechos de trilha...', 'yellow');
    
    if (checkpoints.length >= 2) {
      const trailPartsData = [
        {
          name: 'Centro Histórico - Cultura',
          slug: 'centro-historico-cultura',
          description: 'Percorra o coração histórico de Fortaleza, visitando a Praça do Ferreira e o Mercado Central, dois pontos emblemáticos da cidade.',
          difficulty: 'easy',
          time: '01:30:00',
          distance: 2.5,
          fromCheckpoint: checkpoints[0]?.id,
          toCheckpoint: checkpoints[1]?.id
        },
        {
          name: 'Fé e História',
          slug: 'fe-e-historia',
          description: 'Do Mercado Central até a majestosa Catedral Metropolitana, uma jornada pela fé e arquitetura.',
          difficulty: 'easy',
          time: '00:45:00',
          distance: 1.2,
          fromCheckpoint: checkpoints[1]?.id,
          toCheckpoint: checkpoints[2]?.id
        },
        {
          name: 'Arte e Cultura',
          slug: 'arte-e-cultura',
          description: 'Da Catedral ao Centro Dragão do Mar, um dos principais polos culturais da cidade.',
          difficulty: 'medium',
          time: '01:00:00',
          distance: 2.0,
          fromCheckpoint: checkpoints[2]?.id,
          toCheckpoint: checkpoints[3]?.id
        },
        {
          name: 'Mar e Lazer',
          slug: 'mar-e-lazer',
          description: 'Do Centro Cultural até a bela Praia de Iracema, com vista para o mar.',
          difficulty: 'easy',
          time: '00:30:00',
          distance: 0.8,
          fromCheckpoint: checkpoints[3]?.id,
          toCheckpoint: checkpoints[4]?.id
        },
        {
          name: 'Natureza Urbana',
          slug: 'natureza-urbana',
          description: 'Da praia até o Parque do Cocó, o maior parque natural urbano da América Latina.',
          difficulty: 'hard',
          time: '02:30:00',
          distance: 6.5,
          fromCheckpoint: checkpoints[4]?.id,
          toCheckpoint: checkpoints[5]?.id
        }
      ];

      for (const trailPart of trailPartsData) {
        try {
          // Trail parts precisam de imagens, mas vamos criar sem elas primeiro
          // Você pode adicionar imagens depois pelo admin panel
          const { coverImage, images, ...trailPartWithoutImages } = trailPart;
          
          log(`  ⚠ Trecho "${trailPart.name}" precisa de imagens para ser criado`, 'yellow');
          log(`    Use o admin panel para adicionar: coverImage e images`, 'yellow');
        } catch (error) {
          log(`  ✗ Erro ao criar trecho ${trailPart.name}: ${error.response?.data?.message || error.message}`, 'red');
        }
      }
    }

    // Resumo
    log('\n' + '━'.repeat(60), 'cyan');
    log('✅ Seed concluído!', 'green');
    log(`\n📊 Resumo:`, 'cyan');
    log(`  • Checkpoints criados: ${checkpoints.length}/${checkpointsData.length}`, 'green');
    log(`  • Estabelecimentos criados: ${establishments.length}/${establishmentsData.length}`, 'green');
    log(`  • Trechos de trilha: precisam de imagens (adicione pelo admin panel)`, 'yellow');
    
    log(`\n🌐 Acesse: ${API_URL}/admin`, 'cyan');
    log('━'.repeat(60), 'cyan');

  } catch (error) {
    log(`\n❌ Erro geral: ${error.message}`, 'red');
    if (error.code === 'ECONNREFUSED') {
      log('⚠️  Certifique-se de que o servidor Strapi está rodando em http://localhost:1337', 'yellow');
    }
  }
}

// Executar
seedDatabase();
