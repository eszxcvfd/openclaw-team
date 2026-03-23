import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsInt,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';

export class QuizAnswerDto {
  @IsUUID()
  questionId!: string;

  @IsDefined()
  answer!: unknown;
}

export class SubmitQuizDto {
  @IsUUID()
  quizId!: string;

  @IsUUID()
  assistantMessageId!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuizAnswerDto)
  answers!: QuizAnswerDto[];

  @IsOptional()
  @IsInt()
  @Min(0)
  durationSeconds?: number;
}
