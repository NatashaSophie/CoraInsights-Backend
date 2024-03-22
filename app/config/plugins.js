module.exports = ({ env }) => ({
  email: {
    provider: "sendgrid",
    providerOptions: {
      apiKey: env("SENDGRID_API_KEY"),
    },
    settings: {
      defaultFrom: "erickcelio.dev@gmail.com",
      defaultReplyTo: "erickcelio.dev@gmail.com",
      testAddress: "erickcelio.dev@gmail.com",
    },
  },
  upload: {
    provider: "cloudinary",
    providerOptions: {
      cloud_name: env("CLOUDINARY_NAME"),
      api_key: env("CLOUDINARY_KEY"),
      api_secret: env("CLOUDINARY_SECRET"),
    },
    actionOptions: {
      upload: {
        folder: "caminho-de-cora",
      },
      delete: {},
    },
  },
});
