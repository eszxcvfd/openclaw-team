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
exports.OpenclawService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let OpenclawService = class OpenclawService {
    configService;
    constructor(configService) {
        this.configService = configService;
    }
    async run(request) {
        const baseUrl = this.configService.get('openclaw.baseUrl')?.trim();
        const apiKey = this.configService.get('openclaw.apiKey')?.trim();
        if (!baseUrl) {
            throw new common_1.ServiceUnavailableException({
                code: 'OPENCLAW_TIMEOUT',
                message: 'OpenClaw base URL is not configured.',
                details: {},
            });
        }
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/run`, {
            method: 'POST',
            headers: this.buildHeaders(apiKey),
            body: JSON.stringify(request),
        });
        if (!response.ok) {
            throw new common_1.ServiceUnavailableException({
                code: 'OPENCLAW_TIMEOUT',
                message: 'OpenClaw request failed.',
                details: {
                    status: response.status,
                },
            });
        }
        const payload = (await response.json());
        return {
            text: this.readString(payload, [
                ['text'],
                ['finalAnswer'],
                ['answer'],
                ['data', 'text'],
                ['data', 'finalAnswer'],
                ['data', 'answer'],
            ]),
            uiPayload: this.readObject(payload, [
                ['uiPayload'],
                ['data', 'uiPayload'],
                ['metadata', 'uiPayload'],
            ]),
        };
    }
    buildHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        };
    }
    readString(source, paths) {
        for (const path of paths) {
            const value = this.readPath(source, path);
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
        }
        return '';
    }
    readObject(source, paths) {
        for (const path of paths) {
            const value = this.readPath(source, path);
            if (value && typeof value === 'object' && !Array.isArray(value)) {
                return value;
            }
        }
        return null;
    }
    readPath(source, path) {
        let current = source;
        for (const key of path) {
            if (!current || typeof current !== 'object' || Array.isArray(current)) {
                return undefined;
            }
            current = current[key];
        }
        return current;
    }
};
exports.OpenclawService = OpenclawService;
exports.OpenclawService = OpenclawService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], OpenclawService);
//# sourceMappingURL=openclaw.service.js.map