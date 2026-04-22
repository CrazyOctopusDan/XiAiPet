declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getHomeModules, resolveHomeModuleImageSources } from '../../src/services/catalog';
import { getCachedCustomerRuntimeConfig, hydrateCustomerRuntimeConfig } from '../../src/services/runtime-config';

interface NavigationMetrics {
  statusBarHeight: number;
  navBarHeight: number;
  contentTop: number;
}

interface HomePageInstance {
  setData(data: Record<string, unknown>): void;
  refreshHome(): Promise<void>;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

function buildHomeModulesFallback() {
  return getHomeModules().map((module) => ({
    ...module,
    imageSrc: module.imageFileId
  }));
}

function getNavigationMetrics(): NavigationMetrics {
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

  const navBarHeight = Math.max(44, menuButton.bottom + menuButton.top - statusBarHeight);
  return {
    statusBarHeight,
    navBarHeight,
    contentTop: statusBarHeight + navBarHeight
  };
}

Page({
  data: {
    modules: buildHomeModulesFallback(),
    heroBannerSrc: getCachedCustomerRuntimeConfig().banner.fileId
  },
  onShow(this: HomePageInstance) {
    this.getTabBar?.()?.setSelectedKey?.('home');
    void this.refreshHome();
  },
  async refreshHome(this: HomePageInstance) {
    const modulePromise = resolveHomeModuleImageSources();

    try {
      await hydrateCustomerRuntimeConfig();
    } finally {
      this.setData({
        modules: await modulePromise,
        heroBannerSrc: getCachedCustomerRuntimeConfig().banner.fileId
      });
    }
  },
  handleModuleTap(this: HomePageInstance, event: { currentTarget?: { dataset?: { moduleId?: string } } }) {
    const moduleId = event.currentTarget?.dataset?.moduleId;

    if (moduleId === 'preorder') {
      wx.navigateTo({
        url: '/pages/catalog/index'
      });
      return;
    }

    wx.showToast({
      title: '该模块下一阶段继续实现',
      icon: 'none'
    });
  },
  handleHomeTap() {
    return undefined;
  },
  handleOrdersTap() {
    wx.redirectTo({
      url: '/pages/orders/index'
    });
  },
  handleProfileTap() {
    wx.redirectTo({
      url: '/pages/profile/index'
    });
  }
});
