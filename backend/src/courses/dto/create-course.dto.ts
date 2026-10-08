import {
  IsInt,
  IsString,
  Min,
} from 'class-validator';

export class CreateCourseDto {
  @IsString()
  courseCode!: string;

  @IsString()
  courseName!: string;

  @IsInt()
  @Min(1)
  credits!: number;
}