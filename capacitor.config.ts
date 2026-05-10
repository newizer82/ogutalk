import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.ogutalk.app',
  appName: '오구톡',
  webDir: 'dist',
  // ⚠️ 핵심: origin 변경 (https://localhost → https://app)
  // 이전 설치에서 등록된 OLD Service Worker는 https://localhost 에 묶여있어
  // 새 APK가 다른 origin 에서 로드되면 OLD SW 자체가 적용 불가능
  server: {
    androidScheme: 'https',
    hostname: 'app.ogutalk.local',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_ogu',
      iconColor: '#6366f1',
      // 채널 사운드는 MainActivity.java 에서 직접 지정 (ogu-alarm/ogu-custom)
    },
  },
}

export default config
