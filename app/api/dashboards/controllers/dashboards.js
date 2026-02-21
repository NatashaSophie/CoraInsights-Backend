const dashboardsAuth = require('../../../../dashboards/auth');
const dashboardsAnalytics = require('../../../../dashboards/analytics');

module.exports = {
  async login(ctx) {
    const result = await dashboardsAuth.login(ctx.request.body || {});

    if (!result.ok) {
      ctx.unauthorized(result.error || 'Invalid credentials');
      return;
    }

    ctx.send(result.data);
  },

  async getPilgrimAnalytics(ctx) {
    await dashboardsAnalytics.getPilgrimAnalytics(ctx);
  },

  async getManagerAnalytics(ctx) {
    await dashboardsAnalytics.getManagerAnalytics(ctx);
  },

  async getMerchantAnalytics(ctx) {
    await dashboardsAnalytics.getMerchantAnalytics(ctx);
  },

  async getPublicData(ctx) {
    try {
      console.log('Dashboard API called');
      
      // 1. Contagens básicas
      const totalPilgrims = await strapi.query('user', 'users-permissions').count({
        userType: 'pilgrim',
        blocked: false
      });

      const malePilgrims = await strapi.query('user', 'users-permissions').count({
        userType: 'pilgrim',
        blocked: false,
        sex: 'Male'
      });

      const femalePilgrims = await strapi.query('user', 'users-permissions').count({
        userType: 'pilgrim',
        blocked: false,
        sex: 'Female'
      });

      // Percursos Concluídos - trails com finishedAt preenchido
      const completedTrails = await strapi.query('trails').count({
        finishedAt_null: false
      });
      
      // Percursos Ativos - trails sem finishedAt (em andamento)
      const activeTrails = await strapi.query('trails').count({
        finishedAt_null: true
      });

      // Caminho Completo - peregrinos que completaram todos os 13 trechos
      const fullPathPilgrims = await strapi.connections.default.raw(`
        SELECT COUNT(DISTINCT t.id) as count
        FROM trails t
        WHERE t."finishedAt" IS NOT NULL
        AND (
          SELECT COUNT(DISTINCT tr.route)
          FROM trail_routes tr
          WHERE tr.trail = t.id AND tr."finishedAt" IS NOT NULL
        ) = 13
      `);
      const caminhoCompleto = parseInt(fullPathPilgrims.rows[0]?.count || 0);

      // 2. STATUS DO CAMINHO - Distribuição por quantidade de trechos completados
      const statusCaminhoQuery = await strapi.connections.default.raw(`
        WITH trail_route_counts AS (
          SELECT 
            t.id as trail_id,
            CASE WHEN t."finishedAt" IS NULL THEN 0 ELSE 1 END as is_finished,
            CASE WHEN t."finishedAt" IS NULL THEN 0 ELSE COUNT(DISTINCT tr.route) END as routes_completed
          FROM trails t
          LEFT JOIN trail_routes tr ON tr.trail = t.id AND tr."finishedAt" IS NOT NULL
          GROUP BY t.id, t."finishedAt"
        )
        SELECT 
          CASE 
            WHEN is_finished = 0 THEN 'Em Andamento'
            WHEN routes_completed = 13 THEN 'Caminho Completo (13 trechos)'
            ELSE routes_completed || ' ' || CASE WHEN routes_completed = 1 THEN 'trecho' ELSE 'trechos' END
          END as status,
          routes_completed,
          is_finished,
          COUNT(*) as count
        FROM trail_route_counts
        GROUP BY status, routes_completed, is_finished
        ORDER BY is_finished DESC, routes_completed ASC
      `);
      
      const statusCaminho = statusCaminhoQuery.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count)
      }));

      // 3. TOP PEREGRINOS - Buscar com dados completos
      const pilgrimsWithTrails = await strapi.connections.default.raw(`
        SELECT 
          u.id,
          u.username,
          u.nickname,
          u.name,
          u.sex,
          EXTRACT(YEAR FROM AGE(CURRENT_DATE, u.birthdate::date))::integer as age,
          COUNT(DISTINCT t.id) as total_trails,
          COUNT(DISTINCT CASE WHEN t."finishedAt" IS NOT NULL THEN t.id END) as completed_trails,
          COUNT(DISTINCT CASE WHEN tr."finishedAt" IS NOT NULL THEN tr.id END) as completed_routes,
          COUNT(DISTINCT CASE WHEN (
            SELECT COUNT(DISTINCT tr2.route) 
            FROM trail_routes tr2 
            WHERE tr2.trail = t.id AND tr2."finishedAt" IS NOT NULL
          ) = 13 THEN t.id ELSE NULL END) as has_full_path
        FROM "users-permissions_user" u
        LEFT JOIN trails t ON t."user" = u.id
        LEFT JOIN trail_routes tr ON tr.trail = t.id
        WHERE u."userType" = 'pilgrim' AND u.blocked = false
        GROUP BY u.id, u.username, u.nickname, u.name, u.sex, u.birthdate
        HAVING COUNT(DISTINCT t.id) > 0
      `);

      const pilgrimModalities = await strapi.connections.default.raw(`
        SELECT 
          t.id as trail_id,
          t."user" as user_id,
          t.modality,
          t."finishedAt"
        FROM trails t
      `);

      const normalizeDifficulty = value => {
        const raw = String(value || '').toLowerCase().trim();
        if (raw.includes('fac') || raw.includes('easy')) {
          return 'easy';
        }
        if (raw.includes('dif') || raw.includes('hard')) {
          return 'hard';
        }
        if (raw.includes('ext')) {
          return 'extreme';
        }
        return 'medium';
      };

      const getSpeedRangeForTrecho = (modality, difficulty) => {
        const normalized = normalizeDifficulty(difficulty);
        const mode = String(modality || '').toLowerCase();
        const isBike = mode === 'bicicleta' || mode === 'bike' || mode === 'pedal';

        if (isBike) {
          if (normalized === 'easy') return [20, 25];
          if (normalized === 'hard' || normalized === 'extreme') return [12, 13];
          return [12, 15];
        }

        if (normalized === 'easy') return [6, 6];
        if (normalized === 'hard') return [1, 3];
        if (normalized === 'extreme') return [1, 2];
        return [4, 5];
      };

      const getExpectedHours = (distance, modality, difficulty) => {
        const dist = Number(distance || 0);
        if (!dist) {
          return 0;
        }
        const [minSpeed, maxSpeed] = getSpeedRangeForTrecho(modality, difficulty);
        const avgSpeed = (minSpeed + maxSpeed) / 2;
        return avgSpeed > 0 ? dist / avgSpeed : 0;
      };

      // Calcular tempo estimado por peregrino a partir de distancia/dificuldade/modalidade
      const pilgrimTimes = await strapi.connections.default.raw(`
        SELECT 
          t."user" as user_id,
          tr.trail as trail_id,
          tp.distance as distance,
          tp.difficulty as difficulty,
          t.modality as modality
        FROM trail_routes tr
        JOIN trails t ON tr.trail = t.id
        JOIN trail_parts tp ON tp.id = tr.route
        WHERE tr."finishedAt" IS NOT NULL
      `);

      // Calcular tempo total por usuário com base em distancia/dificuldade/modalidade
      const userHoursMap = {};
      const userDistanceMap = {};
      for (const row of pilgrimTimes.rows) {
        const userId = row.user_id;
        const durationHours = getExpectedHours(row.distance, row.modality, row.difficulty);
        if (durationHours > 0) {
          userHoursMap[userId] = (userHoursMap[userId] || 0) + durationHours;
        }
        const distance = Number(row.distance || 0);
        if (distance > 0) {
          userDistanceMap[userId] = (userDistanceMap[userId] || 0) + distance;
        }
      }

      const modalityMap = {};
      const modalityOrderMap = {};

      const normalizeModalityForRoutes = (value) => {
        if (!value) return null;
        const normalized = String(value).toLowerCase();
        if (normalized === 'pedestre' || normalized === 'foot') return 'pedestre';
        if (normalized === 'bicicleta' || normalized === 'bike') return 'bicicleta';
        return null;
      };

      pilgrimModalities.rows.forEach((row) => {
        const userId = row.user_id;
        if (!userId) return;
        if (!modalityMap[userId]) {
          modalityMap[userId] = {
            counts: { pedestre: 0, bicicleta: 0 },
            latestTime: 0,
            latestModality: null
          };
        }

        if (!modalityOrderMap[userId]) {
          modalityOrderMap[userId] = [];
        }

        const modalityValue = normalizeModalityForRoutes(row.modality);
        if (modalityValue) {
          modalityMap[userId].counts[modalityValue] += 1;
        }

        if (row.finishedAt) {
          const timestamp = new Date(row.finishedAt).getTime();
          if (!Number.isNaN(timestamp) && timestamp > modalityMap[userId].latestTime) {
            modalityMap[userId].latestTime = timestamp;
            modalityMap[userId].latestModality = modalityValue;
          }

          if (modalityValue) {
            modalityOrderMap[userId].push({
              timestamp,
              modality: modalityValue
            });
          }
        }
      });

      const resolveModality = (userId) => {
        const data = modalityMap[userId];
        if (!data) return null;
        const pedestreCount = data.counts.pedestre || 0;
        const bicicletaCount = data.counts.bicicleta || 0;
        if (pedestreCount === 0 && bicicletaCount === 0) return data.latestModality;
        if (pedestreCount === bicicletaCount) return data.latestModality || (pedestreCount > 0 ? 'pedestre' : null);
        return pedestreCount > bicicletaCount ? 'pedestre' : 'bicicleta';
      };

      const resolveModalitySequence = (userId) => {
        const entries = modalityOrderMap[userId] || [];
        const sorted = entries.sort((a, b) => a.timestamp - b.timestamp);
        return sorted
          .map(entry => entry.modality === 'pedestre' ? 'C' : entry.modality === 'bicicleta' ? 'B' : '-')
          .filter(value => value && value !== '-');
      };

      // Calcular pontuação e dados completos
      const topPilgrims = pilgrimsWithTrails.rows.map((p) => {
        const trails = parseInt(p.completed_trails || 0);
        const routes = parseInt(p.completed_routes || 0);
        const hours = userHoursMap[p.id] || 0;
        const fullPaths = parseInt(p.has_full_path || 0);
        const hasFullPath = fullPaths > 0;
        const distance = userDistanceMap[p.id] || routes * 22.89;
        const avgSpeed = hours > 0 ? (distance / hours) : 0;
        const modalityKey = resolveModality(p.id);
        const modality = modalityKey === 'pedestre' ? 'C' : modalityKey === 'bicicleta' ? 'B' : '-';
        const modalitySequence = resolveModalitySequence(p.id);
        
        // Nova fórmula de pontuação:
        // - 10 pontos por km percorrido
        // - 500 pontos por cada percurso (trail) completado
        // - 1000 pontos se completou o caminho completo (13 trechos)
        // - Sem bônus de velocidade
        let points = distance * 10; // 10 pontos por km
        points += trails * 500; // 500 por percurso
        if (fullPaths > 0) {
          points += fullPaths * 1000; // Bônus por percurso completo
        }
        // Sem bônus de velocidade
        
        return {
          id: p.id,
          nickname: p.nickname || p.username || 'Anônimo',
          age: p.age || 0,
          sex: p.sex === 'Male' ? 'M' : p.sex === 'Female' ? 'F' : '-',
          modality: modality,
          modalitySequence: modalitySequence,
          trails: trails,
          routes: routes,
          distance: parseFloat(distance.toFixed(2)),
          totalHours: parseFloat(hours.toFixed(1)),
          averageSpeed: parseFloat(avgSpeed.toFixed(2)),
          hasFullPath: hasFullPath,
          fullPaths: fullPaths,
          points: Math.round(points)
        };
      });

      // Ordenar por pontuação (maior primeiro)
      topPilgrims.sort((a, b) => b.points - a.points);
      
      // Atualizar ranks após ordenação
      topPilgrims.forEach((p, index) => {
        p.rank = index + 1;
      });

      // 4. CRESCIMENTO MENSAL DE CADASTROS
      const monthlySignups = await strapi.connections.default.raw(`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as month,
          COUNT(*) as signups
        FROM "users-permissions_user"
        WHERE "userType" = 'pilgrim' AND blocked = false
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY month ASC
      `);

      const monthlyData = monthlySignups.rows.map(row => ({
        month: row.month,
        signups: parseInt(row.signups)
      }));

      // 5. PERÍODO DO ANO COM MAIOR INCIDÊNCIA DE CONCLUSÕES (últimos 2 anos)
      // Gerar lista de todos os meses dos últimos 2 anos
      const startMonth = '2024-10';

      // Buscar percursos concluídos agrupados por mês e quantidade de trechos
      const completionsByRouteCount = await strapi.connections.default.raw(`
        SELECT 
          TO_CHAR(t."finishedAt", 'YYYY-MM') as month,
          (
            SELECT COUNT(DISTINCT tr.route)
            FROM trail_routes tr
            WHERE tr.trail = t.id AND tr."finishedAt" IS NOT NULL
          ) as route_count,
          COUNT(*) as completions
        FROM trails t
        WHERE t."finishedAt" IS NOT NULL
        AND TO_CHAR(t."finishedAt", 'YYYY-MM') >= ?
        GROUP BY TO_CHAR(t."finishedAt", 'YYYY-MM'), route_count
        ORDER BY month ASC, route_count ASC
      `, [startMonth]);

      // Gerar todos os meses dos últimos 2 anos
      const allMonths = [];
      const currentDate = new Date();
      const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
      const tempDate = new Date(startYear, startMonthNumber - 1, 1);
      while (tempDate <= currentDate) {
        allMonths.push(`${tempDate.getFullYear()}-${String(tempDate.getMonth() + 1).padStart(2, '0')}`);
        tempDate.setMonth(tempDate.getMonth() + 1);
      }

      // Descobrir quais quantidades de trechos existem
      const routeCountsSet = new Set();
      completionsByRouteCount.rows.forEach(r => {
        if (r.route_count > 0) {
          routeCountsSet.add(parseInt(r.route_count));
        }
      });
      const routeCounts = Array.from(routeCountsSet).sort((a, b) => a - b);

      // Mapear dados: { month -> { routeCount -> completions } }
      const dataMap = {};
      completionsByRouteCount.rows.forEach(r => {
        const month = r.month;
        const routeCount = parseInt(r.route_count);
        const completions = parseInt(r.completions);
        if (!dataMap[month]) dataMap[month] = {};
        dataMap[month][routeCount] = completions;
      });

      // Estrutura para o frontend: array de meses com dados por quantidade de trechos
      const completionsByMonth = {
        months: allMonths,
        series: routeCounts.map(count => ({
          routeCount: count,
          label: count === 13 ? 'Caminho Completo (13 trechos)' : `${count} ${count === 1 ? 'trecho' : 'trechos'}`,
          data: allMonths.map(month => (dataMap[month] && dataMap[month][count]) || 0)
        }))
      };

      // 6. TRECHOS COM MAIOR ÍNDICE DE CONCLUSÃO (13 trechos)
      const trailPartsData = await strapi.connections.default.raw(`
        SELECT id, name, distance, time, difficulty
        FROM trail_parts
        ORDER BY id ASC
        LIMIT 13
      `);

      // Buscar tempos por trecho a partir de created_at e finishedAt
      const routeTimesData = await strapi.connections.default.raw(`
        SELECT tr.route, tr."created_at", tr."finishedAt", t."user" as user_id, t.modality
        FROM trail_routes tr
        JOIN trails t ON tr.trail = t.id
        WHERE tr."finishedAt" IS NOT NULL AND tr."created_at" IS NOT NULL
      `);

      // Calcular tempo médio por trecho com peregrinos distintos
      const routeTimesMap = {};
      const routeUsersMap = {};
      const routeTimesMapPedestre = {};
      const routeUsersMapPedestre = {};
      const routeTimesMapBicicleta = {};
      const routeUsersMapBicicleta = {};
      const normalizeModality = (value) => {
        if (!value) return null;
        const normalized = String(value).toLowerCase();
        if (normalized === 'pedestre' || normalized === 'foot') return 'pedestre';
        if (normalized === 'bicicleta' || normalized === 'bike') return 'bicicleta';
        return null;
      };
      const parseTimeToHours = (value) => {
        if (!value) return null;
        const parts = String(value).split(':').map(part => Number(part));
        if (parts.length < 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
          return null;
        }
        return parts[0] + parts[1] / 60 + (parts[2] || 0) / 3600;
      };
      const getSpeedRange = (modality, difficulty) => {
        const diff = (difficulty || '').toLowerCase();
        if (modality === 'pedestre') {
          if (diff === 'easy') return { min: 6, max: 6 };
          if (diff === 'medium') return { min: 4, max: 5 };
          if (diff === 'hard') return { min: 1, max: 3 };
          return { min: 3, max: 5 };
        }

        if (diff === 'easy') return { min: 20, max: 25 };
        if (diff === 'medium') return { min: 12, max: 15 };
        if (diff === 'hard') return { min: 12, max: 13 };
        return { min: 12, max: 15 };
      };
      const deterministicFactor = (seed) => {
        const value = (seed * 9301 + 49297) % 233280;
        return value / 233280;
      };
      const computeSimulatedHours = (part, modality) => {
        const distance = part.distance ? Number(part.distance) : null;
        if (!distance || Number.isNaN(distance) || distance <= 0) {
          const timeHours = parseTimeToHours(part.time);
          return timeHours || 0;
        }

        const range = getSpeedRange(modality, part.difficulty);
        const factor = deterministicFactor(part.id || 0);
        const speed = range.min + (range.max - range.min) * factor;
        return speed > 0 ? distance / speed : 0;
      };
      for (const row of routeTimesData.rows) {
        const routeId = row.route;
        const startTime = new Date(row.created_at).getTime();
        const endTime = new Date(row.finishedAt).getTime();
        if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
          continue;
        }

        const durationHours = (endTime - startTime) / 1000 / 3600;
        if (durationHours > 0) {
          const modality = normalizeModalityForRoutes(row.modality);
          routeTimesMap[routeId] = (routeTimesMap[routeId] || 0) + durationHours;
          if (!routeUsersMap[routeId]) {
            routeUsersMap[routeId] = new Set();
          }
          routeUsersMap[routeId].add(row.user_id);

          if (modality === 'pedestre') {
            routeTimesMapPedestre[routeId] = (routeTimesMapPedestre[routeId] || 0) + durationHours;
            if (!routeUsersMapPedestre[routeId]) {
              routeUsersMapPedestre[routeId] = new Set();
            }
            routeUsersMapPedestre[routeId].add(row.user_id);
          }

          if (modality === 'bicicleta') {
            routeTimesMapBicicleta[routeId] = (routeTimesMapBicicleta[routeId] || 0) + durationHours;
            if (!routeUsersMapBicicleta[routeId]) {
              routeUsersMapBicicleta[routeId] = new Set();
            }
            routeUsersMapBicicleta[routeId].add(row.user_id);
          }
        }
      }

      const partsCompletionDataWithModalities = await Promise.all(
        trailPartsData.rows.map(async (part) => {
          // Contar quantos peregrinos completaram este trecho
          const completions = await strapi.connections.default.raw(`
            SELECT COUNT(DISTINCT t."user") as completed
            FROM trail_routes tr
            JOIN trails t ON tr.trail = t.id
            WHERE tr.route = ?
            AND tr."finishedAt" IS NOT NULL
          `, [part.id]);

          const totalTime = routeTimesMap[part.id] || 0;
          const count = routeUsersMap[part.id] ? routeUsersMap[part.id].size : 0;
          const avgTime = count > 0 ? (totalTime / count) : 0;

          const totalTimePedestre = routeTimesMapPedestre[part.id] || 0;
          const countPedestre = routeUsersMapPedestre[part.id] ? routeUsersMapPedestre[part.id].size : 0;
          const avgTimePedestre = computeSimulatedHours(part, 'pedestre');

          const totalTimeBicicleta = routeTimesMapBicicleta[part.id] || 0;
          const countBicicleta = routeUsersMapBicicleta[part.id] ? routeUsersMapBicicleta[part.id].size : 0;
          const avgTimeBicicleta = computeSimulatedHours(part, 'bicicleta');

          return {
            base: {
              id: part.id,
              name: part.name || `Trecho ${part.id}`,
              distance: part.distance,
              time: part.time,
              completions: parseInt(completions.rows[0].completed || 0),
              avgTimeHours: parseFloat(avgTime.toFixed(2))
            },
            pedestre: {
              id: part.id,
              name: part.name || `Trecho ${part.id}`,
              distance: part.distance,
              time: part.time,
              completions: countPedestre,
              avgTimeHours: parseFloat(avgTimePedestre.toFixed(2))
            },
            bicicleta: {
              id: part.id,
              name: part.name || `Trecho ${part.id}`,
              distance: part.distance,
              time: part.time,
              completions: countBicicleta,
              avgTimeHours: parseFloat(avgTimeBicicleta.toFixed(2))
            }
          };
        })
      );

      const partsCompletionData = partsCompletionDataWithModalities.map(item => item.base);
      const partsCompletionDataPedestre = partsCompletionDataWithModalities.map(item => item.pedestre);
      const partsCompletionDataBicicleta = partsCompletionDataWithModalities.map(item => item.bicicleta);

      console.log('Dashboard data retrieved successfully');

      ctx.send({
        totalPilgrims,
        malePilgrims,
        femalePilgrims,
        completedTrails,
        activeTrails,
        caminhoCompleto,
        statusCaminho,
        topPilgrims,
        monthlyData,
        completionsByMonth,
        partsCompletionData,
        partsCompletionDataPedestre,
        partsCompletionDataBicicleta
      });

    } catch (error) {
      console.error('Dashboard API Error:', error);
      ctx.send({ error: error.message, stack: error.stack }, 500);
    }
  },

};
