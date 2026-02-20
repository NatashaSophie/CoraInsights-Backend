'use strict';

const getTokenFromHeader = ctx => {
  const authHeader = ctx.request.headers.authorization;
  if (!authHeader) {
    return null;
  }

  return authHeader.replace('Bearer ', '');
};

const getUserIdFromToken = async (ctx, userType = 'UNKNOWN') => {
  if (ctx.state.user && ctx.state.user.id) {
    return ctx.state.user.id;
  }

  const token = getTokenFromHeader(ctx);
  if (!token || token.length < 10) {
    return null;
  }

  try {
    const payload = await strapi.plugins['users-permissions'].services.jwt.verify(token);
    return payload && payload.id ? payload.id : null;
  } catch (error) {
    return null;
  }
};

const getPilgrimAnalytics = async ctx => {
  try {
    const { start, end } = ctx.query;
    const userId = await getUserIdFromToken(ctx, 'PILGRIM');

    if (!userId) {
      return ctx.send({
        trails: { total: 0, active: 0, completed: 0 },
        routes: { total: 0, completed: 0, percentage: 0 },
        routeProgress: [],
        recentActivity: [],
        timeStats: { avgHours: 0, minHours: 0, maxHours: 0 },
        achievements: [],
      });
    }

    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    const allTrails = await strapi.connections.default.raw(
      `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as active,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trails
        WHERE "user" = $1
      `,
      [userId]
    );

    const trailStats = allTrails.rows[0];

    const routeStats = await strapi.connections.default.raw(
      `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trail_routes
        WHERE trail IN (SELECT id FROM trails WHERE "user" = $1)
      `,
      [userId]
    );

    const routes = routeStats.rows[0];

    const routeProgress = await strapi.connections.default.raw(
      `
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
      `,
      [userId]
    );

    const recentActivity = await strapi.connections.default.raw(
      `
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
      `,
      [userId, startDate.toISOString(), endDate.toISOString()]
    );

    const timeStats = await strapi.connections.default.raw(
      `
        SELECT 
          AVG(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as avg_hours,
          MIN(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as min_hours,
          MAX(EXTRACT(EPOCH FROM (tr."finishedAt" - tr."createdAt")) / 3600) as max_hours
        FROM trail_routes tr
        WHERE tr.trail IN (SELECT id FROM trails WHERE "user" = $1)
        AND tr."finishedAt" IS NOT NULL
      `,
      [userId]
    );

    const times = timeStats.rows[0];

    const achievements = await strapi.connections.default.raw(
      `
        SELECT id, name, description, icon
        FROM achievements
        LIMIT 10
      `
    );

    ctx.send({
      trails: {
        total: parseInt(trailStats.total, 10),
        active: parseInt(trailStats.active, 10),
        completed: parseInt(trailStats.completed, 10),
      },
      routes: {
        total: parseInt(routes.total, 10),
        completed: parseInt(routes.completed, 10),
        percentage: routes.total > 0 ? Math.round((routes.completed / routes.total) * 100) : 0,
      },
      routeProgress: routeProgress.rows.map(r => ({
        id: r.id,
        name: r.name,
        distance: r.distance,
        time: r.time,
        completions: parseInt(r.completions, 10),
      })),
      recentActivity: recentActivity.rows.map(r => ({
        date: r.date,
        completions: parseInt(r.completions, 10),
      })),
      timeStats: {
        avgHours: times && times.avg_hours ? parseFloat(times.avg_hours.toFixed(2)) : 0,
        minHours: times && times.min_hours ? parseFloat(times.min_hours.toFixed(2)) : 0,
        maxHours: times && times.max_hours ? parseFloat(times.max_hours.toFixed(2)) : 0,
      },
      achievements: achievements.rows || [],
    });
  } catch (error) {
    ctx.send({ error: error.message }, 500);
  }
};

const getManagerAnalytics = async ctx => {
  try {
    const { start, end } = ctx.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    await getUserIdFromToken(ctx, 'MANAGER');

    const userStats = await strapi.connections.default.raw(
      `
        SELECT 
          "userType",
          COUNT(*) as count
        FROM "users-permissions_user"
        WHERE blocked = false
        GROUP BY "userType"
      `
    );

    const trailStats = await strapi.connections.default.raw(
      `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as published,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as draft
        FROM trails
      `
    );

    const trails = trailStats.rows[0];

    const activity = await strapi.connections.default.raw(
      `
        SELECT 
          TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD') as date,
          COUNT(CASE WHEN tr."finishedAt" IS NOT NULL THEN 1 END) as completions
        FROM trail_routes tr
        WHERE tr."createdAt" >= $1
        AND tr."createdAt" <= $2
        GROUP BY TO_CHAR(tr."createdAt"::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `,
      [startDate.toISOString(), endDate.toISOString()]
    );

    ctx.send({
      users: userStats.rows || [],
      trails: {
        total: parseInt(trails.total, 10),
        published: parseInt(trails.published, 10),
        draft: parseInt(trails.draft, 10),
      },
      activity: activity.rows.map(r => ({
        date: r.date,
        completions: parseInt(r.completions, 10),
      })),
    });
  } catch (error) {
    ctx.send({ error: error.message }, 500);
  }
};

const getMerchantAnalytics = async ctx => {
  try {
    const { start, end, merchantId } = ctx.query;
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();

    await getUserIdFromToken(ctx, 'MERCHANT');

    const sales = await strapi.connections.default.raw(
      `
        SELECT 
          COUNT(*) as total_sales,
          SUM(amount) as total_amount
        FROM merchant_sales
        WHERE merchant = $1
        AND "createdAt" >= $2
        AND "createdAt" <= $3
      `,
      [merchantId, startDate.toISOString(), endDate.toISOString()]
    );

    const salesRow = sales.rows[0] || {};

    ctx.send({
      sales: {
        total: parseInt(salesRow.total_sales || 0, 10),
        amount: parseFloat(salesRow.total_amount || 0),
      },
    });
  } catch (error) {
    ctx.send({ error: error.message }, 500);
  }
};

module.exports = {
  getUserIdFromToken,
  getPilgrimAnalytics,
  getManagerAnalytics,
  getMerchantAnalytics,
};
