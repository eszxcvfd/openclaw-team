"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
const trace_id_1 = require("../utils/trace-id");
let HttpExceptionFilter = class HttpExceptionFilter {
    catch(exception, host) {
        const http = host.switchToHttp();
        const request = http.getRequest();
        const response = http.getResponse();
        const traceId = (0, trace_id_1.resolveTraceId)(request, response);
        const status = exception instanceof common_1.HttpException
            ? exception.getStatus()
            : common_1.HttpStatus.INTERNAL_SERVER_ERROR;
        const payload = this.buildErrorPayload(exception, status);
        response.status(status).json({
            success: false,
            error: payload,
            meta: {
                traceId,
            },
        });
    }
    buildErrorPayload(exception, status) {
        if (!(exception instanceof common_1.HttpException)) {
            return {
                code: 'INTERNAL_ERROR',
                message: 'Da xay ra loi noi bo.',
                details: {},
            };
        }
        const response = exception.getResponse();
        const defaultCode = this.mapStatusToCode(status);
        if (typeof response === 'string') {
            return {
                code: defaultCode,
                message: response,
                details: {},
            };
        }
        if (typeof response === 'object' && response !== null) {
            const errorResponse = response;
            const message = errorResponse.message;
            return {
                code: typeof errorResponse.code === 'string'
                    ? errorResponse.code
                    : defaultCode,
                message: Array.isArray(message)
                    ? message.join(', ')
                    : typeof message === 'string'
                        ? message
                        : exception.message,
                details: errorResponse.details ??
                    (Array.isArray(message) ? { messages: message } : {}),
            };
        }
        return {
            code: defaultCode,
            message: exception.message,
            details: {},
        };
    }
    mapStatusToCode(status) {
        switch (status) {
            case common_1.HttpStatus.BAD_REQUEST:
                return 'VALIDATION_ERROR';
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            default:
                return 'INTERNAL_ERROR';
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map