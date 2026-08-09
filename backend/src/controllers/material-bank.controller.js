import { MaterialBankFolder, MaterialBankItem, User } from '../models/index.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';

// Guard helper to ensure teacher or admin role
const checkTeacherOrAdmin = (req, res) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
    res.status(403).json({ message: 'Access denied. Only teachers and admins can access Material Bank.' });
    return false;
  }
  return true;
};

// GET /api/material-bank?folderId=...
export const getMaterialBank = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { folderId } = req.query;
    const organizationId = req.user.organizationId;

    const parsedFolderId = folderId ? parseInt(folderId, 10) : null;

    // Fetch folders inside current folder level (or root level if folderId is null)
    const folders = await MaterialBankFolder.findAll({
      where: {
        organization_id: organizationId,
        parent_id: parsedFolderId
      },
      order: [['created_at', 'ASC']]
    });

    // Fetch items inside current folder level (or root level if folderId is null)
    const items = await MaterialBankItem.findAll({
      where: {
        organization_id: organizationId,
        folder_id: parsedFolderId
      },
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    // Fetch folder breadcrumbs hierarchy if inside a subfolder
    let breadcrumbs = [];
    if (parsedFolderId) {
      let currentFolder = await MaterialBankFolder.findByPk(parsedFolderId);
      while (currentFolder) {
        breadcrumbs.unshift({ id: currentFolder.id, name: currentFolder.name });
        if (currentFolder.parent_id) {
          currentFolder = await MaterialBankFolder.findByPk(currentFolder.parent_id);
        } else {
          currentFolder = null;
        }
      }
    }

    return res.json({
      folders,
      items,
      breadcrumbs
    });

  } catch (error) {
    console.error('Error in getMaterialBank:', error);
    return res.status(500).json({
      message: 'Failed to fetch Material Bank contents.',
      error: error.message
    });
  }
};

// POST /api/material-bank/folders
export const createFolder = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { name, parentId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required.' });
    }

    const folder = await MaterialBankFolder.create({
      organization_id: req.user.organizationId,
      created_by: req.user.id,
      name: name.trim(),
      parent_id: parentId ? parseInt(parentId, 10) : null
    });

    return res.status(201).json({
      message: 'Folder created successfully.',
      folder
    });
  } catch (error) {
    console.error('Error in createFolder:', error);
    return res.status(500).json({
      message: 'Failed to create folder.',
      error: error.message
    });
  }
};

// DELETE /api/material-bank/folders/:folderId
export const deleteFolder = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { folderId } = req.params;
    const folder = await MaterialBankFolder.findOne({
      where: {
        id: folderId,
        organization_id: req.user.organizationId
      }
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Helper to recursively collect & delete items in folder & subfolders
    const deleteFolderContentsRecursively = async (targetFolderId) => {
      const subfolders = await MaterialBankFolder.findAll({
        where: { parent_id: targetFolderId }
      });
      for (const sf of subfolders) {
        await deleteFolderContentsRecursively(sf.id);
      }

      const items = await MaterialBankItem.findAll({
        where: { folder_id: targetFolderId }
      });

      for (const item of items) {
        if (item.type === 'file' && item.drive_file_id) {
          await deleteFile(item.drive_file_id, item.file_url);
        }
        await item.destroy();
      }

      await MaterialBankFolder.destroy({ where: { id: targetFolderId } });
    };

    await deleteFolderContentsRecursively(folder.id);

    return res.json({ message: 'Folder deleted successfully.' });

  } catch (error) {
    console.error('Error in deleteFolder:', error);
    return res.status(500).json({
      message: 'Failed to delete folder.',
      error: error.message
    });
  }
};

// POST /api/material-bank/upload
export const uploadMaterialFile = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { folderId } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided for upload.' });
    }

    const { fileId, webViewLink } = await uploadFile(file.buffer, file.originalname, file.mimetype);

    const item = await MaterialBankItem.create({
      organization_id: req.user.organizationId,
      folder_id: folderId ? parseInt(folderId, 10) : null,
      uploaded_by: req.user.id,
      name: file.originalname,
      type: 'file',
      mime_type: file.mimetype,
      file_url: webViewLink,
      drive_file_id: fileId
    });

    const completeItem = await MaterialBankItem.findByPk(item.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }]
    });

    return res.status(201).json({
      message: 'File uploaded successfully.',
      item: completeItem
    });

  } catch (error) {
    console.error('Error in uploadMaterialFile:', error);
    return res.status(500).json({
      message: 'Failed to upload file.',
      error: error.message
    });
  }
};

// POST /api/material-bank/link
export const addYoutubeLink = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { name, link, folderId } = req.body;
    if (!name || !link) {
      return res.status(400).json({ message: 'Title and YouTube URL are required.' });
    }

    const item = await MaterialBankItem.create({
      organization_id: req.user.organizationId,
      folder_id: folderId ? parseInt(folderId, 10) : null,
      uploaded_by: req.user.id,
      name: name.trim(),
      type: 'youtube',
      mime_type: 'youtube',
      file_url: link.trim(),
      drive_file_id: null
    });

    const completeItem = await MaterialBankItem.findByPk(item.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }]
    });

    return res.status(201).json({
      message: 'YouTube video link added successfully.',
      item: completeItem
    });

  } catch (error) {
    console.error('Error in addYoutubeLink:', error);
    return res.status(500).json({
      message: 'Failed to add YouTube video link.',
      error: error.message
    });
  }
};

// DELETE /api/material-bank/items/:itemId
export const deleteItem = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { itemId } = req.params;
    const item = await MaterialBankItem.findOne({
      where: {
        id: itemId,
        organization_id: req.user.organizationId
      }
    });

    if (!item) {
      return res.status(404).json({ message: 'Material item not found.' });
    }

    if (item.type === 'file' && item.drive_file_id) {
      await deleteFile(item.drive_file_id, item.file_url);
    }

    await item.destroy();

    return res.json({ message: 'Item deleted successfully.' });

  } catch (error) {
    console.error('Error in deleteItem:', error);
    return res.status(500).json({
      message: 'Failed to delete item.',
      error: error.message
    });
  }
};
