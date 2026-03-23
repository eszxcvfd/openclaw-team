"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const tool_call_logging_interceptor_1 = require("./tool-call-logging.interceptor");
describe('ToolCallLoggingInterceptor', () => {
    const toolCallLogger = {
        logExecutionResult: jest.fn().mockResolvedValue(undefined),
    };
    const interceptor = new tool_call_logging_interceptor_1.ToolCallLoggingInterceptor(toolCallLogger);
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('logs successful internal tool executions', async () => {
        const request = {
            originalUrl: '/internal/tools/onboarding/faq',
            internalAgent: {
                agent: 'onboarding',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: ['read:onboarding'],
                jti: 'jti-1',
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const next = {
            handle: () => (0, rxjs_1.of)({ ok: true }),
        };
        await new Promise((resolve, reject) => {
            interceptor.intercept(context, next).subscribe({
                next: (value) => {
                    expect(value).toEqual({ ok: true });
                },
                error: reject,
                complete: resolve,
            });
        });
        expect(toolCallLogger.logExecutionResult).toHaveBeenCalledTimes(1);
        expect(toolCallLogger.logExecutionResult).toHaveBeenCalledWith(expect.objectContaining({
            request,
            responsePayload: { ok: true },
        }));
    });
    it('logs failures after guard and rethrows the error', async () => {
        const request = {
            originalUrl: '/internal/tools/onboarding/faq',
            internalAgent: {
                agent: 'onboarding',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: ['read:onboarding'],
                jti: 'jti-1',
            },
        };
        const context = {
            switchToHttp: () => ({
                getRequest: () => request,
            }),
        };
        const next = {
            handle: () => (0, rxjs_1.throwError)(() => new common_1.ForbiddenException({
                code: 'FORBIDDEN',
                message: 'No access.',
            })),
        };
        await new Promise((resolve) => {
            interceptor.intercept(context, next).subscribe({
                next: () => resolve(),
                error: (error) => {
                    expect(error).toBeInstanceOf(common_1.ForbiddenException);
                    resolve();
                },
            });
        });
        expect(toolCallLogger.logExecutionResult).toHaveBeenCalledTimes(1);
        expect(toolCallLogger.logExecutionResult).toHaveBeenCalledWith(expect.objectContaining({
            request,
            error: expect.any(common_1.ForbiddenException),
        }));
    });
    it('ignores non internal-tool routes', async () => {
        const context = {
            switchToHttp: () => ({
                getRequest: () => ({
                    originalUrl: '/auth/login',
                }),
            }),
        };
        const next = {
            handle: () => (0, rxjs_1.of)({ ok: true }),
        };
        await new Promise((resolve, reject) => {
            interceptor.intercept(context, next).subscribe({
                error: reject,
                complete: resolve,
            });
        });
        expect(toolCallLogger.logExecutionResult).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=tool-call-logging.interceptor.spec.js.map