'use strict';

module.exports = async () => {
  // Registrar rotas customizadas de autenticação
  const authController = require('../api/dashboards/controllers/dashboards'); // Vamos criar um controller customizado
  
  // Este arquivo será carregado ao iniciar o Strapi
  console.log('Custom routes loaded');
};
