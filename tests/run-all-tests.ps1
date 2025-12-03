# Script PowerShell pour exécuter tous les tests de l'API Lefax
# Usage: .\tests\run-all-tests.ps1

Write-Host "🧪 Démarrage des tests Lefax API..." -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Vérifier que Node.js est installé
try {
    $null = node --version
} catch {
    Write-Host "❌ Node.js n'est pas installé" -ForegroundColor Red
    exit 1
}

# Vérifier que npm est installé
try {
    $null = npm --version
} catch {
    Write-Host "❌ npm n'est pas installé" -ForegroundColor Red
    exit 1
}

Write-Host "`n📦 Vérification des dépendances..." -ForegroundColor Yellow
$jestInstalled = npm list jest 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Installation des dépendances de test..." -ForegroundColor Yellow
    npm install
}

Write-Host "`n🔧 Configuration de l'environnement de test..." -ForegroundColor Yellow
$env:NODE_ENV = "test"

Write-Host "`n✅ Exécution des tests unitaires..." -ForegroundColor Green
npm run test -- tests/unit

Write-Host "`n✅ Exécution des tests d'intégration..." -ForegroundColor Green
npm run test -- tests/integration

Write-Host "`n✅ Génération du rapport de couverture..." -ForegroundColor Green
npm run test:coverage

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "✨ Tests terminés !" -ForegroundColor Green
Write-Host "`n📊 Consultez le rapport de couverture dans: coverage\lcov-report\index.html" -ForegroundColor Cyan

# Ouvrir le rapport de couverture dans le navigateur (optionnel)
$openReport = Read-Host "`nVoulez-vous ouvrir le rapport de couverture ? (O/N)"
if ($openReport -eq "O" -or $openReport -eq "o") {
    $reportPath = Join-Path $PSScriptRoot "..\coverage\lcov-report\index.html"
    if (Test-Path $reportPath) {
        Start-Process $reportPath
    } else {
        Write-Host "⚠️  Rapport de couverture non trouvé" -ForegroundColor Yellow
    }
}
