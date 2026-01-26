const axios = require('axios');

async function testAPI() {
  try {
    console.log('🧪 Testando API do Dashboard...\n');
    
    const response = await axios.get('http://127.0.0.1:1337/dashboards/public');
    const data = response.data;

    console.log('👥 PEREGRINOS:');
    console.log(`   Total: ${data.totalPilgrims}`);
    console.log(`   Masculino: ${data.malePilgrims}`);
    console.log(`   Feminino: ${data.femalePilgrims}`);
    
    console.log('\n🚶 PERCURSOS:');
    console.log(`   Concluídos: ${data.completedTrails}`);
    console.log(`   Ativos: ${data.activeTrails}`);
    console.log(`   Caminho Completo (13 trechos): ${data.caminhoCompleto}`);
    
    console.log('\n📊 CAMINHOS PARCIAIS (Concluídos):');
    let totalParciais = 0;
    for (let i = 1; i <= 12; i++) {
      const count = data.caminhosParciais[`${i}_trechos`];
      if (count > 0) {
        console.log(`   ${i} ${i === 1 ? 'trecho' : 'trechos'}: ${count}`);
        totalParciais += count;
      }
    }
    console.log(`   TOTAL PARCIAIS: ${totalParciais}`);
    
    console.log('\n🏃 EM ANDAMENTO:');
    console.log(`   ${data.emAndamento}`);
    
    console.log('\n✅ VERIFICAÇÃO:');
    const totalGrafico = data.caminhoCompleto + totalParciais + data.emAndamento;
    console.log(`   Soma do gráfico: ${totalGrafico} (Completo: ${data.caminhoCompleto}, Parciais: ${totalParciais}, Andamento: ${data.emAndamento})`);
    console.log(`   Total percursos: ${data.completedTrails + data.activeTrails}`);
    console.log(`   ${totalGrafico === (data.completedTrails + data.activeTrails) ? '✅ CORRETO' : '❌ ERRO'}`);
    
    console.log('\n🏆 TOP 5 PEREGRINOS:');
    data.topPilgrims.slice(0, 5).forEach((p, i) => {
      console.log(`   ${i+1}. ${p.nickname}: ${p.points} pts (Dist: ${p.distance}km, Tempo: ${p.time}h, Vel: ${p.averageSpeed}km/h)`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

testAPI();
