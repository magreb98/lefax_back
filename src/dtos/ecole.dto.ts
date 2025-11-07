import { IsString, IsOptional } from 'class-validator';

export class CreateEcoleDto {
    @IsString()
    schoolName!: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsString()
    schoolEmail!: string;

    @IsOptional()
    @IsString()
    schoolPhone?: string;

    @IsString()
    schoolAdmin!: string;
}
