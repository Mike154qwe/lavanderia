# =============================================================
#  BACKUP AUTOMATICO — La Manuelita
#  Destinos:
#    1. C:\LaManuelita_Backups\        (local, 30 dias)
#    2. OneDrive\LaManuelita_Backups\  (nube, 60 dias)
# =============================================================

$DB_ORIGEN      = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local\prisma\dev.db"
$BACKUP_LOCAL   = "C:\LaManuelita_Backups"
$BACKUP_ONEDRIVE = "$env:OneDrive\LaManuelita_Backups"
$BACKUP_GDRIVE  = "G:\Mi unidad\LaManuelita_Backups"
$fecha          = Get-Date -Format "yyyy-MM-dd_HH-mm"

function Hacer-Backup {
    param(
        [string]$Destino,
        [int]$DiasConservar,
        [string]$Etiqueta
    )

    if (-not (Test-Path $Destino)) {
        New-Item -ItemType Directory -Path $Destino | Out-Null
    }

    $archivo = "$Destino\dev_$fecha.db"

    try {
        Copy-Item -Path $DB_ORIGEN -Destination $archivo -Force
        $size = [math]::Round((Get-Item $archivo).Length / 1KB, 1)
        Write-Host "[OK] $Etiqueta : $archivo ($size KB)" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] $Etiqueta : $_" -ForegroundColor Red
        return
    }

    # Limpiar archivos mas antiguos que $DiasConservar dias
    $antiguos = Get-ChildItem -Path $Destino -Filter "dev_*.db" |
                Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$DiasConservar) }
    foreach ($f in $antiguos) {
        Remove-Item $f.FullName -Force
        Write-Host "[LIMPIEZA] $($f.Name)" -ForegroundColor Yellow
    }

    $total = (Get-ChildItem -Path $Destino -Filter "dev_*.db").Count
    Write-Host "[INFO] $Etiqueta : $total backups guardados" -ForegroundColor Cyan
}

# --- Ejecutar los tres backups ---
Hacer-Backup -Destino $BACKUP_LOCAL    -DiasConservar 30 -Etiqueta "LOCAL   "
Hacer-Backup -Destino $BACKUP_ONEDRIVE -DiasConservar 14 -Etiqueta "ONEDRIVE"
Hacer-Backup -Destino $BACKUP_GDRIVE   -DiasConservar 14 -Etiqueta "GDRIVE  "

# --- Exportacion diaria (reporte + inventario en piso) ---
Write-Host ""
Write-Host "[EXPORT] Generando reportes CSV del dia..." -ForegroundColor Magenta
$nodeExe    = (Get-Command node -ErrorAction SilentlyContinue).Source
$exportScript = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local\scripts\export-dia.js"

if ($nodeExe -and (Test-Path $exportScript)) {
    & $nodeExe $exportScript
} else {
    Write-Host "[AVISO] No se encontro node.exe o el script de exportacion." -ForegroundColor Yellow
}
