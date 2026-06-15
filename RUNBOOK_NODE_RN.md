# Ejecucion de la nueva pila

## Servicios

Antes de ejecutar React Native 0.85, confirma que Node sea compatible:

```powershell
node --version
```

React Native 0.85 requiere Node `^20.19.4`, `^22.13.0`, `^24.3.0` o superior. En este equipo el entorno normal reporto Node `v24.15.0`.

1. Base de datos PostgreSQL + pgvector:

```powershell
docker compose up -d db
```

2. Microservicio semantico Python:

```powershell
cd semantic-service
..\\backend\\venv\\Scripts\\python.exe -m pip install -r requirements.txt
..\\backend\\venv\\Scripts\\python.exe run.py
```

3. Backend Node/Express:

```powershell
cd backend
npm.cmd install
npm.cmd run dev
```

4. App React Native:

```powershell
cd mobile
npm.cmd install
npm.cmd start
npm.cmd run android
```

## Notas

- La API publica corre en `http://127.0.0.1:8000`.
- En Android Emulator la app usa `http://10.0.2.2:8000`.
- El asistente documental no consulta IA externa; Node llama al microservicio Python para recuperar fragmentos desde documentos indexados.
- Las credenciales reales se retiraron del `.env`; deben rotarse si ya fueron compartidas.
- El scaffold nativo `android/ios` ya fue generado con React Native 0.85.
