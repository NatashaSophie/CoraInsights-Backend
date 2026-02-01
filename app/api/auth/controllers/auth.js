'use strict';

/**
 * A set of functions called "actions" for `auth`
 */

module.exports = {
  async login(ctx) {
    const { identifier, password } = ctx.request.body;

    if (!identifier || !password) {
      return ctx.badRequest('identifier and password are required');
    }

    try {
      // Query database for user by email
      const query = `
        SELECT 
          users.id,
          users.email,
          users.username,
          users.password,
          roles.name as role
        FROM public.up_users users
        LEFT JOIN public.up_users_role_lnk role_link ON users.id = role_link.user_id
        LEFT JOIN public.up_roles roles ON role_link.role_id = roles.id
        WHERE users.email = $1
      `;

      const result = await strapi.db.connection.raw(query, [identifier]);
      
      if (result.rows.length === 0) {
        return ctx.unauthorized('Invalid credentials');
      }

      const user = result.rows[0];

      // For now, since we don't have bcrypt setup, do simple comparison
      // In production, this should use bcrypt.compare()
      if (user.password !== password) {
        return ctx.unauthorized('Invalid credentials');
      }

      // Return user data with role
      ctx.send({
        jwt: 'mock-jwt-token', // In production, generate a real JWT
        user: {
          id: user.id,
          email: user.email,
          username: user.username,
          role: {
            type: user.role || 'user'
          }
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      ctx.internalServerError('Failed to login');
    }
  },

  async validate(ctx) {
    // Validate a JWT token
    const token = ctx.get('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return ctx.unauthorized('No token provided');
    }

    // For mock setup, just verify it's not empty
    if (token === 'mock-jwt-token') {
      ctx.send({ valid: true });
    } else {
      ctx.unauthorized('Invalid token');
    }
  }
};
