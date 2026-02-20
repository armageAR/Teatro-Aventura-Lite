# Teatro Aventura Lite

Repositorio con backend en Laravel y frontend en Next.js.

## Estructura

- `backend/`: API y логica de negocio (Laravel).
- `frontend/`: interfaz web (Next.js).

## Requisitos

- Node.js (para `frontend/`).
- PHP + Composer (para `backend/`).
- Base de datos compatible con Laravel (segun `.env`).

## Configuracion

Backend:

```bash
cd backend
cp .env.example .env
composer install
php artisan key:generate
php artisan migrate
```

Frontend:

```bash
cd frontend
npm install
```

## Desarrollo

Backend:

```bash
cd backend
php artisan serve
```

Frontend:

```bash
cd frontend
npm run dev
```

Frontend corre por defecto en `http://localhost:3000`.

## Produccion

Frontend:

```bash
cd frontend
npm run build
npm run start
```

## Notas

- Ajusta variables en `backend/.env` segun tu entorno.
- La raiz tiene un `.gitignore` consolidado para `backend/` y `frontend/`.
