# Script para corrigir o problema de roles vazias no Admin Panel
# Execute este script amanhã para aplicar a correção

Write-Host "`n🔧 CORRIGINDO STRAPI ADMIN - POPULATE ROLES`n" -ForegroundColor Cyan
Write-Host "═" * 70 -ForegroundColor Gray

$projectPath = "D:\CoraApp\caminho-de-cora-backend\app"
$authFile = Join-Path $projectPath "node_modules\strapi-admin\services\auth.js"

# Verificar se o arquivo existe
if (-not (Test-Path $authFile)) {
    Write-Host "❌ Arquivo não encontrado: $authFile" -ForegroundColor Red
    Write-Host "   Execute 'npm install' primeiro" -ForegroundColor Yellow
    exit 1
}

# Fazer backup do arquivo original
$backupFile = "$authFile.backup"
if (-not (Test-Path $backupFile)) {
    Copy-Item $authFile $backupFile
    Write-Host "✅ Backup criado: $backupFile" -ForegroundColor Green
}

# Ler o conteúdo do arquivo
$content = Get-Content $authFile -Raw

# Verificar se já foi modificado
if ($content -match "findOne\(\{ email \}, \['roles'\]\)") {
    Write-Host "⚠️  O arquivo JÁ foi modificado anteriormente!" -ForegroundColor Yellow
    Write-Host "   Não é necessário aplicar novamente." -ForegroundColor Yellow
    exit 0
}

# Aplicar a correção
Write-Host "`n📝 Aplicando correção..." -ForegroundColor Cyan

$originalLine = "const user = await strapi.query('user', 'admin').findOne({ email });"
$fixedLine = "const user = await strapi.query('user', 'admin').findOne({ email }, ['roles']);"

if ($content -match [regex]::Escape($originalLine)) {
    $content = $content -replace [regex]::Escape($originalLine), $fixedLine
    $content | Set-Content $authFile -NoNewline -Encoding UTF8
    
    Write-Host "✅ Arquivo modificado com sucesso!" -ForegroundColor Green
    Write-Host "`n📄 Linha original:" -ForegroundColor Gray
    Write-Host "   $originalLine" -ForegroundColor DarkGray
    Write-Host "`n📄 Linha corrigida:" -ForegroundColor Gray
    Write-Host "   $fixedLine" -ForegroundColor Green
    
    Write-Host "`n" + ("═" * 70) -ForegroundColor Gray
    Write-Host "🎯 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
    Write-Host "═" * 70 -ForegroundColor Gray
    Write-Host "1. Reinicie o servidor Strapi" -ForegroundColor White
    Write-Host "2. Abra uma aba anônima: http://localhost:1337/admin" -ForegroundColor White
    Write-Host "3. Faça login com natasha.sophie@gmail.com" -ForegroundColor White
    Write-Host "4. Verifique o Session Storage (F12 → Application)" -ForegroundColor White
    Write-Host "5. Agora 'roles' deve estar preenchido! ✨" -ForegroundColor White
    Write-Host "`n💡 Se funcionar, instale patch-package:" -ForegroundColor Yellow
    Write-Host "   npm install patch-package --save-dev" -ForegroundColor Gray
    Write-Host "   npx patch-package strapi-admin" -ForegroundColor Gray
    Write-Host "`n"
    
} else {
    Write-Host "❌ Não foi possível encontrar a linha para modificar!" -ForegroundColor Red
    Write-Host "   O arquivo pode ter sido alterado por outra versão do Strapi." -ForegroundColor Yellow
    Write-Host "`n📋 Procurando por:" -ForegroundColor Gray
    Write-Host "   $originalLine" -ForegroundColor DarkGray
    exit 1
}
