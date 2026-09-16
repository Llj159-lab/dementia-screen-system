# make-deploy-zip.ps1
# Creates a CloudBase deployment ZIP with forward-slash path separators.
# Usage: powershell -File scripts/make-deploy-zip.ps1

param(
    [string]$BackendDir = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputZip  = (Join-Path (Split-Path -Parent $BackendDir) "backend-deploy.zip")
)

$ErrorActionPreference = "Stop"

# Step 1: compile TypeScript locally (optional - Docker will rebuild)
Write-Host "[1/3] Compiling TypeScript..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
    $tscBin = Join-Path $BackendDir "node_modules\.bin\tsc"
    if (Test-Path $tscBin) {
        & $tscBin
        if ($LASTEXITCODE -ne 0) { throw "tsc failed with exit code $LASTEXITCODE" }
        Write-Host "  tsc OK" -ForegroundColor Green
    } else {
        Write-Host "  tsc not found locally, skipping (Docker will build)" -ForegroundColor Yellow
    }
} finally { Pop-Location }

# Step 2: collect files
$filesToPack = @(
    "Dockerfile",
    "package.json",
    "package-lock.json",
    "tsconfig.json"
)
$srcDir = Join-Path $BackendDir "src"
Get-ChildItem -Path $srcDir -Recurse -Filter "*.ts" | ForEach-Object {
    $rel = $_.FullName.Substring($BackendDir.Length + 1).Replace("\","/"
    )
    $filesToPack += $rel
}
Write-Host "`n[2/3] Files to pack ($($filesToPack.Count) files):" -ForegroundColor Cyan
$filesToPack | ForEach-Object { Write-Host "  $_" }

# Step 3: create ZIP with forward-slash entries using .NET ZipArchive
Write-Host "`n[3/3] Creating ZIP: $OutputZip" -ForegroundColor Cyan
Add-Type -AssemblyName "System.IO.Compression.FileSystem"
if (Test-Path $OutputZip) { Remove-Item $OutputZip -Force }

$zip = [System.IO.Compression.ZipFile]::Open($OutputZip, [System.IO.Compression.ZipArchiveMode]::Create)
try {
    foreach ($relPath in $filesToPack) {
        $absPath = Join-Path $BackendDir $relPath.Replace("/","\")
        if (-not (Test-Path $absPath)) {
            Write-Warning "  Skipping (not found): $relPath"
            continue
        }
        $entry = $zip.CreateEntry($relPath, [System.IO.Compression.CompressionLevel]::Optimal)
        $entryStream = $entry.Open()
        $fileBytes = [System.IO.File]::ReadAllBytes($absPath)
        $entryStream.Write($fileBytes, 0, $fileBytes.Length)
        $entryStream.Close()
    }
} finally {
    $zip.Dispose()
}

# Verify: no backslashes in ZIP entries
Write-Host "`nVerifying ZIP path separators..." -ForegroundColor Cyan
$verifyZip = [System.IO.Compression.ZipFile]::OpenRead($OutputZip)
$backslashEntries = @($verifyZip.Entries | Where-Object { $_.FullName -like "*\*" })
$allEntries = @($verifyZip.Entries | ForEach-Object { $_.FullName })
$verifyZip.Dispose()

if ($backslashEntries.Count -gt 0) {
    Write-Host "ERROR: backslash paths found!" -ForegroundColor Red
    $backslashEntries | ForEach-Object { Write-Host "  $($_.FullName)" }
    exit 1
}

$zipSizeKB = [math]::Round((Get-Item $OutputZip).Length / 1KB, 1)
Write-Host "`n[DONE] Created: $OutputZip  (${zipSizeKB} KB)" -ForegroundColor Green
Write-Host "Entries:" -ForegroundColor White
$allEntries | ForEach-Object { Write-Host "  $_" }
Write-Host "`nUpload this ZIP to CloudBase console and redeploy." -ForegroundColor Cyan