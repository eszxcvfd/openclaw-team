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
exports.InternalTokenService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const node_crypto_1 = require("node:crypto");
let InternalTokenService = class InternalTokenService {
    jwtService;
    constructor(jwtService) {
        this.jwtService = jwtService;
    }
    async createToken(agentGroup, userId, conversationId, scopes) {
        const internalSecret = this.getInternalSecret();
        const payload = {
            agent: agentGroup,
            userId,
            conversationId,
            scope: scopes,
            jti: (0, node_crypto_1.randomUUID)(),
        };
        return this.jwtService.signAsync(payload, {
            secret: internalSecret,
            expiresIn: 300,
        });
    }
    async verifyToken(token) {
        const internalSecret = this.getInternalSecret();
        try {
            return await this.jwtService.verifyAsync(token, {
                secret: internalSecret,
            });
        }
        catch (error) {
            throw new common_1.UnauthorizedException({
                code: 'UNAUTHORIZED',
                message: 'Invalid or expired internal security token.',
                details: {},
            });
        }
    }
    getInternalSecret() {
        const internalSecret = process.env.JWT_INTERNAL_SECRET?.trim();
        const accessSecret = process.env.JWT_ACCESS_SECRET?.trim();
        if (!internalSecret) {
            throw new common_1.InternalServerErrorException({
                code: 'INTERNAL_ERROR',
                message: 'Internal AI Security secret is not configured.',
            });
        }
        if (accessSecret && internalSecret === accessSecret) {
            throw new common_1.InternalServerErrorException({
                code: 'INTERNAL_ERROR',
                message: 'Internal AI Security secret must differ from access token secret.',
            });
        }
        return internalSecret;
    }
};
exports.InternalTokenService = InternalTokenService;
exports.InternalTokenService = InternalTokenService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [jwt_1.JwtService])
], InternalTokenService);
//# sourceMappingURL=internal-token.service.js.map