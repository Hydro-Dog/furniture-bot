import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested
} from 'class-validator';

export class SpecificationRowDto {
  @IsString()
  @MaxLength(80)
  id!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  section!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  itemType!: string | null;

  @IsString()
  @MaxLength(240)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  material!: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthMm!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  widthMm!: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  thicknessMm!: number | null;

  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  edgeBanding!: string | null;

  @IsString()
  @MaxLength(40)
  unit!: string;

  @IsOptional()
  @IsString()
  @MaxLength(600)
  notes!: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  source!: string | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  confidence!: number | null;
}

export class UpdateSpecificationDto {
  @IsArray()
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => SpecificationRowDto)
  rows!: SpecificationRowDto[];
}

