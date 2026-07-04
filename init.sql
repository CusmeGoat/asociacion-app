-- Habilitar extensiones necesarias para el proyecto unificado
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabla para guardar los fragmentos vectoriales de los documentos del chatbot
CREATE TABLE IF NOT EXISTS fragmentos_documento (
  id SERIAL PRIMARY KEY,
  nombre_documento VARCHAR(255) NOT NULL,
  contenido TEXT NOT NULL,
  vector_embedding VECTOR(1024),
  numero_pagina INTEGER NOT NULL,
  indice_fragmento INTEGER NOT NULL
);
