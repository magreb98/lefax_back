import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response, NextFunction } from 'express';

export function validateDto(dtoClass: any) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const instance = plainToInstance(dtoClass, req.body);
        const errors = await validate(instance as object, { whitelist: true, forbidNonWhitelisted: false });
        if (errors.length > 0) {
            const formatted = errors.map(e => ({ property: e.property, constraints: e.constraints }));
            return res.status(400).json({ message: 'Validation failed', errors: formatted });
        }
        // Replace body with the validated instance
        req.body = instance;
        next();
    };
}
