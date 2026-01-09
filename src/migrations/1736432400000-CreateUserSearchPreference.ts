import { MigrationInterface, QueryRunner, Table, TableForeignKey, TableIndex } from "typeorm";

/**
 * Migration pour créer la table user_search_preference
 * Permet aux étudiants de configurer quels groupes apparaissent dans leurs résultats de recherche
 */
export class CreateUserSearchPreference1736432400000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        console.log('📦 [Migration] Creating user_search_preference table...');

        // Créer la table user_search_preference
        await queryRunner.createTable(
            new Table({
                name: "user_search_preference",
                columns: [
                    {
                        name: "id",
                        type: "uuid",
                        isPrimary: true,
                        generationStrategy: "uuid",
                        default: "uuid_generate_v4()"
                    },
                    {
                        name: "user_id",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "groupe_partage_id",
                        type: "uuid",
                        isNullable: false
                    },
                    {
                        name: "isEnabled",
                        type: "boolean",
                        default: true
                    },
                    {
                        name: "displayOrder",
                        type: "int",
                        default: 0
                    },
                    {
                        name: "isDefault",
                        type: "boolean",
                        default: false
                    },
                    {
                        name: "createdAt",
                        type: "timestamp",
                        default: "now()"
                    },
                    {
                        name: "updatedAt",
                        type: "timestamp",
                        default: "now()"
                    }
                ]
            }),
            true
        );

        console.log('✅ [Migration] Table user_search_preference created');

        // Ajouter les foreign keys
        console.log('🔗 [Migration] Adding foreign keys...');

        await queryRunner.createForeignKey(
            "user_search_preference",
            new TableForeignKey({
                name: "FK_user_search_preference_user",
                columnNames: ["user_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "user",
                onDelete: "CASCADE"
            })
        );

        await queryRunner.createForeignKey(
            "user_search_preference",
            new TableForeignKey({
                name: "FK_user_search_preference_groupe",
                columnNames: ["groupe_partage_id"],
                referencedColumnNames: ["id"],
                referencedTableName: "groupe_partage",
                onDelete: "CASCADE"
            })
        );

        console.log('✅ [Migration] Foreign keys created');

        // Créer les indexes pour améliorer les performances
        console.log('📊 [Migration] Creating indexes...');

        await queryRunner.createIndex(
            "user_search_preference",
            new TableIndex({
                name: "IDX_user_search_pref_user",
                columnNames: ["user_id"]
            })
        );

        await queryRunner.createIndex(
            "user_search_preference",
            new TableIndex({
                name: "IDX_user_search_pref_enabled",
                columnNames: ["user_id", "isEnabled"]
            })
        );

        await queryRunner.createIndex(
            "user_search_preference",
            new TableIndex({
                name: "IDX_user_search_pref_groupe",
                columnNames: ["groupe_partage_id"]
            })
        );

        // Index unique pour éviter les doublons (user + groupe)
        await queryRunner.createIndex(
            "user_search_preference",
            new TableIndex({
                name: "IDX_user_search_pref_unique",
                columnNames: ["user_id", "groupe_partage_id"],
                isUnique: true
            })
        );

        console.log('✅ [Migration] Indexes created');
        console.log('🎉 [Migration] user_search_preference migration completed successfully!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        console.log('⏪ [Migration] Reverting user_search_preference table...');

        // Supprimer les indexes
        await queryRunner.dropIndex("user_search_preference", "IDX_user_search_pref_unique");
        await queryRunner.dropIndex("user_search_preference", "IDX_user_search_pref_groupe");
        await queryRunner.dropIndex("user_search_preference", "IDX_user_search_pref_enabled");
        await queryRunner.dropIndex("user_search_preference", "IDX_user_search_pref_user");

        // Supprimer les foreign keys
        await queryRunner.dropForeignKey("user_search_preference", "FK_user_search_preference_groupe");
        await queryRunner.dropForeignKey("user_search_preference", "FK_user_search_preference_user");

        // Supprimer la table
        await queryRunner.dropTable("user_search_preference");

        console.log('✅ [Migration] user_search_preference table reverted');
    }
}
