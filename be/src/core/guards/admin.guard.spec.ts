import {
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;

  beforeEach(() => {
    guard = new AdminGuard();
  });

  function createContext(user: unknown): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    } as ExecutionContext;
  }

  it('allows admin users from JWT role payload', () => {
    const context = createContext({
      role: {
        code: 'admin',
      },
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows security admins from flattened session payload', () => {
    const context = createContext({
      roleCode: 'security_admin',
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('rejects non-admin users', () => {
    const context = createContext({
      role: {
        code: 'employee',
      },
    });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
