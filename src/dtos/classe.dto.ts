import { IsString, IsOptional } from 'class-validator';

export class CreateClasseDto {
    @IsString()
    className!: string;

    @IsString()
    filiereId!: string;
}

export class UpdateClasseDto {
    @IsOptional()
    @IsString()
    className?: string;

    @IsOptional()
    @IsString()
    filiereId?: string;
}
