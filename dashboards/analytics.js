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
    const userIdValue = Number(userId);

    if (!userId || !Number.isFinite(userIdValue)) {
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
        achievements: [],
      });
    }

    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const escapeLiteral = value => String(value).replace(/'/g, "''");
    const startIso = escapeLiteral(startDate.toISOString());
    const endIso = escapeLiteral(endDate.toISOString());

    const allTrails = await strapi.connections.default.raw(`
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as active,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as completed
        FROM trails
        WHERE "user" = ${userIdValue}
      `);

    const trailStats = allTrails.rows[0];

    const totalParts = 13;

    const routeStats = await strapi.connections.default.raw(`
        SELECT 
          COUNT(*) as completed
        FROM trail_routes
        WHERE trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
          AND "finishedAt" IS NOT NULL
      `);

    const routes = routeStats.rows[0];

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

    const getExpectedHours = (distance, modality, difficulty) => {
      const dist = Number(distance || 0);
      if (!dist) {
        return 0;
      }
      const [minSpeed, maxSpeed] = getSpeedRange(modality, difficulty);
      const avgSpeed = (minSpeed + maxSpeed) / 2;
      return avgSpeed > 0 ? dist / avgSpeed : 0;
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
        totalDistance += Number(row.distance) || 0;
        totalHours += hours;
      }
    });

    const average = list => (list.length ? list.reduce((sum, value) => sum + value, 0) / list.length : 0);

    const routeHistoryResult = await strapi.connections.default.raw(`
        SELECT
          tr.id as trail_route_id,
          tr.route as route_id,
          tp.name as route_name,
          tp.distance,
          tp.difficulty,
          t.modality,
          t."inversePaths" as inverse_paths,
          tr.created_at,
          tr."finishedAt"
        FROM trail_routes tr
        JOIN trails t ON tr.trail = t.id
        LEFT JOIN trail_parts tp ON tp.id = tr.route
        WHERE t."user" = ${userIdValue}
        ORDER BY tr.created_at ASC
      `);

    const routeHistory = routeHistoryResult.rows.map(row => {
      const startTime = row.created_at ? new Date(row.created_at) : null;
      const endTime = row.finishedAt ? new Date(row.finishedAt) : null;
      const durationHours = (startTime && endTime && endTime > startTime)
        ? (endTime.getTime() - startTime.getTime()) / 1000 / 3600
        : 0;
      const expectedHours = getExpectedHours(row.distance, row.modality, row.difficulty);
      const hoursSpent = expectedHours > 0 ? expectedHours : durationHours;
      const distance = Number(row.distance || 0);
      const avgSpeed = hoursSpent > 0 && distance > 0 ? (distance / hoursSpent) : 0;
      const isInverse = row.inverse_paths === true || row.inverse_paths === 'true' || row.inverse_paths === 1;
      const status = row.finishedAt ? 'concluido' : 'andamento';

      return {
        id: row.trail_route_id,
        routeId: row.route_id,
        name: row.route_name,
        modality: row.modality || null,
        direction: isInverse,
        startAt: row.created_at || null,
        finishedAt: row.finishedAt || null,
        status,
        distance,
        hoursSpent,
        avgSpeed
      };
    });

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

    const avgHours = average(allRouteHours);
    const minHours = allRouteHours.length ? Math.min(...allRouteHours) : 0;
    const maxHours = allRouteHours.length ? Math.max(...allRouteHours) : 0;
    const times = { avg_hours: avgHours, min_hours: minHours, max_hours: maxHours };

    const speedStats = await strapi.connections.default.raw(`
        SELECT
          SUM(tp.distance) / NULLIF(
            SUM(EXTRACT(EPOCH FROM (tr."finishedAt" - tr.created_at)) / 3600),
            0
          ) as avg_speed
        FROM trail_routes tr
        INNER JOIN trail_parts tp ON tp.id = tr.route
        WHERE tr.trail IN (SELECT id FROM trails WHERE "user" = ${userIdValue})
          AND tr."finishedAt" IS NOT NULL
          AND tr.created_at IS NOT NULL
          AND tr."finishedAt" > tr.created_at
      `);

    const speeds = speedStats.rows[0];

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

    let achievements = { rows: [] };
    try {
      achievements = await strapi.connections.default.raw(
        `
        SELECT id, name, description, icon
        FROM achievements
        LIMIT 10
      `
      );
    } catch (e) {
      achievements = { rows: [] };
    }

    ctx.send({
      trails: {
        total: parseInt(trailStats.total, 10),
        active: parseInt(trailStats.active, 10),
        completed: parseInt(trailStats.completed, 10),
      },
      routes: {
        total: totalParts,
        completed: parseInt(routes.completed || 0, 10),
        percentage: totalParts > 0 ? Math.round((parseInt(routes.completed || 0, 10) / totalParts) * 100) : 0,
      },
      routeProgress: routeProgress.rows.map(r => ({
        id: r.id,
        name: r.name,
        distance: r.distance,
        time: r.time,
        completions: parseInt(r.completions, 10),
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
                lon: fromCoords ? fromCoords.lon : null,
              }
            : null,
          toCheckpoint: row.to_checkpoint_id
            ? {
                id: row.to_checkpoint_id,
                name: row.to_checkpoint_name,
                x: row.to_checkpoint_x,
                y: row.to_checkpoint_y,
                lat: toCoords ? toCoords.lat : null,
                lon: toCoords ? toCoords.lon : null,
              }
            : null,
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
            lon: coords.lon,
          };
        }),
      timePerRoute: (timePerRoute || []).map(r => ({
        id: r.id,
        name: r.name,
        avgHours: r.avgHours ? parseFloat(r.avgHours.toFixed(2)) : 0,
      })),
      timePerRouteByModality: (timePerRouteByModality || []).map(r => ({
        id: r.id,
        name: r.name,
        avgWalkHours: r.avgWalkHours ? parseFloat(r.avgWalkHours.toFixed(2)) : 0,
        avgBikeHours: r.avgBikeHours ? parseFloat(r.avgBikeHours.toFixed(2)) : 0,
      })),
      routeHistory: (routeHistory || []).map(row => ({
        id: row.id,
        routeId: row.routeId,
        name: row.name,
        modality: row.modality,
        startAt: row.startAt,
        finishedAt: row.finishedAt,
        status: row.status,
        distance: row.distance ? parseFloat(row.distance.toFixed(2)) : 0,
        hoursSpent: row.hoursSpent ? parseFloat(row.hoursSpent.toFixed(2)) : 0,
        avgSpeed: row.avgSpeed ? parseFloat(row.avgSpeed.toFixed(2)) : 0,
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
      speedStats: {
        avgKmh: speeds && speeds.avg_speed ? parseFloat(speeds.avg_speed.toFixed(2)) : 0,
      },
      fullPathCompletions: parseInt(fullPathCompletionsResult.rows[0]?.total || 0, 10),
      completedTrailsByModality,
      completedTrailsByDirection,
      inProgressRoute: inProgressRoute
        ? {
            hasActive: true,
            routeId: inProgressRoute.route,
            routeName: inProgressRoute.name || null,
            trailId: inProgressRoute.trail,
          }
        : { hasActive: false },
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
    const escapeLiteral = value => String(value).replace(/'/g, "''");
    const startIso = escapeLiteral(startDate.toISOString());
    const endIso = escapeLiteral(endDate.toISOString());

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

    const pilgrimStatsResult = await strapi.connections.default.raw(`
        SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN LOWER(sex) IN ('male', 'masculino') THEN 1 END) as male,
          COUNT(CASE WHEN LOWER(sex) IN ('female', 'feminino') THEN 1 END) as female,
          COUNT(CASE WHEN birthdate IS NOT NULL
            AND DATE_PART('year', AGE(birthdate)) < 30 THEN 1 END) as age_under_30,
          COUNT(CASE WHEN birthdate IS NOT NULL
            AND DATE_PART('year', AGE(birthdate)) BETWEEN 30 AND 44 THEN 1 END) as age_30_44,
          COUNT(CASE WHEN birthdate IS NOT NULL
            AND DATE_PART('year', AGE(birthdate)) BETWEEN 45 AND 59 THEN 1 END) as age_45_59,
          COUNT(CASE WHEN birthdate IS NOT NULL
            AND DATE_PART('year', AGE(birthdate)) >= 60 THEN 1 END) as age_60_plus
        FROM "users-permissions_user"
        WHERE blocked = false
        AND LOWER("userType") = 'pilgrim'
      `);

    const trailStats = await strapi.connections.default.raw(
      `
        SELECT 
          COUNT(*) as total,
          COUNT(CASE WHEN "finishedAt" IS NOT NULL THEN 1 END) as published,
          COUNT(CASE WHEN "finishedAt" IS NULL THEN 1 END) as draft
        FROM trails
      `
    );

    const directionStatsResult = await strapi.connections.default.raw(`
        SELECT
          COUNT(CASE WHEN "inversePaths" = true THEN 1 END) as inverse_count,
          COUNT(CASE WHEN "inversePaths" IS NULL OR "inversePaths" = false THEN 1 END) as direct_count
        FROM trails
      `);

    const modalityStatsResult = await strapi.connections.default.raw(`
        SELECT
          COUNT(CASE WHEN LOWER(modality) IN ('pedestre', 'foot') THEN 1 END) as foot_count,
          COUNT(CASE WHEN LOWER(modality) IN ('bicicleta', 'bike', 'pedal') THEN 1 END) as bike_count
        FROM trails
      `);

    const trails = trailStats.rows[0];
    const directionStatsRow = directionStatsResult.rows[0] || {};
    const directionStats = {
      direct: parseInt(directionStatsRow.direct_count || 0, 10),
      inverse: parseInt(directionStatsRow.inverse_count || 0, 10)
    };
    const modalityStatsRow = modalityStatsResult.rows[0] || {};
    const modalityStats = {
      foot: parseInt(modalityStatsRow.foot_count || 0, 10),
      bike: parseInt(modalityStatsRow.bike_count || 0, 10)
    };

    const activity = await strapi.connections.default.raw(`
        SELECT 
          TO_CHAR(tr.created_at::date, 'YYYY-MM-DD') as date,
          COUNT(CASE WHEN tr."finishedAt" IS NOT NULL THEN 1 END) as completions
        FROM trail_routes tr
        WHERE tr.created_at >= '${startIso}'
        AND tr.created_at <= '${endIso}'
        GROUP BY TO_CHAR(tr.created_at::date, 'YYYY-MM-DD')
        ORDER BY date ASC
      `);

    const trailPartsResult = await strapi.connections.default.raw(`
        SELECT
          tp.id as part_id,
          tp.name as part_name,
          cp_from.id as from_checkpoint_id,
          loc_from.x as from_checkpoint_x,
          loc_from.y as from_checkpoint_y,
          cp_to.id as to_checkpoint_id,
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

    const checkpointsResult = await strapi.connections.default.raw(`
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

    const trailParts = trailPartsResult.rows.map(row => ({
      id: row.part_id,
      name: row.part_name || `Trecho ${row.part_id}`,
      fromCheckpointId: row.from_checkpoint_id,
      toCheckpointId: row.to_checkpoint_id,
      from: {
        id: row.from_checkpoint_id,
        x: row.from_checkpoint_x,
        y: row.from_checkpoint_y
      },
      to: {
        id: row.to_checkpoint_id,
        x: row.to_checkpoint_x,
        y: row.to_checkpoint_y
      }
    }));

    const checkpoints = checkpointsResult.rows
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
      });

    const establishmentsResult = await strapi.connections.default.raw(`
        SELECT
          e.id,
          e.name,
          e.address,
          e.email,
          e.phone,
          e.category,
          e.description,
          e."openingHours" as opening_hours,
          e.services,
          e."isActive" as is_active,
          e."rejectionReason" as rejection_reason,
          e.owner as owner_id,
          u.username as owner_name,
          u.email as owner_email,
          e.created_at,
          loc.x as location_x,
          loc.y as location_y
        FROM establishments e
        LEFT JOIN "users-permissions_user" u ON e.owner = u.id
        LEFT JOIN establishments_components ec
          ON e.id = ec.establishment_id
          AND ec.component_type = 'components_general_locations'
        LEFT JOIN components_general_locations loc
          ON ec.component_id = loc.id
        ORDER BY e.id ASC
      `);

    const merchantsResult = await strapi.connections.default.raw(`
        SELECT id, username, email
        FROM "users-permissions_user"
        WHERE blocked = false
        AND LOWER("userType") = 'merchant'
        ORDER BY username ASC
      `);

    const distanceSquared = (ax, ay, bx, by) => {
      if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) {
        return Number.POSITIVE_INFINITY;
      }
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    };

    const establishments = establishmentsResult.rows.map(row => {
      const location = Number.isFinite(row.location_x) && Number.isFinite(row.location_y)
        ? { x: row.location_x, y: row.location_y }
        : null;
      let coords = null;
      if (location) {
        coords = utmToLatLon(location.x, location.y);
      }

      let closestPart = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      if (location) {
        trailParts.forEach(part => {
          const fromDistance = distanceSquared(location.x, location.y, part.from.x, part.from.y);
          const toDistance = distanceSquared(location.x, location.y, part.to.x, part.to.y);
          const candidateDistance = Math.min(fromDistance, toDistance);
          if (candidateDistance < closestDistance) {
            closestDistance = candidateDistance;
            closestPart = part;
          }
        });
      }

      return {
        id: row.id,
        name: row.name,
        address: row.address,
        email: row.email,
        phone: row.phone,
        category: row.category,
        description: row.description,
        openingHours: row.opening_hours,
        services: row.services,
        isActive: row.is_active,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        ownerId: row.owner_id,
        ownerName: row.owner_name,
        ownerEmail: row.owner_email,
        location,
        lat: coords ? coords.lat : null,
        lon: coords ? coords.lon : null,
        trailPartId: closestPart ? closestPart.id : null,
        trailPartName: closestPart ? closestPart.name : null
      };
    });

    const segmentsWithEstablishments = Array.from(
      new Set(establishments.map(item => item.trailPartId).filter(Boolean))
    );

    const segmentCompletionResult = await strapi.connections.default.raw(`
        SELECT
          tp.id as part_id,
          tp.name as part_name,
          t.modality as modality,
          COUNT(*) as total
        FROM trail_parts tp
        LEFT JOIN trail_routes tr ON tr.route = tp.id
          AND tr."finishedAt" IS NOT NULL
        LEFT JOIN trails t ON tr.trail = t.id
        GROUP BY tp.id, tp.name, t.modality
        ORDER BY tp.id ASC
      `);

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

    const segmentMap = new Map();
    trailParts.forEach(part => {
      segmentMap.set(part.id, {
        id: part.id,
        name: part.name,
        foot: 0,
        bike: 0,
        total: 0
      });
    });

    segmentCompletionResult.rows.forEach(row => {
      const entry = segmentMap.get(row.part_id) || {
        id: row.part_id,
        name: row.part_name || `Trecho ${row.part_id}`,
        foot: 0,
        bike: 0,
        total: 0
      };
      const modality = normalizeTrailModality(row.modality);
      const count = parseInt(row.total, 10) || 0;
      if (modality === 'foot') {
        entry.foot += count;
      } else if (modality === 'bike') {
        entry.bike += count;
      }
      segmentMap.set(entry.id, entry);
    });

    const segmentCompletions = Array.from(segmentMap.values())
      .sort((a, b) => a.id - b.id)
      .map(entry => ({
        ...entry,
        total: entry.foot + entry.bike
      }));

    const registrationResult = await strapi.connections.default.raw(`
        SELECT
          EXTRACT(YEAR FROM created_at)::int as year,
          EXTRACT(MONTH FROM created_at)::int as month,
          COUNT(*) as total
        FROM "users-permissions_user"
        WHERE blocked = false
        AND LOWER("userType") = 'pilgrim'
        GROUP BY EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)
        ORDER BY year ASC, month ASC
      `);

    const monthlyRegistrations = {};
    registrationResult.rows.forEach(row => {
      const year = String(row.year);
      if (!monthlyRegistrations[year]) {
        monthlyRegistrations[year] = Array.from({ length: 12 }, () => 0);
      }
      const monthIndex = Math.max(0, Math.min(11, Number(row.month) - 1));
      monthlyRegistrations[year][monthIndex] = parseInt(row.total, 10) || 0;
    });

    const activeRoutesResult = await strapi.connections.default.raw(`
        SELECT COUNT(*) as total
        FROM trail_routes
        WHERE "finishedAt" IS NULL
      `);

    const completedRoutesByTrail = await strapi.connections.default.raw(`
        SELECT tr.trail, tr.route, tr.created_at, t."inversePaths" as inverse_paths
        FROM trail_routes tr
        JOIN trails t ON tr.trail = t.id
        WHERE tr."finishedAt" IS NOT NULL
        ORDER BY tr.trail ASC, tr.created_at ASC
      `);

    const expectedRouteOrder = trailParts.map(part => part.id);
    const expectedReverseOrder = [...expectedRouteOrder].reverse();
    const routesByTrail = new Map();
    completedRoutesByTrail.rows.forEach(row => {
      if (!routesByTrail.has(row.trail)) {
        routesByTrail.set(row.trail, {
          routes: [],
          inverse: row.inverse_paths === true
        });
      }
      const entry = routesByTrail.get(row.trail);
      entry.routes.push(Number(row.route));
    });

    const fullPathCompletions = Array.from(routesByTrail.values()).filter(entry => {
      if (entry.routes.length !== expectedRouteOrder.length) {
        return false;
      }
      const expected = entry.inverse ? expectedReverseOrder : expectedRouteOrder;
      return expected.every((routeId, index) => entry.routes[index] === routeId);
    }).length;

    const totalCompletedRoutes = parseInt(trails.published || 0, 10);
    const completionRate = totalCompletedRoutes > 0
      ? Math.round((fullPathCompletions / totalCompletedRoutes) * 100)
      : 0;
    const activeRoutes = parseInt(activeRoutesResult.rows[0]?.total || 0, 10);

    const totalPilgrims = userStats.rows.reduce((sum, row) => {
      const isPilgrim = String(row.userType || '').toLowerCase() === 'pilgrim';
      return isPilgrim ? sum + parseInt(row.count, 10) : sum;
    }, 0);

    const pilgrimStatsRow = pilgrimStatsResult.rows[0] || {};
    const pilgrimStats = {
      total: parseInt(pilgrimStatsRow.total || 0, 10),
      male: parseInt(pilgrimStatsRow.male || 0, 10),
      female: parseInt(pilgrimStatsRow.female || 0, 10),
      ageUnder30: parseInt(pilgrimStatsRow.age_under_30 || 0, 10),
      age30To44: parseInt(pilgrimStatsRow.age_30_44 || 0, 10),
      age45To59: parseInt(pilgrimStatsRow.age_45_59 || 0, 10),
      age60Plus: parseInt(pilgrimStatsRow.age_60_plus || 0, 10)
    };

    ctx.send({
      users: userStats.rows || [],
      totalPilgrims,
      pilgrimStats,
      trails: {
        total: parseInt(trails.total, 10),
        published: parseInt(trails.published, 10),
        draft: parseInt(trails.draft, 10),
      },
      directionStats,
      modalityStats,
      activity: activity.rows.map(r => ({
        date: r.date,
        completions: parseInt(r.completions, 10),
      })),
      trailParts,
      checkpoints,
      establishments,
      merchants: merchantsResult.rows || [],
      segmentsWithEstablishments,
      segmentCompletions,
      monthlyRegistrations,
      completionStats: {
        fullPathCompletions,
        totalCompletedRoutes,
        percentage: completionRate
      },
      activeRoutes: {
        count: activeRoutes
      }
    });
  } catch (error) {
    ctx.send({ error: error.message }, 500);
  }
};

const getMerchantAnalytics = async ctx => {
  try {
    const { start, end, merchantId } = ctx.query;
    const merchantIdValue = Number(merchantId);
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    const escapeLiteral = value => String(value).replace(/'/g, "''");
    const startIso = escapeLiteral(startDate.toISOString());
    const endIso = escapeLiteral(endDate.toISOString());

    await getUserIdFromToken(ctx, 'MERCHANT');

    if (!Number.isFinite(merchantIdValue)) {
      return ctx.badRequest('merchantId inválido');
    }

    const establishmentsResult = await strapi.connections.default.raw(`
        SELECT
          e.id,
          e.name,
          e.address,
          e.email,
          e.phone,
          e.category,
          e.description,
          e."openingHours" as opening_hours,
          e.services,
          e."isActive" as is_active,
          e."rejectionReason" as rejection_reason,
          e.created_at,
          loc.x as location_x,
          loc.y as location_y
        FROM establishments e
        LEFT JOIN establishments_components ec
          ON e.id = ec.establishment_id
          AND ec.component_type = 'components_general_locations'
        LEFT JOIN components_general_locations loc
          ON ec.component_id = loc.id
        WHERE e.owner = ${merchantIdValue}
        ORDER BY e.id ASC
      `);

    const trailPartsResult = await strapi.connections.default.raw(`
        SELECT
          tp.id as part_id,
          tp.name as part_name,
          cp_from.id as from_checkpoint_id,
          loc_from.x as from_checkpoint_x,
          loc_from.y as from_checkpoint_y,
          cp_to.id as to_checkpoint_id,
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

    const checkpointsResult = await strapi.connections.default.raw(`
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

    const trailParts = trailPartsResult.rows.map(row => ({
      id: row.part_id,
      name: row.part_name || `Trecho ${row.part_id}`,
      fromCheckpointId: row.from_checkpoint_id,
      toCheckpointId: row.to_checkpoint_id,
      from: {
        id: row.from_checkpoint_id,
        x: row.from_checkpoint_x,
        y: row.from_checkpoint_y
      },
      to: {
        id: row.to_checkpoint_id,
        x: row.to_checkpoint_x,
        y: row.to_checkpoint_y
      }
    }));

    const checkpoints = checkpointsResult.rows
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
      });

    const distanceSquared = (ax, ay, bx, by) => {
      if (!Number.isFinite(ax) || !Number.isFinite(ay) || !Number.isFinite(bx) || !Number.isFinite(by)) {
        return Number.POSITIVE_INFINITY;
      }
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    };

    const establishments = establishmentsResult.rows.map(row => {
      const location = Number.isFinite(row.location_x) && Number.isFinite(row.location_y)
        ? { x: row.location_x, y: row.location_y }
        : null;
      let coords = null;
      if (location) {
        coords = utmToLatLon(location.x, location.y);
      }

      let closestPart = null;
      let closestDistance = Number.POSITIVE_INFINITY;
      if (location) {
        trailParts.forEach(part => {
          const fromDistance = distanceSquared(location.x, location.y, part.from.x, part.from.y);
          const toDistance = distanceSquared(location.x, location.y, part.to.x, part.to.y);
          const candidateDistance = Math.min(fromDistance, toDistance);
          if (candidateDistance < closestDistance) {
            closestDistance = candidateDistance;
            closestPart = part;
          }
        });
      }

      return {
        id: row.id,
        name: row.name,
        address: row.address,
        email: row.email,
        phone: row.phone,
        category: row.category,
        description: row.description,
        openingHours: row.opening_hours,
        services: row.services,
        isActive: row.is_active,
        rejectionReason: row.rejection_reason,
        createdAt: row.created_at,
        location,
        lat: coords ? coords.lat : null,
        lon: coords ? coords.lon : null,
        trailPartId: closestPart ? closestPart.id : null,
        trailPartName: closestPart ? closestPart.name : null
      };
    });

    const segmentsWithEstablishments = Array.from(
      new Set(establishments.map(item => item.trailPartId).filter(Boolean))
    );

    let segmentStats = [];

    if (segmentsWithEstablishments.length) {
      const partIds = segmentsWithEstablishments.join(',');

      const monthlyResult = await strapi.connections.default.raw(`
          SELECT
            tp.id as part_id,
            EXTRACT(YEAR FROM (tr.created_at + (tr."finishedAt" - tr.created_at) / 2))::int as year,
            EXTRACT(MONTH FROM (tr.created_at + (tr."finishedAt" - tr.created_at) / 2))::int as month,
            COUNT(*) as total
          FROM trail_routes tr
          INNER JOIN trail_parts tp ON tp.id = tr.route
          INNER JOIN trails t ON tr.trail = t.id
          WHERE tr."finishedAt" IS NOT NULL
          AND tr.created_at IS NOT NULL
          AND tr."finishedAt" > tr.created_at
          AND tp.id IN (${partIds})
          GROUP BY tp.id, year, month
          ORDER BY tp.id ASC, year ASC, month ASC
        `);

      const demographicsResult = await strapi.connections.default.raw(`
          SELECT
            tp.id as part_id,
            SUM(CASE WHEN u.sex = 'Male' THEN 1 ELSE 0 END) as male_count,
            SUM(CASE WHEN u.sex = 'Female' THEN 1 ELSE 0 END) as female_count,
            SUM(CASE WHEN DATE_PART('year', AGE(u.birthdate)) < 30 THEN 1 ELSE 0 END) as age_under_30,
            SUM(CASE WHEN DATE_PART('year', AGE(u.birthdate)) >= 30 AND DATE_PART('year', AGE(u.birthdate)) < 45 THEN 1 ELSE 0 END) as age_30_44,
            SUM(CASE WHEN DATE_PART('year', AGE(u.birthdate)) >= 45 AND DATE_PART('year', AGE(u.birthdate)) < 60 THEN 1 ELSE 0 END) as age_45_59,
            SUM(CASE WHEN DATE_PART('year', AGE(u.birthdate)) >= 60 THEN 1 ELSE 0 END) as age_60_plus
          FROM trail_routes tr
          INNER JOIN trail_parts tp ON tp.id = tr.route
          INNER JOIN trails t ON tr.trail = t.id
          INNER JOIN "users-permissions_user" u ON t."user" = u.id
          WHERE tr."finishedAt" IS NOT NULL
          AND tp.id IN (${partIds})
          GROUP BY tp.id
        `);

      const modalityResult = await strapi.connections.default.raw(`
          SELECT
            tp.id as part_id,
            SUM(CASE WHEN LOWER(t.modality) IN ('pedestre', 'foot', 'pe') THEN 1 ELSE 0 END) as foot_count,
            SUM(CASE WHEN LOWER(t.modality) IN ('bicicleta', 'bike', 'pedal') THEN 1 ELSE 0 END) as bike_count,
            COUNT(*) as total_count
          FROM trail_routes tr
          INNER JOIN trail_parts tp ON tp.id = tr.route
          INNER JOIN trails t ON tr.trail = t.id
          WHERE tr."finishedAt" IS NOT NULL
          AND tp.id IN (${partIds})
          GROUP BY tp.id
        `);

      const monthlyMap = new Map();
      monthlyResult.rows.forEach(row => {
        const partId = Number(row.part_id);
        const year = Number(row.year);
        const month = Number(row.month);
        const total = parseInt(row.total, 10) || 0;
        if (!monthlyMap.has(partId)) {
          monthlyMap.set(partId, {});
        }
        const partYears = monthlyMap.get(partId);
        if (!partYears[year]) {
          partYears[year] = Array.from({ length: 12 }, () => 0);
        }
        if (month >= 1 && month <= 12) {
          partYears[year][month - 1] = total;
        }
      });

      const demographicsMap = new Map();
      demographicsResult.rows.forEach(row => {
        demographicsMap.set(Number(row.part_id), {
          male: parseInt(row.male_count, 10) || 0,
          female: parseInt(row.female_count, 10) || 0,
          ageUnder30: parseInt(row.age_under_30, 10) || 0,
          age30To44: parseInt(row.age_30_44, 10) || 0,
          age45To59: parseInt(row.age_45_59, 10) || 0,
          age60Plus: parseInt(row.age_60_plus, 10) || 0
        });
      });

      const modalityMap = new Map();
      modalityResult.rows.forEach(row => {
        modalityMap.set(Number(row.part_id), {
          foot: parseInt(row.foot_count, 10) || 0,
          bike: parseInt(row.bike_count, 10) || 0,
          total: parseInt(row.total_count, 10) || 0
        });
      });

      segmentStats = segmentsWithEstablishments.map(partId => {
        const part = trailParts.find(item => item.id === partId);
        const monthlyByYear = monthlyMap.get(partId) || {};
        const totalFromMonthly = Object.values(monthlyByYear)
          .reduce((sum, values) => sum + values.reduce((acc, value) => acc + value, 0), 0);
        const demographics = demographicsMap.get(partId) || {
          male: 0,
          female: 0,
          ageUnder30: 0,
          age30To44: 0,
          age45To59: 0,
          age60Plus: 0
        };
        const modality = modalityMap.get(partId) || { foot: 0, bike: 0, total: 0 };

        return {
          id: partId,
          name: part ? part.name : `Trecho ${partId}`,
          monthlyByYear,
          totalCompletions: totalFromMonthly,
          demographics,
          modality
        };
      });
    }

    ctx.send({
      establishments,
      trailParts: trailParts.map(item => ({
        id: item.id,
        name: item.name,
        fromCheckpointId: item.fromCheckpointId,
        toCheckpointId: item.toCheckpointId
      })),
      checkpoints,
      segmentsWithEstablishments,
      segmentStats
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
