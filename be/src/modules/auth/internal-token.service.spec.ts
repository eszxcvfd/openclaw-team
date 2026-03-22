import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { InternalTokenService } from './internal-token.service';
import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';

describe('InternalTokenService', () => {
  let service: InternalTokenService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InternalTokenService,
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InternalTokenService>(InternalTokenService);
    jwtService = module.get<JwtService>(JwtService);
    
    process.env.JWT_INTERNAL_SECRET = 'test-internal-secret';
    process.env.JWT_ACCESS_SECRET = 'test-access-secret';
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createToken', () => {
    it('should create a signed JWT with the correct payload', async () => {
      const mockToken = 'mock-internal-token';
      (jwtService.signAsync as jest.Mock).mockResolvedValue(mockToken);

      const result = await service.createToken(
        'onboarding_assistant',
        'user-1',
        'conv-1',
        ['read:onboarding']
      );

      expect(jwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: 'onboarding_assistant',
          userId: 'user-1',
          conversationId: 'conv-1',
          scope: ['read:onboarding'],
          jti: expect.any(String),
        }),
        expect.objectContaining({
          secret: 'test-internal-secret',
          expiresIn: 300,
        })
      );
      expect(result).toBe(mockToken);
    });

    it('should throw InternalServerErrorException if secret is missing', async () => {
      delete process.env.JWT_INTERNAL_SECRET;

      await expect(service.createToken('agent', 'user', 'conv', []))
        .rejects.toThrow(InternalServerErrorException);
    });

    it('should throw if internal secret matches access secret', async () => {
      process.env.JWT_INTERNAL_SECRET = 'same-secret';
      process.env.JWT_ACCESS_SECRET = 'same-secret';

      await expect(service.createToken('agent', 'user', 'conv', []))
        .rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('verifyToken', () => {
    it('should verify and return the payload', async () => {
      const mockPayload = { agent: 'agent' };
      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);

      const result = await service.verifyToken('token');

      expect(jwtService.verifyAsync).toHaveBeenCalledWith('token', {
        secret: 'test-internal-secret',
      });
      expect(result).toEqual(mockPayload);
    });

    it('should throw InternalServerErrorException if verification fails', async () => {
      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid'));

      await expect(service.verifyToken('invalid-token'))
        .rejects.toThrow(UnauthorizedException);
    });
  });
});
