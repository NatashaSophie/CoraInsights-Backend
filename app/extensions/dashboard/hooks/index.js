/**
 * Middleware para permitir acesso público ao endpoint /dashboards/public
 * Este hook é carregado automaticamente pelo Strapi
 */

'use strict';

module.exports = strapi => {
  return {
    initialize() {
      // Middleware para permitir acesso público a endpoints específicos
      strapi.app.use(async (ctx, next) => {
        // Permitir acesso público ao endpoint /dashboards/public
        if (ctx.path.includes('/dashboards/public') && ctx.method === 'GET') {
          // Marcar como público para pular validações de permissão
          ctx.state.isPublic = true;
        }
        await next();
      });
    },
  };
};
