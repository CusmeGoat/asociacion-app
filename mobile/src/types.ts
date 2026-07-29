export type User = {
  id: string;
  nombres: string;
  apellidos: string;
  cedula: string | null;
  email: string;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  roles: string[];
};

export type Announcement = {
  id: string;
  title: string;
  content: string;
  category: string;
  otros_subtype?: string | null;
  is_active: boolean;
  image_url?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
  published_by: string;
  publisher_name: string;
};

export type DocumentItem = {
  id: string;
  filename: string;
  file_path: string;
  preview_url?: string;
  download_url?: string;
  uploaded_by_id: string;
  uploader_name: string;
  status: string;
  error_message?: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  announcement_type: string;
  is_read: boolean;
  created_at: string;
};

export type ChatSource = {
  document_id?: string;
  content: string;
  page_number: number;
  document_name: string;
  chunk_index?: number;
  distance?: number;
  score?: number;
  quality?: number;
  preview_url?: string;
  page_preview_url?: string;
  excerpt?: string;
};

export type ChatTable = {
  kind?: 'socios' | 'socio_lookup' | 'default';
  caption?: string;
  columns: string[];
  rows: string[][];
};

export type ChatbotResponse = {
  respuesta: string;
  respuesta_directa?: string;
  resumen?: string;
  puntos?: string[];
  tabla?: ChatTable | null;
  aclaracion?: string | null;
  fragmentos?: ChatSource[];
  fuentes: ChatSource[];
};
