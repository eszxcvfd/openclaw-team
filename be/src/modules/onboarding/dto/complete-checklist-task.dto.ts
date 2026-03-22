import { IsOptional, IsString } from 'class-validator';

export class CompleteChecklistTaskDto {
  @IsOptional()
  @IsString()
  note?: string;
}
