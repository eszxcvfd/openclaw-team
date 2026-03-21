"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfig = void 0;
const redisConfig = () => ({
    redis: {
        url: process.env.REDIS_URL || '',
    },
});
exports.redisConfig = redisConfig;
//# sourceMappingURL=redis.config.js.map