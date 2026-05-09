import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/main/index.js'),
          'api-http': resolve(__dirname, 'src/main/api-http.js'),
          'chromium-path': resolve(__dirname, 'src/main/chromium-path.js'),
          'close-behavior': resolve(__dirname, 'src/main/close-behavior.js'),
          'launch-security': resolve(__dirname, 'src/main/launch-security.js'),
          'network-consistency': resolve(__dirname, 'src/main/network-consistency.js'),
          'path-safety': resolve(__dirname, 'src/main/path-safety.js'),
          'profile-identity': resolve(__dirname, 'src/main/profile-identity.js'),
          'proxy-error-format': resolve(__dirname, 'src/main/proxy-error-format.js'),
          'proxy-readiness': resolve(__dirname, 'src/main/proxy-readiness.js'),
          'xray-assets': resolve(__dirname, 'src/main/xray-assets.js'),
          'release-check': resolve(__dirname, 'src/main/release-check.js')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.js')
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [vue()]
  }
})
