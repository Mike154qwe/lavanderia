<p align="center">
  <img src="public/logo/header.png" alt="Lavaseco La Manuelita" width="420">
</p>

# Lavaseco La Manuelita

Prototipo de sistema de información **offline-first** para una lavandería de barrio en Bogotá. El registro de pedidos y el cierre de caja corren en un computador del local, **sin depender de internet**. Un panel remoto de solo lectura permite a la gerente consultar el día desde el celular.

Este repositorio es el código del prototipo. El documento de grado se entrega a la facultad por separado.

**Trabajo de grado** — Ingeniería de Sistemas y Computación, Universidad Católica de Colombia, 2026.

| | |
|---|---|
| Autores | Joel David Marín Galindo · Mike Anderson Villarreal Agudelo |
| Directora | Sara Fernanda Sánchez |
| Caso | Lavaseco La Manuelita (localidad de Suba) |
| Alcance | Prototipo académico. No es un producto comercial ni un despliegue permanente del negocio. |
| Stack | Next.js, Prisma, SQLite (WAL), Firebase (Firestore, Hosting, Auth), PM2 |

La validación en operación real (8–30 de septiembre de 2026) midió 367 pedidos y 3 cierres de caja. El tiempo de registro pasó de 7,32 a 3,77 min (−48,5 %) y el de cierre de 47,31 a 14,54 min (−69,3 %). El SUS de la gerente fue 85,8. Las trece pruebas de caja negra (CF01–CF13) se cumplieron. El diseño fue preexperimental (un grupo, antes/después): el cambio se observó junto con el uso del prototipo; **no prueba causalidad**.

## Qué hay en el prototipo

- Pedido rápido, tarifario, estados, abonos y entregas parciales
- Cierre de caja (ganancia neta y efectivo en caja, por separado)
- Inventario en piso, código de barras, pedidos antiguos
- Roles de empleado y gerente
- Panel remoto de consulta, con caché cuando el celular no tiene señal

## Arquitectura

Dos proyectos Next.js en el mismo repositorio. No comparten build ni despliegue.

| | Aplicación del local | Panel remoto (`panel-remoto/`) |
|---|---|---|
| Uso | Mostrador y gerente en el negocio | Consulta desde el celular |
| Dónde corre | Node + PM2 en el PC del local (`127.0.0.1:3000`) | Firebase Hosting (sitio estático) |
| Datos | SQLite (`prisma/dev.db`) | Lee Firestore; no escribe |
| Internet | No hace falta para registrar un pedido | Hace falta para actualizar; sin red muestra la última caché |

```
.
├── app/                 Mostrador y panel de gerente (App Router)
├── components/
├── lib/                 Caja, autenticación, Firestore Admin
├── prisma/              Esquema SQLite
├── scripts/             Seeds y respaldo
├── tests/               Cálculo de caja y control de acceso (RNF04)
├── firestore.rules      Reglas de Firestore (ambos sitios)
├── ecosystem.config.js  PM2 en el equipo del local
└── panel-remoto/        Proyecto aparte — ver su README
```

## Cómo correrlo en local

Hace falta Node.js 20 o superior. Copiar `.env.example` a `.env` y completar los valores (sin `.env` la aplicación no arranca: `AUTH_SECRET` es obligatorio).

```bash
npm install
npx prisma migrate dev
npm run dev                 # http://localhost:3000
```

Panel remoto, en otra terminal:

```bash
cd panel-remoto
npm install
npm run dev                 # http://localhost:3002
```

Las variables de Firebase del panel van en `panel-remoto/.env.local`. Detalle de esa parte: [`panel-remoto/README.md`](panel-remoto/README.md).

## Pruebas

```bash
npm run test:caja     # cálculo de caja y cierres
npm run test:rnf04    # acceso por ruta (empleado / gerente)
```

## Despliegue en el local (resumen)

En el computador del negocio el servidor se ata a `127.0.0.1` (no se publica en la red ni en internet). Arranque con PM2:

```bash
pm2 stop lavanderia
npm run build
pm2 restart lavanderia
```

Hay que detener el proceso antes del build: si no, `prisma generate` falla por archivo bloqueado. El detalle de Windows, `pm2 save` y el respaldo cada 25 minutos está en los comentarios de `ecosystem.config.js`.

El panel remoto se publica desde `panel-remoto/` con `npm run build` y `firebase deploy --only hosting`.

## Datos personales

El prototipo guarda nombre y teléfono de clientes (Ley 1581 de 2012). Las credenciales **no van en git**. Las reglas de Firestore se aplican a mano desde la consola de Firebase, pegando `firestore.rules`.
