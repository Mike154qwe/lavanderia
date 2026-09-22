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
