"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cart_1 = require("./src/services/cart");
App({
    onLaunch() {
        (0, cart_1.hydrateCartFromStorage)();
    },
    globalData: {
        auth: {
            status: 'idle'
        },
        cartCount: 0
    }
});
