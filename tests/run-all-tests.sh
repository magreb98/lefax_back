#!/bin/bash

# Script pour exécuter tous les tests de l'API Lefax
# Usage: ./tests/run-all-tests.sh

echo "🧪 Démarrage des tests Lefax API..."
echo "======================================"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Vérifier que Node.js est installé
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi

# Vérifier que npm est installé
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Vérification des dépendances...${NC}"
npm list jest > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Installation des dépendances de test...${NC}"
    npm install
fi

echo ""
echo -e "${YELLOW}🔧 Configuration de l'environnement de test...${NC}"
export NODE_ENV=test

echo ""
echo -e "${GREEN}✅ Exécution des tests unitaires...${NC}"
npm run test -- tests/unit

echo ""
echo -e "${GREEN}✅ Exécution des tests d'intégration...${NC}"
npm run test -- tests/integration

echo ""
echo -e "${GREEN}✅ Génération du rapport de couverture...${NC}"
npm run test:coverage

echo ""
echo "======================================"
echo -e "${GREEN}✨ Tests terminés !${NC}"
echo ""
echo "📊 Consultez le rapport de couverture dans: coverage/lcov-report/index.html"
