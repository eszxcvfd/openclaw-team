import { ValidationPipe } from '@nestjs/common';
import { INestApplication } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';

import { HttpExceptionFilter } from '../../common/filters/http-exception.filter';
import { SuccessResponseInterceptor } from '../../common/interceptors/success-response.interceptor';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { hashPassword } from '../../modules/auth/auth-password.util';
import { AuthController } from '../../modules/auth/auth.controller';
import { AuthService } from '../../modules/auth/auth.service';

describe('AuthController', () => {
  let app: INestApplication;

  const prismaService = {
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({})],
      controllers: [AuthController],
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new SuccessResponseInterceptor());

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
    process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';
    process.env.JWT_ACCESS_TTL_SECONDS = '3600';
    process.env.JWT_REFRESH_TTL_SECONDS = '604800';
  });

  it('wraps login success response with trace id metadata', async () => {
    const passwordHash = await hashPassword('OpenClaw#2026');

    prismaService.users.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'manager@openclaw.local',
      password_hash: passwordHash,
      full_name: 'Manager Two',
      status: 'active',
      deleted_at: null,
      departments: {
        code: 'ops',
        name: 'Operations',
      },
      user_roles: [
        {
          roles: {
            code: 'manager',
            name: 'Manager',
          },
        },
      ],
    });
    prismaService.users.update.mockResolvedValue(undefined);

    const response = await request(app.getHttpServer())
      .post('/auth/login')
      .set('X-Trace-Id', 'trace-auth-001')
      .send({
        email: 'manager@openclaw.local',
        password: 'OpenClaw#2026',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        user: {
          email: 'manager@openclaw.local',
          role: 'Manager',
          department: 'Operations',
        },
      },
      meta: {
        traceId: 'trace-auth-001',
      },
    });
    expect(response.body.data.tokens).toMatchObject({
      userAccessToken: expect.any(String),
      refreshToken: expect.any(String),
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });

  it('returns standardized unauthorized response on invalid password', async () => {
    const passwordHash = await hashPassword('Correct#Password1');

    prismaService.users.findUnique.mockResolvedValue({
      id: 'user-3',
      email: 'employee@openclaw.local',
      password_hash: passwordHash,
      full_name: 'Employee Three',
      status: 'active',
      deleted_at: null,
      departments: null,
      user_roles: [],
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'employee@openclaw.local',
      password: 'Wrong#Password1',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error.code).toBe('UNAUTHORIZED');
    expect(response.body.meta.traceId).toBeDefined();
  });

  it('returns standardized unauthorized response for inactive users', async () => {
    const passwordHash = await hashPassword('Inactive#Password1');

    prismaService.users.findUnique.mockResolvedValue({
      id: 'user-4',
      email: 'inactive@openclaw.local',
      password_hash: passwordHash,
      full_name: 'Inactive Employee',
      status: 'inactive',
      deleted_at: null,
      departments: null,
      user_roles: [],
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'inactive@openclaw.local',
      password: 'Inactive#Password1',
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Email hoac mat khau khong hop le.',
      },
    });
  });
});
