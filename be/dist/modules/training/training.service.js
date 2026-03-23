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
exports.TrainingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../infra/prisma/prisma.service");
let TrainingService = class TrainingService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getTrainingRecommendationsForUser(userId) {
        const snapshot = await this.getLearningRecommendationSnapshot(userId);
        if (snapshot.requirements.length === 0) {
            const fallbackTemplate = await this.findPreferredLearningPathTemplate(snapshot.user, undefined);
            return this.buildFallbackRecommendationsFromTemplate(fallbackTemplate);
        }
        const completedCourseIds = new Set(snapshot.userCourses
            .filter((course) => course.status === 'completed')
            .map((course) => course.course_id));
        const rankedRecommendations = snapshot.courses
            .filter((course) => course.is_active && !completedCourseIds.has(course.id))
            .map((course) => this.rankCourseRecommendation(course, snapshot.userSkillLevels, snapshot.requirements))
            .filter((course) => Boolean(course))
            .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }
            if (left.course.level_no !== right.course.level_no) {
                return left.course.level_no - right.course.level_no;
            }
            return left.course.title.localeCompare(right.course.title);
        });
        if (rankedRecommendations.length === 0) {
            return this.buildFallbackRecommendationsFromTemplate(await this.findPreferredLearningPathTemplate(snapshot.user, undefined));
        }
        return rankedRecommendations.map((entry, index) => ({
            courseId: entry.course.id,
            title: entry.course.title,
            reason: entry.reason,
            priority: index + 1,
        }));
    }
    async getLearningPathForUser(userId) {
        const currentPath = await this.prisma.user_learning_paths.findFirst({
            where: {
                user_id: userId,
                status: 'active',
            },
            orderBy: [{ updated_at: 'desc' }, { generated_at: 'desc' }],
            select: {
                id: true,
                status: true,
                generated_payload: true,
                learning_paths: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        target_level: true,
                        learning_path_items: {
                            select: {
                                order_no: true,
                                required: true,
                                courses: {
                                    select: {
                                        id: true,
                                        code: true,
                                        title: true,
                                        duration_hours: true,
                                    },
                                },
                            },
                            orderBy: [{ order_no: 'asc' }],
                        },
                    },
                },
            },
        });
        if (!currentPath) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Learning path not found.',
                details: {},
            });
        }
        return this.mapLearningPathRecord(currentPath);
    }
    async generateLearningPathForUser(userId, input = {}) {
        const snapshot = await this.getLearningRecommendationSnapshot(userId);
        const targetLevel = this.normalizeTargetLevel(input.targetLevel);
        const maxCourses = Math.min(input.maxCourses ?? 5, 20);
        const includeMandatoryCourses = input.includeMandatoryCourses ?? true;
        const template = await this.findPreferredLearningPathTemplate(snapshot.user, targetLevel);
        const recommendations = await this.getTrainingRecommendationsForUser(userId);
        const templateItems = template ? this.mapTemplateItems(template, recommendations) : [];
        const recommendedItems = this.buildGeneratedItemsFromRecommendations(recommendations, snapshot.courses, maxCourses);
        const mergedItems = this.mergeLearningPathItems(includeMandatoryCourses
            ? templateItems
            : templateItems.filter((item) => !item.required), recommendedItems, maxCourses);
        const summary = mergedItems.length > 0
            ? `Bat dau voi ${mergedItems[0].courseTitle}.`
            : 'Hien tai chua co khoa hoc phu hop. Vui long cap nhat ky nang hoac lien he quan ly dao tao.';
        const contextLabel = this.buildLearningPathContextLabel(snapshot.requirements, snapshot.userSkills);
        await this.prisma.user_learning_paths.updateMany({
            where: {
                user_id: userId,
                status: 'active',
            },
            data: {
                status: 'inactive',
            },
        });
        const createdPath = await this.prisma.user_learning_paths.create({
            data: {
                user_id: userId,
                learning_path_id: template?.id ?? null,
                generated_payload: this.toJsonObject({
                    generated: true,
                    summary,
                    contextLabel,
                    items: mergedItems,
                }),
                status: 'active',
            },
            select: {
                id: true,
                status: true,
                generated_payload: true,
                learning_paths: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                        description: true,
                        target_level: true,
                        learning_path_items: {
                            select: {
                                order_no: true,
                                required: true,
                                courses: {
                                    select: {
                                        id: true,
                                        code: true,
                                        title: true,
                                        duration_hours: true,
                                    },
                                },
                            },
                            orderBy: [{ order_no: 'asc' }],
                        },
                    },
                },
            },
        });
        return this.mapLearningPathRecord(createdPath);
    }
    async generateQuizForUser(userId, input = {}) {
        const template = await this.findQuizTemplate(userId, input);
        const selectedQuestions = this.selectQuestions(template.quiz_questions, input);
        if (selectedQuestions.length === 0) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'No quiz questions matched the requested filters.',
                details: {},
            });
        }
        return {
            type: 'quiz',
            version: 1,
            quizId: template.id,
            templateCode: template.code,
            title: template.title,
            difficulty: template.difficulty,
            course: template.courses
                ? {
                    id: template.courses.id,
                    code: template.courses.code,
                    title: template.courses.title,
                }
                : null,
            questionCount: selectedQuestions.length,
            questions: selectedQuestions.map((question) => ({
                id: question.id,
                prompt: question.question_text,
                type: question.question_type,
                options: this.normalizeOptions(question.options_json, question.question_type),
                weight: this.toNumber(question.score_weight),
            })),
        };
    }
    async submitQuizAttempt(userId, input) {
        const assistantMessage = await this.getQuizAssistantMessage(userId, input.assistantMessageId, input.quizId);
        const template = await this.getTemplateById(input.quizId);
        const selectedQuestions = this.selectQuestions(template.quiz_questions, {
            questionCount: template.question_count,
        });
        const grading = this.gradeSubmission(selectedQuestions, input.answers);
        const submittedAt = new Date();
        const submittedAnswers = input.answers.map((answer) => ({
            questionId: answer.questionId,
            answer: this.toJsonValue(answer.answer),
        }));
        const attempt = await this.prisma.quiz_attempts.create({
            data: {
                user_id: userId,
                quiz_template_id: template.id,
                submitted_answers: submittedAnswers,
                score: grading.score,
                duration_seconds: input.durationSeconds ?? null,
                submitted_at: submittedAt,
            },
            select: {
                id: true,
                duration_seconds: true,
                submitted_at: true,
                score: true,
                submitted_answers: true,
                quiz_templates: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        difficulty: true,
                        question_count: true,
                        courses: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                is_active: true,
                            },
                        },
                        quiz_questions: {
                            select: {
                                id: true,
                                question_type: true,
                                question_text: true,
                                options_json: true,
                                answer_key_json: true,
                                score_weight: true,
                            },
                            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
                        },
                    },
                },
            },
        });
        const result = this.mapAttemptResult(attempt);
        await this.persistQuizResultMetadata(assistantMessage, result);
        return result;
    }
    async getQuizAttemptResult(userId, attemptId) {
        const attempt = await this.prisma.quiz_attempts.findFirst({
            where: {
                id: attemptId,
                user_id: userId,
            },
            select: {
                id: true,
                duration_seconds: true,
                submitted_at: true,
                score: true,
                submitted_answers: true,
                quiz_templates: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        difficulty: true,
                        question_count: true,
                        courses: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                is_active: true,
                            },
                        },
                        quiz_questions: {
                            select: {
                                id: true,
                                question_type: true,
                                question_text: true,
                                options_json: true,
                                answer_key_json: true,
                                score_weight: true,
                            },
                            orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
                        },
                    },
                },
            },
        });
        if (!attempt) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Quiz attempt not found.',
                details: {},
            });
        }
        return this.mapAttemptResult(attempt);
    }
    async getLearningRecommendationSnapshot(userId) {
        const user = (await this.prisma.users.findFirst({
            where: {
                id: userId,
            },
            select: {
                id: true,
                position_id: true,
                department_id: true,
            },
        }));
        if (!user) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'User not found.',
                details: {},
            });
        }
        const [userSkills, requirements, userCourses, courses] = await Promise.all([
            this.prisma.user_skills.findMany({
                where: {
                    user_id: userId,
                },
                select: {
                    skill_id: true,
                    level_no: true,
                    skills: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                },
            }),
            user.position_id
                ? this.prisma.role_skill_requirements.findMany({
                    where: {
                        position_id: user.position_id,
                    },
                    orderBy: [{ priority: 'asc' }, { required_level: 'desc' }],
                    select: {
                        skill_id: true,
                        required_level: true,
                        priority: true,
                        skills: {
                            select: {
                                id: true,
                                code: true,
                                name: true,
                            },
                        },
                    },
                })
                : Promise.resolve([]),
            this.prisma.user_courses.findMany({
                where: {
                    user_id: userId,
                },
                select: {
                    course_id: true,
                    status: true,
                },
            }),
            this.prisma.courses.findMany({
                where: {
                    is_active: true,
                },
                select: {
                    id: true,
                    code: true,
                    title: true,
                    description: true,
                    level_no: true,
                    duration_hours: true,
                    is_active: true,
                    course_skills: {
                        select: {
                            skill_id: true,
                            outcome_level: true,
                        },
                    },
                },
            }),
        ]);
        return {
            user,
            userSkills,
            requirements,
            userCourses,
            courses,
            userSkillLevels: new Map(userSkills.map((skill) => [skill.skill_id, skill.level_no])),
        };
    }
    rankCourseRecommendation(course, userSkillLevels, requirements) {
        let score = 0;
        const reasons = [];
        for (const courseSkill of course.course_skills) {
            const requirement = requirements.find((entry) => entry.skill_id === courseSkill.skill_id);
            if (!requirement) {
                continue;
            }
            const userLevel = userSkillLevels.get(courseSkill.skill_id) ?? 0;
            const missingLevel = requirement.required_level - userLevel;
            const reachableLevel = Math.min(courseSkill.outcome_level, requirement.required_level) - userLevel;
            if (missingLevel <= 0 || reachableLevel <= 0) {
                continue;
            }
            score += reachableLevel * 10 + Math.max(0, 5 - requirement.priority);
            reasons.push(`Ban dang thieu ky nang ${requirement.skills?.name ?? 'can thiet'} o muc ${requirement.required_level}.`);
        }
        if (score === 0) {
            return null;
        }
        return {
            course,
            score,
            reason: reasons[0] ?? `Khoa hoc ${course.title} phu hop voi khoang trong ky nang hien tai.`,
        };
    }
    async findPreferredLearningPathTemplate(user, targetLevel) {
        return (await this.prisma.learning_paths.findFirst({
            where: {
                is_active: true,
                position_id: user.position_id ?? undefined,
                department_id: user.department_id ?? undefined,
                target_level: targetLevel,
            },
            orderBy: [{ updated_at: 'desc' }, { created_at: 'desc' }],
            select: {
                id: true,
                code: true,
                name: true,
                description: true,
                target_level: true,
                learning_path_items: {
                    select: {
                        order_no: true,
                        required: true,
                        courses: {
                            select: {
                                id: true,
                                code: true,
                                title: true,
                                duration_hours: true,
                            },
                        },
                    },
                    orderBy: [{ order_no: 'asc' }],
                },
            },
        }));
    }
    buildFallbackRecommendationsFromTemplate(template) {
        if (!template) {
            return [];
        }
        return template.learning_path_items.map((item, index) => ({
            courseId: item.courses.id,
            title: item.courses.title,
            reason: `Khoa hoc nay thuoc lo trinh ${template.name}.`,
            priority: index + 1,
        }));
    }
    mapTemplateItems(template, recommendations) {
        return template.learning_path_items.map((item) => {
            const recommendation = recommendations.find((entry) => entry.courseId === item.courses.id);
            return {
                orderNo: item.order_no,
                courseId: item.courses.id,
                courseCode: item.courses.code,
                courseTitle: item.courses.title,
                required: item.required,
                reason: recommendation?.reason ?? 'Mon nen tang bat buoc',
                estimatedHours: this.toNumber(item.courses.duration_hours),
                status: 'not_started',
            };
        });
    }
    buildGeneratedItemsFromRecommendations(recommendations, courses, maxCourses) {
        return recommendations.slice(0, maxCourses).map((recommendation, index) => {
            const course = courses.find((entry) => entry.id === recommendation.courseId);
            return {
                orderNo: index + 1,
                courseId: recommendation.courseId,
                courseCode: course?.code ?? '',
                courseTitle: recommendation.title,
                required: index === 0,
                reason: recommendation.reason,
                estimatedHours: course ? this.toNumber(course.duration_hours) : null,
                status: 'not_started',
            };
        });
    }
    mergeLearningPathItems(primaryItems, secondaryItems, maxCourses) {
        const seenCourseIds = new Set();
        return [...primaryItems, ...secondaryItems]
            .filter((item) => {
            if (!item.courseId || seenCourseIds.has(item.courseId)) {
                return false;
            }
            seenCourseIds.add(item.courseId);
            return true;
        })
            .slice(0, maxCourses)
            .map((item, index) => ({
            ...item,
            orderNo: index + 1,
        }));
    }
    mapLearningPathRecord(record) {
        const payloadRecord = this.toRecord(record.generated_payload);
        const payloadItems = this.normalizeLearningPathItems(payloadRecord.items);
        const templateItems = record.learning_paths ? this.mapTemplateItems(record.learning_paths, []) : [];
        const items = payloadItems.length > 0
            ? this.mergeLearningPathItems(payloadItems, templateItems, 20)
            : templateItems;
        const name = this.toStringValue(payloadRecord.name, payloadRecord.title, record.learning_paths?.name, record.learning_paths?.code, record.id);
        const summary = this.toStringValue(payloadRecord.summary, items[0] ? `Bat dau voi ${items[0].courseTitle}.` : 'Lo trinh hoc hien tai.');
        const payload = {
            type: 'learning-path',
            version: 1,
            pathId: record.id,
            title: name,
            description: this.toStringValue(payloadRecord.description, record.learning_paths?.description),
            contextLabel: this.toStringValue(payloadRecord.contextLabel, payloadRecord.context_label),
            generated: payloadRecord.generated !== false,
            items,
            summary,
        };
        return {
            id: record.id,
            name,
            generated: payload.generated,
            summary,
            items,
            payload,
        };
    }
    normalizeLearningPathItems(value) {
        if (!Array.isArray(value)) {
            return [];
        }
        const normalizedItems = value.map((item, index) => {
            const record = this.toRecord(item);
            const courseId = this.toStringValue(record.courseId, record.course_id, record.id);
            const courseTitle = this.toStringValue(record.courseTitle, record.course_title, record.title);
            if (!courseId || !courseTitle) {
                return null;
            }
            return {
                orderNo: this.toNumber(record.orderNo ?? record.order_no) || index + 1,
                courseId,
                courseCode: this.toStringValue(record.courseCode, record.course_code),
                courseTitle,
                required: Boolean(record.required),
                reason: this.toStringValue(record.reason, record.summary),
                estimatedHours: this.toNumber(record.estimatedHours ?? record.estimated_hours),
                status: this.toStringValue(record.status, 'not_started'),
            };
        });
        return normalizedItems
            .filter((item) => item !== null)
            .sort((left, right) => left.orderNo - right.orderNo);
    }
    buildLearningPathContextLabel(requirements, userSkills) {
        const userLevels = new Map(userSkills.map((skill) => [skill.skill_id, skill.level_no]));
        const gaps = requirements
            .filter((requirement) => (userLevels.get(requirement.skill_id) ?? 0) < requirement.required_level)
            .slice(0, 3)
            .map((requirement) => requirement.skills?.name ?? requirement.skill_id);
        return gaps.length > 0
            ? `Gap: ${gaps.join(', ')}`
            : 'Lo trinh hoc hien tai phu hop voi ky nang dang co.';
    }
    normalizeTargetLevel(value) {
        const normalized = (value ?? '').trim().toLowerCase();
        if (normalized === 'intern') {
            return 1;
        }
        if (normalized === 'junior') {
            return 2;
        }
        if (normalized === 'mid') {
            return 3;
        }
        if (normalized === 'senior') {
            return 4;
        }
        return undefined;
    }
    async findQuizTemplate(userId, input) {
        if (input.templateId) {
            return this.getTemplateById(input.templateId);
        }
        const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
        const templates = await this.prisma.quiz_templates.findMany({
            where: {
                difficulty: input.difficulty,
                course_id: input.courseId ??
                    (enrolledCourseIds.length > 0 ? { in: enrolledCourseIds } : undefined),
                OR: [{ courses: { is: null } }, { courses: { is: { is_active: true } } }],
            },
            select: {
                id: true,
                code: true,
                title: true,
                difficulty: true,
                question_count: true,
                courses: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        is_active: true,
                    },
                },
                quiz_questions: {
                    select: {
                        id: true,
                        question_type: true,
                        question_text: true,
                        options_json: true,
                        answer_key_json: true,
                        score_weight: true,
                    },
                    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
                },
            },
            orderBy: [{ updated_at: 'desc' }, { title: 'asc' }],
        });
        const filteredTemplates = templates.filter((template) => this.matchesQuestionTypeFilter(template.quiz_questions, input.questionTypes));
        const selectedTemplate = this.pickBestTemplate(filteredTemplates, input.queryText);
        if (!selectedTemplate) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Quiz template not found.',
                details: {},
            });
        }
        return selectedTemplate;
    }
    async getTemplateById(templateId) {
        const template = await this.prisma.quiz_templates.findFirst({
            where: {
                id: templateId,
                OR: [{ courses: { is: null } }, { courses: { is: { is_active: true } } }],
            },
            select: {
                id: true,
                code: true,
                title: true,
                difficulty: true,
                question_count: true,
                courses: {
                    select: {
                        id: true,
                        code: true,
                        title: true,
                        is_active: true,
                    },
                },
                quiz_questions: {
                    select: {
                        id: true,
                        question_type: true,
                        question_text: true,
                        options_json: true,
                        answer_key_json: true,
                        score_weight: true,
                    },
                    orderBy: [{ created_at: 'asc' }, { id: 'asc' }],
                },
            },
        });
        if (!template) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Quiz template not found.',
                details: {},
            });
        }
        return template;
    }
    async getEnrolledCourseIds(userId) {
        const userCourses = await this.prisma.user_courses.findMany({
            where: {
                user_id: userId,
            },
            select: {
                course_id: true,
            },
        });
        return userCourses.map((course) => course.course_id);
    }
    async getQuizAssistantMessage(userId, assistantMessageId, quizId) {
        const assistantMessage = await this.prisma.messages.findFirst({
            where: {
                id: assistantMessageId,
                sender_type: 'assistant',
                conversations: {
                    is: {
                        user_id: userId,
                    },
                },
            },
            select: {
                id: true,
                metadata: true,
            },
        });
        if (!assistantMessage) {
            throw new common_1.NotFoundException({
                code: 'NOT_FOUND',
                message: 'Quiz message not found.',
                details: {},
            });
        }
        const metadata = this.toRecord(assistantMessage.metadata);
        const uiPayload = this.toRecord(metadata.uiPayload);
        const messageQuizId = this.toStringValue(uiPayload.quizId, uiPayload.quiz_id, uiPayload.id);
        if (messageQuizId !== quizId) {
            throw new common_1.BadRequestException({
                code: 'VALIDATION_ERROR',
                message: 'Quiz submission does not match the referenced assistant message.',
                details: {},
            });
        }
        if (uiPayload.result && Object.keys(this.toRecord(uiPayload.result)).length > 0) {
            throw new common_1.BadRequestException({
                code: 'VALIDATION_ERROR',
                message: 'This quiz card has already been submitted.',
                details: {},
            });
        }
        return assistantMessage;
    }
    async persistQuizResultMetadata(assistantMessage, result) {
        const metadata = this.toRecord(assistantMessage.metadata);
        const uiPayload = this.toRecord(metadata.uiPayload);
        const nextMetadata = this.toJsonObject({
            ...metadata,
            uiPayloadVersion: metadata.uiPayloadVersion ?? uiPayload.version ?? 1,
            uiPayload: {
                ...uiPayload,
                result: this.toJsonObject({
                    attemptId: result.attemptId,
                    quizId: result.quizId,
                    score: result.score,
                    maxScore: result.maxScore,
                    scorePercent: result.scorePercent,
                    correctCount: result.correctCount,
                    totalQuestions: result.totalQuestions,
                    durationSeconds: result.durationSeconds,
                    submittedAt: result.submittedAt,
                    summary: `Ban dung ${result.correctCount}/${result.totalQuestions} cau hoi.`,
                }),
            },
        });
        await this.prisma.messages.update({
            where: {
                id: assistantMessage.id,
            },
            data: {
                metadata: nextMetadata,
            },
        });
    }
    pickBestTemplate(templates, queryText) {
        if (templates.length === 0) {
            return null;
        }
        const normalizedQuery = (queryText ?? '').trim().toLowerCase();
        if (!normalizedQuery) {
            return templates[0];
        }
        const scored = templates
            .map((template) => ({
            template,
            score: this.calculateTemplateScore(template, normalizedQuery),
        }))
            .sort((left, right) => right.score - left.score);
        return scored[0]?.template ?? templates[0];
    }
    calculateTemplateScore(template, queryText) {
        let score = 0;
        const haystacks = [
            template.title,
            template.code,
            template.courses?.title ?? '',
            template.courses?.code ?? '',
        ].map((value) => value.toLowerCase());
        for (const haystack of haystacks) {
            if (!haystack) {
                continue;
            }
            if (queryText.includes(haystack) || haystack.includes(queryText)) {
                score += 10;
            }
            for (const token of queryText.split(/\s+/).filter(Boolean)) {
                if (haystack.includes(token)) {
                    score += 1;
                }
            }
        }
        return score;
    }
    matchesQuestionTypeFilter(questions, questionTypes) {
        if (!questionTypes || questionTypes.length === 0) {
            return true;
        }
        return questions.some((question) => questionTypes.includes(question.question_type));
    }
    selectQuestions(questions, input) {
        const allowedTypes = new Set(input.questionTypes ?? []);
        const filteredQuestions = questions.filter((question) => allowedTypes.size === 0 || allowedTypes.has(question.question_type));
        const questionCount = Math.min(input.questionCount ?? filteredQuestions.length, filteredQuestions.length);
        return filteredQuestions.slice(0, questionCount);
    }
    normalizeOptions(options, questionType) {
        if (!Array.isArray(options)) {
            return questionType === 'true_false'
                ? [
                    { value: 'true', label: 'True' },
                    { value: 'false', label: 'False' },
                ]
                : [];
        }
        return options
            .map((option) => {
            if (typeof option === 'string' ||
                typeof option === 'number' ||
                typeof option === 'boolean') {
                const value = String(option);
                return {
                    value,
                    label: value,
                };
            }
            if (typeof option === 'object' && option !== null) {
                const optionRecord = option;
                const value = this.toStringValue(optionRecord.value, optionRecord.id, optionRecord.key, optionRecord.label, optionRecord.text);
                const label = this.toStringValue(optionRecord.label, optionRecord.text, optionRecord.value, optionRecord.id);
                if (!value || !label) {
                    return null;
                }
                return {
                    value,
                    label,
                };
            }
            return null;
        })
            .filter((option) => Boolean(option));
    }
    gradeSubmission(questions, answers) {
        const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer.answer]));
        let score = 0;
        let maxScore = 0;
        let correctCount = 0;
        const questionResults = [];
        for (const question of questions) {
            const maxQuestionScore = this.toNumber(question.score_weight);
            const submittedAnswer = answersByQuestionId.get(question.id);
            const isCorrect = this.isAnswerCorrect(question.question_type, submittedAnswer, question.answer_key_json);
            const earnedScore = isCorrect ? maxQuestionScore : 0;
            maxScore += maxQuestionScore;
            score += earnedScore;
            if (isCorrect) {
                correctCount += 1;
            }
            questionResults.push({
                questionId: question.id,
                prompt: question.question_text,
                type: question.question_type,
                selectedAnswer: submittedAnswer ?? null,
                isCorrect,
                earnedScore,
                maxScore: maxQuestionScore,
            });
        }
        return {
            score: Number(score.toFixed(2)),
            maxScore: Number(maxScore.toFixed(2)),
            correctCount,
            totalQuestions: questions.length,
            questionResults,
        };
    }
    mapAttemptResult(attempt) {
        const selectedQuestions = this.selectQuestions(attempt.quiz_templates.quiz_questions, {
            questionCount: attempt.quiz_templates.question_count,
        });
        const parsedAnswers = Array.isArray(attempt.submitted_answers)
            ? attempt.submitted_answers
            : [];
        const grading = this.gradeSubmission(selectedQuestions, parsedAnswers
            .map((answer) => {
            if (typeof answer !== 'object' || answer === null) {
                return null;
            }
            const answerRecord = answer;
            if (typeof answerRecord.questionId !== 'string') {
                return null;
            }
            return {
                questionId: answerRecord.questionId,
                answer: answerRecord.answer,
            };
        })
            .filter((answer) => Boolean(answer)));
        const persistedScore = attempt.score === null || attempt.score === undefined
            ? grading.score
            : this.toNumber(attempt.score);
        const scorePercent = grading.maxScore > 0 ? (persistedScore / grading.maxScore) * 100 : 0;
        return {
            attemptId: attempt.id,
            quizId: attempt.quiz_templates.id,
            title: attempt.quiz_templates.title,
            difficulty: attempt.quiz_templates.difficulty,
            course: attempt.quiz_templates.courses
                ? {
                    id: attempt.quiz_templates.courses.id,
                    code: attempt.quiz_templates.courses.code,
                    title: attempt.quiz_templates.courses.title,
                }
                : null,
            score: Number(persistedScore.toFixed(2)),
            maxScore: grading.maxScore,
            scorePercent: Number(scorePercent.toFixed(2)),
            correctCount: grading.correctCount,
            totalQuestions: grading.totalQuestions,
            durationSeconds: attempt.duration_seconds,
            submittedAt: attempt.submitted_at?.toISOString() ?? null,
            questionResults: grading.questionResults,
        };
    }
    isAnswerCorrect(questionType, submittedAnswer, answerKey) {
        const normalizedSubmitted = this.normalizeAnswer(submittedAnswer, questionType);
        const normalizedAnswerKey = this.normalizeAnswerKey(answerKey, questionType);
        if (questionType === 'multiple_choice') {
            return (Array.isArray(normalizedSubmitted) &&
                Array.isArray(normalizedAnswerKey) &&
                normalizedSubmitted.length === normalizedAnswerKey.length &&
                normalizedSubmitted.every((value, index) => value === normalizedAnswerKey[index]));
        }
        if (Array.isArray(normalizedAnswerKey)) {
            return typeof normalizedSubmitted === 'string'
                ? normalizedAnswerKey.includes(normalizedSubmitted)
                : false;
        }
        return normalizedSubmitted === normalizedAnswerKey;
    }
    normalizeAnswerKey(answerKey, questionType) {
        if (typeof answerKey === 'object' && answerKey !== null && !Array.isArray(answerKey)) {
            const answerKeyRecord = answerKey;
            const candidate = answerKeyRecord.answers ??
                answerKeyRecord.values ??
                answerKeyRecord.correctAnswers ??
                answerKeyRecord.optionIds ??
                answerKeyRecord.answer ??
                answerKeyRecord.value ??
                answerKeyRecord.correct ??
                answerKeyRecord.correctAnswer;
            return this.normalizeAnswer(candidate, questionType);
        }
        return this.normalizeAnswer(answerKey, questionType);
    }
    normalizeAnswer(value, questionType) {
        if (questionType === 'multiple_choice') {
            if (!Array.isArray(value)) {
                return [];
            }
            return value
                .map((item) => this.normalizeString(item))
                .filter((item) => Boolean(item))
                .sort();
        }
        if (questionType === 'true_false') {
            if (typeof value === 'boolean') {
                return value;
            }
            const normalized = this.normalizeString(value);
            if (normalized === 'true') {
                return true;
            }
            if (normalized === 'false') {
                return false;
            }
            return null;
        }
        if (Array.isArray(value)) {
            return value
                .map((item) => this.normalizeString(item))
                .filter((item) => Boolean(item))
                .sort();
        }
        return this.normalizeString(value);
    }
    normalizeString(value) {
        if (typeof value === 'string') {
            return value.trim().toLowerCase();
        }
        if (typeof value === 'number' || typeof value === 'boolean') {
            return String(value).trim().toLowerCase();
        }
        return null;
    }
    toStringValue(...values) {
        for (const value of values) {
            if (typeof value === 'string' && value.trim()) {
                return value.trim();
            }
            if (typeof value === 'number' || typeof value === 'boolean') {
                return String(value);
            }
        }
        return '';
    }
    toRecord(value) {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            return {};
        }
        return value;
    }
    toNumber(value) {
        const normalized = Number(String(value));
        return Number.isFinite(normalized) ? normalized : 0;
    }
    toJsonObject(value) {
        return JSON.parse(JSON.stringify(value));
    }
    toJsonValue(value) {
        const normalized = JSON.parse(JSON.stringify(value));
        if (normalized === null) {
            return {};
        }
        return normalized;
    }
};
exports.TrainingService = TrainingService;
exports.TrainingService = TrainingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TrainingService);
//# sourceMappingURL=training.service.js.map