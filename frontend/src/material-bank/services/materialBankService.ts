import api from '../../services/api';
import type { MaterialBankResponse, MaterialBankFolder, MaterialBankItem } from '../types/materialBank.types';

export interface GetMaterialBankParams {
  folderId?: number | null;
  page?: number;
  limit?: number;
  folderPage?: number;
  folderLimit?: number;
  search?: string;
  filterType?: 'all' | 'file' | 'youtube';
  sortBy?: string;
}

export const materialBankService = {
  getContents: async (
    folderIdOrParams?: number | null | GetMaterialBankParams,
    page?: number,
    limit?: number,
    folderPage?: number,
    folderLimit?: number
  ): Promise<MaterialBankResponse> => {
    let params: any = {};
    if (typeof folderIdOrParams === 'object' && folderIdOrParams !== null) {
      params = { ...folderIdOrParams };
      if (params.folderId === null || params.folderId === undefined) {
        delete params.folderId;
      }
    } else {
      if (folderIdOrParams) params.folderId = folderIdOrParams;
      if (page !== undefined) params.page = page;
      if (limit !== undefined) params.limit = limit;
      if (folderPage !== undefined) params.folderPage = folderPage;
      if (folderLimit !== undefined) params.folderLimit = folderLimit;
    }
    const res = await api.get('/material-bank', { params });
    return res.data;
  },

  createFolder: async (name: string, parentId?: number | null): Promise<MaterialBankFolder> => {
    const res = await api.post('/material-bank/folders', { name, parentId });
    return res.data.folder;
  },

  renameFolder: async (folderId: number, name: string): Promise<MaterialBankFolder> => {
    const res = await api.put(`/material-bank/folders/${folderId}`, { name });
    return res.data.folder;
  },

  deleteFolder: async (folderId: number): Promise<void> => {
    await api.delete(`/material-bank/folders/${folderId}`);
  },

  uploadFile: async (file: File, folderId?: number | null): Promise<MaterialBankItem> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('fileName', file.name);
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

  renameItem: async (itemId: number, name: string): Promise<MaterialBankItem> => {
    const res = await api.put(`/material-bank/items/${itemId}`, { name });
    return res.data.item;
  },

  deleteItem: async (itemId: number): Promise<void> => {
    await api.delete(`/material-bank/items/${itemId}`);
  },

  reorderItems: async (itemIds: number[], startIndex?: number): Promise<void> => {
    await api.put('/material-bank/items/reorder', { itemIds, startIndex });
  },

  reorderFolders: async (folderIds: number[], startIndex?: number): Promise<void> => {
    await api.put('/material-bank/folders/reorder', { folderIds, startIndex });
  }
};
