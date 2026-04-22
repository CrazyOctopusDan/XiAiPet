"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
async function loadComponentModule() {
    let capturedComponent = null;
    const wxMock = {
        redirectTo: vitest_1.vi.fn()
    };
    vitest_1.vi.resetModules();
    vitest_1.vi.unstubAllGlobals();
    vitest_1.vi.stubGlobal('wx', wxMock);
    vitest_1.vi.stubGlobal('Component', (options) => {
        capturedComponent = options;
    });
    await Promise.resolve().then(() => __importStar(require('/Users/zhangyi/zhangyi/homework/xiaipet/apps/customer-miniapp/components/custom-tabbar/index.js')));
    if (!capturedComponent) {
        throw new Error('component not registered');
    }
    return {
        component: capturedComponent,
        wx: wxMock
    };
}
function createComponentInstance(component, active) {
    return {
        data: {
            active
        },
        properties: {
            active
        },
        ...component.methods
    };
}
(0, vitest_1.describe)('custom tabbar component', () => {
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.resetModules();
        vitest_1.vi.unstubAllGlobals();
    });
    (0, vitest_1.it)('redirects to another first-level page when tapping an inactive item', async () => {
        const { component, wx } = await loadComponentModule();
        const instance = createComponentInstance(component, 'home');
        instance.handleTabTap({
            currentTarget: {
                dataset: {
                    key: 'orders',
                    url: '/pages/orders/index'
                }
            }
        });
        (0, vitest_1.expect)(wx.redirectTo).toHaveBeenCalledWith({
            url: '/pages/orders/index'
        });
    });
    (0, vitest_1.it)('does nothing when tapping the active item', async () => {
        const { component, wx } = await loadComponentModule();
        const instance = createComponentInstance(component, 'orders');
        instance.handleTabTap({
            currentTarget: {
                dataset: {
                    key: 'orders',
                    url: '/pages/orders/index'
                }
            }
        });
        (0, vitest_1.expect)(wx.redirectTo).not.toHaveBeenCalled();
    });
});
