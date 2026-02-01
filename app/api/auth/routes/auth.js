module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'auth.login',
      config: {
        policies: [],
      },
    },
    {
      method: 'GET',
      path: '/auth/validate',
      handler: 'auth.validate',
      config: {
        policies: [],
      },
    },
  ],
};
