# =============================================================
#  BACKUP AUTOMATICO — La Manuelita
#  Copia prisma/dev.db a C:\LaManuelita_Backups\
#  Conserva los ultimos 30 backups y elimina los mas antiguos
# =============================================================

$DB_ORIGEN  = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local\prisma\dev.db"
$BACKUP_DIR = "C:\LaManuelita_Backups"

# --- Crear carpeta de destino si no existe ---
if (-not (Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

# --- Nombre del archivo con fecha y hora ---
$fecha     = Get-Date -Format "yyyy-MM-dd_HH-mm"
$destino   = "$BACKUP_DIR\dev_$fecha.db"

# --- Copiar el archivo ---
try {
    Copy-Item -Path $DB_ORIGEN -Destination $destino -Force
    $size = [math]::Round((Get-Item $destino).Length / 1KB, 1)
    Write-Host "[OK] Backup creado: $destino ($size KB)" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] No se pudo copiar la base de datos: $_" -ForegroundColor Red
    exit 1
}

# --- Eliminar backups con mas de 30 dias ---
$antiguos = Get-ChildItem -Path $BACKUP_DIR -Filter "dev_*.db" |
            Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) }

foreach ($archivo in $antiguos) {
    Remove-Item $archivo.FullName -Force
    Write-Host "[LIMPIEZA] Eliminado backup antiguo: $($archivo.Name)" -ForegroundColor Yellow
}

$total = (Get-ChildItem -Path $BACKUP_DIR -Filter "dev_*.db").Count
Write-Host "[INFO] Total de backups almacenados: $total" -ForegroundColor Cyan
