import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from "typeorm";

/**
 * Migration pour ajouter le champ matricule à la table user
 * Le matricule est un identifiant unique alphanumérique pour les étudiants et enseignants
 * Unicité garantie par école via un index composite (matricule, school_id)
 */
export class AddMatriculeToUser1736500000000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('📦 [Migration] Adding matricule column to user table...');

        // Vérifier si la colonne existe déjà (peut avoir été créée par synchronize)
        const table = await queryRunner.getTable('user');
        const matriculeColumn = table?.findColumnByName('matricule');

        if (!matriculeColumn) {
            // Ajouter la colonne matricule seulement si elle n'existe pas
            await queryRunner.addColumn('user', new TableColumn({
                name: 'matricule',
                type: 'varchar',
                length: '50',
                isNullable: true,
                comment: 'Numéro d\'identification unique alphanumérique (unique par école)'
            }));
            console.log('✅ [Migration] Column matricule added');
        } else {
            console.log('ℹ️  [Migration] Column matricule already exists, skipping...');
        }

        // Créer l'index unique composite pour garantir l'unicité par école
        console.log('📊 [Migration] Creating unique composite index...');

        await queryRunner.createIndex('user', new TableIndex({
            name: 'IDX_USER_MATRICULE_SCHOOL',
            columnNames: ['matricule', 'school_id'],
            isUnique: true,
            where: 'matricule IS NOT NULL'
        }));

        console.log('✅ [Migration] Unique composite index created');
        console.log('🎉 [Migration] AddMatriculeToUser migration completed successfully!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏪ [Migration] Reverting matricule column from user table...');

        // Supprimer l'index unique composite
        await queryRunner.dropIndex('user', 'IDX_USER_MATRICULE_SCHOOL');
        console.log('✅ [Migration] Index dropped');

        // Supprimer la colonne matricule
        await queryRunner.dropColumn('user', 'matricule');
        console.log('✅ [Migration] Column matricule dropped');

        console.log('🎉 [Migration] AddMatriculeToUser migration reverted successfully!');
    }
}
