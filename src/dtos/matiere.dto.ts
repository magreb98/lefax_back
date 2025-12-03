import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateMatiereDto {
    @IsString()
    matiereName!: string;

    @IsString()
    classeId!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    matiereCode?: string;
}

export class UpdateMatiereDto {
    @IsOptional()
    @IsString()
    matiereName?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    matiereCode?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
