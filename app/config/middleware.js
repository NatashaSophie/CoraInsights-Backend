module.exports = ({ env }) => ({
  settings: {
    cors: {
      enabled: true,
      origin: ['http://localhost:1337', 'http://localhost:3001', 'http://localhost:3000'],
    },
  },
});

