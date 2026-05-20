"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catalogProducts = exports.catalogCategories = exports.homeModules = void 0;
exports.homeModules = [
    {
        id: 'preorder',
        title: '浏览商品',
        subtitle: '同城闪送 / 顺丰邮寄 / 到店自提',
        description: '按履约方式进入购物列表，先选蛋糕再定时间。',
        accent: '#F5C84C',
        imageFileId: '/assets/catalog/浏览商品_v3.png',
        imageAltText: '浏览商品'
    },
    {
        id: 'notice',
        title: '购前须知',
        subtitle: '订购流程 / 食用指南 / 保鲜储存 / 成分提示',
        description: '下单前先确认配送方式、保存建议和食材提示。',
        accent: '#F1CFEC',
        imageFileId: '/assets/catalog/购前须知_3.png',
        imageAltText: '购前须知'
    },
    {
        id: 'consulting',
        title: '售前咨询',
        subtitle: '若回复不及时 请添加微信号：pawsonly',
        description: '需要更复杂的定制内容时，先联系店主沟通细节。',
        accent: '#B9E16E',
        imageFileId: '/assets/catalog/售前咨询_v3.png',
        imageAltText: '售前咨询'
    },
    {
        id: 'vip',
        title: '会员权益',
        subtitle: '查看会员等级 & 权益',
        description: '根据累计消费解锁不同等级和购买门槛。',
        accent: '#F6D66C',
        imageFileId: '/assets/catalog/会员权益_v3.png',
        imageAltText: '会员权益'
    }
];
exports.catalogCategories = [
    {
        id: 'cake-custom',
        name: '蛋糕｜定制系列',
        shortName: '蛋糕｜定制系列',
        iconText: '猫',
        sectionTitle: '立体全身造型'
    },
    {
        id: 'cake-regular',
        name: '蛋糕｜非定制系列',
        shortName: '蛋糕｜非定制系列',
        iconText: '糕',
        sectionTitle: '经典畅销款'
    },
    {
        id: 'mousse',
        name: '慕斯系列',
        shortName: '慕斯系列',
        iconText: '慕',
        sectionTitle: '细腻慕斯'
    },
    {
        id: 'cookie',
        name: '饼干系列',
        shortName: '饼干系列',
        iconText: '饼',
        sectionTitle: '磨牙零嘴'
    },
    {
        id: 'snacks',
        name: '小零食系列',
        shortName: '小零食系列',
        iconText: '零',
        sectionTitle: '轻量零食'
    },
    {
        id: 'party',
        name: '聚会 PARTY',
        shortName: '聚会 PARTY',
        iconText: '派',
        sectionTitle: '派对物料'
    },
    {
        id: 'candles',
        name: '蜡烛',
        shortName: '蜡烛',
        iconText: '烛',
        sectionTitle: '仪式感小物'
    }
];
exports.catalogProducts = [
    {
        id: 'coconut-wave',
        name: '椰椰浪屿',
        summary: '标价包含头像定制，下单备注宠物姓名与主题色。',
        description: '适合生日派对的定制造型蛋糕，奶油层次柔和，适合拍照。',
        price: 288,
        stock: 2,
        soldOut: false,
        cartActionLabel: '选规格',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cake-custom',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/product-card-reference.png',
        gallery: ['/assets/catalog/product-card-reference.png', '/assets/catalog/detail-reference.png'],
        detailImages: ['/assets/catalog/detail-reference.png', '/assets/catalog/detail-long-reference.png'],
        specs: [
            { id: 'coconut-wave-3-chicken', label: '3寸鸡肉', price: 288 },
            { id: 'coconut-wave-3-duck', label: '3寸鸭肉', price: 288 },
            { id: 'coconut-wave-4-chicken', label: '4寸鸡肉', price: 338 }
        ]
    },
    {
        id: 'retro-lolo',
        name: '复古洛洛',
        summary: '奶油裱花复古感更强，适合小型庆生和拍照打卡。',
        description: '粉蓝配色复古蛋糕，适合 3-4 寸生日庆祝。',
        price: 308,
        stock: 1,
        soldOut: false,
        cartActionLabel: '选规格',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cake-custom',
        deliveryModes: ['pickup', 'delivery'],
        thumbnail: '/assets/catalog/detail-reference.png',
        gallery: ['/assets/catalog/detail-reference.png', '/assets/catalog/quick-buy-reference.png'],
        detailImages: ['/assets/catalog/detail-reference.png', '/assets/catalog/detail-long-reference.png'],
        specs: [
            { id: 'retro-lolo-3-chicken', label: '3寸鸡肉', price: 308 },
            { id: 'retro-lolo-4-duck', label: '4寸鸭肉', price: 348 }
        ]
    },
    {
        id: 'milk-ball',
        name: '奶盖球球',
        summary: '标价包含头像定制，下单备注宠物姓名与年龄。',
        description: '圆润奶盖层次更柔和，适合到店自提与同城配送。',
        price: 248,
        stock: 5,
        soldOut: false,
        cartActionLabel: '选规格',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cake-custom',
        deliveryModes: ['pickup', 'delivery'],
        thumbnail: '/assets/catalog/catalog-reference.png',
        gallery: ['/assets/catalog/catalog-reference.png', '/assets/catalog/detail-reference.png'],
        detailImages: ['/assets/catalog/detail-reference.png', '/assets/catalog/detail-long-reference.png'],
        specs: [
            { id: 'milk-ball-3-chicken', label: '3寸鸡肉', price: 248 },
            { id: 'milk-ball-4-duck', label: '4寸鸭肉', price: 288 }
        ]
    },
    {
        id: 'spring-time',
        name: '春漫漫',
        summary: '标价包含头像定制，下单备注宠物姓名和想要的祝福语。',
        description: '适合春日主题的清新蛋糕，支持配送与快递。',
        price: 248,
        stock: 6,
        soldOut: false,
        cartActionLabel: '选规格',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cake-custom',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/catalog-reference.png',
        gallery: ['/assets/catalog/catalog-reference.png', '/assets/catalog/detail-reference.png'],
        detailImages: ['/assets/catalog/detail-reference.png', '/assets/catalog/detail-long-reference.png'],
        specs: [
            { id: 'spring-time-3-chicken', label: '3寸鸡肉', price: 248 },
            { id: 'spring-time-4-heart', label: '4寸狗狗夹心坯', price: 298 }
        ]
    },
    {
        id: 'ocean-party',
        name: '海洋奇遇',
        summary: '下单备注宠物姓名 3寸/4寸 规格可选，展示图为3寸效果。',
        description: '立体彩色小鱼含乳制品，乳糖不耐的宠物宝贝请规避。',
        price: 138,
        stock: 9,
        soldOut: false,
        cartActionLabel: '选规格',
        memberLevelLabel: '银卡会员可购',
        categoryId: 'cake-regular',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/detail-reference.png',
        gallery: ['/assets/catalog/detail-reference.png', '/assets/catalog/detail-long-reference.png'],
        detailImages: ['/assets/catalog/detail-long-reference.png', '/assets/catalog/detail-reference.png'],
        specs: [
            { id: 'ocean-party-3-chicken', label: '3寸鸡肉', price: 138 },
            { id: 'ocean-party-3-duck', label: '3寸鸭肉', price: 138 },
            { id: 'ocean-party-4-chicken', label: '4寸鸡肉', price: 168 },
            { id: 'ocean-party-4-duck', label: '4寸鸭肉', price: 168 },
            { id: 'ocean-party-4-dog-heart', label: '4寸 狗狗夹心坯', price: 188 },
            { id: 'ocean-party-4-cat-heart', label: '4寸 猫咪夹心坯', price: 188 }
        ]
    },
    {
        id: 'sea-sponge',
        name: '海绵宝宝',
        summary: '一份3枚，表情压模饼干，适合轻量加购。',
        description: '海绵宝宝造型饼干，可直接加购，适合和蛋糕一起下单。',
        price: 12.9,
        stock: 2,
        soldOut: false,
        cartActionLabel: '直接加购',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cookie',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/search-reference.png',
        gallery: ['/assets/catalog/search-reference.png'],
        detailImages: ['/assets/catalog/search-reference.png'],
        specs: []
    },
    {
        id: 'seaweed-jerky',
        name: '海苔肉脯',
        summary: '70g，鸡鸭肉混装，烘焙更酥脆。',
        description: '海苔肉脯更适合作为加餐零嘴，当前库存为 0。',
        price: 29.9,
        stock: 0,
        soldOut: true,
        cartActionLabel: '选规格',
        memberLevelLabel: '普通会员可购',
        categoryId: 'snacks',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/sold-out-reference.png',
        gallery: ['/assets/catalog/sold-out-reference.png'],
        detailImages: ['/assets/catalog/sold-out-reference.png'],
        specs: [
            { id: 'seaweed-jerky-70g', label: '70g 鸡鸭混装', price: 29.9 }
        ]
    },
    {
        id: 'bear-cookie',
        name: '小熊表情包',
        summary: '一份 6 个 / 组，磨牙饼干，当前售罄。',
        description: '可作为配角零食或派对伴手礼，当前库存售罄。',
        price: 26,
        stock: 0,
        soldOut: true,
        cartActionLabel: '直接加购',
        memberLevelLabel: '普通会员可购',
        categoryId: 'cookie',
        deliveryModes: ['pickup', 'delivery', 'express'],
        thumbnail: '/assets/catalog/sold-out-reference.png',
        gallery: ['/assets/catalog/sold-out-reference.png'],
        detailImages: ['/assets/catalog/sold-out-reference.png'],
        specs: []
    }
];
