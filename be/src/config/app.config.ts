export const appConfig = () => {
  const port = Number(process.env.PORT) || 3001;

  return {
    app: {
      name: 'openclaw-backend',
      port,
      baseUrl: process.env.APP_BASE_URL || `http://localhost:${port}`,
    },
  };
};
