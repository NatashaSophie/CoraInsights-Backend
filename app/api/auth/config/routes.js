module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/auth/login',
      handler: 'auth.login',
      config: {
        auth: false
      }
    },
    {
      method: 'GET',
      path: '/auth/validate',
      handler: 'auth.validate',
      config: {
        auth: false
      }
    }
  ]
};
