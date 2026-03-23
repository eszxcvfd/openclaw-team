import { IsBoolean, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class GenerateLearningPathDto {
  @IsOptional()
  @IsString()
  targetLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  maxCourses?: number;

  @IsOptional()
  @IsBoolean()
  includeMandatoryCourses?: boolean;

  @IsOptional()
  @IsString()
  queryText?: string;
}
