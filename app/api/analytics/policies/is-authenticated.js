'use strict';

/**
 * Policy para Analytics
 * Permite acesso público aos endpoints de analytics
 */

module.exports = async (ctx, next) => {
  // Permitir que a requisição continue
  await next();
};
