module.exports = {
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
            COUNT(DISTINCT tr.route) as routes_completed
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
          MAX(CASE WHEN (
            SELECT COUNT(DISTINCT tr2.route) 
            FROM trail_routes tr2 
            WHERE tr2.trail = t.id AND tr2."finishedAt" IS NOT NULL
          ) = 13 THEN 1 ELSE 0 END) as has_full_path
        FROM "users-permissions_user" u
        LEFT JOIN trails t ON t."user" = u.id
        LEFT JOIN trail_routes tr ON tr.trail = t.id
        WHERE u."userType" = 'pilgrim' AND u.blocked = false
        GROUP BY u.id, u.username, u.nickname, u.name, u.sex, u.birthdate
        HAVING COUNT(DISTINCT t.id) > 0
      `);

      // Buscar os tempos de cada peregrino a partir do trackedPath
      const pilgrimTimes = await strapi.connections.default.raw(`
        SELECT 
          t."user" as user_id,
          tr."trackedPath"
        FROM trail_routes tr
        JOIN trails t ON tr.trail = t.id
        WHERE tr."finishedAt" IS NOT NULL AND tr."trackedPath" IS NOT NULL
      `);

      // Calcular tempo total por usuário a partir dos timestamps do trackedPath
      const userHoursMap = {};
      for (const row of pilgrimTimes.rows) {
        const userId = row.user_id;
        const path = row.trackedPath;
        if (path && path.length >= 2) {
          const startTime = path[0]?.timestamp || 0;
          const endTime = path[path.length - 1]?.timestamp || 0;
          const durationHours = (endTime - startTime) / 1000 / 3600;
          if (durationHours > 0 && durationHours < 24) { // Filtrar durações razoáveis (menos de 24h por trecho)
            userHoursMap[userId] = (userHoursMap[userId] || 0) + durationHours;
          }
        }
      }

      // Calcular pontuação e dados completos
      const topPilgrims = pilgrimsWithTrails.rows.map((p) => {
        const trails = parseInt(p.completed_trails || 0);
        const routes = parseInt(p.completed_routes || 0);
        const hours = userHoursMap[p.id] || 0;
        const hasFullPath = parseInt(p.has_full_path || 0) === 1;
        const distance = routes * 22.89; // Distância média por trecho (297.6km / 13 trechos)
        const avgSpeed = hours > 0 ? (distance / hours) : 0;
        
        // Nova fórmula de pontuação:
        // - 10 pontos por km percorrido
        // - 1000 pontos de bônus se velocidade média entre 4 e 6 km/h (caminhada saudável)
        // - 500 pontos por cada percurso (trail) completado
        // - 1000 pontos se completou o caminho completo (13 trechos)
        let points = distance * 10; // 10 pontos por km
        if (avgSpeed >= 4 && avgSpeed <= 6) {
          points += 1000; // Bônus velocidade ideal
        }
        points += trails * 500; // 500 por percurso
        if (hasFullPath) {
          points += 1000; // Bônus caminho completo
        }
        
        return {
          id: p.id,
          nickname: p.nickname || p.username || 'Anônimo',
          age: p.age || 0,
          sex: p.sex === 'Male' ? 'M' : p.sex === 'Female' ? 'F' : '-',
          trails: trails,
          routes: routes,
          distance: parseFloat(distance.toFixed(2)),
          totalHours: parseFloat(hours.toFixed(1)),
          averageSpeed: parseFloat(avgSpeed.toFixed(2)),
          hasFullPath: hasFullPath,
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
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const startMonth = `${twoYearsAgo.getFullYear()}-${String(twoYearsAgo.getMonth() + 1).padStart(2, '0')}`;

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
      const tempDate = new Date(twoYearsAgo);
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
        SELECT id, name, distance, time
        FROM trail_parts
        ORDER BY id ASC
        LIMIT 13
      `);

      // Buscar todos os trackedPaths para calcular tempo médio por trecho
      const routeTimesData = await strapi.connections.default.raw(`
        SELECT tr.route, tr."trackedPath"
        FROM trail_routes tr
        WHERE tr."finishedAt" IS NOT NULL AND tr."trackedPath" IS NOT NULL
      `);

      // Calcular tempo médio por trecho a partir dos timestamps
      const routeTimesMap = {};
      const routeCountsMap = {};
      for (const row of routeTimesData.rows) {
        const routeId = row.route;
        const path = row.trackedPath;
        if (path && path.length >= 2) {
          const startTime = path[0]?.timestamp || 0;
          const endTime = path[path.length - 1]?.timestamp || 0;
          const durationHours = (endTime - startTime) / 1000 / 3600;
          if (durationHours > 0 && durationHours < 24) { // Filtrar durações razoáveis
            routeTimesMap[routeId] = (routeTimesMap[routeId] || 0) + durationHours;
            routeCountsMap[routeId] = (routeCountsMap[routeId] || 0) + 1;
          }
        }
      }

      const partsCompletionData = await Promise.all(
        trailPartsData.rows.map(async (part) => {
          // Contar quantos peregrinos completaram este trecho
          const completions = await strapi.connections.default.raw(`
            SELECT COUNT(DISTINCT tr.id) as completed
            FROM trail_routes tr
            WHERE tr.route = ?
            AND tr."finishedAt" IS NOT NULL
          `, [part.id]);

          const totalTime = routeTimesMap[part.id] || 0;
          const count = routeCountsMap[part.id] || 0;
          const avgTime = count > 0 ? (totalTime / count) : 0;

          return {
            id: part.id,
            name: part.name || `Trecho ${part.id}`,
            distance: part.distance,
            time: part.time,
            completions: parseInt(completions.rows[0].completed || 0),
            avgTimeHours: parseFloat(avgTime.toFixed(2))
          };
        })
      );

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
        partsCompletionData
      });

    } catch (error) {
      console.error('Dashboard API Error:', error);
      ctx.send({ error: error.message, stack: error.stack }, 500);
    }
  },

  async login(ctx) {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      ctx.badRequest('identifier and password are required');
      return;
    }

    try {
      console.log('Login attempt for:', identifier);
      
      // Tentar buscar usuário no banco via query raw
      let user = null;
      
      try {
        // Método 1: Query raw direto no banco
        const result = await strapi.db.connection.raw(
          'SELECT id, email, username, password, role FROM up_users WHERE email = ? LIMIT 1',
          [identifier]
        );
        
        user = result.rows && result.rows.length > 0 ? result.rows[0] : result[0];
        console.log('User found:', user);
      } catch (e) {
        console.log('Raw query failed:', e.message);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      if (!user) {
        console.log('No user found for:', identifier);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      // Validar senha (comparação simples)
      if (user.password !== password) {
        console.log('Invalid password for:', identifier);
        ctx.unauthorized('Invalid credentials');
        return;
      }

      console.log('Login successful for:', identifier);

      // Retornar dados do usuário
      ctx.send({
        jwt: 'mock-jwt-token-' + user.id,
        user: {
          id: user.id,
          email: user.email,
          username: user.username || user.email,
          role: {
            type: user.role || 'user'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      ctx.internalServerError('Failed to login');
    }
  },

  async validate(ctx) {
    // Validate a JWT token
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      ctx.unauthorized('No token provided');
      return;
    }

    // Para setup mock, apenas verifica se começa com o prefixo esperado
    if (token && token.startsWith('mock-jwt-token')) {
      ctx.send({ valid: true });
    } else {
      ctx.unauthorized('Invalid token');
    }
  }
};
