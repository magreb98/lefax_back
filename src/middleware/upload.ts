import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ValidationError } from '../exceptions/AppError';

// Types de fichiers autorisés
const ALLOWED_FILE_TYPES = {
    images: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    documents: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
    ],
    archives: ['application/zip', 'application/x-rar-compressed', 'application/x-7z-compressed'],
};

// Tous les types autorisés
const ALL_ALLOWED_TYPES = [
    ...ALLOWED_FILE_TYPES.images,
    ...ALLOWED_FILE_TYPES.documents,
    ...ALLOWED_FILE_TYPES.archives,
];

// Taille maximale des fichiers (20 MB)
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// Configuration du stockage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'src', 'uploads', 'documents');
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    },
});

// Filtre pour valider les fichiers
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Vérifier le type MIME
    if (!ALL_ALLOWED_TYPES.includes(file.mimetype)) {
        return cb(
            new ValidationError(
                `Type de fichier non autorisé: ${file.mimetype}. Types autorisés: PDF, Word, Excel, PowerPoint, images, archives.`
            )
        );
    }

    // Vérifier l'extension du fichier
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = [
        '.pdf',
        '.doc',
        '.docx',
        '.xls',
        '.xlsx',
        '.ppt',
        '.pptx',
        '.txt',
        '.jpg',
        '.jpeg',
        '.png',
        '.gif',
        '.webp',
        '.zip',
        '.rar',
        '.7z',
    ];

    if (!allowedExtensions.includes(ext)) {
        return cb(new ValidationError(`Extension de fichier non autorisée: ${ext}`));
    }

    cb(null, true);
};

// Configuration de multer
export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_FILE_SIZE,
        files: 20, // Maximum 20 fichiers par requête
    },
});

// Middleware pour gérer les erreurs de multer
export const handleMulterError = (err: any, req: any, res: any, next: any) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            throw new ValidationError(
                `Fichier trop volumineux. Taille maximale: ${MAX_FILE_SIZE / (1024 * 1024)} MB`
            );
        }
        if (err.code === 'LIMIT_FILE_COUNT') {
            throw new ValidationError('Trop de fichiers. Maximum: 20 fichiers par requête');
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            throw new ValidationError('Champ de fichier inattendu');
        }
        throw new ValidationError(`Erreur d'upload: ${err.message}`);
    }
    next(err);
};
