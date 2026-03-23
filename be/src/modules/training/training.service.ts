import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../../infra/prisma/prisma.service';
import {
  GenerateQuizDto,
  quizQuestionTypes,
} from './dto/generate-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

interface QuizOptionDto {
  value: string;
  label: string;
}

export interface QuizQuestionDto {
  id: string;
  prompt: string;
  type: string;
  options: QuizOptionDto[];
  weight: number;
}

export interface QuizPayloadDto {
  type: 'quiz';
  version: 1;
  quizId: string;
  templateCode: string;
  title: string;
  difficulty: string;
  course: {
    id: string;
    code: string;
    title: string;
  } | null;
  questionCount: number;
  questions: QuizQuestionDto[];
}

export interface QuizResultQuestionDto {
  questionId: string;
  prompt: string;
  type: string;
  selectedAnswer: unknown;
  isCorrect: boolean;
  earnedScore: number;
  maxScore: number;
}

export interface QuizAttemptResultDto {
  attemptId: string;
  quizId: string;
  title: string;
  difficulty: string;
  course: {
    id: string;
    code: string;
    title: string;
  } | null;
  score: number;
  maxScore: number;
  scorePercent: number;
  correctCount: number;
  totalQuestions: number;
  durationSeconds: number | null;
  submittedAt: string | null;
  questionResults: QuizResultQuestionDto[];
}

type QuizTemplateRecord = {
  id: string;
  code: string;
  title: string;
  difficulty: string;
  question_count: number;
  courses: {
    id: string;
    code: string;
    title: string;
    is_active: boolean;
  } | null;
  quiz_questions: QuizQuestionRecord[];
};

type QuizQuestionRecord = {
  id: string;
  question_type: string;
  question_text: string;
  options_json: unknown;
  answer_key_json: unknown;
  score_weight: unknown;
};

type QuizAttemptRecord = {
  id: string;
  duration_seconds: number | null;
  submitted_at: Date | null;
  score: unknown;
  quiz_templates: QuizTemplateRecord;
  submitted_answers: unknown;
};

type QuizAssistantMessageRecord = {
  id: string;
  metadata: unknown;
};

type CanonicalAnswer = boolean | string | string[] | null;
type QuizQuestionType = (typeof quizQuestionTypes)[number];

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  async generateQuizForUser(
    userId: string,
    input: GenerateQuizDto = {},
  ): Promise<QuizPayloadDto> {
    const template = await this.findQuizTemplate(userId, input);
    const selectedQuestions = this.selectQuestions(template.quiz_questions, input);

    if (selectedQuestions.length === 0) {
      throw new NotFoundException({
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

  async submitQuizAttempt(
    userId: string,
    input: SubmitQuizDto,
  ): Promise<QuizAttemptResultDto> {
    const assistantMessage = await this.getQuizAssistantMessage(
      userId,
      input.assistantMessageId,
      input.quizId,
    );
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
        submitted_answers: submittedAnswers as Prisma.InputJsonValue,
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

    const result = this.mapAttemptResult(attempt as QuizAttemptRecord);

    await this.persistQuizResultMetadata(assistantMessage, result);

    return result;
  }

  async getQuizAttemptResult(
    userId: string,
    attemptId: string,
  ): Promise<QuizAttemptResultDto> {
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
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quiz attempt not found.',
        details: {},
      });
    }

    return this.mapAttemptResult(attempt as QuizAttemptRecord);
  }

  private async findQuizTemplate(userId: string, input: GenerateQuizDto) {
    if (input.templateId) {
      return this.getTemplateById(input.templateId);
    }

    const enrolledCourseIds = await this.getEnrolledCourseIds(userId);
    const templates = await this.prisma.quiz_templates.findMany({
      where: {
        difficulty: input.difficulty,
        course_id:
          input.courseId ??
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

    const filteredTemplates = templates.filter((template) =>
      this.matchesQuestionTypeFilter(template.quiz_questions, input.questionTypes),
    );
    const selectedTemplate = this.pickBestTemplate(filteredTemplates, input.queryText);

    if (!selectedTemplate) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quiz template not found.',
        details: {},
      });
    }

    return selectedTemplate;
  }

  private async getTemplateById(templateId: string) {
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
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quiz template not found.',
        details: {},
      });
    }

    return template;
  }

  private async getEnrolledCourseIds(userId: string) {
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

  private async getQuizAssistantMessage(
    userId: string,
    assistantMessageId: string,
    quizId: string,
  ): Promise<QuizAssistantMessageRecord> {
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
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Quiz message not found.',
        details: {},
      });
    }

    const metadata = this.toRecord(assistantMessage.metadata);
    const uiPayload = this.toRecord(metadata.uiPayload);
    const messageQuizId = this.toStringValue(uiPayload.quizId, uiPayload.quiz_id, uiPayload.id);

    if (messageQuizId !== quizId) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Quiz submission does not match the referenced assistant message.',
        details: {},
      });
    }

    if (uiPayload.result && Object.keys(this.toRecord(uiPayload.result)).length > 0) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'This quiz card has already been submitted.',
        details: {},
      });
    }

    return assistantMessage;
  }

  private async persistQuizResultMetadata(
    assistantMessage: QuizAssistantMessageRecord,
    result: QuizAttemptResultDto,
  ) {
    const metadata = this.toRecord(assistantMessage.metadata);
    const uiPayload = this.toRecord(metadata.uiPayload);
    const nextMetadata = this.toJsonObject({
      ...metadata,
      uiPayloadVersion:
        metadata.uiPayloadVersion ?? uiPayload.version ?? 1,
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

  private pickBestTemplate(
    templates: QuizTemplateRecord[],
    queryText?: string,
  ) {
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

  private calculateTemplateScore(template: QuizTemplateRecord, queryText: string) {
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

  private matchesQuestionTypeFilter(
    questions: QuizQuestionRecord[],
    questionTypes?: string[],
  ) {
    if (!questionTypes || questionTypes.length === 0) {
      return true;
    }

    return questions.some((question) => questionTypes.includes(question.question_type));
  }

  private selectQuestions(
    questions: QuizQuestionRecord[],
    input: Pick<GenerateQuizDto, 'questionCount' | 'questionTypes'>,
  ) {
    const allowedTypes = new Set<string>(input.questionTypes ?? []);
    const filteredQuestions = questions.filter(
      (question) => allowedTypes.size === 0 || allowedTypes.has(question.question_type),
    );
    const questionCount = Math.min(
      input.questionCount ?? filteredQuestions.length,
      filteredQuestions.length,
    );

    return filteredQuestions.slice(0, questionCount);
  }

  private normalizeOptions(options: unknown, questionType: string): QuizOptionDto[] {
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
        if (
          typeof option === 'string' ||
          typeof option === 'number' ||
          typeof option === 'boolean'
        ) {
          const value = String(option);
          return {
            value,
            label: value,
          };
        }

        if (typeof option === 'object' && option !== null) {
          const optionRecord = option as Record<string, unknown>;
          const value = this.toStringValue(
            optionRecord.value,
            optionRecord.id,
            optionRecord.key,
            optionRecord.label,
            optionRecord.text,
          );
          const label = this.toStringValue(
            optionRecord.label,
            optionRecord.text,
            optionRecord.value,
            optionRecord.id,
          );

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
      .filter((option): option is QuizOptionDto => Boolean(option));
  }

  private gradeSubmission(
    questions: QuizQuestionRecord[],
    answers: SubmitQuizDto['answers'],
  ) {
    const answersByQuestionId = new Map(
      answers.map((answer) => [answer.questionId, answer.answer]),
    );
    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    const questionResults: QuizResultQuestionDto[] = [];

    for (const question of questions) {
      const maxQuestionScore = this.toNumber(question.score_weight);
      const submittedAnswer = answersByQuestionId.get(question.id);
      const isCorrect = this.isAnswerCorrect(
        question.question_type,
        submittedAnswer,
        question.answer_key_json,
      );
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

  private mapAttemptResult(attempt: QuizAttemptRecord): QuizAttemptResultDto {
    const selectedQuestions = this.selectQuestions(attempt.quiz_templates.quiz_questions, {
      questionCount: attempt.quiz_templates.question_count,
    });
    const parsedAnswers = Array.isArray(attempt.submitted_answers)
      ? attempt.submitted_answers
      : [];
    const grading = this.gradeSubmission(
      selectedQuestions,
      parsedAnswers
        .map((answer) => {
          if (typeof answer !== 'object' || answer === null) {
            return null;
          }

          const answerRecord = answer as Record<string, unknown>;
          if (typeof answerRecord.questionId !== 'string') {
            return null;
          }

          return {
            questionId: answerRecord.questionId,
            answer: answerRecord.answer,
          };
        })
        .filter(
          (
            answer,
          ): answer is {
            questionId: string;
            answer: unknown;
          } => Boolean(answer),
        ),
    );
    const persistedScore =
      attempt.score === null || attempt.score === undefined
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

  private isAnswerCorrect(
    questionType: QuizQuestionType | string,
    submittedAnswer: unknown,
    answerKey: unknown,
  ) {
    const normalizedSubmitted = this.normalizeAnswer(submittedAnswer, questionType);
    const normalizedAnswerKey = this.normalizeAnswerKey(answerKey, questionType);

    if (questionType === 'multiple_choice') {
      return (
        Array.isArray(normalizedSubmitted) &&
        Array.isArray(normalizedAnswerKey) &&
        normalizedSubmitted.length === normalizedAnswerKey.length &&
        normalizedSubmitted.every((value, index) => value === normalizedAnswerKey[index])
      );
    }

    if (Array.isArray(normalizedAnswerKey)) {
      return typeof normalizedSubmitted === 'string'
        ? normalizedAnswerKey.includes(normalizedSubmitted)
        : false;
    }

    return normalizedSubmitted === normalizedAnswerKey;
  }

  private normalizeAnswerKey(
    answerKey: unknown,
    questionType: QuizQuestionType | string,
  ): CanonicalAnswer {
    if (typeof answerKey === 'object' && answerKey !== null && !Array.isArray(answerKey)) {
      const answerKeyRecord = answerKey as Record<string, unknown>;
      const candidate =
        answerKeyRecord.answers ??
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

  private normalizeAnswer(
    value: unknown,
    questionType: QuizQuestionType | string,
  ): CanonicalAnswer {
    if (questionType === 'multiple_choice') {
      if (!Array.isArray(value)) {
        return [];
      }

      return value
        .map((item) => this.normalizeString(item))
        .filter((item): item is string => Boolean(item))
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
        .filter((item): item is string => Boolean(item))
        .sort();
    }

    return this.normalizeString(value);
  }

  private normalizeString(value: unknown) {
    if (typeof value === 'string') {
      return value.trim().toLowerCase();
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value).trim().toLowerCase();
    }

    return null;
  }

  private toStringValue(...values: unknown[]) {
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

  private toRecord(value: unknown) {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {} as Record<string, unknown>;
    }

    return value as Record<string, unknown>;
  }

  private toNumber(value: unknown) {
    const normalized = Number(String(value));
    return Number.isFinite(normalized) ? normalized : 0;
  }

  private toJsonObject(value: Record<string, unknown>) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue {
    const normalized = JSON.parse(JSON.stringify(value)) as unknown;

    if (normalized === null) {
      return {} as Prisma.InputJsonValue;
    }

    return normalized as Prisma.InputJsonValue;
  }
}
