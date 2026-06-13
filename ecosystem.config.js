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
  ],
};
