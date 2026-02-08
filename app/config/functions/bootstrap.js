'use strict';

/**
 * An asynchronous bootstrap function that runs before
 * your application gets started.
 *
 * This gives you an opportunity to set up your data model,
 * run jobs, or perform some special logic.
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#bootstrap
 */

module.exports = async () => {  // ============================================================================
  // PATCH CRÍTICO: Popular admin roles durante login
  // ============================================================================
  // Aguardar 1 segundo para garantir que todos os serviços estejam carregados
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Sobrescrever o método findOne do query builder do admin user
  const originalFindOne = strapi.query('user', 'admin').findOne;
  
  strapi.query('user', 'admin').findOne = async function(params, populate = []) {
    // Se estiver buscando por email E não estiver populando roles, adicionar roles
    if (params && params.email && !populate.includes('roles')) {
      populate = [...(Array.isArray(populate) ? populate : []), 'roles'];
    }
    
    const result = await originalFindOne.call(this, params, populate);

    return result;
  };

  try {
    const roleService = strapi.admin.services.role;
    const userService = strapi.admin.services.user;
    const superAdminRole = await roleService.getSuperAdmin();

    if (superAdminRole) {
      const usersWithoutRole = await userService.countUsersWithoutRole();

      if (usersWithoutRole > 0) {
        await userService.assignARoleToAll(superAdminRole.id);
      }
    }
  } catch (error) {
    // no-op
  }

  // ATENÇÃO: Rotas customizadas comentadas para permitir registro inicial do admin no Strapi
  // Para reabilitar essas rotas customizadas após criar o admin, basta descomentar este bloco
  /*
  // Middleware para rota POST /api/auth/login
  strapi.router.post('/api/auth/login', async (ctx, next) => {
    console.log('[AUTH ROUTE] ========== LOGIN REQUEST RECEIVED ==========');
    console.log('[AUTH ROUTE] Method:', ctx.method);
    console.log('[AUTH ROUTE] URL:', ctx.url);
    console.log('[AUTH ROUTE] Headers:', ctx.headers);
    console.log('[AUTH ROUTE] Request body:', ctx.request.body);
    console.log('[AUTH ROUTE] Raw body:', ctx.body);
    
    // Tentar parsear o body manualmente se necessário
    let identifier, password;
    
    if (ctx.request.body && typeof ctx.request.body === 'object') {
      identifier = ctx.request.body.identifier;
      password = ctx.request.body.password;
    } else if (typeof ctx.request.body === 'string') {
      try {
        const parsed = JSON.parse(ctx.request.body);
        identifier = parsed.identifier;
        password = parsed.password;
      } catch (e) {
        console.log('[AUTH] Error parsing body:', e.message);
      }
    }

    console.log('[AUTH] Parsed identifier:', identifier);
    console.log('[AUTH] Parsed password:', password);

    if (!identifier || !password) {
      console.log('[AUTH] Missing credentials - returning 400');
      ctx.status = 400;
      ctx.body = { error: 'identifier and password are required' };
      return;
    }

    try {
      console.log('[AUTH] Login attempt for:', identifier, 'with password:', password);
      
      let user = null;
      
      try {
        console.log('[AUTH] Querying database for email:', identifier);
        
        // Query SQL direta na tabela users-permissions_user
        const result = await strapi.connections.default.raw(
          'SELECT id, email, username, password, role, "userType" FROM "users-permissions_user" WHERE email = ? LIMIT 1',
          [identifier]
        );
        
        console.log('[AUTH] Query result:', result);
        
        user = result.rows && result.rows.length > 0 ? result.rows[0] : null;
        
        if (user) {
          console.log('[AUTH] User found:', user.email, 'with role:', user.role);
        }
      } catch (e) {
        console.log('[AUTH] Database query error:', e.message);
        console.error('[AUTH] Full error:', e);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      if (!user) {
        console.log('[AUTH] No user found for:', identifier);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      // User já vem do resultado da query SQL
      const userData = user;

      console.log('[AUTH] Comparing passwords:');
      console.log('[AUTH] Provided password:', password, 'Type:', typeof password);
      console.log('[AUTH] DB password hash:', userData.password, 'Type:', typeof userData.password);
      
      // Comparar senha com bcrypt
      const passwordMatch = await bcrypt.compare(password, userData.password);
      console.log('[AUTH] Password match:', passwordMatch);

      if (!passwordMatch) {
        console.log('[AUTH] Invalid password for:', identifier);
        ctx.status = 401;
        ctx.body = { error: 'Invalid credentials' };
        return;
      }

      // role é um ID numérico, precisamos validar se é um role permitido
      // Roles no Strapi users-permissions: 1 = Authenticated, 2 = Public, etc
      // userType é uma string que indica o tipo de usuário: pilgrim, manager, merchant
      console.log('[AUTH] User role ID:', userData.role);
      console.log('[AUTH] User type:', userData.userType);
      
      // Validar userType
      const allowedUserTypes = ['pilgrim', 'manager', 'merchant', 'gestor', 'comerciante', 'peregrino'];
      
      if (!allowedUserTypes.includes(userData.userType)) {
        console.log('[AUTH] Unauthorized user type for:', identifier, 'user type:', userData.userType);
        ctx.status = 403;
        ctx.body = { error: 'Only authorized users can access the dashboard' };
        return;
      }

      console.log('[AUTH] Login successful for:', identifier, 'with userType:', userData.userType);

      ctx.status = 200;
      ctx.body = {
        jwt: 'mock-jwt-token-' + userData.id,
        user: {
          id: userData.id,
          email: userData.email,
          username: userData.username || userData.email,
          userType: mapUserTypeToId(userData.userType)
        }
      };
      console.log('[AUTH] Returning success response');
    } catch (error) {
      console.error('[AUTH] Login error:', error);
      ctx.status = 500;
      ctx.body = { error: 'Failed to login' };
    }
  });

  // Função para mapear userType string para ID numérico (baseado em role)
  function mapUserTypeToId(userType) {
    const mapping = {
      'pilgrim': 1,      // role 1 para peregrino
      'manager': 2,      // role 2 para gestor
      'merchant': 3,     // role 3 para comerciante
      'gestor': 2,
      'comerciante': 3,
      'peregrino': 1
    };
    return mapping[userType] || 1;
  }

  // Middleware para rota GET /api/auth/validate
  strapi.router.get('/api/auth/validate', async (ctx, next) => {
    console.log('[AUTH ROUTE] Validate request received');
    
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      ctx.status = 401;
      ctx.body = { error: 'No token provided' };
      return;
    }

    if (token && token.startsWith('mock-jwt-token')) {
      ctx.status = 200;
      ctx.body = { valid: true };
    } else {
      ctx.status = 401;
      ctx.body = { error: 'Invalid token' };
    }
  });
  
  console.log('[BOOTSTRAP] Auth routes registered successfully');
  */
  
};
