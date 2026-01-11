import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../entity/user';

export class AuthService {
    public generateTokens(user: User): { token: string } {
        const jwtSecret: string = process.env.JWT_SECRET || 'your-secret-key-un-peu-plus-secure-comme-ca';
        const jwtExpiresIn: string = process.env.JWT_EXPIRES_IN || '24h';

        const token = jwt.sign(
            { userId: user.id, role: user.role },
            jwtSecret,
            { expiresIn: jwtExpiresIn } as SignOptions
        );

        return { token };
    }
}

export const authService = new AuthService();
