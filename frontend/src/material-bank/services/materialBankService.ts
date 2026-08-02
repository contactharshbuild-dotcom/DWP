import api from '../../services/api';
import type { MaterialBankResponse, MaterialBankFolder, MaterialBankItem } from '../types/materialBank.types';

export const materialBankService = {
  getContents: async (folderId?: number | null): Promise<MaterialBankResponse> => {
    const params = folderId ? { folderId } : {};
    const res = await api.get('/material-bank', { params });
    return res.data;
  },

  createFolder: async (name: string, parentId?: number | null): Promise<MaterialBankFolder> => {
    const res = await api.post('/material-bank/folders', { name, parentId });
    return res.data.folder;
  },

  deleteFolder: async (folderId: number): Promise<void> => {
    await api.delete(`/material-bank/folders/${folderId}`);
  },

  uploadFile: async (file: File, folderId?: number | null): Promise<MaterialBankItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (folderId) {
      formData.append('folderId', folderId.toString());
    }

    const res = await api.post('/material-bank/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return res.data.item;
  },

  addYoutubeLink: async (name: string, link: string, folderId?: number | null): Promise<MaterialBankItem> => {
    const res = await api.post('/material-bank/link', { name, link, folderId });
    return res.data.item;
  },

  deleteItem: async (itemId: number): Promise<void> => {
    await api.delete(`/material-bank/items/${itemId}`);
  }
};
