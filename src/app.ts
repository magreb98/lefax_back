import express from 'express';
import dotenv from 'dotenv';
import { AppDataSource } from './config/database';
import routes from './routes';
import swaggerUi from 'swagger-ui-express';
import { GroupePartage, TypeGroupePartage } from './entity/groupe.partage';
import { User } from './entity/user';

dotenv.config();

const PORT = process.env.PORT || 3000;
const app = express();

app.use(express.json());

AppDataSource.initialize()
  .then(async () => {
    console.log('✅ Base de données connectée avec succès');

    const groupeRepo = AppDataSource.getRepository(GroupePartage);
    const userRepo = AppDataSource.getRepository(User);

    let publicGroup = await groupeRepo.findOne({
      where: { name: 'public' },
      relations: ['users']
    });

    if (!publicGroup) {
      console.log('⚙️ Création du groupe de partage "public"...');
      publicGroup = groupeRepo.create({
        name: 'public',
        description: 'Groupe de partage public par défaut contenant tous les utilisateurs.',
        type: TypeGroupePartage.CUSTOM
      });
      await groupeRepo.save(publicGroup);
      console.log('✅ Groupe "public" créé.');
    }

    const allUsers = await userRepo.find();
    if (allUsers.length > 0) {
      const newUsers = allUsers.filter(
        (user) => !publicGroup.users?.some((u) => u.id === user.id)
      );

      if (newUsers.length > 0) {
        publicGroup.users = [...(publicGroup.users || []), ...newUsers];
        await groupeRepo.save(publicGroup);
        console.log(`✅ ${newUsers.length} utilisateur(s) ajouté(s) au groupe "public".`);
      } else {
        console.log('ℹ️ Tous les utilisateurs sont déjà dans le groupe "public".');
      }
    } else {
      console.log('ℹ️ Aucun utilisateur à ajouter pour le moment.');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`📘 Documentation Swagger disponible sur http://localhost:${PORT}/api/docs`);
    });
  })
  .catch((error) => {
    console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
  });

export default app;
