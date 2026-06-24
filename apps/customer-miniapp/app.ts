declare function App(options: Record<string, unknown>): void;

import { hydrateCartFromStorage } from './src/services/cart';

App({
  onLaunch() {
    hydrateCartFromStorage();
  },
  globalData: {
    auth: {
      status: 'idle'
    },
    cartCount: 0
  }
});
