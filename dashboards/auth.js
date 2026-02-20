'use strict';

const getSanitizeEntity = () => {
  if (strapi && strapi.utils && strapi.utils.sanitizeEntity) {
    return strapi.utils.sanitizeEntity;
  }

  // Fallback for local resolution when strapi utils are not on Node's path.
  return require('../app/node_modules/strapi-utils').sanitizeEntity;
};

const ALLOWED_USER_TYPES = ['pilgrim', 'manager', 'merchant'];

const normalizeIdentifier = identifier => {
  if (!identifier) {
    return '';
  }

  return String(identifier).trim().toLowerCase();
};

const normalizeUserType = userType => {
  if (!userType) {
    return '';
  }

  return String(userType).trim().toLowerCase();
};

const getUserModel = () => strapi.query('user', 'users-permissions').model;

const sanitizeUser = user => {
  const sanitizeEntity = getSanitizeEntity();
  return sanitizeEntity(user, { model: getUserModel() });
};

const findUserByIdentifier = async identifier => {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return null;
  }

  const userService = strapi.plugins['users-permissions'].services.user;
  const emailUser = await userService.fetch({ email: normalized });
  if (emailUser) {
    return { user: emailUser, source: 'users-permissions' };
  }

  const rawEmailUser = await userService.fetch({ email: identifier });
  if (rawEmailUser) {
    return { user: rawEmailUser, source: 'users-permissions' };
  }

  const usernameUser = await userService.fetch({ username: normalized });
  if (usernameUser) {
    return { user: usernameUser, source: 'users-permissions' };
  }

  const rawUsernameUser = await userService.fetch({ username: identifier });
  if (rawUsernameUser) {
    return { user: rawUsernameUser, source: 'users-permissions' };
  }

  try {
    const legacyResult = await strapi.connections.default.raw(
      'SELECT id, email, username, password, "userType" FROM up_users WHERE LOWER(email) = $1 OR LOWER(username) = $1 LIMIT 1',
      [normalized]
    );

    const legacyUser = legacyResult.rows && legacyResult.rows.length > 0 ? legacyResult.rows[0] : null;
    if (legacyUser) {
      return { user: legacyUser, source: 'legacy' };
    }
  } catch (error) {
    // If legacy table does not exist, ignore and fall through.
  }

  return null;
};

const issueJwt = user => {
  return strapi.plugins['users-permissions'].services.jwt.issue({ id: user.id });
};

const validateUserForDashboard = user => {
  if (!user) {
    return { ok: false, error: 'Invalid credentials' };
  }

  if (user.blocked === true) {
    return { ok: false, error: 'User is blocked' };
  }

  const userType = normalizeUserType(user.userType);
  if (!ALLOWED_USER_TYPES.includes(userType)) {
    return { ok: false, error: 'Only pilgrim, manager and merchant users can access the dashboard' };
  }

  return { ok: true };
};

const login = async ({ identifier, password }) => {
  if (!identifier || !password) {
    return { ok: false, error: 'identifier and password are required' };
  }

  const found = await findUserByIdentifier(identifier);
  const user = found ? found.user : null;
  const source = found ? found.source : null;
  const validation = validateUserForDashboard(user);
  if (!validation.ok) {
    return validation;
  }

  let isValidPassword = false;
  if (source === 'users-permissions') {
    const userService = strapi.plugins['users-permissions'].services.user;
    isValidPassword = await userService.validatePassword(password, user.password);
  } else {
    const userService = strapi.plugins['users-permissions'].services.user;
    const hasHashedPassword = typeof user.password === 'string' && user.password.startsWith('$2');

    if (hasHashedPassword) {
      isValidPassword = await userService.validatePassword(password, user.password);
    } else {
      isValidPassword = user.password === password;
    }
  }
  if (!isValidPassword) {
    return { ok: false, error: 'Invalid credentials' };
  }

  const token = issueJwt(user);
  const sanitized = source === 'users-permissions'
    ? sanitizeUser(user)
    : {
        id: user.id,
        email: user.email,
        username: user.username || user.email,
        userType: user.userType,
      };

  return {
    ok: true,
    data: {
      jwt: token,
      user: {
        id: sanitized.id,
        email: sanitized.email,
        username: sanitized.username,
        userType: sanitized.userType,
      },
    },
  };
};

module.exports = {
  login,
};
