<#
  Registra la tarea programada diaria (22:30) que corre scripts/backup-seguro.js
  --aplicar -- respaldo + retención real, no dry-run (si prefieres que la tarea
  programada se quede en dry-run, cambia $Argumentos abajo antes de correr esto).

  A propósito, ESTE SCRIPT NO SE EJECUTA SOLO -- nadie lo corre automáticamente.
  Es para que el usuario lo ejecute él mismo en PowerShell cuando decida activar
  la tarea. Ver el bloque de verificación al final de este archivo (comentado)
  para confirmar que quedó bien después.

  OJO -- ruta de trabajo: esta carpeta ($CarpetaTrabajo, abajo) es el worktree
  de prueba de la rama feat/backup-seguro, NO la carpeta de producción. Sirve
  para probar el mecanismo real de principio a fin (Programador de tareas de
  Windows disparando este script tal cual) mientras la rama no se fusiona.
  Si/cuando esta rama se fusiona a main y se despliega, cambia $CarpetaTrabajo
  a la carpeta de producción (…\lavanderia-local) y vuelve a correr esto --
  o entra al Programador de tareas y edita la acción a mano.
#>

$NodeExe        = "C:\Program Files\nodejs\node.exe"
$CarpetaTrabajo = "C:\LaManuelita_Test\worktree-backup-seguro"
$Script         = "scripts\backup-seguro.js"
$Argumentos     = "`"$Script`" --aplicar"
$NombreTarea    = "LaManuelita_BackupSeguro"

if (-not (Test-Path $NodeExe)) {
  throw "No se encontró node.exe en $NodeExe -- ajusta `$NodeExe antes de registrar la tarea."
}
if (-not (Test-Path (Join-Path $CarpetaTrabajo $Script))) {
  throw "No se encontró $Script dentro de $CarpetaTrabajo -- revisa `$CarpetaTrabajo."
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
  -Description "Respaldo local diario de prisma/dev.db (backup-seguro.js) + retención 72h/30d." `
  -RunLevel Limited

Write-Output "Tarea '$NombreTarea' registrada. Verificar con:"
Write-Output "  Get-ScheduledTaskInfo -TaskName '$NombreTarea'"
Write-Output "  Get-ScheduledTask -TaskName '$NombreTarea' | Select-Object TaskName, State"
