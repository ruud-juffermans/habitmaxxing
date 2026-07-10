import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    // 3003 matches the platform server's CORS default for this app (HABIT_URL).
    port: 3003,
    watch: { usePolling: true },
  },
});
