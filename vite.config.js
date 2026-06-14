import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    server: {
      // allowedHosts: env.VITE_ALLOW_HOSTS ? [env.VITE_ALLOW_HOSTS] : [],
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL,// API base URL
          changeOrigin: true,
          secure: false,
        },
      }
    }
  }
})