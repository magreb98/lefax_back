import { IsString } from 'class-validator';

export class CreateClasseDto {
    @IsString()
    className!: string;

    @IsString()
    filiereId!: string;
}
