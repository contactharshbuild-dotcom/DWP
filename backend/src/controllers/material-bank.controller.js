import { MaterialBankFolder, MaterialBankItem, User } from '../models/index.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';
import sequelize from '../config/database.js';
import { Op } from 'sequelize';

// Guard helper to ensure teacher or admin role
const checkTeacherOrAdmin = (req, res) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'teacher')) {
    res.status(403).json({ message: 'Access denied. Only teachers and admins can access Material Bank.' });
    return false;
  }
  return true;
};

let isTableMigrated = false;
const ensureOrderIndexColumn = async () => {
  if (isTableMigrated) return;
  try {
    await sequelize.query('ALTER TABLE material_bank_items ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;');
    await sequelize.query('ALTER TABLE material_bank_folders ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;');
    isTableMigrated = true;
  } catch (err) {
    // Silently ignore if already exists or dialect mismatch
  }
};

/**
 * Fixes filenames that were corrupted by multipart/form-data Latin-1 header parsing (mojibake).
 * E.g. "S1â\x80\x93Excel" -> "S1–Excel"
 */
export const fixFilenameEncoding = (filename) => {
  if (!filename || typeof filename !== 'string') return filename;
  try {
    if (filename.includes('â')) {
      const fixed = Buffer.from(filename, 'latin1').toString('utf8');
      if (!fixed.includes('\uFFFD')) return fixed;
    }
    const decoded = Buffer.from(filename, 'latin1').toString('utf8');
    if (decoded !== filename && !decoded.includes('\uFFFD')) {
      if (Buffer.from(decoded, 'utf8').toString('latin1') === filename) {
        return decoded;
      }
    }
  } catch (err) {}
  return filename;
};

// GET /api/material-bank?folderId=...&page=...&limit=...
export const getMaterialBank = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;
    await ensureOrderIndexColumn();

    const { folderId, page, limit, folderPage, folderLimit, search, filterType, sortBy } = req.query;
    const organizationId = req.user.organizationId;

    const parsedFolderId = folderId ? parseInt(folderId, 10) : null;
    const trimmedSearch = typeof search === 'string' ? search.trim() : '';

    // Folders query & pagination
    const folderWhere = {
      organization_id: organizationId,
      parent_id: parsedFolderId
    };
    if (trimmedSearch) {
      folderWhere.name = { [Op.iLike]: `%${trimmedSearch}%` };
    }

    let folderOrder = [
      ['order_index', 'ASC'],
      ['created_at', 'ASC']
    ];
    if (sortBy === 'name-asc') folderOrder = [['name', 'ASC']];
    else if (sortBy === 'name-desc') folderOrder = [['name', 'DESC']];
    else if (sortBy === 'date-desc') folderOrder = [['created_at', 'DESC']];
    else if (sortBy === 'date-asc') folderOrder = [['created_at', 'ASC']];

    const hasFolderPagination = folderPage !== undefined || folderLimit !== undefined;
    const fPage = folderPage ? Math.max(1, parseInt(folderPage, 10)) : 1;
    const fLimit = folderLimit !== undefined ? parseInt(folderLimit, 10) : (hasFolderPagination ? 10 : null);
    const fOffset = fLimit ? (fPage - 1) * fLimit : 0;

    let folders = [];
    let totalFolders = 0;

    if (fLimit && fLimit > 0) {
      const folderResult = await MaterialBankFolder.findAndCountAll({
        where: folderWhere,
        order: folderOrder,
        limit: fLimit,
        offset: fOffset
      });
      folders = folderResult.rows;
      totalFolders = folderResult.count;
    } else {
      folders = await MaterialBankFolder.findAll({
        where: folderWhere,
        order: folderOrder
      });
      totalFolders = folders.length;
    }

    // Items query & pagination
    const itemWhere = {
      organization_id: organizationId,
      folder_id: parsedFolderId
    };
    if (filterType && (filterType === 'file' || filterType === 'youtube')) {
      itemWhere.type = filterType;
    }
    if (trimmedSearch) {
      itemWhere.name = { [Op.iLike]: `%${trimmedSearch}%` };
    }

    let itemOrder = [
      ['order_index', 'ASC'],
      ['created_at', 'DESC']
    ];
    if (sortBy === 'name-asc') itemOrder = [['name', 'ASC']];
    else if (sortBy === 'name-desc') itemOrder = [['name', 'DESC']];
    else if (sortBy === 'date-desc') itemOrder = [['created_at', 'DESC']];
    else if (sortBy === 'date-asc') itemOrder = [['created_at', 'ASC']];

    const hasItemPagination = page !== undefined || limit !== undefined;
    const itemPage = page ? Math.max(1, parseInt(page, 10)) : 1;
    const itemLimit = limit !== undefined ? parseInt(limit, 10) : (hasItemPagination ? 10 : null);
    const itemOffset = itemLimit ? (itemPage - 1) * itemLimit : 0;

    let items = [];
    let totalItems = 0;

    if (itemLimit && itemLimit > 0) {
      const itemResult = await MaterialBankItem.findAndCountAll({
        where: itemWhere,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }],
        order: itemOrder,
        limit: itemLimit,
        offset: itemOffset
      });
      items = itemResult.rows;
      totalItems = itemResult.count;
    } else {
      items = await MaterialBankItem.findAll({
        where: itemWhere,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }],
        order: itemOrder
      });
      totalItems = items.length;
    }

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

    // Auto-heal any existing records with mojibake encoding corruption
    items.forEach((item) => {
      const fixedName = fixFilenameEncoding(item.name);
      if (fixedName !== item.name) {
        item.name = fixedName;
        MaterialBankItem.update({ name: fixedName }, { where: { id: item.id } }).catch(() => {});
      }
    });

    folders.forEach((folder) => {
      const fixedName = fixFilenameEncoding(folder.name);
      if (fixedName !== folder.name) {
        folder.name = fixedName;
        MaterialBankFolder.update({ name: fixedName }, { where: { id: folder.id } }).catch(() => {});
      }
    });

    const folderTotalPages = fLimit ? Math.ceil(totalFolders / fLimit) : 1;
    const itemTotalPages = itemLimit ? Math.ceil(totalItems / itemLimit) : 1;

    return res.json({
      folders,
      items,
      breadcrumbs,
      totalFolders,
      totalItems,
      folderPage: fPage,
      folderLimit: fLimit || totalFolders,
      folderTotalPages,
      page: itemPage,
      limit: itemLimit || totalItems,
      totalPages: itemTotalPages,
      pagination: {
        items: {
          page: itemPage,
          limit: itemLimit || totalItems,
          total: totalItems,
          totalPages: itemTotalPages
        },
        folders: {
          page: fPage,
          limit: fLimit || totalFolders,
          total: totalFolders,
          totalPages: folderTotalPages
        }
      }
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

    const trimmedName = name.trim();
    const parentFolderId = parentId ? parseInt(parentId, 10) : null;

    const existingFolder = await MaterialBankFolder.findOne({
      where: {
        organization_id: req.user.organizationId,
        parent_id: parentFolderId,
        name: trimmedName
      }
    });

    if (existingFolder) {
      return res.status(200).json({
        message: 'Folder already exists.',
        folder: existingFolder
      });
    }

    const folder = await MaterialBankFolder.create({
      organization_id: req.user.organizationId,
      created_by: req.user.id,
      name: trimmedName,
      parent_id: parentFolderId
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

// PUT /api/material-bank/folders/:folderId
export const renameFolder = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { folderId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Folder name is required.' });
    }

    const folder = await MaterialBankFolder.findOne({
      where: {
        id: folderId,
        organization_id: req.user.organizationId
      }
    });

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    const trimmedName = name.trim();

    // Check if sibling folder with the same name exists
    const existingSibling = await MaterialBankFolder.findOne({
      where: {
        organization_id: req.user.organizationId,
        parent_id: folder.parent_id,
        name: trimmedName,
        id: { [Op.ne]: folder.id }
      }
    });

    if (existingSibling) {
      return res.status(400).json({ message: 'A folder with this name already exists in this directory.' });
    }

    folder.name = trimmedName;
    await folder.save();

    return res.json({
      message: 'Folder renamed successfully.',
      folder
    });
  } catch (error) {
    console.error('Error in renameFolder:', error);
    return res.status(500).json({
      message: 'Failed to rename folder.',
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
        if (item.type === 'file') {
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

    const { folderId, fileName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: 'No file provided for upload.' });
    }

    const resolvedName = (fileName && typeof fileName === 'string' && fileName.trim())
      ? fileName.trim()
      : fixFilenameEncoding(file.originalname);

    const { fileId, webViewLink } = await uploadFile(file.buffer, resolvedName, file.mimetype);

    const item = await MaterialBankItem.create({
      organization_id: req.user.organizationId,
      folder_id: folderId ? parseInt(folderId, 10) : null,
      uploaded_by: req.user.id,
      name: resolvedName,
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

// PUT /api/material-bank/items/:itemId
export const renameItem = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;

    const { itemId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Item name is required.' });
    }

    const item = await MaterialBankItem.findOne({
      where: {
        id: itemId,
        organization_id: req.user.organizationId
      },
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }]
    });

    if (!item) {
      return res.status(404).json({ message: 'Material item not found.' });
    }

    item.name = name.trim();
    await item.save();

    return res.json({
      message: 'Item renamed successfully.',
      item
    });
  } catch (error) {
    console.error('Error in renameItem:', error);
    return res.status(500).json({
      message: 'Failed to rename item.',
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

    if (item.type === 'file') {
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

// PUT /api/material-bank/items/reorder
export const reorderItems = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;
    await ensureOrderIndexColumn();

    const { itemIds } = req.body;
    if (!Array.isArray(itemIds)) {
      return res.status(400).json({ message: 'itemIds array is required.' });
    }

    const organizationId = req.user.organizationId;
    const startIndex = typeof req.body.startIndex === 'number' ? req.body.startIndex : 0;

    // Update each item's order_index according to its array position
    const updatePromises = itemIds.map((id, index) =>
      MaterialBankItem.update(
        { order_index: startIndex + index },
        {
          where: {
            id,
            organization_id: organizationId
          }
        }
      )
    );

    await Promise.all(updatePromises);

    return res.json({
      message: 'Items reordered successfully.',
      success: true
    });

  } catch (error) {
    console.error('Error in reorderItems:', error);
    return res.status(500).json({
      message: 'Failed to reorder items.',
      error: error.message
    });
  }
};

// PUT /api/material-bank/folders/reorder
export const reorderFolders = async (req, res) => {
  try {
    if (!checkTeacherOrAdmin(req, res)) return;
    await ensureOrderIndexColumn();

    const { folderIds } = req.body;
    if (!Array.isArray(folderIds)) {
      return res.status(400).json({ message: 'folderIds array is required.' });
    }

    const organizationId = req.user.organizationId;
    const startIndex = typeof req.body.startIndex === 'number' ? req.body.startIndex : 0;

    const updatePromises = folderIds.map((id, index) =>
      MaterialBankFolder.update(
        { order_index: startIndex + index },
        {
          where: {
            id,
            organization_id: organizationId
          }
        }
      )
    );

    await Promise.all(updatePromises);

    return res.json({
      message: 'Folders reordered successfully.',
      success: true
    });

  } catch (error) {
    console.error('Error in reorderFolders:', error);
    return res.status(500).json({
      message: 'Failed to reorder folders.',
      error: error.message
    });
  }
};

