"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolCallLoggingInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const tool_call_logger_service_1 = require("./tool-call-logger.service");
let ToolCallLoggingInterceptor = class ToolCallLoggingInterceptor {
    toolCallLogger;
    constructor(toolCallLogger) {
        this.toolCallLogger = toolCallLogger;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        if (!this.isInternalToolRequest(request)) {
            return next.handle();
        }
        const startedAt = new Date();
        return next.handle().pipe((0, rxjs_1.mergeMap)((data) => (0, rxjs_1.from)(this.toolCallLogger.logExecutionResult({
            request,
            responsePayload: data,
            startedAt,
            verifiedPayload: request.internalAgent,
        })).pipe((0, rxjs_1.mergeMap)(() => [data]))), (0, rxjs_1.catchError)((error) => (0, rxjs_1.from)(this.toolCallLogger.logExecutionResult({
            request,
            error,
            startedAt,
            verifiedPayload: request.internalAgent,
        })).pipe((0, rxjs_1.mergeMap)(() => (0, rxjs_1.throwError)(() => error)))));
    }
    isInternalToolRequest(request) {
        const route = request.originalUrl ?? request.url ?? '';
        return (route.startsWith('/internal/tools/') ||
            route.startsWith('/api/quiz/submit') ||
            /\/api\/quiz\/[^/]+\/result(?:\?|$)/.test(route));
    }
};
exports.ToolCallLoggingInterceptor = ToolCallLoggingInterceptor;
exports.ToolCallLoggingInterceptor = ToolCallLoggingInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [tool_call_logger_service_1.ToolCallLoggerService])
], ToolCallLoggingInterceptor);
//# sourceMappingURL=tool-call-logging.interceptor.js.map