"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolGatewayModule = void 0;
const common_1 = require("@nestjs/common");
const tool_call_logging_interceptor_1 = require("./tool-call-logging.interceptor");
const tool_call_logger_service_1 = require("./tool-call-logger.service");
const tool_call_log_metadata_resolver_1 = require("./tool-call-log-metadata.resolver");
let ToolGatewayModule = class ToolGatewayModule {
};
exports.ToolGatewayModule = ToolGatewayModule;
exports.ToolGatewayModule = ToolGatewayModule = __decorate([
    (0, common_1.Module)({
        providers: [
            tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver,
            tool_call_logger_service_1.ToolCallLoggerService,
            tool_call_logging_interceptor_1.ToolCallLoggingInterceptor,
        ],
        exports: [
            tool_call_log_metadata_resolver_1.ToolCallLogMetadataResolver,
            tool_call_logger_service_1.ToolCallLoggerService,
            tool_call_logging_interceptor_1.ToolCallLoggingInterceptor,
        ],
    })
], ToolGatewayModule);
//# sourceMappingURL=tool-gateway.module.js.map