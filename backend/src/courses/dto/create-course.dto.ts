import { Transform } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateCourseDto {

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value)
  @IsString()
  @IsNotEmpty()
  courseName!: string;

  @IsOptional()
  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value)
  @IsString()
  courseCode?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number | null;
}
