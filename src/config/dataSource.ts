import { DataSource, DataSourceOptions } from 'typeorm';
import dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'lefax',
    entities: ['src/entity/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    synchronize: process.env.NODE_ENV !== 'production', // Désactivé en production
    logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
