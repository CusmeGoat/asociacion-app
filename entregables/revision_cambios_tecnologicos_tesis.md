# Revision de cambios tecnologicos para tesis

Documento revisado: `C:\Users\cusmej\Searches\Documents\Ug\ProyectoTesis\Chatbot informativo - Salas, Cusme CON INDICES.docx`

No se modifico el documento Word. Esta revision indica donde conviene actualizar el contenido para alinearlo con la pila tecnologica actual:

- Frontend movil: React Native 0.85 + TypeScript.
- Backend principal: Node.js + Express + TypeScript + TypeORM.
- Arquitectura: Hexagonal, con capas de dominio, aplicacion, puertos y adaptadores.
- Servicio especializado: microservicio semantico Python/FastAPI para recuperacion documental.
- Base de datos: PostgreSQL + pgvector.
- Documentos: almacenamiento local de PDFs.
- Correo: SMTP.
- Contenedores: Docker como soporte para PostgreSQL/pgvector.

## Imagen de arquitectura

Se genero una nueva imagen en:

`C:\Users\cusmej\Searches\Documents\Ug\ProyectoTesis\asociacion-app\entregables\arquitectura_hexagonal_react_native_node.png`

Esta imagen reemplaza la referencia visual anterior que mencionaba Flutter y FastAPI como backend principal.

## Cambios prioritarios en el documento

### 1. Figura 6 y parrafo posterior

Ubicacion detectada: parrafos 677 a 683, seccion `Arquitectura de Software`.

Texto actual critico:

> Como se observa en la Figura 6, los socios interactuan con el sistema mediante la aplicacion movil desarrollada en Flutter. Desde la aplicacion se realizan acciones como consultas al chatbot, visualizacion de anuncios, acceso a documentos institucionales y gestion de usuarios. Las solicitudes enviadas desde la aplicacion son recibidas por el backend desarrollado en FastAPI, donde se ejecutan los casos de uso correspondientes.

Cambio recomendado:

> Como se observa en la Figura 6, los socios y el secretario interactuan con el sistema mediante la aplicacion movil desarrollada en React Native 0.85 con TypeScript. Desde la aplicacion se realizan acciones como consultas al asistente documental, visualizacion de anuncios, acceso a documentos institucionales, notificaciones y gestion de usuarios. Las solicitudes enviadas desde la aplicacion son recibidas por el backend principal desarrollado en Node.js, Express y TypeScript, donde se ejecutan los casos de uso definidos bajo arquitectura hexagonal. Para las consultas documentales, el backend se comunica con un microservicio interno desarrollado en Python con FastAPI, encargado de realizar la recuperacion semantica sobre documentos indexados en PostgreSQL con pgvector.

Caption recomendado:

> Figura 6. Arquitectura hexagonal del sistema documental con aplicacion movil React Native, backend Node.js/Express, base PostgreSQL con pgvector y microservicio semantico Python. Informacion adaptada de la investigacion de campo. Elaborado por los autores.

### 2. FastAPI en Marco Conceptual

Ubicacion detectada: parrafos 556 a 558, seccion `FastAPI`.

Problema:

El parrafo 558 describe FastAPI como componente del backend que sirve de intermediario entre cliente y servicios. Eso ya no coincide con la arquitectura actual, porque el backend principal es Node.js/Express.

Cambio recomendado para el parrafo 558:

> En el presente proyecto, FastAPI se emplea como base del microservicio semantico documental, no como backend principal de la aplicacion. Este servicio interno recibe solicitudes del backend Node.js para indexar documentos PDF y realizar busquedas semanticas sobre los fragmentos almacenados. De esta manera, FastAPI queda especializado en tareas de procesamiento documental y recuperacion semantica, mientras que la API publica del sistema se mantiene en Node.js y Express.

### 3. Capitulo III: tema y objetivo

Ubicacion detectada: parrafos 788 a 790.

Texto actual:

> Desarrollo de aplicacion movil para la asociacion agricola 10 de mayo basada en base de datos vectorial con chatbot informativo.

Recomendacion:

Usar una denominacion mas precisa:

> Desarrollo de aplicacion movil para la Asociacion Agricola 10 de Mayo con asistente documental basado en recuperacion semantica sobre base de datos vectorial.

Si se desea conservar la palabra chatbot:

> Desarrollo de aplicacion movil para la Asociacion Agricola 10 de Mayo con chatbot informativo documental basado en recuperacion semantica sobre base de datos vectorial.

### 4. Diagramas de flujo del sistema

Ubicacion detectada: parrafos 823 a 848.

Cambios recomendados:

- Parrafo 824: reemplazar `consultas al chatbot` por `consultas al asistente documental` o `consultas al chatbot informativo documental`.
- Parrafo 838: reemplazar `consultas del chatbot` por `consultas del asistente documental`.
- Parrafo 843: cambiar el titulo `Flujo de consulta al chatbot informativo` por `Flujo de consulta al asistente documental` o `Flujo de consulta al chatbot informativo documental`.
- Parrafo 848: el contenido esta bien alineado con recuperacion documental; solo conviene mantener el termino elegido de forma consistente.

### 5. Biblioteca documental y prototipos

Ubicacion detectada: parrafos 761 a 769.

Recomendacion:

Actualizar la descripcion de la biblioteca para mencionar que ahora permite visualizar o abrir documentos PDF, no solo cargarlos y verificar su indexacion.

Frase sugerida:

> La biblioteca documental permite administrar y consultar los archivos institucionales registrados en la aplicacion. Desde esta pantalla, el secretario puede cargar documentos PDF, visualizar los archivos almacenados, abrirlos para su revision y verificar si la informacion ya fue procesada para las consultas del asistente documental.

### 6. Docker

Ubicacion detectada: parrafos 569 a 576.

Estado:

Puede mantenerse, porque el repositorio incluye `docker-compose.yml` para levantar PostgreSQL con pgvector.

Recomendacion:

Indicar que Docker se usa principalmente como soporte de infraestructura para la base de datos PostgreSQL/pgvector, no como componente funcional de la aplicacion movil.

## Terminos que ya estan alineados

El documento ya contiene secciones conceptuales adecuadas para:

- React Native.
- TypeScript.
- Node.js.
- Python.
- PyMuPDF.
- Pydantic v2.
- PostgreSQL.
- Pgvector.
- Docker.
- Arquitectura hexagonal.

## Terminos a evitar o ajustar

- Evitar presentar Flutter o Dart como tecnologias usadas en el sistema.
- Evitar presentar FastAPI como backend principal.
- Evitar presentar el chatbot como IA generativa externa.
- Usar de forma consistente uno de estos dos enfoques:
  - `asistente documental basado en recuperacion semantica`, o
  - `chatbot informativo documental basado en recuperacion semantica`.
