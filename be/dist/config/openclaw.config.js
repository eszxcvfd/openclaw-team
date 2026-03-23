"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.openclawConfig = void 0;
const openclawConfig = () => ({
    openclaw: {
        baseUrl: process.env.OPENCLAW_BASE_URL || '',
        apiKey: process.env.OPENCLAW_API_KEY || '',
    },
});
exports.openclawConfig = openclawConfig;
//# sourceMappingURL=openclaw.config.js.map