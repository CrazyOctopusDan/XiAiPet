declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getHomeModules, resolveHomeModuleImageSources } from '../../src/services/catalog';
import { getCachedCustomerRuntimeConfig, hydrateCustomerRuntimeConfig } from '../../src/services/runtime-config';

const HERO_BANNER_SRC = '/assets/catalog/banner.jpg';

interface HomeModuleViewModel {
  id: string;
  title: string;
  imageSrc: string;
}

interface NavigationMetrics {
  statusBarHeight: number;
  navBarHeight: number;
  contentTop: number;
}

interface HomePageInstance {
  data: {
    storeContact: {
      wechatId: string;
      ownerPhone: string;
    };
    purchaseNotice: string;
    primaryModule: HomeModuleViewModel | null;
    secondaryModules: HomeModuleViewModel[];
    contactModalVisible: boolean;
    noticeModalVisible: boolean;
  };
  setData(data: Record<string, unknown>): void;
  refreshHome(): Promise<void>;
  getTabBar?(): { setSelectedKey?: (key: string) => void } | undefined;
}

function buildHomeLayout(modules: HomeModuleViewModel[]) {
  const primaryModule = modules.find((module) => module.id === 'preorder') ?? modules[0] ?? null;

  return {
    primaryModule,
    secondaryModules: modules.filter((module) => module.id !== primaryModule?.id)
  };
}

function buildHomeModulesFallback(): HomeModuleViewModel[] {
  return getHomeModules().map((module) => ({
    id: module.id,
    title: module.title,
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
    ...buildHomeLayout(buildHomeModulesFallback()),
    heroBannerSrc: HERO_BANNER_SRC,
    storeContact: {
      wechatId: getCachedCustomerRuntimeConfig().store.wechatId,
      ownerPhone: getCachedCustomerRuntimeConfig().store.ownerPhone
    },
    purchaseNotice: getCachedCustomerRuntimeConfig().customNotice.content,
    contactModalVisible: false,
    noticeModalVisible: false
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
      const homeLayout = buildHomeLayout(await modulePromise);

      this.setData({
        ...homeLayout,
        heroBannerSrc: HERO_BANNER_SRC,
        storeContact: {
          wechatId: getCachedCustomerRuntimeConfig().store.wechatId,
          ownerPhone: getCachedCustomerRuntimeConfig().store.ownerPhone
        },
        purchaseNotice: getCachedCustomerRuntimeConfig().customNotice.enabled ? getCachedCustomerRuntimeConfig().customNotice.content : ''
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

    if (moduleId === 'consulting') {
      this.setData({ contactModalVisible: true });
      return;
    }

    if (moduleId === 'notice') {
      this.setData({ noticeModalVisible: true });
      return;
    }

    if (moduleId === 'vip') {
      wx.navigateTo({
        url: '/pages/membership/index'
      });
      return;
    }

    wx.showToast({
      title: '该模块下一阶段继续实现',
      icon: 'none'
    });
  },
  handleCloseContactModal(this: HomePageInstance) {
    this.setData({ contactModalVisible: false });
  },
  handleCloseNoticeModal(this: HomePageInstance) {
    this.setData({ noticeModalVisible: false });
  },
  handleCopyContact(this: HomePageInstance, event: { currentTarget?: { dataset?: { value?: string; label?: string } } }) {
    const value = event.currentTarget?.dataset?.value;
    const label = event.currentTarget?.dataset?.label ?? '联系方式';

    if (!value) {
      wx.showToast({
        title: `${label}暂未配置`,
        icon: 'none'
      });
      return;
    }

    wx.setClipboardData({
      data: value,
      success: () => {
        wx.showToast({
          title: `${label}已复制`,
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败，请长按号码',
          icon: 'none'
        });
      }
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
