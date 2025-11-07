# Modèles de données

## Vue d'ensemble

Lefax utilise TypeORM pour la gestion des modèles de données. Voici la documentation détaillée de chaque modèle.

## User

```typescript
@Entity()
class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    firstName: string;

    @Column()
    lastName: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column({
        type: 'enum',
        enum: ['ADMIN', 'SUPER_ADMIN', 'USER', 'TEACHER']
    })
    role: string;

    @Column({ nullable: true })
    phoneNumber: string;

    @Column({ default: true })
    isActive: boolean;

    @ManyToMany(() => GroupePartage)
    groupesPartage: GroupePartage[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

## Document

```typescript
@Entity()
class Document {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    documentName: string;

    @Column()
    documentUrl: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => DocumentCategorie)
    categorie: DocumentCategorie;

    @ManyToOne(() => Matiere, { nullable: true })
    matiere: Matiere;

    @ManyToOne(() => User)
    addedBy: User;

    @Column({ default: true })
    isdownloadable: boolean;

    @Column({ default: 0 })
    downloadCount: number;

    @Column({ default: 0 })
    viewCount: number;

    @ManyToMany(() => GroupePartage)
    groupesPartage: GroupePartage[];

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
```

## DocumentCategorie

```typescript
@Entity()
class DocumentCategorie {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => Document, document => document.categorie)
    documents: Document[];
}
```

## GroupePartage

```typescript
@Entity()
class GroupePartage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: ['SYSTEM', 'CUSTOM']
    })
    type: string;

    @ManyToMany(() => User)
    @JoinTable()
    users: User[];

    @ManyToMany(() => Document)
    @JoinTable()
    documents: Document[];
}
```

## Ecole

```typescript
@Entity()
class Ecole {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    address: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    email: string;

    @OneToMany(() => Filiere, filiere => filiere.ecole)
    filieres: Filiere[];

    @ManyToMany(() => User)
    @JoinTable()
    staff: User[];
}
```

## Filiere

```typescript
@Entity()
class Filiere {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => Ecole)
    ecole: Ecole;

    @OneToMany(() => Classe, classe => classe.filiere)
    classes: Classe[];
}
```

## Classe

```typescript
@Entity()
class Classe {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToOne(() => Filiere)
    filiere: Filiere;

    @ManyToMany(() => Matiere)
    @JoinTable()
    matieres: Matiere[];
}
```

## Matiere

```typescript
@Entity()
class Matiere {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ nullable: true })
    description: string;

    @ManyToMany(() => Classe)
    classes: Classe[];

    @OneToMany(() => Document, document => document.matiere)
    documents: Document[];
}
```

## Relations

### User - GroupePartage
- Many-to-Many
- Un utilisateur peut appartenir à plusieurs groupes
- Un groupe peut avoir plusieurs utilisateurs

### Document - GroupePartage
- Many-to-Many
- Un document peut être partagé dans plusieurs groupes
- Un groupe peut contenir plusieurs documents

### Document - Matiere
- Many-to-One
- Un document appartient à une matière
- Une matière peut avoir plusieurs documents

### Ecole - Filiere
- One-to-Many
- Une école peut avoir plusieurs filières
- Une filière appartient à une école

### Filiere - Classe
- One-to-Many
- Une filière peut avoir plusieurs classes
- Une classe appartient à une filière

### Classe - Matiere
- Many-to-Many
- Une classe peut avoir plusieurs matières
- Une matière peut être enseignée dans plusieurs classes

## Indexes

```typescript
// User
@Index('user_email_idx', ['email'], { unique: true })

// Document
@Index('document_name_idx', ['documentName'])
@Index('document_addedBy_idx', ['addedBy'])

// GroupePartage
@Index('groupe_name_idx', ['name'])

// Ecole
@Index('ecole_name_idx', ['name'])
```

## Triggers

Les triggers sont implémentés via les hooks TypeORM :

```typescript
@BeforeInsert()
@BeforeUpdate()
async hashPassword() {
    if (this.password) {
        this.password = await bcrypt.hash(this.password, 10);
    }
}
```

## Contraintes

- Email unique pour les utilisateurs
- Noms non-nuls pour toutes les entités principales
- Clés étrangères avec suppression en cascade où approprié
- Vérification des énumérations pour les types