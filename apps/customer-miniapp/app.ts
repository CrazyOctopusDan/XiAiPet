declare const wx: any;
declare function App(options: Record<string, unknown>): void;

const CLOUD_ENV_ID = 'cloud1-d6g77eyym7081a1b0';

App({
  globalData: {
    auth: {
      status: 'idle'
    },
    cartCount: 0
  },
  onLaunch() {
    if (wx?.cloud?.init) {
      wx.cloud.init({
        env: CLOUD_ENV_ID,
        traceUser: true
      });
    }
  }
});
