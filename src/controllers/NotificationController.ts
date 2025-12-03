import { Request, Response } from 'express';
import { AppDataSource } from '../config/database';
import { Notification } from '../entity/notification';
import { GroupePartage } from '../entity/groupe.partage';
import { NotFoundError, ValidationError } from '../exceptions/AppError';
import { PaginationHelper } from '../util/pagination';
import { logger } from '../config/logger';

export class NotificationController {
    /**
     * Récupérer toutes les notifications avec pagination et filtres
     * GET /api/notifications?page=1&limit=10&type=NEW_DOCUMENT&groupeId=xxx
     */
    static async getNotifications(req: Request, res: Response): Promise<void> {
        try {
            const { type, groupeId } = req.query;
            const { skip, take, page } = PaginationHelper.getParams(req.query);

            const notificationRepo = AppDataSource.getRepository(Notification);
            const queryBuilder = notificationRepo
                .createQueryBuilder('notification')
                .leftJoinAndSelect('notification.groupePartage', 'groupePartage')
                .orderBy('notification.sharedAt', 'DESC');

            // Filtrer par type si fourni
            if (type) {
                queryBuilder.andWhere('notification.type = :type', { type });
            }

            // Filtrer par groupe si fourni
            if (groupeId) {
                queryBuilder.andWhere('groupePartage.id = :groupeId', { groupeId });
            }

            // Pagination
            queryBuilder.skip(skip).take(take);

            const [notifications, total] = await queryBuilder.getManyAndCount();

            const result = PaginationHelper.createResponse(notifications, total, page, take);

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            logger.error('Erreur lors de la récupération des notifications:', error);
            throw error;
        }
    }

    /**
     * Récupérer une notification par ID
     * GET /api/notifications/:id
     */
    static async getNotificationById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const notificationRepo = AppDataSource.getRepository(Notification);
            const notification = await notificationRepo.findOne({
                where: { id },
                relations: ['groupePartage'],
            });

            if (!notification) {
                throw new NotFoundError('Notification non trouvée');
            }

            res.json({
                success: true,
                notification,
            });
        } catch (error) {
            logger.error('Erreur lors de la récupération de la notification:', error);
            throw error;
        }
    }

    /**
     * Créer une nouvelle notification
     * POST /api/notifications
     * Body: { type, message, groupePartageId }
     */
    static async createNotification(req: Request, res: Response): Promise<void> {
        try {
            const { type, message, groupePartageId } = req.body;

            // Validation
            if (!type || !message || !groupePartageId) {
                throw new ValidationError('Type, message et groupePartageId sont requis');
            }

            // Vérifier que le groupe existe
            const groupeRepo = AppDataSource.getRepository(GroupePartage);
            const groupe = await groupeRepo.findOne({ where: { id: groupePartageId } });

            if (!groupe) {
                throw new NotFoundError('Groupe de partage non trouvé');
            }

            // Créer la notification
            const notificationRepo = AppDataSource.getRepository(Notification);
            const notification = notificationRepo.create({
                type,
                message,
                groupePartage: groupe,
            });

            await notificationRepo.save(notification);

            logger.info(`Notification créée: ${notification.id}`);

            res.status(201).json({
                success: true,
                message: 'Notification créée avec succès',
                notification,
            });
        } catch (error) {
            logger.error('Erreur lors de la création de la notification:', error);
            throw error;
        }
    }

    /**
     * Mettre à jour une notification
     * PUT /api/notifications/:id
     * Body: { type?, message? }
     */
    static async updateNotification(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const { type, message } = req.body;

            const notificationRepo = AppDataSource.getRepository(Notification);
            const notification = await notificationRepo.findOne({ where: { id } });

            if (!notification) {
                throw new NotFoundError('Notification non trouvée');
            }

            // Mettre à jour les champs
            if (type) notification.type = type;
            if (message) notification.message = message;

            await notificationRepo.save(notification);

            logger.info(`Notification mise à jour: ${id}`);

            res.json({
                success: true,
                message: 'Notification mise à jour avec succès',
                notification,
            });
        } catch (error) {
            logger.error('Erreur lors de la mise à jour de la notification:', error);
            throw error;
        }
    }

    /**
     * Supprimer une notification
     * DELETE /api/notifications/:id
     */
    static async deleteNotification(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;

            const notificationRepo = AppDataSource.getRepository(Notification);
            const notification = await notificationRepo.findOne({ where: { id } });

            if (!notification) {
                throw new NotFoundError('Notification non trouvée');
            }

            await notificationRepo.remove(notification);

            logger.info(`Notification supprimée: ${id}`);

            res.status(204).send();
        } catch (error) {
            logger.error('Erreur lors de la suppression de la notification:', error);
            throw error;
        }
    }

    /**
     * Récupérer les notifications d'un groupe
     * GET /api/notifications/groupe/:groupeId
     */
    static async getNotificationsByGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;
            const { skip, take, page } = PaginationHelper.getParams(req.query);

            const notificationRepo = AppDataSource.getRepository(Notification);
            const [notifications, total] = await notificationRepo.findAndCount({
                where: { groupePartage: { id: groupeId } },
                relations: ['groupePartage'],
                order: { sharedAt: 'DESC' },
                skip,
                take,
            });

            const result = PaginationHelper.createResponse(notifications, total, page, take);

            res.json({
                success: true,
                ...result,
            });
        } catch (error) {
            logger.error('Erreur lors de la récupération des notifications du groupe:', error);
            throw error;
        }
    }

    /**
     * Supprimer toutes les notifications d'un groupe
     * DELETE /api/notifications/groupe/:groupeId
     */
    static async deleteNotificationsByGroupe(req: Request, res: Response): Promise<void> {
        try {
            const { groupeId } = req.params;

            const notificationRepo = AppDataSource.getRepository(Notification);
            const result = await notificationRepo.delete({ groupePartage: { id: groupeId } });

            logger.info(`${result.affected || 0} notifications supprimées du groupe ${groupeId}`);

            res.json({
                success: true,
                message: `${result.affected || 0} notification(s) supprimée(s)`,
            });
        } catch (error) {
            logger.error('Erreur lors de la suppression des notifications du groupe:', error);
            throw error;
        }
    }

    /**
     * Marquer les notifications comme lues (future fonctionnalité)
     * POST /api/notifications/mark-read
     * Body: { notificationIds: string[] }
     */
    static async markAsRead(req: Request, res: Response): Promise<void> {
        try {
            const { notificationIds } = req.body;

            if (!notificationIds || !Array.isArray(notificationIds)) {
                throw new ValidationError('notificationIds doit être un tableau');
            }

            // Note: Cette fonctionnalité nécessiterait d'ajouter un champ 'isRead' à l'entité Notification
            // Pour l'instant, on retourne un message d'information

            res.json({
                success: true,
                message: 'Fonctionnalité à implémenter: ajouter le champ isRead à l\'entité Notification',
            });
        } catch (error) {
            logger.error('Erreur lors du marquage des notifications:', error);
            throw error;
        }
    }
}