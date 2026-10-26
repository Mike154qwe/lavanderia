# Panel remoto — Lavaseco La Manuelita

Sitio estático (Firebase Hosting) para que la gerente consulte, desde el celular, los movimientos del día y el cierre de caja. Es **solo lectura**: este proyecto no escribe en Firestore.

Es un Next.js independiente (`package.json` y `node_modules` propios). La aplicación del mostrador vive en la raíz del repositorio y se despliega con PM2; esta, con Firebase Hosting.

Autenticación: Firebase Auth (correo y contraseña). No reutiliza la cookie del mostrador, porque este sitio queda en internet.

Los datos los escribe la aplicación del local (Admin SDK) en la colección `panelRemoto`. Las reglas están en `/firestore.rules` en la raíz del repo.

## Local

```bash
cd panel-remoto
npm install
npm run dev          # http://localhost:3002
```

Crear `.env.local` con las variables `NEXT_PUBLIC_FIREBASE_*` (ver `lib/firebase.ts`).

## Despliegue

```bash
cd panel-remoto
npm run build
firebase deploy --only hosting
```

El comando se ejecuta **desde esta carpeta** (`firebase.json` es de este proyecto).
