export const appConfig = () => ({
  app: {
    name: 'openclaw-backend',
    port: Number(process.env.PORT) || 3001,
  },
});
