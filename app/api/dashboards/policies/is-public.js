'use strict';

/**
 * Política para permitir acesso público sem autenticação
 */

module.exports = async (ctx, next) => {
  // Permitir acesso público sem validação de token JWT
  await next();
};
