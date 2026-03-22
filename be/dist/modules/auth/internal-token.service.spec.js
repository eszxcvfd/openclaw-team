"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const testing_1 = require("@nestjs/testing");
const jwt_1 = require("@nestjs/jwt");
const internal_token_service_1 = require("./internal-token.service");
const common_1 = require("@nestjs/common");
describe('InternalTokenService', () => {
    let service;
    let jwtService;
    beforeEach(async () => {
        const module = await testing_1.Test.createTestingModule({
            providers: [
                internal_token_service_1.InternalTokenService,
                {
                    provide: jwt_1.JwtService,
                    useValue: {
                        signAsync: jest.fn(),
                        verifyAsync: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get(internal_token_service_1.InternalTokenService);
        jwtService = module.get(jwt_1.JwtService);
        process.env.JWT_INTERNAL_SECRET = 'test-internal-secret';
        process.env.JWT_ACCESS_SECRET = 'test-access-secret';
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
    describe('createToken', () => {
        it('should create a signed JWT with the correct payload', async () => {
            const mockToken = 'mock-internal-token';
            jwtService.signAsync.mockResolvedValue(mockToken);
            const result = await service.createToken('onboarding_assistant', 'user-1', 'conv-1', ['read:onboarding']);
            expect(jwtService.signAsync).toHaveBeenCalledWith(expect.objectContaining({
                agent: 'onboarding_assistant',
                userId: 'user-1',
                conversationId: 'conv-1',
                scope: ['read:onboarding'],
                jti: expect.any(String),
            }), expect.objectContaining({
                secret: 'test-internal-secret',
                expiresIn: 300,
            }));
            expect(result).toBe(mockToken);
        });
        it('should throw InternalServerErrorException if secret is missing', async () => {
            delete process.env.JWT_INTERNAL_SECRET;
            await expect(service.createToken('agent', 'user', 'conv', []))
                .rejects.toThrow(common_1.InternalServerErrorException);
        });
        it('should throw if internal secret matches access secret', async () => {
            process.env.JWT_INTERNAL_SECRET = 'same-secret';
            process.env.JWT_ACCESS_SECRET = 'same-secret';
            await expect(service.createToken('agent', 'user', 'conv', []))
                .rejects.toThrow(common_1.InternalServerErrorException);
        });
    });
    describe('verifyToken', () => {
        it('should verify and return the payload', async () => {
            const mockPayload = { agent: 'agent' };
            jwtService.verifyAsync.mockResolvedValue(mockPayload);
            const result = await service.verifyToken('token');
            expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
                secret: 'test-internal-secret',
            });
            expect(result).toEqual(mockPayload);
        });
        it('should throw InternalServerErrorException if verification fails', async () => {
            jwtService.verifyAsync.mockRejectedValue(new Error('Invalid'));
            await expect(service.verifyToken('invalid-token'))
                .rejects.toThrow(common_1.UnauthorizedException);
        });
    });
});
//# sourceMappingURL=internal-token.service.spec.js.map