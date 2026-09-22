// =============================================================
//  ARRANQUE AUTOMÁTICO CON WINDOWS -- La Manuelita
// =============================================================
//
// Windows arranca PM2 solo, sin abrir ninguna terminal ni que nadie ejecute
// nada a mano, con este mecanismo (verificado en vivo el 22-sep-2026, no solo
// leído de la documentación de pm2-windows-startup):
//
//   1. Al iniciar sesión de Windows, arranca todo lo que esté en
//      HKCU\Software\Microsoft\Windows\CurrentVersion\Run. Ahí hay una
//      entrada "PM2" (instalada con `pm2-startup install`, paquete
//      pm2-windows-startup) que ejecuta, oculto:
//        wscript.exe invisible.vbs pm2_resurrect.cmd
//      y pm2_resurrect.cmd solo corre "pm2 resurrect".
//   2. "pm2 resurrect" lee C:\Users\<usuario>\.pm2\dump.pm2 -- una foto de
//      qué procesos había corriendo la última vez que alguien corrió
//      "pm2 save" -- y los vuelve a arrancar con su configuración exacta
//      (cwd, script, env, cron_restart, autorestart, etc.).
//
// *** Por eso "pm2 save" hay que correrlo cada vez que se agrega, quita o
// cambia un proceso de este archivo *** (arrancarlo con
// `pm2 start ecosystem.config.js` no alcanza por sí solo -- si no se guarda,
// el próximo arranque de Windows resucita la lista VIEJA, no la actual). El
// 22-sep-2026 el dump llevaba desde el 12-jun-2026 y solo tenía "lavanderia"
// -- "respaldo-db" no se habría levantado en un reinicio real hasta que se
// corrió "pm2 save" a mano.
//
// --- Procedimiento de recuperación manual (si el arranque automático falla) ---
//
// Diagnóstico, en orden:
//   1. ¿el daemon de PM2 está vivo?           pm2 ping
//   2. ¿qué hay corriendo ahora mismo?        pm2 list
//   3. ¿la entrada de registro sigue ahí?     PowerShell:
//        Get-ItemProperty HKCU:\Software\Microsoft\Windows\CurrentVersion\Run
//      (debe existir una entrada "PM2" apuntando a pm2-windows-startup)
//   4. ¿el dump guardado tiene lo que debería?  Node:
//        const j = JSON.parse(fs.readFileSync("C:/Users/<usuario>/.pm2/dump.pm2"));
//        j.map(p => p.name)   // debe listar "lavanderia" Y "respaldo-db"
//
// Arreglo, según lo que falló:
//   - Si el daemon está muerto y no hay nada corriendo:
//       pm2 resurrect
//     (si el dump está al día, esto solo basta -- no hace falta "pm2 start").
//   - Si "pm2 resurrect" no trae nada o trae la lista vieja: el dump está
//     desactualizado o falta. Reconstruir desde cero:
//       cd <ruta a lavanderia-local>
//       pm2 start ecosystem.config.js
//       pm2 save
//   - Si falta la entrada de registro (se desinstaló pm2-windows-startup, o
//     Windows la perdió): reinstalarla --
//       npm install -g pm2-windows-startup   (si el paquete ya no está)
//       pm2-startup install
//     Confirmarla sin reiniciar la máquina, simulando el logon (esto es
//     literalmente lo que corre Windows al iniciar sesión):
//       PowerShell:
//         $v = (Get-ItemProperty HKCU:\...\Run).PM2
//         Invoke-Expression $v
//       Esperar ~15-20s y comprobar con `pm2 list` (o mejor: primero con
//       `curl http://localhost:3000/login`, sin tocar pm2, para no disparar
//       sin querer un daemon vacío nuevo con el propio comando de chequeo).
//   - Si todo lo anterior está bien pero "respaldo-db" nunca corre solo:
//     revisar que el "cron restart" siga registrado --
//       pm2 describe respaldo-db     (buscar la línea "cron restart")
//     "*/25 * * * *" dispara en los minutos :00, :25 y :50 del reloj, NO
//     "cada 25 minutos desde que arrancó" -- si acaba de arrancar a las
//     xx:40, el primer disparo real es a las xx:50, no a los 25 minutos.
//
// Nunca hace falta abrir una terminal a mano salvo para diagnosticar o
// reparar uno de los pasos de arriba -- en operación normal, todo esto pasa
// solo al iniciar sesión de Windows.

module.exports = {
  apps: [
    {
      name: "lavanderia",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "C:\\Users\\mikev\\Downloads\\lavanderia-local-next-prisma-sqlite\\lavanderia-local",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      restart_delay: 3000,
    },
    {
      // Respaldo periódico completo a Firebase (scripts/respaldo-db-firebase.js):
      // un ciclo por disparo y termina -- autorestart:false para que PM2 no lo
      // reinicie de inmediato al terminar, cron_restart para que lo vuelva a
      // arrancar cada 25 minutos (dentro del rango pedido de 20-30). Ver el
      // encabezado del script para el alcance real (point-in-time, no tiempo real).
      name: "respaldo-db",
      script: "scripts/respaldo-db-firebase.js",
      cwd: "C:\\Users\\mikev\\Downloads\\lavanderia-local-next-prisma-sqlite\\lavanderia-local",
      interpreter: "node",
      watch: false,
      autorestart: false,
      cron_restart: "*/25 * * * *",
    },
  ],
};
