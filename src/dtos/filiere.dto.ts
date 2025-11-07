import { IsString, IsOptional } from 'class-validator';

export class CreateFiliereDto {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsString()
    ecoleId!: string;
}
