import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class UpdateCourseDto {
  @IsOptional()
  @IsString()
  courseCode?: string;

  @IsOptional()
  @IsString()
  courseName?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  credits?: number;
}