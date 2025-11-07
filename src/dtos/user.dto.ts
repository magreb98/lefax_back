import { IsEmail, IsOptional, IsString, MinLength, IsEnum } from 'class-validator';
import { UserRole } from '../entity/user';

export class RegisterUserDto {
    @IsString()
    firstName!: string;

    @IsString()
    lastName!: string;

    @IsEmail()
    email!: string;

    @IsString()
    @MinLength(6)
    password!: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MinLength(6)
    password?: string;

    @IsOptional()
    @IsString()
    phoneNumber?: string;
}
