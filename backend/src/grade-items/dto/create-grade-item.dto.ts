import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateGradeItemDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  score?: number | null;

  @IsNumber()
  @Min(0)
  maxScore!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  weightPercentage!: number;
}