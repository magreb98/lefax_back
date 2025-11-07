import { DataSource } from "typeorm";
import { User } from "../entity/user";
import { Ecole } from "../entity/ecole";
import dotenv from 'dotenv';
import { Class } from "../entity/classe";
import { DocumentCategorie } from "../entity/document.categorie";
import { Filiere } from "../entity/filiere";
import { Notification } from "../entity/notification";
import { GroupePartage } from "../entity/groupe.partage";
import { Matiere } from "../entity/matiere";
import { Document } from "../entity/document";
import { EnseignementAssignment } from "../entity/enseignement.assigment";

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'lefax_db',
  synchronize: process.env.NODE_ENV === 'development' || false,
  logging: process.env.NODE_ENV === 'development' || true,
  entities: [
    User,
    Ecole,
    Class,
    DocumentCategorie,
    Document,
    Filiere,
    Notification,
    GroupePartage,
    Matiere,
    EnseignementAssignment
  ],
  migrations: ['src/migrations/*.ts'],
  subscribers: ['src/subscribers/*.ts'],
});