import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor native-shell config. Read only by the Capacitor CLI (`npx cap …`),
// never by the Vite web build — safe to commit before Capacitor is installed.
// The web assets are built with `npm run build:cap` (relative base) into `dist`.
const config: CapacitorConfig = {
  appId: 'com.laserlabstudios.jackflash',
  appName: 'JackFlash',
  webDir: 'dist',
  backgroundColor: '#FFF8E7', // cream — matches the app background, avoids white flash
  ios: {
    contentInset: 'always',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#FFD43B', // brand yellow
      showSpinner: false,
    },
  },
};

export default config;
