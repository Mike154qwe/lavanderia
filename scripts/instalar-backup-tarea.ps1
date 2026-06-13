# =============================================================
#  INSTALAR TAREA PROGRAMADA DE BACKUP
#  Ejecutar UNA sola vez como Administrador
# =============================================================

$scriptPath = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local\scripts\backup-db.ps1"

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -Daily -At "23:00"

$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 5) `
    -StartWhenAvailable `
    -RunOnlyIfNetworkAvailable:$false

Register-ScheduledTask `
    -TaskName   "LaManuelita_BackupDB" `
    -Description "Backup automatico base de datos La Manuelita - 11 PM diario" `
    -Action     $action `
    -Trigger    $trigger `
    -Settings   $settings `
    -RunLevel   Highest `
    -Force

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Tarea instalada: backup cada noche a las 11:00 PM" -ForegroundColor Green
Write-Host "  Backups guardados en: C:\LaManuelita_Backups\"      -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Presiona cualquier tecla para cerrar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
