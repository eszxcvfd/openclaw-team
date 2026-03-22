import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class UpdateUserAccessDto {
  @IsString()
  @IsNotEmpty()
  agentGroupCode!: string;

  @IsBoolean()
  isAllowed!: boolean;
}
