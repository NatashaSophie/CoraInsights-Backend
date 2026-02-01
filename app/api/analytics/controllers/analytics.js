/**
 * Analytics Controller
 * Fornece dados específicos para cada tipo de usuário (Peregrino, Gestor, Comerciante)
 */

module.exports = {
  /**
   * GET /api/analytics/pilgrim
   * Retorna estatísticas do peregrino logado
   */
  async getPilgrimAnalytics(ctx) {
    try {
      const { start, end } = ctx.query;
      
      // Tentar buscar usuário do token JWT no header
      let userId = ctx.state.user?.id;
      
      if (!userId && ctx.request.headers.authorization) {
        // Token está presente no header, validar manualmente
        const token = ctx.request.headers.authorization?.replace('Bearer ', '');
        console.log('[ANALYTICS-PILGRIM] Token recebido:', token ? token.substring(0, 50) + '...' : 'nenhum');
        if (token) {
          try {
            const jwt = require('jsonwebtoken');
            // Tentar múltiplos secrets possíveis
            const secrets = [
              strapi.config.get('server.admin.auth.secret'),
              strapi.config.get('server.app.keys')?.[0],
              process.env.ADMIN_JWT_SECRET,
              '7d5d7f3026d7ea4fc6b5499ed8a0c38a'
            ].filter(Boolean);
            
            let decoded = null;
            for (const secret of secrets) {
              try {
                decoded = jwt.verify(token, secret);
                console.log('[ANALYTICS-PILGRIM] Token decodificado com sucesso');
                break;
              } catch (e) {
                // Tentar próximo secret
              }
            }
            
            if (decoded) {
              userId = decoded.id;
              console.log('[ANALYTICS-PILGRIM] Usuário extraído do token:', userId);
            } else {
              console.log('[ANALYTICS-PILGRIM] Nenhum secret válido para decodificar o token');
            }
          } catch (e) {
            console.log('[ANALYTICS-PILGRIM] Erro ao decodificar token:', e.message);
            // Token inválido, continuar com usuário anônimo
          }
        }
      }

      // Se não há usuário autenticado, retornar dados vazios
      if (!userId) {
        console.log('[ANALYTICS-PILGRIM] Nenhum userId encontrado, retornando dados vazios');
        return ctx.send({
          trails: { total: 0, active: 0, completed: 0 },
          routes: { total: 0, completed: 0, percentage: 0 },
          routeProgress: [],
          recentActivity: [],
          timeStats: { avgHours: 0, minHours: 0, maxHours: 0 },
          achievements: []
        });
      }

      // Validar datas
      const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = end ? new Date(end) : new Date();

      // 1. TRILHAS DO PEREGRINO - Total, Ativas e Completadas
      const pilgrimage = await strapi.query('trails').findOne({ user: userId });
      
      const allTrails = await strapi.connections.default.raw(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as active,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trails
        WHERE "user" = $1
      `, [userId]);

      const trailStats = allTrails.rows[0];

      // 2. TRECHOS COMPLETADOS DO PEREGRINO
      const routeStats = await strapi.connections.default.raw(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trail_routes
        WHERE trail IN (SELECT id FROM trails WHERE "user" = $1)
      `, [userId]);

      const routes = routeStats.rows[0];

      // 3. PROGRESSO POR TRECHO
      const routeProgress = await strapi.connections.default.raw(`
        SELECT 
          tp.id,
          tp.name,
          tp.distance,
          tp.time,
          COUNT(DISTINCT tr.id) as completions
        FROM trail_parts tp
        LEFT JOIN trail_routes tr ON tr.route = tp.id 
          AND tr.trail IN (SELECT id FROM trails WHERE "user" = $1)
          AND tr."finishedAt" IS NOT NULL
        GROUP BY tp.id, tp.name, tp.distance, tp.time
        ORDER BY tp.id ASC
      `, [userId]);

      // 4. ATIVIDADE RECENTE (últimos 30 dias)
      const recentActivity = await strapi.connections.default.raw(`
        SELECT 
          TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD') as date,
          COUNT(*) as completions
        FROM trail_routes tr
        WHERE tr.trail IN (SELECT id FROM trails WHERE "user" = $1)
        AND tr."finishedAt" IS NOT NULL
        AND tr."finishedAt" >= $2
        AND tr."finishedAt" <= $3
        GROUP BY TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [userId, startDate.toISOString(), endDate.toISOString()]);

      // 5. ESTATÍSTICAS DE TEMPO
      const timeStats = await strapi.connections.default.raw(`
        SELECT 
          AVG(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as avg_hours,
          MIN(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as min_hours,
          MAX(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as max_hours
        FROM trail_routes tr
        WHERE tr.trail IN (SELECT id FROM trails WHERE "user" = $1)
        AND tr."finishedAt" IS NOT NULL
      `, [userId]);

      const times = timeStats.rows[0];

      // 6. CONQUISTAS/BADGES
      const achievements = await strapi.connections.default.raw(`
        SELECT id, name, description, icon
        FROM achievements
        LIMIT 10
      `);

      ctx.send({
        trails: {
          total: parseInt(trailStats.total),
          active: parseInt(trailStats.active),
          completed: parseInt(trailStats.completed)
        },
        routes: {
          total: parseInt(routes.total),
          completed: parseInt(routes.completed),
          percentage: routes.total > 0 ? Math.round((routes.completed / routes.total) * 100) : 0
        },
        routeProgress: routeProgress.rows.map(r => ({
          id: r.id,
          name: r.name,
          distance: r.distance,
          time: r.time,
          completions: parseInt(r.completions)
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

      // Validar token (mesmo que manager tenha acesso a dados agregados)
      let userId = ctx.state.user?.id;
      if (!userId && ctx.request.headers.authorization) {
        const token = ctx.request.headers.authorization?.replace('Bearer ', '');
        console.log('[ANALYTICS-MANAGER] Token recebido:', token ? token.substring(0, 50) + '...' : 'nenhum');
        if (token) {
          try {
            const jwt = require('jsonwebtoken');
            const secrets = [
              strapi.config.get('server.admin.auth.secret'),
              strapi.config.get('server.app.keys')?.[0],
              process.env.ADMIN_JWT_SECRET,
              '7d5d7f3026d7ea4fc6b5499ed8a0c38a'
            ].filter(Boolean);
            
            let decoded = null;
            for (const secret of secrets) {
              try {
                decoded = jwt.verify(token, secret);
                console.log('[ANALYTICS-MANAGER] Token decodificado com sucesso');
                break;
              } catch (e) {
                // Tentar próximo secret
              }
            }
            
            if (decoded) {
              userId = decoded.id;
              console.log('[ANALYTICS-MANAGER] Usuário extraído do token:', userId);
            } else {
              console.log('[ANALYTICS-MANAGER] Nenhum secret válido para decodificar o token');
            }
          } catch (e) {
            console.log('[ANALYTICS-MANAGER] Erro ao decodificar token:', e.message);
          }
        }
      }

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
          TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD') as date,
          COUNT(CASE WHEN tr."finishedAt" IS NOT NULL THEN 1 END) as completions
        FROM trail_routes tr
        WHERE tr."createdAt" >= $1
        AND tr."createdAt" <= $2
        GROUP BY TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD')
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

      // Validar token
      let userId = ctx.state.user?.id;
      if (!userId && ctx.request.headers.authorization) {
        const token = ctx.request.headers.authorization?.replace('Bearer ', '');
        console.log('[ANALYTICS-MERCHANT] Token recebido:', token ? token.substring(0, 50) + '...' : 'nenhum');
        if (token) {
          try {
            const jwt = require('jsonwebtoken');
            const secrets = [
              strapi.config.get('server.admin.auth.secret'),
              strapi.config.get('server.app.keys')?.[0],
              process.env.ADMIN_JWT_SECRET,
              '7d5d7f3026d7ea4fc6b5499ed8a0c38a'
            ].filter(Boolean);
            
            let decoded = null;
            for (const secret of secrets) {
              try {
                decoded = jwt.verify(token, secret);
                console.log('[ANALYTICS-MERCHANT] Token decodificado com sucesso');
                break;
              } catch (e) {
                // Tentar próximo secret
              }
            }
            
            if (decoded) {
              userId = decoded.id;
              console.log('[ANALYTICS-MERCHANT] Usuário extraído do token:', userId);
            } else {
              console.log('[ANALYTICS-MERCHANT] Nenhum secret válido para decodificar o token');
            }
          } catch (e) {
            console.log('[ANALYTICS-MERCHANT] Erro ao decodificar token:', e.message);
          }
        }
      }
      const userId = ctx.state.user?.id;

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
          COUNT(DISTINCT CASE WHEN cp."createdAt" >= $1 THEN cp."user" END) as recent_visitors
        FROM checkpoints cp
        WHERE cp.establishment = $2
      `, [startDate.toISOString(), merchantId]);

      const visitors = visitorsData.rows[0];

      // 3. ATIVIDADE (visitantes por dia)
      const activityData = await strapi.connections.default.raw(`
        SELECT 
          TO_CHAR(cp."createdAt"::date, 'YYYY-MM-DD') as date,
          COUNT(*) as visits
        FROM checkpoints cp
        WHERE cp.establishment = $1
        AND cp."createdAt" >= $2
        AND cp."createdAt" <= $3
        GROUP BY TO_CHAR(cp."createdAt"::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `, [merchantId, startDate.toISOString(), endDate.toISOString()]);

      // 4. HORÁRIOS DE PICO
      const peakHours = await strapi.connections.default.raw(`
        SELECT 
          EXTRACT(HOUR FROM cp."createdAt") as hour,
          COUNT(*) as visits
        FROM checkpoints cp
        WHERE cp.establishment = $1
        AND cp."createdAt" >= $2
        AND cp."createdAt" <= $3
        GROUP BY EXTRACT(HOUR FROM cp."createdAt")
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
