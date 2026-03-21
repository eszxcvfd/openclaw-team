"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbConfig = void 0;
const dbConfig = () => ({
    db: {
        url: process.env.DATABASE_URL || '',
    },
});
exports.dbConfig = dbConfig;
//# sourceMappingURL=db.config.js.map