import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.bothstacks.lingo',
  appName: 'BothLingo',
  webDir: 'dist',
  server: {
    // Load the live production deployment so the installed app always serves the
    // current facelift and the voice tutor's same-origin /api/* calls just work.
    url: 'https://bothlingo-831930974109.australia-southeast1.run.app',
    androidScheme: 'https',
    cleartext: false,
  },
};

export default config;
