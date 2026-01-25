const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'strapi'
});

// Coordenadas aproximadas dos checkpoints em Goiás
const checkpoints = [
  { name: 'Cidade de Corumbá', x: -15.9247, y: -48.8089 },
  { name: 'Salto de Corumbá', x: -15.8932, y: -48.7845 },
  { name: 'Pico dos Pireneus', x: -15.8521, y: -48.9234 },
  { name: 'Pirenópolis', x: -15.8509, y: -48.9587 },
  { name: 'Caxambu', x: -15.7823, y: -49.0456 },
  { name: 'Radiolândia', x: -15.7234, y: -49.1234 },
  { name: 'São Francisco de Goiás', x: -15.6345, y: -49.2567 },
  { name: 'Jaraguá', x: -15.7567, y: -49.3312 },
  { name: 'Vila Aparecida', x: -15.8123, y: -49.3789 },
  { name: 'Itaguari', x: -15.9234, y: -49.4567 },
  { name: 'São Benedito', x: -16.0345, y: -49.5234 },
  { name: 'Calcilândia', x: -16.1234, y: -49.6123 },
  { name: 'Ferreiro', x: -16.2345, y: -49.6789 },
  { name: 'Cidade de Goiás', x: -15.9344, y: -50.1406 }
];

const trailParts = [
  {
    name: 'Cidade de Corumbá ao Salto de Corumbá',
    slug: 'cidade-de-corumba-ao-salto-de-corumba',
    description: 'Com um percurso de 14,5 km e dificuldade moderada, se inicia na cidade de Corumbá de Goiás, na Praça da Matriz, onde fica a Igreja Nossa Senhora da Penha, que guarda o primeiro museu a ser visitado durante o percurso. O trecho tem muita subida e finaliza no Salto de Corumbá, cachoeira de grande exuberância, além de outras cachoeiras. A estimativa de tempo para percorrer este trecho é de 5 horas para um caminhante.',
    difficulty: 'medium',
    time: '05:00:00',
    distance: 14.5,
    fromCheckpoint: 0,
    toCheckpoint: 1
  },
  {
    name: 'Salto de Corumbá ao Pico dos Pireneus',
    slug: 'salto-de-corumba-ao-pico-dos-pireneus',
    description: 'Se inicia no Salto de Corumbá e vai até o Pico dos Pireneus, possui 12,7 km de extensão e é um trecho de muita subida, um ponto de destaque deste trecho é a caminhada pelo Parque Estadual dos Pirineus, onde os visitantes se deparam com formações rochosas em arenitos e quartzitos, datadas do período pré-cambriano, cruzam o Cerrado Rupestre até chegar ao Pico dos Pireneus, a 1.385 metros de altitude, onde há uma capela dedicada à Santíssima Trindade. O Pico dos Pireneus é o ponto mais alto da trilha inteira, onde o viajante pode desfrutar de uma visão panorâmica de todas as cidades ao redor de Pirenópolis.',
    difficulty: 'medium',
    time: '05:00:00',
    distance: 12.7,
    fromCheckpoint: 1,
    toCheckpoint: 2
  },
  {
    name: 'Pico dos Pireneus a Pirenópolis',
    slug: 'pico-dos-pireneus-a-pirenopolis',
    description: 'Se estende do Parque Estadual da Serra dos Pireneus até a cidade histórica de Pirenópolis, cobre uma distância de 24,4 km. Este segmento destaca-se pela riqueza de paisagens e recursos hídricos, além de ser o mais bem estruturado em termos de suporte aos caminhantes. Atravessa 12 quilômetros do Parque Estadual dos Pireneus, transpondo o Divisor Continental de Águas, que separa as bacias Platina e Tocantinense, e prossegue em direção a Pirenópolis por antigas estradas e trilhas no Cerrado. Após deixar o Parque na descida da serra, os caminhantes e ciclistas encontrarão o Parque do Coqueiro e o Mirante do Ventilador. Este trecho do percurso oferece diversos atrativos, como o Córrego da Barriguda e o Refúgio Avalon, com seu jardim sensorial. O trajeto segue pela trilha das Pedreiras até Pirenópolis, margeando o Rio das Almas em seu último trecho pela trilha Brasileirinho.',
    difficulty: 'hard',
    time: '08:00:00',
    distance: 24.4,
    fromCheckpoint: 2,
    toCheckpoint: 3
  },
  {
    name: 'Pirenópolis a Caxambu',
    slug: 'pirenopolis-a-caxambu',
    description: 'Se estende de Pirenópolis ao povoado de Caxambu, com uma extensão de 30 km, é caracterizado pelo relevo mais acentuado, cruzando remanescentes de mata primária e transpondo as serras Paraíso e Caxambu, esta última com altitudes superiores a mil metros. O percurso abrange partes do antigo caminho dos escravos, que conectava a Fazenda Babilônia (datada de 1800) a Pirenópolis, na região conhecida como Retiro. No meio do trajeto, encontram-se, em proximidade, o córrego Godinho e o Rio das Pedras, frequentemente mencionados por viajantes desde o século XVIII. Ao final, é necessário reunir forças para enfrentar a Serra de Caxambu, a mais desafiadora para os caminhantes. Para acessá-la, o caminhante ou ciclista atravessa a Fazenda Caiçara, onde, em menos de um quilômetro e meio, a altitude aumenta 150 metros até o topo, seguido de uma descida de 250 metros por uma trilha cavaleira.',
    difficulty: 'hard',
    time: '09:00:00',
    distance: 30,
    fromCheckpoint: 3,
    toCheckpoint: 4
  },
  {
    name: 'Caxambu a Radiolândia',
    slug: 'caxambu-a-radiolandia',
    description: 'Se estende do povoado de Caxambu ao povoado de Radiolândia, possui um relevo suavemente ondulado, abrangendo uma distância de 17,5 km. Este percurso destaca-se pela paisagem exuberante e atravessa áreas de pequenas propriedades, pastagens e grandes plantações. O trajeto segue por estradas vicinais e servidões, majoritariamente intercaladas por áreas de vegetação natural preservada, conhecida como Mato Grosso Goiano.',
    difficulty: 'medium',
    time: '06:00:00',
    distance: 17.5,
    fromCheckpoint: 4,
    toCheckpoint: 5
  },
  {
    name: 'Radiolândia a São Francisco de Goiás',
    slug: 'radiolandia-a-sao-francisco-de-goias',
    description: 'Parte do povoado de Radiolândia indo até São Francisco de Goiás, cobrindo uma distância de 27 km. Este trecho é caracterizado por um relevo predominantemente plano e percorre estradas rurais, atravessando áreas de mata e diversas fazendas. Nos pontos mais elevados deste percurso, é possível avistar as Serras do Loredo e do Chibio. Além disso, São Francisco de Goiás é notável por sua bela igreja e pelo Museu Histórico das Cavalhadas.',
    difficulty: 'hard',
    time: '08:00:00',
    distance: 27,
    fromCheckpoint: 5,
    toCheckpoint: 6
  },
  {
    name: 'São Francisco de Goiás a Jaraguá',
    slug: 'sao-francisco-de-goias-a-jaragua',
    description: 'Entre São Francisco de Goiás e Jaraguá, abrange uma extensão de 38,5 km, sendo o mais longo dessa jornada. Este segmento apresenta um relevo predominantemente plano ao longo de quase todo o percurso, seguindo por uma estrada vicinal que margeia o Rio Pari por uma longa extensão. A imponente Serra de Jaraguá, com mais de mil metros de altitude, pode ser avistada de longe, sendo um excelente local para a prática de voo livre. A altitude do trajeto varia entre 626 metros e 981 metros acima do nível do mar. Neste percurso, o Caminho de Cora Coralina cruza a Ferrovia Norte-Sul, e, por uma longa extensão, a principal paisagem é a Serra de Jaraguá, onde se encontra o Sítio Arqueológico de São Januário. O relevo torna-se levemente acidentado até a chegada ao Parque Estadual da Serra de Jaraguá. O viajante atravessará o Parque Estadual da Serra de Jaraguá e, após cruzar o Rio Pari, deverá seguir até a Igreja Nossa Senhora do Rosário, onde o trecho se finaliza.',
    difficulty: 'extreme',
    time: '12:00:00',
    distance: 38.5,
    fromCheckpoint: 6,
    toCheckpoint: 7
  },
  {
    name: 'Jaraguá a Vila Aparecida',
    slug: 'jaragua-a-vila-aparecida',
    description: 'Estende-se de Jaraguá ao povoado de Vila Aparecida, cobrindo uma distância de 17,3 km. Este segmento inicia-se na Igreja Nossa Senhora do Rosário, prosseguindo em direção ao Parque Estadual da Serra de Jaraguá até alcançar as torres, onde há um mirante que proporciona uma vista panorâmica de toda a região. Poucos metros após as torres, à direita e descendo a serra, o caminhante ou ciclista passará por uma casa abandonada, antiga sede do parque, e continuará a descida até alcançar a estrada vicinal. Seguindo à direita, atravessa-se a ponte sobre o Rio Pari e, em seguida, a Ferrovia Norte-Sul, continuando em frente até Vila Aparecida. Este trecho é caracterizado por um relevo pouco acidentado, com altitudes variando entre 606 metros e 725 metros. A região é predominantemente agrícola e pecuária, destacando-se pela presença de grandes áreas de cultivo de bananeiras.',
    difficulty: 'medium',
    time: '06:00:00',
    distance: 17.3,
    fromCheckpoint: 7,
    toCheckpoint: 8
  },
  {
    name: 'Vila Aparecida a Itaguari',
    slug: 'vila-aparecida-a-itaguari',
    description: 'Estende-se do povoado de Vila Aparecida até Itaguari, cobrindo uma distância de 29 km. Este segmento passa também pelos povoados de Avelândia e Palestina de Goiás, ambos pertencentes ao município de Jaraguá. Caracteriza-se por um relevo pouco acidentado, com altitudes variando entre 644 e 820 metros. A partir deste ponto, o Caminho de Cora Coralina torna-se mais tranquilo. A região é predominantemente agrícola e pecuária, com grandes áreas de cultivo de bananeiras. Itaguari destaca-se pelo número de pamonharias, devido à produção de milho, e é também uma referência na produção de lingerie.',
    difficulty: 'easy',
    time: '08:00:00',
    distance: 29,
    fromCheckpoint: 8,
    toCheckpoint: 9
  },
  {
    name: 'Itaguari a São Benedito',
    slug: 'itaguari-a-sao-benedito',
    description: 'Estende-se de Itaguari ao povoado de São Benedito, abrangendo uma distância de 27 km e apresentando um relevo diversificado. Na saída de Itaguari, o viajante é contemplado com a vista do nascer do sol no horizonte, que gradualmente fica para trás à medida que se avança pela estrada. Este segmento possui variações de altitude entre 650 e 805 metros, percorrendo inteiramente estradas vicinais. A paisagem é dominada por lavouras e criação de gado. Em São Benedito, é possível visitar a Vinícola Goiás, que proporciona uma experiência reminiscentes da Europa ao oferecer geleias, sucos e diversos derivados da uva.',
    difficulty: 'easy',
    time: '08:00:00',
    distance: 27,
    fromCheckpoint: 9,
    toCheckpoint: 10
  },
  {
    name: 'São Benedito a Calcilândia',
    slug: 'sao-benedito-a-calcilandia',
    description: 'Parte do povoado de São Benedito em direção ao povoado de Calcilândia, cobrindo uma distância de 22,7 km. Este trecho é caracterizado por um relevo pouco acidentado, com variações de altitude entre 650 e 800 metros, estando totalmente inserido na região conhecida como Mato Grosso Goiano. Historicamente, essa área era coberta predominantemente por espécies arbóreas do Cerrado sentido restrito, que representavam cerca de 70% da vegetação total, com alturas médias variando entre oito e quinze metros. Atualmente, devido à predominância de extensas áreas dedicadas à agricultura e pecuária, a paisagem foi significativamente alterada, restando apenas vestígios da mata original. O povoado de São Benedito, anteriormente conhecido como Olhos D\'Água, é um importante centro de produção e comercialização de polvilho, também chamado de fécula de mandioca, amplamente utilizado no preparo de tapioca. Ao sair de São Benedito, o caminhante ou ciclista deverá atravessar o Rio Uru, um importante curso d\'água da Bacia do Tocantins.',
    difficulty: 'hard',
    time: '08:00:00',
    distance: 22.7,
    fromCheckpoint: 10,
    toCheckpoint: 11
  },
  {
    name: 'Calcilândia a Ferreiro',
    slug: 'calcilandia-a-ferreiro',
    description: 'Cobre 29,5 km, estendendo-se do povoado de Calcilândia até o povoado de Ferreiro. Este segmento é caracterizado por um relevo pouco acidentado, apresentando uma descida próximo à chegada em Ferreiro, que atualmente conta apenas com uma igreja e algumas casas dispersas. A partir de Calcilândia, predomina uma região serrana, com elevações que variam entre 554 e 860 metros de altitude. Neste trecho, é possível avistar a Serra de São Pedro, que preserva muitas de suas características naturais e é fonte de histórias e mitos. Saindo de Calcilândia, o percurso atravessa fazendas e belas paisagens com vista para a Serra Dourada, até alcançar as ruínas de Ouro Fino. O arraial de Ouro Fino, marco inicial da mineração em Goiás, foi quase totalmente destruído, restando apenas as ruínas da antiga igreja e do cemitério. Após as ruínas de Ouro Fino, pode-se fazer um desvio para visitar a cruz de Chico Mineiro, localizada em uma propriedade privada. Continuando pelo Caminho, descendo pelo vale das nascentes do Rio Vermelho, chega-se ao antigo povoado de Ferreiro. Parte deste trajeto segue pela antiga Estrada Real, trilha histórica utilizada por bandeirantes e autoridades durante o período colonial.',
    difficulty: 'hard',
    time: '08:00:00',
    distance: 29.5,
    fromCheckpoint: 11,
    toCheckpoint: 12
  },
  {
    name: 'Ferreiro a Cidade de Goiás',
    slug: 'ferreiro-a-cidade-de-goias',
    description: 'Com extensão de 7,5 km, constitui a etapa final do percurso, partindo do povoado de Ferreiro até a Cidade de Goiás. Esta cidade histórica e turística é conhecida por seus inúmeros casarões e pousadas. O trajeto segue pelas antigas ruas da cidade até alcançar o ponto final, a Casa Velha da Ponte, residência de Cora Coralina. Este local, onde a poetisa viveu e produziu grande parte de sua obra, atualmente funciona como um museu dedicado à sua vida e poesia. Outro marco significativo na Cidade de Goiás é a Ponte da Lapa, imortalizada em alguns dos poemas de Cora Coralina, assim como o Rio Vermelho, frequentemente presente em sua obra. Este rio, localizado nas proximidades da cidade, proporciona aos visitantes um contato profundo com a natureza que inspirou a poetisa.',
    difficulty: 'easy',
    time: '02:00:00',
    distance: 7.5,
    fromCheckpoint: 12,
    toCheckpoint: 13
  }
];

async function seed() {
  try {
    await client.connect();
    console.log('✓ Conectado ao banco de dados PostgreSQL\n');

    // 1. Inserir checkpoints com componentes de localização
    console.log('📍 Criando checkpoints...');
    const checkpointIds = [];
    
    for (const checkpoint of checkpoints) {
      // Primeiro, inserir o componente de localização
      const locationResult = await client.query(
        `INSERT INTO components_general_locations (x, y) VALUES ($1, $2) RETURNING id`,
        [checkpoint.x, checkpoint.y]
      );
      const locationId = locationResult.rows[0].id;

      // Depois, inserir o checkpoint
      const checkpointResult = await client.query(
        `INSERT INTO checkpoints (name, created_at, updated_at) VALUES ($1, NOW(), NOW()) RETURNING id`,
        [checkpoint.name]
      );
      const checkpointId = checkpointResult.rows[0].id;

      // Vincular o componente de localização ao checkpoint através da tabela de ligação
      await client.query(
        `INSERT INTO checkpoints_components (field, "order", component_type, component_id, checkpoint_id) 
         VALUES ('location', 1, 'components_general_locations', $1, $2)`,
        [locationId, checkpointId]
      );

      checkpointIds.push(checkpointId);
      console.log(`  ✓ ${checkpoint.name} (ID: ${checkpointId})`);
    }

    // 2. Inserir trail-parts (SEM imagens - serão adicionadas depois)
    console.log('\n🚶 Criando trechos da trilha...');
    console.log('⚠️  Nota: As imagens (coverImage e images) precisam ser adicionadas pelo admin panel\n');
    
    for (const part of trailParts) {
      const result = await client.query(
        `INSERT INTO trail_parts 
        (name, slug, description, difficulty, time, distance, "fromCheckpoint", "toCheckpoint", created_at, updated_at) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
        RETURNING id`,
        [
          part.name,
          part.slug,
          part.description,
          part.difficulty,
          part.time,
          part.distance,
          checkpointIds[part.fromCheckpoint],
          checkpointIds[part.toCheckpoint]
        ]
      );
      console.log(`  ✓ Trecho ${trailParts.indexOf(part) + 1}: ${part.name} (ID: ${result.rows[0].id})`);
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Seed concluído com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`  • ${checkpoints.length} checkpoints criados`);
    console.log(`  • ${trailParts.length} trechos de trilha criados`);
    console.log(`  • Distância total: ${trailParts.reduce((sum, p) => sum + p.distance, 0)} km`);
    console.log('\n⚠️  Próximo passo: Adicione imagens aos trail-parts pelo admin panel');
    console.log('🌐 Acesse: http://localhost:1337/admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error);
  } finally {
    await client.end();
  }
}

seed();
