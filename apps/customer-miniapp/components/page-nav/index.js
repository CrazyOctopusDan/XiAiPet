function getNavigationMetrics() {
  const windowInfo = wx.getWindowInfo?.() ?? wx.getSystemInfoSync?.() ?? {};
  const menuButton = wx.getMenuButtonBoundingClientRect?.();
  const statusBarHeight = windowInfo.statusBarHeight ?? 20;

  if (!menuButton) {
    const navBarHeight = 44;
    return {
      statusBarHeight,
      navBarHeight,
      contentTop: statusBarHeight + navBarHeight
    };
  }

  const verticalPadding = Math.max(0, menuButton.top - statusBarHeight);
  const navBarHeight = Math.max(44, menuButton.height + verticalPadding * 2);

  return {
    statusBarHeight,
    navBarHeight,
    contentTop: statusBarHeight + navBarHeight
  };
}

Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    theme: {
      type: String,
      value: 'dark'
    },
    showBack: {
      type: Boolean,
      value: true
    },
    fixed: {
      type: Boolean,
      value: true
    },
    background: {
      type: String,
      value: 'transparent'
    },
    reserveSpace: {
      type: Boolean,
      value: true
    },
    navigateOnBack: {
      type: Boolean,
      value: true
    }
  },
  data: {
    navMetrics: getNavigationMetrics()
  },
  lifetimes: {
    attached() {
      this.refreshMetrics();
    }
  },
  pageLifetimes: {
    show() {
      this.refreshMetrics();
    }
  },
  methods: {
    refreshMetrics() {
      this.setData({
        navMetrics: getNavigationMetrics()
      });
    },
    handleBackTap() {
      this.triggerEvent('back');
      if (this.properties.navigateOnBack) {
        wx.navigateBack();
      }
    }
  }
});
