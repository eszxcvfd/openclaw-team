"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveTraceId = resolveTraceId;
const node_crypto_1 = require("node:crypto");
function resolveTraceId(request, response) {
    const traceAwareRequest = request;
    const headerValue = request.headers['x-trace-id'];
    const traceIdFromHeader = typeof headerValue === 'string'
        ? headerValue
        : Array.isArray(headerValue)
            ? headerValue[0]
            : undefined;
    const traceId = traceIdFromHeader?.trim() || traceAwareRequest.traceId || (0, node_crypto_1.randomUUID)();
    traceAwareRequest.traceId = traceId;
    response?.setHeader('X-Trace-Id', traceId);
    return traceId;
}
//# sourceMappingURL=trace-id.js.map