"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
const appConfig = () => ({
    app: {
        name: 'openclaw-backend',
        port: Number(process.env.PORT) || 3001,
    },
});
exports.appConfig = appConfig;
//# sourceMappingURL=app.config.js.map