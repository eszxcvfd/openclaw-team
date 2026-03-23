"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const admin_guard_1 = require("./admin.guard");
describe('AdminGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new admin_guard_1.AdminGuard();
    });
    function createContext(user) {
        return {
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
        };
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
        expect(() => guard.canActivate(context)).toThrow(common_1.ForbiddenException);
    });
});
//# sourceMappingURL=admin.guard.spec.js.map