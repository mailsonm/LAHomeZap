import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig(() => {
  const isContent = process.env.BUILD_TARGET === 'content';
  const isInterceptor = process.env.BUILD_TARGET === 'interceptor';
  const isBackground = process.env.BUILD_TARGET === 'background';

  if (isContent) {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
          input: {
            content: resolve(__dirname, 'src/content/index.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            inlineDynamicImports: true,
            format: 'iife',
          },
        },
      },
    };
  }

  if (isInterceptor) {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: {
            interceptor: resolve(__dirname, 'src/content/interceptor.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            inlineDynamicImports: true,
            format: 'iife',
          },
        },
      },
    };
  }

  if (isBackground) {
    return {
      plugins: [react()],
      build: {
        outDir: 'dist',
        emptyOutDir: false,
        rollupOptions: {
          input: {
            background: resolve(__dirname, 'src/background.ts'),
          },
          output: {
            entryFileNames: '[name].js',
            inlineDynamicImports: true,
            format: 'iife',
          },
        },
      },
    };
  }

  return {
    plugins: [react()],
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      rollupOptions: {
        input: {
          options: resolve(__dirname, 'options.html'),
        },
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
    },
  };
});
