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
exports.OnboardingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let OnboardingService = class OnboardingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getFaqItems() {
        const faqItems = await this.prisma.faq_items.findMany({
            where: {
                is_active: true,
            },
            select: {
                id: true,
                category: true,
                audience: true,
                question: true,
                answer: true,
            },
            orderBy: [{ category: 'asc' }, { question: 'asc' }],
        });
        return faqItems.map((faqItem) => ({
            id: faqItem.id,
            category: faqItem.category,
            audience: faqItem.audience,
            question: faqItem.question,
            answer: faqItem.answer,
        }));
    }
    async getSupportContacts() {
        const contacts = await this.prisma.contacts_directory.findMany({
            where: {
                is_active: true,
            },
            select: {
                id: true,
                name: true,
                role_title: true,
                email: true,
                phone: true,
                support_type: true,
                departments: {
                    select: {
                        name: true,
                    },
                },
            },
            orderBy: [{ support_type: 'asc' }, { name: 'asc' }],
        });
        return contacts.map((contact) => ({
            id: contact.id,
            name: contact.name,
            departmentName: contact.departments?.name ?? null,
            roleTitle: contact.role_title,
            email: contact.email,
            phone: contact.phone,
            supportType: contact.support_type,
        }));
    }
    async getChecklistItems(userId) {
        const checklistItems = await this.prisma.user_onboarding_tasks.findMany({
            where: {
                user_id: userId,
                status: 'pending',
            },
            select: {
                status: true,
                onboarding_tasks: {
                    select: {
                        id: true,
                        task_name: true,
                        description: true,
                        due_day: true,
                        required: true,
                        order_no: true,
                    },
                },
            },
            orderBy: [
                { onboarding_tasks: { order_no: 'asc' } },
                { onboarding_tasks: { task_name: 'asc' } },
            ],
        });
        return checklistItems.map((item) => ({
            taskId: item.onboarding_tasks.id,
            taskName: item.onboarding_tasks.task_name,
            description: item.onboarding_tasks.description,
            status: item.status,
            dueDay: item.onboarding_tasks.due_day,
            required: item.onboarding_tasks.required,
            orderNo: item.onboarding_tasks.order_no,
        }));
    }
    async completeChecklistTask(userId, taskId, note) {
        const existingAssignment = await this.prisma.user_onboarding_tasks.findUnique({
            where: {
                user_id_onboarding_task_id: {
                    user_id: userId,
                    onboarding_task_id: taskId,
                },
            },
            select: {
                id: true,
                user_id: true,
                onboarding_task_id: true,
                status: true,
                completed_at: true,
            },
        });
        if (!existingAssignment) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Checklist task not found.',
                details: {},
            });
        }
        if (existingAssignment.status === 'completed') {
            return {
                taskId: existingAssignment.onboarding_task_id,
                status: existingAssignment.status,
                completedAt: existingAssignment.completed_at?.toISOString() ?? null,
            };
        }
        const completedAt = new Date();
        const updatedAssignment = await this.prisma.user_onboarding_tasks.update({
            where: {
                user_id_onboarding_task_id: {
                    user_id: userId,
                    onboarding_task_id: taskId,
                },
            },
            data: {
                status: 'completed',
                completed_at: completedAt,
                notes: note,
            },
            select: {
                onboarding_task_id: true,
                status: true,
                completed_at: true,
            },
        });
        return {
            taskId: updatedAssignment.onboarding_task_id,
            status: updatedAssignment.status,
            completedAt: updatedAssignment.completed_at?.toISOString() ?? null,
        };
    }
};
exports.OnboardingService = OnboardingService;
exports.OnboardingService = OnboardingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OnboardingService);
//# sourceMappingURL=onboarding.service.js.map