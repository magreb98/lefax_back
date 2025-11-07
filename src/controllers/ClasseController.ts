import { Request, Response } from "express";
import { AppDataSource } from "../config/database";
import { Class } from "../entity/classe";
import { Filiere } from "../entity/filiere";
import { GroupePartageService } from "../services/GroupePartageService";
import { formatErrorResponse } from "../util/helper";

export class ClasseController {
    private classeRepository = AppDataSource.getRepository(Class);
    private filiereRepository = AppDataSource.getRepository(Filiere);
    private groupePartageService = new GroupePartageService();

    // Créer une classe avec son groupe de partage
    async createClasse(req: any, res: any): Promise<void> {
        try {
            const { className, filiereId } = req.body;

            if (!className || !filiereId) {
                return res.status(400).json({ 
                    message: 'Les champs className et filiereId sont requis' 
                });
            }

            // Vérifier que la filière existe
            const filiere = await this.filiereRepository.findOne({ 
                where: { id: filiereId },
                relations: ['school']
            });

            if (!filiere) {
                return res.status(404).json({ message: 'Filière non trouvée' });
            }

            // Créer la classe avec son groupe de partage
            const classe = await this.groupePartageService.createClasseWithGroupe({
                className,
                filiere
            });

            // Synchroniser les groupes de partage de la filière et de l'école
            await this.groupePartageService.syncFiliereGroupePartage(filiereId);
            if (filiere.school) {
                await this.groupePartageService.syncEcoleGroupePartage(filiere.school.id);
            }

            res.status(201).json({ 
                message: 'Classe créée avec succès', 
                classe 
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer toutes les classes
    async getClasses(req: any, res: any): Promise<void> {
        try {
            const classes = await this.classeRepository.find({
                relations: ['groupePartage', 'groupePartage.users', 'filiere', 'filiere.school'],
                order: { createdAt: 'DESC' }
            });

            res.status(200).json({ 
                count: classes.length,
                classes 
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Récupérer une classe par son ID
    async getClasseById(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const classe = await this.classeRepository.findOne({
                where: { id },
                relations: ['groupePartage', 'groupePartage.users', 'filiere', 'matieres']
            });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            res.status(200).json({ classe });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Synchroniser le groupe de partage d'une classe
    async syncClasseGroupe(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;

            await this.groupePartageService.syncClasseGroupePartage(id);

            res.status(200).json({ 
                message: 'Groupe de partage synchronisé avec succès' 
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json(formatErrorResponse(error));
        }
    }

    // Mettre à jour une classe
    async updateClasse(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const { className } = req.body;

            const classe = await this.classeRepository.findOne({ where: { id } });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            if (className) classe.className = className;

            await this.classeRepository.save(classe);

            res.status(200).json({ 
                message: 'Classe mise à jour avec succès', 
                classe 
            });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

    // Supprimer une classe
    async deleteClasse(req: any, res: any): Promise<void> {
        try {
            const { id } = req.params;
            const classe = await this.classeRepository.findOne({ 
                where: { id },
                relations: ['groupePartage', 'filiere', 'filiere.school']
            });

            if (!classe) {
                return res.status(404).json({ message: 'Classe non trouvée' });
            }

            const filiereId = classe.filiere.id;
            const ecoleId = classe.filiere.school?.id;

            await this.classeRepository.remove(classe);

            // Re-synchroniser les groupes de la filière et de l'école
            await this.groupePartageService.syncFiliereGroupePartage(filiereId);
            if (ecoleId) {
                await this.groupePartageService.syncEcoleGroupePartage(ecoleId);
            }

            res.status(200).json({ message: 'Classe supprimée avec succès' });
        } catch (error) {
            console.error('Erreur:', error);
            res.status(500).json({ message: 'Erreur serveur' });
        }
    }

     /**
       * Ajouter une classe à un groupe
       * POST /api/users/groupes/:groupeId/classes/:classeId
       */
      async addClasseToGroupe(req: Request, res: Response): Promise < void> {
      try {
        const { groupeId, classeId } = req.params;
    
        await this.groupePartageService.addClasseToGroupe(classeId, groupeId);
    
        res.json({ message: 'Classe ajoutée au groupe avec succès' });
      } catch(error) {
        console.error('Erreur lors de l\'ajout de la classe au groupe:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de l\'ajout de la classe au groupe' });
      }
    }
    
      /**
       * Retirer une classe d'un groupe
       * DELETE /api/users/groupes/:groupeId/classes/:classeId
       */
      async removeClasseFromGroupe(req: Request, res: Response): Promise < void> {
      try {
        const { groupeId, classeId } = req.params;
    
        await this.groupePartageService.removeClasseFromGroupe(classeId, groupeId);
    
        res.json({ message: 'Classe retirée du groupe avec succès' });
      } catch(error) {
        console.error('Erreur lors du retrait de la classe du groupe:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors du retrait de la classe du groupe' });
      }
    }
    
      /**
       * Synchroniser le groupe de partage d'une classe
       * POST /api/users/groupes/sync/classe/:classeId
       */
      async syncClasseGroupePartage(req: Request, res: Response): Promise < void> {
      try {
        const { classeId } = req.params;
    
        await this.groupePartageService.syncClasseGroupePartage(classeId);
    
        res.json({ message: 'Groupe de la classe synchronisé avec succès' });
      } catch(error) {
        console.error('Erreur lors de la synchronisation du groupe de la classe:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Erreur lors de la synchronisation du groupe de la classe' });
      }
    }
}