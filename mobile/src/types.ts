export type User = {
  id: number;
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
  id: number;
  title: string;
  content: string;
  category: string;
  otros_subtype?: string | null;
  is_active: boolean;
  image_url?: string | null;
  created_at: string;
  published_by: number;
  publisher_name: string;
};

export type DocumentItem = {
  id: number;
  filename: string;
  file_path: string;
  preview_url?: string;
  download_url?: string;
  uploaded_by_id: number;
  uploader_name: string;
  status: string;
  error_message?: string | null;
  created_at: string;
};

export type NotificationItem = {
  id: number;
  title: string;
  message: string;
  announcement_type: string;
  is_read: boolean;
  created_at: string;
};

export type ChatSource = {
  content: string;
  page_number: number;
  document_name: string;
};
