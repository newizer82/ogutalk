import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ogutalk.app',
  appName: '오구톡',
  webDir: 'dist',
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_ogu',
      iconColor: '#6366f1',
      sound: 'ogu',               // android/app/src/main/res/raw/ogu.wav
    },
  },
}

export default config
