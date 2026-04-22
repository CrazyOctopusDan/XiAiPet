function getSelectedKeyByRoute(route) {
  if (route === 'pages/home/index') {
    return 'home';
  }

  if (route === 'pages/orders/index') {
    return 'orders';
  }

  if (route === 'pages/profile/index') {
    return 'profile';
  }

  return 'home';
}

Component({
  data: {
    selectedKey: 'home'
  },
  lifetimes: {
    attached() {
      this.syncSelected();
    }
  },
  pageLifetimes: {
    show() {
      this.syncSelected();
    }
  },
  methods: {
    setSelectedKey(key) {
      if (!key) {
        return;
      }

      this.setData({
        selectedKey: key
      });
    },
    syncSelected() {
      const pages = getCurrentPages();
      const currentPage = pages[pages.length - 1];
      const route = currentPage?.route ?? '';

      this.setSelectedKey(getSelectedKeyByRoute(route));
    },
    handleTabTap(event) {
      const { key, url } = event.currentTarget.dataset || {};

      if (!key || !url || key === this.data.selectedKey) {
        return;
      }

      wx.switchTab({ url });
    }
  }
});
