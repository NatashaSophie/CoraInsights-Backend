module.exports = ({ env }) => ({
  host: env("HOST", "0.0.0.0"),
  port: env.int("PORT", 1337),
  admin: {
    autoOpen: false,
    host: "0.0.0.0",
    port: 8000,
    auth: {
      secret: env("ADMIN_JWT_SECRET", "7d5d7f3026d7ea4fc6b5499ed8a0c38a"),
    },
  },
  cron: {
    enabled: false,
  },
});
