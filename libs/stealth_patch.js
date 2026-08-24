// [video_kb patch] stealth.min.js 的现代补充：修补新版风控常查的指纹点。
// 与原 stealth.min.js 叠加使用（其基于旧版 puppeteer-extra-stealth，部分补丁已过时）。
(() => {
    'use strict';

    // 1. navigator.webdriver —— 双保险（playwright CDP 模式下可能残留 true）
    try {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
        delete Navigator.prototype.webdriver;
    } catch (e) {}

    // 2. window.chrome 运行时 —— 真实 Chrome 必有，爬虫常为 undefined
    if (!window.chrome) {
        window.chrome = { runtime: {}, loadTimes: function () {}, csi: function () {} };
    }

    // 3. permissions.query 对 notification 状态的处理（headless 特征）
    try {
        const originalQuery = window.navigator.permissions && window.navigator.permissions.query;
        if (originalQuery) {
            window.navigator.permissions.query = (parameters) => (
                parameters && parameters.name === 'notifications'
                    ? Promise.resolve({ state: Notification.permission })
                    : originalQuery(parameters)
            );
        }
    } catch (e) {}

    // 4. plugins/mimeTypes —— 空数组是典型自动化特征，填充常见插件形状
    try {
        if (navigator.plugins.length === 0) {
            const fakePlugins = [
                { name: 'PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chrome PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Chromium PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'Microsoft Edge PDF Viewer', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                { name: 'WebKit built-in PDF', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
            ];
            Object.defineProperty(navigator, 'plugins', {
                get: () => Object.setPrototypeOf(fakePlugins, PluginArray.prototype),
                configurable: true,
            });
        }
    } catch (e) {}

    // 5. languages —— 保证非空且与中文用户一致
    try {
        Object.defineProperty(navigator, 'languages', {
            get: () => ['zh-CN', 'zh', 'en-US', 'en'],
            configurable: true,
        });
    } catch (e) {}

    // 6. WebGL vendor/renderer —— SwiftShader/空值是 headless 铁证
    try {
        const patchGL = (proto) => {
            if (!proto) return;
            const getParameter = proto.getParameter;
            proto.getParameter = function (parameter) {
                // UNMASKED_VENDOR_WEBGL / UNMASKED_RENDERER_WEBGL
                if (parameter === 37445) return 'Google Inc. (Apple)';
                if (parameter === 37446) return 'ANGLE (Apple, ANGLE Metal Renderer: Apple M1, Unspecified Version)';
                return getParameter.call(this, parameter);
            };
        };
        patchGL(WebGLRenderingContext.prototype);
        patchGL(window.WebGL2RenderingContext && WebGL2RenderingContext.prototype);
    } catch (e) {}

    // 7. hairline 特征（devicePixelRatio 相关检测）
    try {
        Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
            get: new Proxy(Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight').get, {
                apply(target, thisArg, args) {
                    const v = Reflect.apply(target, thisArg, args);
                    return v === 0 && thisArg.style && thisArg.style.height === '1px' ? 1 : v;
                },
            }),
            configurable: true,
        });
    } catch (e) {}

    // 8. 屏蔽 Playwright/CDP 在 console 侧留下的自动化痕迹
    try {
        for (const key of Object.keys(window)) {
            if (/^(cdc_|__webdriver|__driver|__playwright|__pw_manual)/i.test(key)) {
                try { delete window[key]; } catch (e) { window[key] = undefined; }
            }
        }
        if (window.document) {
            for (const key of Object.keys(document)) {
                if (/^cdc_/i.test(key)) { try { delete document[key]; } catch (e) {} }
            }
        }
    } catch (e) {}
})();
