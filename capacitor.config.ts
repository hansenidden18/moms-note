import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.hayati.notahayati",
  appName: "Nota Hayati",
  webDir: "dist",
  android: { backgroundColor: "#f8f9f5" },
  plugins: {
    SplashScreen: { backgroundColor: "#164d3d", launchShowDuration: 1200 },
  },
};
export default config;
