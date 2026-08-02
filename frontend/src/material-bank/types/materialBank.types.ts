export interface MaterialBankFolder {
  id: number;
  organization_id: number;
  created_by: number;
  parent_id: number | null;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialBankItem {
  id: number;
  organization_id: number;
  folder_id: number | null;
  uploaded_by: number;
  name: string;
  type: 'file' | 'youtube';
  mime_type: string | null;
  file_url: string;
  drive_file_id: string | null;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

export interface BreadcrumbItem {
  id: number;
  name: string;
}

export interface MaterialBankResponse {
  folders: MaterialBankFolder[];
  items: MaterialBankItem[];
  breadcrumbs?: BreadcrumbItem[];
}
