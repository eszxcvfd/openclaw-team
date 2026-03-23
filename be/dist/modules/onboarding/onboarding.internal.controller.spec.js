"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const constants_1 = require("@nestjs/common/constants");
const agent_scope_decorator_1 = require("../auth/decorators/agent-scope.decorator");
const internal_agent_guard_1 = require("../auth/guards/internal-agent.guard");
const onboarding_internal_controller_1 = require("./onboarding.internal.controller");
const onboarding_service_1 = require("./onboarding.service");
describe('OnboardingInternalController', () => {
    let controller;
    let service;
    beforeEach(async () => {
        service = {
            getFaqItems: jest.fn(),
            getSupportContacts: jest.fn(),
            getChecklistItems: jest.fn(),
            completeChecklistTask: jest.fn(),
        };
        const module = await testing_1.Test.createTestingModule({
            controllers: [onboarding_internal_controller_1.OnboardingInternalController],
            providers: [
                {
                    provide: onboarding_service_1.OnboardingService,
                    useValue: service,
                },
            ],
        })
            .overrideGuard(internal_agent_guard_1.InternalAgentGuard)
            .useValue({ canActivate: () => true })
            .compile();
        controller = module.get(onboarding_internal_controller_1.OnboardingInternalController);
    });
    it('should be defined', () => {
        expect(controller).toBeDefined();
    });
    describe('getFaq', () => {
        it('should delegate to onboarding service', async () => {
            const mockResult = [
                {
                    id: 'faq-1',
                    category: 'policy',
                    audience: 'all',
                    question: 'How do I request equipment?',
                    answer: 'Open a ticket.',
                },
            ];
            service.getFaqItems.mockResolvedValue(mockResult);
            await expect(controller.getFaq()).resolves.toEqual(mockResult);
            expect(service.getFaqItems).toHaveBeenCalledTimes(1);
        });
        it('should expose a guarded GET /faq route with onboarding scope', () => {
            expect(Reflect.getMetadata(constants_1.PATH_METADATA, onboarding_internal_controller_1.OnboardingInternalController)).toBe('internal/tools/onboarding');
            expect(Reflect.getMetadata(constants_1.PATH_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getFaq)).toBe('faq');
            expect(Reflect.getMetadata(constants_1.METHOD_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getFaq)).toBe(common_1.RequestMethod.GET);
            expect(Reflect.getMetadata(constants_1.GUARDS_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getFaq)).toContain(internal_agent_guard_1.InternalAgentGuard);
            expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, onboarding_internal_controller_1.OnboardingInternalController.prototype.getFaq)).toEqual(['read:onboarding']);
        });
    });
    describe('getSupportContacts', () => {
        it('should delegate to onboarding service', async () => {
            const mockResult = [
                {
                    id: 'contact-1',
                    name: 'IT Helpdesk',
                    departmentName: 'Technology',
                    roleTitle: 'Support Engineer',
                    email: 'it@example.com',
                    phone: '123456789',
                    supportType: 'it',
                },
            ];
            service.getSupportContacts.mockResolvedValue(mockResult);
            await expect(controller.getSupportContacts()).resolves.toEqual(mockResult);
            expect(service.getSupportContacts).toHaveBeenCalledTimes(1);
        });
        it('should expose a guarded GET /contacts/support route with onboarding scope', () => {
            expect(Reflect.getMetadata(constants_1.PATH_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getSupportContacts)).toBe('contacts/support');
            expect(Reflect.getMetadata(constants_1.METHOD_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getSupportContacts)).toBe(common_1.RequestMethod.GET);
            expect(Reflect.getMetadata(constants_1.GUARDS_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getSupportContacts)).toContain(internal_agent_guard_1.InternalAgentGuard);
            expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, onboarding_internal_controller_1.OnboardingInternalController.prototype.getSupportContacts)).toEqual(['read:onboarding']);
        });
    });
    describe('getChecklist', () => {
        it('should delegate to onboarding service with the token user id', async () => {
            const mockResult = [
                {
                    taskId: 'task-1',
                    taskName: 'Read the handbook',
                    description: 'Review company onboarding guide.',
                    status: 'pending',
                    dueDay: 1,
                    required: true,
                    orderNo: 1,
                },
            ];
            service.getChecklistItems.mockResolvedValue(mockResult);
            await expect(controller.getChecklist({ internalAgent: { userId: 'user-1' } })).resolves.toEqual(mockResult);
            expect(service.getChecklistItems).toHaveBeenCalledWith('user-1');
        });
        it('should expose a guarded GET /me/checklist route with checklist read scope', () => {
            expect(Reflect.getMetadata(constants_1.PATH_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getChecklist)).toBe('me/checklist');
            expect(Reflect.getMetadata(constants_1.METHOD_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getChecklist)).toBe(common_1.RequestMethod.GET);
            expect(Reflect.getMetadata(constants_1.GUARDS_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.getChecklist)).toContain(internal_agent_guard_1.InternalAgentGuard);
            expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, onboarding_internal_controller_1.OnboardingInternalController.prototype.getChecklist)).toEqual(['read:checklist']);
        });
    });
    describe('completeChecklistTask', () => {
        it('should delegate to onboarding service with token user id, task id, and note', async () => {
            const mockResult = {
                taskId: '550e8400-e29b-41d4-a716-446655440000',
                status: 'completed',
                completedAt: '2026-03-21T14:30:00.000Z',
            };
            service.completeChecklistTask.mockResolvedValue(mockResult);
            await expect(controller.completeChecklistTask({ internalAgent: { userId: 'user-1' } }, '550e8400-e29b-41d4-a716-446655440000', { note: 'Done with HR' })).resolves.toEqual(mockResult);
            expect(service.completeChecklistTask).toHaveBeenCalledWith('user-1', '550e8400-e29b-41d4-a716-446655440000', 'Done with HR');
        });
        it('should expose a guarded POST /me/checklist/:taskId/complete route with checklist write scope', () => {
            expect(Reflect.getMetadata(constants_1.PATH_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.completeChecklistTask)).toBe('me/checklist/:taskId/complete');
            expect(Reflect.getMetadata(constants_1.METHOD_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.completeChecklistTask)).toBe(common_1.RequestMethod.POST);
            expect(Reflect.getMetadata(constants_1.GUARDS_METADATA, onboarding_internal_controller_1.OnboardingInternalController.prototype.completeChecklistTask)).toContain(internal_agent_guard_1.InternalAgentGuard);
            expect(Reflect.getMetadata(agent_scope_decorator_1.AGENT_SCOPE_KEY, onboarding_internal_controller_1.OnboardingInternalController.prototype.completeChecklistTask)).toEqual(['write:checklist']);
        });
        it('should validate taskId with ParseUUIDPipe metadata', async () => {
            const pipe = new common_1.ParseUUIDPipe();
            await expect(pipe.transform('not-a-uuid', {
                type: 'param',
                metatype: String,
                data: 'taskId',
            })).rejects.toBeInstanceOf(common_1.BadRequestException);
        });
    });
});
//# sourceMappingURL=onboarding.internal.controller.spec.js.map