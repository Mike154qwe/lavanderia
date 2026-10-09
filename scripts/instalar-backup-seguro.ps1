<#
  Registra la tarea programada diaria (22:30) que corre scripts/backup-seguro.js
  contra la base de producción -- EN MODO REPORTE (sin --aplicar): la tarea deja
  el respaldo real en C:\LaManuelita_Backups\auto y SIEMPRE imprime qué borraría
  la retención, pero no borra nada hasta que se le quite el dry-run a propósito
  (ver el punto 7 que te di aparte: qué cambiar para pasar a --aplicar el
  15-oct-2026).

  A propósito, ESTE SCRIPT NO SE EJECUTA SOLO -- nadie lo corre automáticamente.
  Es para que el usuario lo ejecute él mismo en PowerShell cuando decida activar
  la tarea.

  Apunta a la carpeta de PRODUCCIÓN (no a un worktree de prueba) y a su base
  real -- ambas rutas absolutas, igual que exige backup-seguro.js para --db.
#>

$NodeExe        = "C:\Program Files\nodejs\node.exe"
$CarpetaTrabajo = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local"
$Script         = "scripts\backup-seguro.js"
$RutaDb         = "C:\Users\mikev\Downloads\lavanderia-local-next-prisma-sqlite\lavanderia-local\prisma\dev.db"
$NombreTarea    = "LaManuelita_BackupSeguro"

# Modo reporte (SIN --aplicar) a propósito -- ver el encabezado de este archivo.
$Argumentos = "`"$Script`" --db `"$RutaDb`""

if (-not (Test-Path $NodeExe)) {
  throw "No se encontró node.exe en $NodeExe -- ajusta `$NodeExe antes de registrar la tarea."
}
if (-not (Test-Path (Join-Path $CarpetaTrabajo $Script))) {
  throw "No se encontró $Script dentro de $CarpetaTrabajo -- revisa `$CarpetaTrabajo (¿ya copiaste backup-seguro.js a producción?)."
}
if (-not (Test-Path $RutaDb)) {
  throw "No se encontró la base en $RutaDb -- revisa `$RutaDb."
}

$Accion = New-ScheduledTaskAction -Execute $NodeExe -Argument $Argumentos -WorkingDirectory $CarpetaTrabajo
$Disparador = New-ScheduledTaskTrigger -Daily -At "22:30"
$Config = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Minutes 10)

Register-ScheduledTask `
  -TaskName $NombreTarea `
  -Action $Accion `
  -Trigger $Disparador `
  -Settings $Config `
  -Description "Respaldo local diario de prisma/dev.db (backup-seguro.js) + retención 72h/30d. MODO REPORTE (sin --aplicar) hasta que se cambie a mano -- ver instrucciones del 15-oct-2026." `
  -RunLevel Limited

Write-Output "Tarea '$NombreTarea' registrada EN MODO REPORTE (sin --aplicar). Verificar con:"
Write-Output "  Get-ScheduledTaskInfo -TaskName '$NombreTarea'"
Write-Output "  Get-ScheduledTask -TaskName '$NombreTarea' | Select-Object TaskName, State"
Write-Output "  (Get-ScheduledTask -TaskName '$NombreTarea').Settings.StartWhenAvailable   # debe ser True"
