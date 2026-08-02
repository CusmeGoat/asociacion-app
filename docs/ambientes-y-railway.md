# Ambientes Y Railway

## Idea principal

La app movil no se conecta directamente a PostgreSQL. La app movil llama al backend Node. El backend Node y el semantic-service Python son los que se conectan a PostgreSQL.

Flujo local:

```text
Celular o Metro -> backend local :8000 -> PostgreSQL local Docker :5432
                                -> semantic-service local :8010 -> PostgreSQL local Docker :5432
```

Flujo produccion:

```text
APK -> backend Railway -> PostgreSQL Railway
                      -> semantic-service Railway -> PostgreSQL Railway
```

## Archivos de ambiente reales

Los archivos reales de ambiente existen, pero no deben subirse a Git porque pueden contener credenciales:

```text
backend/.env.local
backend/.env.production
semantic-service/.env.local
semantic-service/.env.production
mobile/.env.local
mobile/.env.production
```

El archivo `.env` activo se genera copiando uno de esos ambientes.

## Cambiar a ambiente local

Usar este comando desde la raiz del proyecto:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\switch-environment.ps1 local
```

Luego levantar la base local:

```powershell
docker compose up -d --build
```

Y levantar servicios:

```powershell
cd backend
npm.cmd run dev
```

```powershell
cd semantic-service
.\venv\Scripts\python.exe run.py
```

## Cambiar a ambiente production

Antes de compilar APK de produccion, editar:

```text
mobile/.env.production
```

Y colocar la URL publica del backend de Railway:

```env
PUBLIC_API_BASE_URL=https://tu-backend.up.railway.app
```

Luego ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\switch-environment.ps1 production
```

Ese comando actualiza:

```text
backend/.env
semantic-service/.env
mobile/src/config/api.ts
```

## Railway

En Railway se recomiendan tres servicios separados:

1. PostgreSQL
2. Backend Node, usando `backend/Dockerfile`
3. Semantic-service Python, usando `semantic-service/Dockerfile`

Variables necesarias del backend en Railway:

```env
NODE_ENV=production
HOST=0.0.0.0
DATABASE_URL=<URL privada o publica de PostgreSQL Railway>
JWT_SECRET=<secreto fuerte>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_DAYS=30
SEMANTIC_SERVICE_URL=<URL interna o publica del semantic-service>
STATIC_ROOT=static
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<correo remitente>
SMTP_PASSWORD=<contrasena de aplicacion>
SMTP_FROM_NAME=Asociacion Agricola 10 de Mayo
SMTP_FROM_EMAIL=<correo remitente>
```

Variables necesarias del semantic-service en Railway:

```env
HOST=0.0.0.0
RELOAD=false
DATABASE_URL=<URL privada o publica de PostgreSQL Railway>
EMBEDDING_MODEL=intfloat/multilingual-e5-large
VECTOR_DIMENSION=1024
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
OCR_ENABLED=true
OCR_LANGUAGE=spa
OCR_DPI=220
OCR_MIN_PAGE_CHARS=30
OCR_TESSERACT_CONFIG=--oem 1 --psm 6
OCR_TESSERACT_CMD=tesseract
OCR_TESSDATA_DIR=/usr/share/tesseract-ocr/5/tessdata
SEARCH_MAX_DISTANCE=0.85
SEARCH_FETCH_MULTIPLIER=4
```

## Sobre documentos PDF en Railway

Actualmente el backend guarda PDF en disco local (`static/documents`) y envia al semantic-service una ruta local del archivo.

Eso funciona en desarrollo local. En Railway, si backend y semantic-service son servicios separados, el semantic-service no vera automaticamente los archivos del backend.

Opciones para resolverlo:

1. Un solo contenedor para backend + semantic-service. Es mas simple para tesis/demo, pero menos limpio.
2. Cambiar la indexacion para que semantic-service reciba el PDF por upload o URL, no por ruta local. Recomendado a mediano plazo.
3. Usar almacenamiento persistente/externo para PDFs y que ambos servicios puedan acceder al mismo archivo.

Para una primera subida a Railway, no subir documentos criticos hasta definir esta parte.