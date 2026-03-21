export const openclawConfig = () => ({
  openclaw: {
    baseUrl: process.env.OPENCLAW_BASE_URL || '',
    apiKey: process.env.OPENCLAW_API_KEY || '',
  },
});
