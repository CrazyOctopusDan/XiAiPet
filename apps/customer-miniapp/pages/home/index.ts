declare const wx: any;
declare function Page(options: Record<string, unknown>): void;

import { getHomeModules, resolveHomeModuleImageSources } from '../../src/services/catalog';
import { getCachedCustomerRuntimeConfig, hydrateCustomerRuntimeConfig } from '../../src/services/runtime-config';

const HERO_BANNER_SRC = '/assets/catalog/banner.jpg';
const RIGHT_TOP_SHARE_OPTIONS = {
  withShareTicket: true,
  menus: ['shareAppMessage']
};

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
  refreshRuntimeConfigFields(): Promise<void>;
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

function enableRightTopShareMenu() {
  wx.showShareMenu?.(RIGHT_TOP_SHARE_OPTIONS);
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
    enableRightTopShareMenu();
    this.getTabBar?.()?.setSelectedKey?.('home');
    void this.refreshHome();
  },
  async refreshHome(this: HomePageInstance) {
    const modulePromise = resolveHomeModuleImageSources();

    try {
      await this.refreshRuntimeConfigFields();
    } finally {
      const homeLayout = buildHomeLayout(await modulePromise);

      this.setData({
        ...homeLayout,
        heroBannerSrc: HERO_BANNER_SRC
      });
    }
  },
  async refreshRuntimeConfigFields(this: HomePageInstance) {
    try {
      await hydrateCustomerRuntimeConfig();
    } catch {
      // Keep visible values empty when the runtime config API is unavailable.
    }

    const runtimeConfig = getCachedCustomerRuntimeConfig();
    this.setData({
      storeContact: {
        wechatId: runtimeConfig.store.wechatId,
        ownerPhone: runtimeConfig.store.ownerPhone
      },
      purchaseNotice: runtimeConfig.customNotice.enabled ? runtimeConfig.customNotice.content : ''
    });
  },
  async handleModuleTap(this: HomePageInstance, event: { currentTarget?: { dataset?: { moduleId?: string } } }) {
    const moduleId = event.currentTarget?.dataset?.moduleId;

    if (moduleId === 'preorder') {
      wx.navigateTo({
        url: '/pages/catalog/index'
      });
      return;
    }

    if (moduleId === 'consulting') {
      await this.refreshRuntimeConfigFields();
      this.setData({ contactModalVisible: true });
      return;
    }

    if (moduleId === 'notice') {
      await this.refreshRuntimeConfigFields();
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
  },
  onShareAppMessage() {
    return {
      title: 'XiAi宠物烘焙',
      path: '/pages/home/index',
      imageUrl: HERO_BANNER_SRC
    };
  }
});
