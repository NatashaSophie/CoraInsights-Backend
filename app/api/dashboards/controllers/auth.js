'use strict';

const dashboardsAuth = require('../../../../dashboards/auth');

module.exports = {
  async login(ctx) {
    const result = await dashboardsAuth.login(ctx.request.body || {});

    if (!result.ok) {
      ctx.unauthorized(result.error || 'Invalid credentials');
      return;
    }

    ctx.send(result.data);
  },
};
