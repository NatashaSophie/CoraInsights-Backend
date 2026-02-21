/**
 * Analytics Controller
 * Fornece dados específicos para cada tipo de usuário (Peregrino, Gestor, Comerciante)
 */

module.exports = {
  /**
   * Método helper para validar e extrair userId do token JWT
   * @param {Object} ctx - Contexto Strapi
   * @param {String} userType - Tipo de usuário para logs (PILGRIM, MANAGER, MERCHANT)
   * @returns {Number|null} - userId ou null se não validado
   */
  async getUserIdFromToken(ctx, userType = 'UNKNOWN') {
    // Tentar buscar usuário já autenticado
    let userId = ctx.state.user?.id;
    if (userId) {
      console.log(`[ANALYTICS-${userType}] UserId obtido do ctx.state:`, userId);
      return userId;
    }

    // Token no header Authorization
    if (!ctx.request.headers.authorization) {
      console.log(`[ANALYTICS-${userType}] Nenhum header Authorization encontrado`);
      return null;
    }

    const authHeader = ctx.request.headers.authorization;
    const token = authHeader?.replace('Bearer ', '');

    console.log(
      `[ANALYTICS-${userType}] Auth header:`,
      authHeader ? authHeader.substring(0, 100) + '...' : 'nenhum'
    );
    console.log(
      `[ANALYTICS-${userType}] Token recebido:`,
      token ? token.substring(0, 100) + '...' : 'nenhum'
    );

    if (!token || token.length < 10) {
      console.log(`[ANALYTICS-${userType}] Token muito curto ou vazio`);
      return null;
    }

    try {
      const jwt = require('jsonwebtoken');
      const secrets = [
        strapi.config.get('server.admin.auth.secret'),
        strapi.config.get('server.app.keys')?.[0],
        process.env.ADMIN_JWT_SECRET,
        '7d5d7f3026d7ea4fc6b5499ed8a0c38a'
      ].filter(Boolean);

      console.log(`[ANALYTICS-${userType}] Tentando decodificar com ${secrets.length} secrets`);

      let decoded = null;
      for (const secret of secrets) {
        try {
          decoded = jwt.verify(token, secret);
          console.log(`[ANALYTICS-${userType}] Token decodificado com sucesso`);
          break;
        } catch (e) {
          // Tentar próximo secret
          console.log(`[ANALYTICS-${userType}] Secret falhou, tentando próximo...`);
        }
      }

      if (decoded) {
        userId = decoded.id;
        console.log(`[ANALYTICS-${userType}] UserId extraído do token:`, userId);
        return userId;
      } else {
        console.log(`[ANALYTICS-${userType}] Nenhum secret válido para decodificar o token`);
        return null;
      }
    } catch (e) {
      console.log(`[ANALYTICS-${userType}] Erro ao decodificar token:`, e.message);
      return null;
    }
  },

  /**
   * GET /api/analytics/pilgrim
   * Retorna estatísticas do peregrino logado
   */
  async getPilgrimAnalytics(ctx) {
    try {
      const { start, end } = ctx.query;

      // Validar token e extrair userId
      const userId = await this.getUserIdFromToken(ctx, 'PILGRIM');
      const userIdValue = Number(userId);

      // Se não há usuário autenticado, retornar dados vazios
      if (!userId || !Number.isFinite(userIdValue)) {
        console.log('[ANALYTICS-PILGRIM] Nenhum userId encontrado, retornando dados vazios');
        return ctx.send({
          trails: { total: 0, active: 0, completed: 0 },
          routes: { total: 0, completed: 0, percentage: 0 },
          routeProgress: [],
          trailParts: [],
          allCheckpoints: [],
          timePerRoute: [],
          timePerRouteByModality: [],
          recentActivity: [],
          timeStats: { avgHours: 0, minHours: 0, maxHours: 0 },
          speedStats: { avgKmh: 0 },
          fullPathCompletions: 0,
          completedTrailsByModality: { foot: 0, bike: 0 },
          completedTrailsByDirection: { correct: 0, inverse: 0 },
          inProgressRoute: { hasActive: false },
          achievements: []
        });
      }

      // Validar datas
      const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end) : new Date();
      const escapeLiteral = value => String(value).replace(/'/g, "''");
      const startIso = escapeLiteral(startDate.toISOString());
      const endIso = escapeLiteral(endDate.toISOString());

      // 1. TRILHAS DO PEREGRINO - Total, Ativas e Completadas
      const pilgrimage = await strapi.query('trails').findOne({ user: userId });

      const allTrails = await strapi.connections.default.raw(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as active,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trails
        WHERE "user" = ${userIdValue}
      `);

      const trailStats = allTrails.rows[0];

      // 2. TOTAL DE TRECHOS (fixo em 13)
      const totalParts = 13;

      // 3. TRECHOS COMPLETADOS (total do usuario)
      const routeStats = await strapi.connections.default.raw(`
        SELECT
          COUNT(*) as completed
        FROM trail_routes
        WHERE trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
          AND "finishedAt" IS NOT NULL
      `);

      const routes = routeStats.rows[0];

      // 5. PROGRESSO POR TRECHO
      const routeProgress = await strapi.connections.default.raw(`
        SELECT
          tp.id,
          tp.name,
          tp.distance,
          tp.time,
          COUNT(DISTINCT tr.id) as completions
        FROM trail_parts tp
        LEFT JOIN trail_routes tr ON tr.route = tp.id
          AND tr.trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
          AND tr."finishedAt" IS NOT NULL
        GROUP BY tp.id, tp.name, tp.distance, tp.time
        ORDER BY tp.id ASC
      `);

      const trailPartsWithCheckpoints = await strapi.connections.default.raw(`
        SELECT
          tp.id as part_id,
          tp.name as part_name,
          cp_from.id as from_checkpoint_id,
          cp_from.name as from_checkpoint_name,
          loc_from.x as from_checkpoint_x,
          loc_from.y as from_checkpoint_y,
          cp_to.id as to_checkpoint_id,
          cp_to.name as to_checkpoint_name,
          loc_to.x as to_checkpoint_x,
          loc_to.y as to_checkpoint_y
        FROM trail_parts tp
        LEFT JOIN checkpoints cp_from ON tp."fromCheckpoint" = cp_from.id
        LEFT JOIN checkpoints_components cc_from
          ON cp_from.id = cc_from.checkpoint_id
          AND cc_from.component_type = 'components_general_locations'
        LEFT JOIN components_general_locations loc_from ON cc_from.component_id = loc_from.id
        LEFT JOIN checkpoints cp_to ON tp."toCheckpoint" = cp_to.id
        LEFT JOIN checkpoints_components cc_to
          ON cp_to.id = cc_to.checkpoint_id
          AND cc_to.component_type = 'components_general_locations'
        LEFT JOIN components_general_locations loc_to ON cc_to.component_id = loc_to.id
        ORDER BY tp.id ASC
      `);

      const allCheckpointsResult = await strapi.connections.default.raw(`
        SELECT
          cp.id as checkpoint_id,
          cp.name as checkpoint_name,
          loc.x as checkpoint_x,
          loc.y as checkpoint_y
        FROM checkpoints cp
        LEFT JOIN checkpoints_components cc
          ON cp.id = cc.checkpoint_id
          AND cc.component_type = 'components_general_locations'
        LEFT JOIN components_general_locations loc ON cc.component_id = loc.id
        ORDER BY cp.id ASC
      `);

      const utmToLatLon = (x, y) => {
        const xRef = 734787;
        const yRef = 8238207;
        const latRef = -15.9255;
        const lonRef = -48.8104;
        const metrosPorGrauLat = 111320;
        const metrosPorGrauLon = 107550;
        const deltaX = x - xRef;
        const deltaY = y - yRef;
        return {
          lat: latRef + (deltaY / metrosPorGrauLat),
          lon: lonRef + (deltaX / metrosPorGrauLon)
        };
      };

      const END_GRACE_MINUTES = 30;
      const normalizeTrailModality = value => {
        const raw = String(value || '').toLowerCase().trim();
        if (raw === 'bicicleta' || raw === 'bike' || raw === 'pedal') {
          return 'bike';
        }
        if (raw === 'pedestre' || raw === 'foot' || raw === 'pe') {
          return 'foot';
        }
        return null;
      };

      const toWindowTime = (day, hourFloat) => {
        const hours = Math.floor(hourFloat);
        const minutes = Math.round((hourFloat - hours) * 60);
        const d = new Date(day);
        d.setHours(hours, minutes, 0, 0);
        return d;
      };

      const getActiveHours = (start, end) => {
        const startDate = new Date(start);
        const endDate = new Date(end);
        if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
          return 0;
        }
        if (endDate <= startDate) {
          return 0;
        }

        let totalMs = 0;
        const dayCursor = new Date(startDate);
        dayCursor.setHours(0, 0, 0, 0);
        const endDay = new Date(endDate);
        endDay.setHours(0, 0, 0, 0);

        const afternoonEnd = 19 + END_GRACE_MINUTES / 60;

        while (dayCursor <= endDay) {
          const morningStart = toWindowTime(dayCursor, 6);
          const morningEnd = toWindowTime(dayCursor, 11);
          const afternoonStart = toWindowTime(dayCursor, 13);
          const afternoonEndTime = toWindowTime(dayCursor, afternoonEnd);

          const ranges = [
            [morningStart, morningEnd],
            [afternoonStart, afternoonEndTime]
          ];

          ranges.forEach(([winStart, winEnd]) => {
            const overlapStart = new Date(Math.max(winStart.getTime(), startDate.getTime()));
            const overlapEnd = new Date(Math.min(winEnd.getTime(), endDate.getTime()));
            if (overlapEnd > overlapStart) {
              totalMs += overlapEnd.getTime() - overlapStart.getTime();
            }
          });

          dayCursor.setDate(dayCursor.getDate() + 1);
        }

        return totalMs / (1000 * 60 * 60);
      };

      const routeTimesResult = await strapi.connections.default.raw(`
        SELECT
          tp.id,
          tp.name,
          tp.distance,
          tp.difficulty,
          tr.created_at,
          tr."finishedAt",
          t.modality
        FROM trail_parts tp
        LEFT JOIN trail_routes tr ON tr.route = tp.id
          AND tr.trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
          AND tr."finishedAt" IS NOT NULL
          AND tr.created_at IS NOT NULL
          AND tr."finishedAt" > tr.created_at
        LEFT JOIN trails t ON tr.trail = t.id
        ORDER BY tp.id ASC
      `);

      const routePartsMap = new Map();
      const allRouteHours = [];
      let totalDistance = 0;
      let totalHours = 0;
      let totalDurationHours = 0;

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

      const getSpeedRange = (modality, difficulty) => {
        const normalized = normalizeDifficulty(difficulty);
        const isBike = normalizeTrailModality(modality) === 'bike';

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

      routeTimesResult.rows.forEach(row => {
        if (!routePartsMap.has(row.id)) {
          routePartsMap.set(row.id, {
            id: row.id,
            name: row.name,
            all: [],
            walk: [],
            bike: []
          });
        }

        if (!row.created_at || !row.finishedAt) {
          return;
        }

        const distance = Number(row.distance || 0);
        const [minSpeed, maxSpeed] = getSpeedRange(row.modality, row.difficulty);
        const avgSpeed = (minSpeed + maxSpeed) / 2;
        const expectedHours = distance > 0 && avgSpeed > 0 ? distance / avgSpeed : 0;
        const activeHours = getActiveHours(row.created_at, row.finishedAt);
        const hours = expectedHours > 0 ? expectedHours : activeHours;
        if (hours <= 0) {
          return;
        }

        const entry = routePartsMap.get(row.id);
        entry.all.push(hours);

        const modality = normalizeTrailModality(row.modality);
        if (modality === 'foot') {
          entry.walk.push(hours);
        } else if (modality === 'bike') {
          entry.bike.push(hours);
        }

        allRouteHours.push(hours);
        if (row.distance) {
          const dist = Number(row.distance) || 0;
          totalDistance += dist;
          totalHours += hours;

          const startTime = new Date(row.created_at).getTime();
          const endTime = new Date(row.finishedAt).getTime();
          const durationHours = (!Number.isNaN(startTime) && !Number.isNaN(endTime) && endTime > startTime)
            ? (endTime - startTime) / 1000 / 3600
            : 0;
          if (durationHours > 0) {
            totalDurationHours += durationHours;
          }
        }
      });

      const average = list => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0);

      const timePerRoute = Array.from(routePartsMap.values())
        .sort((a, b) => a.id - b.id)
        .map(part => ({
          id: part.id,
          name: part.name,
          avgHours: average(part.all)
        }));

      const timePerRouteByModality = Array.from(routePartsMap.values())
        .sort((a, b) => a.id - b.id)
        .map(part => ({
          id: part.id,
          name: part.name,
          avgWalkHours: average(part.walk),
          avgBikeHours: average(part.bike)
        }));

      // 6. ATIVIDADE RECENTE (últimos 30 dias)
      const recentActivity = await strapi.connections.default.raw(`
        SELECT
          TO_CHAR(tr.created_at::date, 'YYYY-MM-DD') as date,
          COUNT(*) as completions
        FROM trail_routes tr
        WHERE tr.trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
        AND tr."finishedAt" IS NOT NULL
        AND tr."finishedAt" >= '${startIso}'
        AND tr."finishedAt" <= '${endIso}'
        GROUP BY TO_CHAR(tr.created_at::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `);

      // 7. ESTATÍSTICAS DE TEMPO
      const avgHours = average(allRouteHours);
      const minHours = allRouteHours.length ? Math.min(...allRouteHours) : 0;
      const maxHours = allRouteHours.length ? Math.max(...allRouteHours) : 0;
      const times = { avg_hours: avgHours, min_hours: minHours, max_hours: maxHours };

      const speeds = {
        avg_speed: totalHours > 0 ? (totalDistance / totalHours) : 0
      };

      // 8. CAMINHO COMPLETO (13 trechos) E MODALIDADES
      const fullPathCompletionsResult = await strapi.connections.default.raw(`
        SELECT COUNT(*) as total
        FROM trails t
        WHERE t."user" = ${userIdValue}
          AND t."finishedAt" IS NOT NULL
          AND (
            SELECT COUNT(*)
            FROM trail_routes tr
            WHERE tr.trail = t.id AND tr."finishedAt" IS NOT NULL
          ) >= ${totalParts}
      `);

      const completedTrailsByModalityResult = await strapi.connections.default.raw(`
        SELECT t.modality, COUNT(*) as total
        FROM trails t
        WHERE t."user" = ${userIdValue}
          AND t."finishedAt" IS NOT NULL
        GROUP BY t.modality
      `);

      const completedTrailsByDirectionResult = await strapi.connections.default.raw(`
        SELECT t."inversePaths" as inverse_paths, COUNT(*) as total
        FROM trails t
        WHERE t."user" = ${userIdValue}
          AND t."finishedAt" IS NOT NULL
        GROUP BY t."inversePaths"
      `);

      const normalizeModality = value => {
        const raw = String(value || '').toLowerCase().trim();
        if (raw === 'bicicleta' || raw === 'bike' || raw === 'pedal') {
          return 'bike';
        }
        if (raw === 'pedestre' || raw === 'foot' || raw === 'pe') {
          return 'foot';
        }
        return raw || null;
      };

      const completedTrailsByModality = completedTrailsByModalityResult.rows.reduce((acc, row) => {
        const normalized = normalizeModality(row.modality);
        if (normalized === 'bike' || normalized === 'foot') {
          acc[normalized] = parseInt(row.total, 10);
        }
        return acc;
      }, { foot: 0, bike: 0 });

      const completedTrailsByDirection = completedTrailsByDirectionResult.rows.reduce((acc, row) => {
        const isInverse = row.inverse_paths === true || row.inverse_paths === 'true' || row.inverse_paths === 1;
        if (isInverse) {
          acc.inverse = parseInt(row.total, 10);
        } else {
          acc.correct = parseInt(row.total, 10);
        }
        return acc;
      }, { correct: 0, inverse: 0 });

      // 9. PERCURSO EM ANDAMENTO (trecho atual)
      const inProgressRouteResult = await strapi.connections.default.raw(`
        SELECT tr.id, tr.route, tr.trail, tr.created_at, tp.name
        FROM trail_routes tr
        LEFT JOIN trail_parts tp ON tp.id = tr.route
        WHERE tr.trail IN (
          SELECT id FROM trails WHERE "user" = ${userIdValue} AND "finishedAt" IS NULL
        )
        AND tr."finishedAt" IS NULL
        ORDER BY tr.created_at DESC
        LIMIT 1
      `);

      const inProgressRoute = inProgressRouteResult.rows[0];

      // 10. CONQUISTAS/BADGES
      let achievements = { rows: [] };
      try {
        achievements = await strapi.connections.default.raw(`
          SELECT id, name, description, icon
          FROM achievements
          LIMIT 10
        `);
      } catch (e) {
        achievements = { rows: [] };
      }

      ctx.send({
        trails: {
          total: parseInt(trailStats.total),
          active: parseInt(trailStats.active),
          completed: parseInt(trailStats.completed)
        },
        routes: {
          total: totalParts,
          completed: parseInt(routes.completed || 0, 10),
          percentage: totalParts > 0 ? Math.round((parseInt(routes.completed || 0, 10) / totalParts) * 100) : 0
        },
        routeProgress: routeProgress.rows.map(r => ({
          id: r.id,
          name: r.name,
          distance: r.distance,
          time: r.time,
          completions: parseInt(r.completions)
        })),
        trailParts: trailPartsWithCheckpoints.rows.map(row => {
          const hasFromCoords = Number.isFinite(row.from_checkpoint_x) && Number.isFinite(row.from_checkpoint_y);
          const fromCoords = hasFromCoords ? utmToLatLon(row.from_checkpoint_x, row.from_checkpoint_y) : null;
          const hasToCoords = Number.isFinite(row.to_checkpoint_x) && Number.isFinite(row.to_checkpoint_y);
          const toCoords = hasToCoords ? utmToLatLon(row.to_checkpoint_x, row.to_checkpoint_y) : null;
          return {
            id: row.part_id,
            name: row.part_name,
            fromCheckpoint: row.from_checkpoint_id
              ? {
                  id: row.from_checkpoint_id,
                  name: row.from_checkpoint_name,
                  x: row.from_checkpoint_x,
                  y: row.from_checkpoint_y,
                  lat: fromCoords ? fromCoords.lat : null,
                  lon: fromCoords ? fromCoords.lon : null
                }
              : null,
            toCheckpoint: row.to_checkpoint_id
              ? {
                  id: row.to_checkpoint_id,
                  name: row.to_checkpoint_name,
                  x: row.to_checkpoint_x,
                  y: row.to_checkpoint_y,
                  lat: toCoords ? toCoords.lat : null,
                  lon: toCoords ? toCoords.lon : null
                }
              : null
          };
        }),
        allCheckpoints: allCheckpointsResult.rows
          .filter(row => Number.isFinite(row.checkpoint_x) && Number.isFinite(row.checkpoint_y))
          .map(row => {
            const coords = utmToLatLon(row.checkpoint_x, row.checkpoint_y);
            return {
              id: row.checkpoint_id,
              name: row.checkpoint_name,
              x: row.checkpoint_x,
              y: row.checkpoint_y,
              lat: coords.lat,
              lon: coords.lon
            };
          }),
        timePerRoute: (timePerRoute || []).map(r => ({
          id: r.id,
          name: r.name,
          avgHours: r.avgHours ? parseFloat(r.avgHours.toFixed(2)) : 0
        })),
        timePerRouteByModality: (timePerRouteByModality || []).map(r => ({
          id: r.id,
          name: r.name,
          avgWalkHours: r.avgWalkHours ? parseFloat(r.avgWalkHours.toFixed(2)) : 0,
          avgBikeHours: r.avgBikeHours ? parseFloat(r.avgBikeHours.toFixed(2)) : 0
        })),
        recentActivity: recentActivity.rows.map(r => ({
          date: r.date,
          completions: parseInt(r.completions)
        })),
        timeStats: {
          avgHours: times?.avg_hours ? parseFloat(times.avg_hours.toFixed(2)) : 0,
          minHours: times?.min_hours ? parseFloat(times.min_hours.toFixed(2)) : 0,
          maxHours: times?.max_hours ? parseFloat(times.max_hours.toFixed(2)) : 0
        },
        speedStats: {
          avgKmh: speeds?.avg_speed ? parseFloat(speeds.avg_speed.toFixed(2)) : 0
        },
        debugSpeed: {
          totalDistance,
          totalHours,
          totalDurationHours,
          avgSpeed: speeds?.avg_speed ? parseFloat(speeds.avg_speed.toFixed(4)) : 0
        },
        fullPathCompletions: parseInt(fullPathCompletionsResult.rows[0]?.total || 0, 10),
        completedTrailsByModality,
        completedTrailsByDirection,
        inProgressRoute: inProgressRoute
          ? {
              hasActive: true,
              routeId: inProgressRoute.route,
              routeName: inProgressRoute.name || null,
              trailId: inProgressRoute.trail
            }
          : { hasActive: false },
        achievements: achievements.rows || []
      });

    } catch (error) {
      console.error('Erro em getPilgrimAnalytics:', error);
      ctx.send({ error: error.message }, 500);
    }
  },

  /**
   * GET /api/analytics/manager
   * Retorna estatísticas para gestor (dashboard de gerenciamento)
   */
  async getManagerAnalytics(ctx) {
    try {
      const { start, end } = ctx.query;

      // Validar token e extrair userId
      const userId = await this.getUserIdFromToken(ctx, 'MANAGER');

      // Validar datas
      const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end) : new Date();

      // 1. TOTAL DE USUÁRIOS (por tipo)
      const userStats = await strapi.connections.default.raw(`
        SELECT
          "userType",
          COUNT(*) as count
        FROM "users-permissions_user"
        WHERE blocked = false
        GROUP BY "userType"
      `);

      // 2. TRILHAS (total, publicadas, rascunhos)
      const trailStats = await strapi.connections.default.raw(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as published,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as draft
        FROM trails
      `);

      const trails = trailStats.rows[0];

      // 3. ATIVIDADE RECENTE (cadastros/conclusões)
      const activity = await strapi.connections.default.raw(`
        SELECT
          TO_CHAR(tr.created_at::date, 'YYYY-MM-DD') as date,
          COUNT(CASE WHEN tr."finishedAt" IS NOT NULL THEN 1 END) as completions
        FROM trail_routes tr
        WHERE tr.created_at >= ?
        AND tr.created_at <= ?
        GROUP BY TO_CHAR(tr.created_at::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [startDate.toISOString(), endDate.toISOString()]);

      // 4. TOP TRILHAS (mais populares)
      const topTrails = await strapi.connections.default.raw(`
        SELECT
          t.id,
          t.name,
          COUNT(DISTINCT tr.id) as route_completions,
          COUNT(DISTINCT t.user) as unique_pilgrims
        FROM trails t
        LEFT JOIN trail_routes tr ON tr.trail = t.id AND tr."finishedAt" IS NOT NULL
        GROUP BY t.id, t.name
        ORDER BY route_completions DESC
        LIMIT 5
      `);

      // 5. TAXA DE CONCLUSÃO GERAL
      const completionRate = await strapi.connections.default.raw(`
        SELECT
          COUNT(CASE WHEN tr."finishedAt" IS NOT NULL THEN 1 END)::float /
          COUNT(*) * 100 as percentage
        FROM trail_routes tr
      `);

      const completion = completionRate.rows[0];

      // 6. PEREGRINOS ATIVOS
      const activeUsers = await strapi.connections.default.raw(`
        SELECT
          COUNT(DISTINCT t."user") as count
        FROM trails t
        WHERE t."finishedAt" IS NULL
      `);

      ctx.send({
        users: userStats.rows.map(r => ({
          type: r.userType,
          count: parseInt(r.count)
        })),
        trails: {
          total: parseInt(trails.total),
          published: parseInt(trails.published),
          draft: parseInt(trails.draft)
        },
        activity: activity.rows.map(r => ({
          date: r.date,
          completions: parseInt(r.completions)
        })),
        topTrails: topTrails.rows.map(r => ({
          id: r.id,
          name: r.name,
          completions: parseInt(r.route_completions),
          uniquePilgrims: parseInt(r.unique_pilgrims)
        })),
        completionRate: {
          percentage: completion?.percentage ? parseFloat(completion.percentage.toFixed(2)) : 0
        },
        activeUsers: {
          count: parseInt(activeUsers.rows[0]?.count || 0)
        }
      });

    } catch (error) {
      console.error('Erro em getManagerAnalytics:', error);
      ctx.send({ error: error.message }, 500);
    }
  },

  /**
   * GET /api/analytics/merchant
   * Retorna estatísticas para comerciante (estabelecimento)
   */
  async getMerchantAnalytics(ctx) {
    try {
      const { start, end, merchantId } = ctx.query;

      // Validar token e extrair userId
      const userId = await this.getUserIdFromToken(ctx, 'MERCHANT');

      if (!merchantId || !userId) {
        return ctx.badRequest('merchantId e autenticação são obrigatórios');
      }

      // Validar datas
      const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end) : new Date();

      // 1. DADOS DO ESTABELECIMENTO
      const establishment = await strapi.query('establishment').findOne({
        id: merchantId,
        user: userId
      });

      if (!establishment) {
        return ctx.forbidden('Acesso negado ao estabelecimento');
      }

      // 2. VISITANTES/CLIENTES
      const visitorsData = await strapi.connections.default.raw(`
        SELECT
          COUNT(DISTINCT cp."user") as total_visitors,
          COUNT(DISTINCT CASE WHEN cp.created_at >= ? THEN cp."user" END) as recent_visitors
        FROM checkpoints cp
        WHERE cp.establishment = ?
      `, [startDate.toISOString(), merchantId]);

      const visitors = visitorsData.rows[0];

      // 3. ATIVIDADE (visitantes por dia)
      const activityData = await strapi.connections.default.raw(`
        SELECT
          TO_CHAR(cp.created_at::date, 'YYYY-MM-DD') as date,
          COUNT(*) as visits
        FROM checkpoints cp
        WHERE cp.establishment = ?
        AND cp.created_at >= ?
        AND cp.created_at <= ?
        GROUP BY TO_CHAR(cp.created_at::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [merchantId, startDate.toISOString(), endDate.toISOString()]);

      // 4. HORÁRIOS DE PICO
      const peakHours = await strapi.connections.default.raw(`
        SELECT
          EXTRACT(HOUR FROM cp.created_at) as hour,
          COUNT(*) as visits
        FROM checkpoints cp
        WHERE cp.establishment = ?
        AND cp.created_at >= ?
        AND cp.created_at <= ?
        GROUP BY EXTRACT(HOUR FROM cp.created_at)
        ORDER BY visits DESC
        LIMIT 5
      `, [merchantId, startDate.toISOString(), endDate.toISOString()]);

      // 5. PRODUTOS/SERVIÇOS (se existir tabela)
      let services = [];
      try {
        const servicesData = await strapi.query('service').find({
          establishment: merchantId
        });
        services = servicesData || [];
      } catch (e) {
        services = [];
      }

      ctx.send({
        establishment: {
          id: establishment.id,
          name: establishment.name,
          description: establishment.description
        },
        visitors: {
          total: parseInt(visitors.total_visitors || 0),
          recent: parseInt(visitors.recent_visitors || 0)
        },
        activity: activityData.rows.map(r => ({
          date: r.date,
          visits: parseInt(r.visits)
        })),
        peakHours: peakHours.rows.map(r => ({
          hour: parseInt(r.hour),
          visits: parseInt(r.visits)
        })),
        services: services.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price
        }))
      });

    } catch (error) {
      console.error('Erro em getMerchantAnalytics:', error);
      ctx.send({ error: error.message }, 500);
    }
  }
};
