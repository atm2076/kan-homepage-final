import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL('./index.html', import.meta.url)),
        gumiOneRoom: fileURLToPath(new URL('./gumi-one-room.html', import.meta.url))
      }
    }
  }
});
