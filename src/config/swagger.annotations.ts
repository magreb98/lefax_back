/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Connexion utilisateur
 *     description: Authentifie un utilisateur et retourne un JWT token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Connexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401:
 *         description: Identifiants invalides
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: "Email ou mot de passe incorrect"
 *               error: "INVALID_CREDENTIALS"
 */

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Inscription utilisateur
 *     description: Crée un nouveau compte utilisateur
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: Inscription réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Utilisateur créé avec succès"
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       409:
 *         description: Email déjà utilisé
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags:
 *       - Authentication
 *     summary: Profil utilisateur actuel
 *     description: Récupère les informations de l'utilisateur connecté
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profil récupéré
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags:
 *       - Authentication
 *     summary: Déconnexion
 *     description: Déconnecte l'utilisateur (invalide le token côté client)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Déconnexion réussie
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Déconnexion réussie"
 */

/**
 * @swagger
 * /documents/upload:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Upload un document
 *     description: Téléverse un nouveau document (max 10MB)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - file
 *               - documentName
 *               - categorieId
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: Fichier à uploader (max 10MB)
 *               documentName:
 *                 type: string
 *                 example: "Cours Chapitre 1"
 *               description:
 *                 type: string
 *                 example: "Introduction aux fonctions"
 *               categorieId:
 *                 type: string
 *                 format: uuid
 *               matiereId:
 *                 type: string
 *                 format: uuid
 *               groupePartageIds:
 *                 type: string
 *                 description: 'JSON array de UUIDs, ex: ["id1","id2"]'
 *               isdownloadable:
 *                 type: boolean
 *                 default: true
 *               documentType:
 *                 type: string
 *                 enum: [COURS, TD, TP, EXAMEN, CORRIGE]
 *               publicationMonth:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               publicationYear:
 *                 type: integer
 *                 minimum: 2000
 *     responses:
 *       201:
 *         description: Document créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 document:
 *                   $ref: '#/components/schemas/Document'
 *       400:
 *         description: Fichier invalide ou trop volumineux
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /documents:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Liste des documents
 *     description: Récupère la liste des documents accessibles
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: categorieId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par catégorie
 *       - in: query
 *         name: matiereId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filtrer par matière
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Nombre de résultats
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Pagination
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 42
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 */

/**
 * @swagger
 * /documents/{id}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Détails d'un document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   put:
 *     tags:
 *       - Documents
 *     summary: Modifier un document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               documentName:
 *                 type: string
 *               description:
 *                 type: string
 *               isdownloadable:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Document modifié
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   delete:
 *     tags:
 *       - Documents
 *     summary: Supprimer un document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Document supprimé
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /documents/{id}/download:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Télécharger un document
 *     description: Télécharge un document et incrémente le compteur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Fichier téléchargé
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Document non téléchargeable
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /documents/search:
 *   get:
 *     tags:
 *       - Documents
 *     summary: Rechercher des documents
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Terme de recherche
 *         example: "mathématiques"
 *     responses:
 *       200:
 *         description: Résultats de recherche
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                 documents:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Document'
 */

/**
 * @swagger
 * /ecoles:
 *   post:
 *     tags:
 *       - Écoles
 *     summary: Créer une école
 *     description: Crée une nouvelle école (SUPERADMIN ou canCreateSchool requis)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEcoleRequest'
 *     responses:
 *       201:
 *         description: École créée
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 ecole:
 *                   $ref: '#/components/schemas/Ecole'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *   get:
 *     tags:
 *       - Écoles
 *     summary: Liste des écoles
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Ecole'
 */

/**
 * @swagger
 * /ecoles/{id}:
 *   get:
 *     tags:
 *       - Écoles
 *     summary: Détails d'une école
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: École trouvée
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Ecole'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

/**
 * @swagger
 * /groupes:
 *   post:
 *     tags:
 *       - Groupes de Partage
 *     summary: Créer un groupe personnalisé
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateGroupeRequest'
 *     responses:
 *       201:
 *         description: Groupe créé
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 groupe:
 *                   $ref: '#/components/schemas/GroupePartage'
 *   get:
 *     tags:
 *       - Groupes de Partage
 *     summary: Liste des groupes
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/GroupePartage'
 */

/**
 * @swagger
 * /groupes/{id}/generate-invitation:
 *   post:
 *     tags:
 *       - Groupes de Partage
 *     summary: Générer un lien d'invitation
 *     description: Crée un token d'invitation avec expiration
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expiresInDays:
 *                 type: integer
 *                 default: 7
 *                 description: Durée de validité en jours
 *     responses:
 *       200:
 *         description: Token généré
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invitationToken:
 *                   type: string
 *                   example: "abc123def456"
 *                 invitationUrl:
 *                   type: string
 *                   example: "http://localhost:3000/api/groupes/join/abc123def456"
 *                 expiresAt:
 *                   type: string
 *                   format: date-time
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags:
 *       - Users
 *     summary: Liste des utilisateurs
 *     description: Récupère la liste des utilisateurs (ADMIN+ requis)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Liste récupérée
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags:
 *       - Users
 *     summary: Détails d'un utilisateur
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Utilisateur trouvé
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
