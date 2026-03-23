"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const helmet_1 = __importDefault(require("helmet"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const success_response_interceptor_1 = require("./common/interceptors/success-response.interceptor");
const tool_call_logging_interceptor_1 = require("./modules/tool-gateway/tool-call-logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.use((0, helmet_1.default)());
    app.enableCors();
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(app.get(tool_call_logging_interceptor_1.ToolCallLoggingInterceptor), new success_response_interceptor_1.SuccessResponseInterceptor());
    const port = Number(process.env.PORT) || 3001;
    await app.listen(port);
    console.log(`Backend server running on http://localhost:${port}`);
}
void bootstrap();
//# sourceMappingURL=main.js.map