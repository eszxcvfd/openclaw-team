import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

const QUIZ_DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
const QUIZ_QUESTION_TYPES = [
  'single_choice',
  'multiple_choice',
  'true_false',
  'short_answer',
] as const;

export class GenerateQuizDto {
  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @IsUUID()
  courseId?: string;

  @IsOptional()
  @IsString()
  queryText?: string;

  @IsOptional()
  @IsIn(QUIZ_DIFFICULTIES)
  difficulty?: (typeof QUIZ_DIFFICULTIES)[number];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  questionCount?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsIn(QUIZ_QUESTION_TYPES, { each: true })
  questionTypes?: Array<(typeof QUIZ_QUESTION_TYPES)[number]>;
}

export const quizDifficulties = QUIZ_DIFFICULTIES;
export const quizQuestionTypes = QUIZ_QUESTION_TYPES;
