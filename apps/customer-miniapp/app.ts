declare function App(options: Record<string, unknown>): void;

App({
  globalData: {
    auth: {
      status: 'idle'
    },
    cartCount: 0
  }
});
