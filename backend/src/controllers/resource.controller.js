import { ClassroomResource, User, Classroom, ClassroomTeacher, ClassroomFolder, MaterialBankFolder, MaterialBankItem } from '../models/index.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';
import { Op } from 'sequelize';

export const uploadResource = async (req, res) => {
  try {
    const { classroomId, folderId, moduleSession, visibility, batch } = req.body;
    const file = req.file;

    if (!classroomId) {
      return res.status(400).json({ message: 'Classroom ID is required.' });
    }

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded.' });
    }

    // Verify classroom exists and current user is authorized (either organization admin or approved teacher in the classroom)
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroomId,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'You are not authorized to upload files to this classroom.' });
      }
    }

    // Upload using S3/Google Drive / local storage fallback
    const { fileId, webViewLink } = await uploadFile(file.buffer, file.originalname, file.mimetype);

    let targetFolderId = folderId ? parseInt(folderId, 10) : null;

    // Save metadata in database
    const { assignedStudentIds } = req.body;
    const resource = await ClassroomResource.create({
      classroom_id: classroomId,
      name: file.originalname,
      drive_file_id: fileId,
      drive_link: webViewLink,
      mime_type: file.mimetype,
      uploaded_by: req.user.id,
      folder_id: targetFolderId,
      module_session: moduleSession || null,
      visibility: visibility || 'hidden',
      batch: batch || null,
      assigned_student_ids: assignedStudentIds ? (typeof assignedStudentIds === 'string' ? JSON.parse(assignedStudentIds) : assignedStudentIds) : null
    });

    // Load uploader relationship for response
    const completeResource = await ClassroomResource.findByPk(resource.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }]
    });

    return res.status(201).json({
      message: 'File uploaded successfully.',
      resource: completeResource
    });

  } catch (error) {
    console.error('Error in uploadResource:', error);
    return res.status(500).json({
      message: 'Internal server error during file upload.',
      error: error.message
    });
  }
};

export const addLinkResource = async (req, res) => {
  try {
    const { classroomId, name, link, driveFileId, mimeType: customMimeType, folderId, moduleSession, visibility, batch } = req.body;

    if (!classroomId || !name || (!link && !driveFileId)) {
      return res.status(400).json({ message: 'Classroom ID, name, and link/file are required.' });
    }

    // Verify classroom and authorization
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroomId,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'You are not authorized to add links to this classroom.' });
      }
    }

    // Save link / file reference in database
    let mimeType = customMimeType || 'url';
    if (!customMimeType && link && (link.includes('youtube.com') || link.includes('youtu.be'))) {
      mimeType = 'youtube';
    }

    let targetFolderId = folderId ? parseInt(folderId, 10) : null;

    const { assignedStudentIds } = req.body;
    const resource = await ClassroomResource.create({
      classroom_id: classroomId,
      name,
      drive_file_id: driveFileId || null,
      drive_link: link,
      mime_type: mimeType,
      uploaded_by: req.user.id,
      folder_id: targetFolderId,
      module_session: moduleSession || null,
      visibility: visibility || 'hidden',
      batch: batch || null,
      assigned_student_ids: assignedStudentIds || null
    });

    const completeResource = await ClassroomResource.findByPk(resource.id, {
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }]
    });

    return res.status(201).json({
      message: 'Link added successfully.',
      resource: completeResource
    });
  } catch (error) {
    console.error('Error in addLinkResource:', error);
    return res.status(500).json({
      message: 'Internal server error while adding link.',
      error: error.message
    });
  }
};

export const getClassroomResources = async (req, res) => {
  try {
    const { classroomId } = req.params;
    const { folderId } = req.query;

    // Verify classroom and authorization
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (req.user.role === 'teacher' || req.user.role === 'student') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroomId,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const isAccessible = (item, userObj, studentBatch) => {
      const now = new Date();

      if (userObj.role === 'student') {
        if (item.scheduled_at && now < new Date(item.scheduled_at)) {
          return false; // Not yet released/published
        }
        if (item.expiry_at && now > new Date(item.expiry_at)) {
          return false; // Expired
        }

        const assignedStudentIds = item.assigned_student_ids || [];
        if (assignedStudentIds.length > 0) {
          return assignedStudentIds.includes(userObj.id);
        }

        if (item.visibility === 'all_students') {
          return true;
        }

        if (item.visibility === 'specific_batch') {
          return Boolean(studentBatch && item.batch === studentBatch);
        }

        // Default: unassigned / hidden from students
        return false;
      }

      if (userObj.role === 'teacher') {
        if (item.uploaded_by === userObj.id) {
          return true;
        }

        const assignedTeacherIds = item.assigned_teacher_ids || [];
        if (assignedTeacherIds.length > 0) {
          return assignedTeacherIds.includes(userObj.id);
        }

        if (item.visibility === 'hidden') {
          return false;
        }

        return true;
      }

      return true; // Admin
    };

    // CASE 1: Fetching resources inside a specific folder (folderId query parameter provided)
    if (folderId) {
      const targetFolderId = parseInt(folderId, 10);

      const whereCondition = {
        classroom_id: classroomId,
        folder_id: targetFolderId
      };

      const allResources = await ClassroomResource.findAll({
        where: whereCondition,
        include: [{
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email']
        }],
        order: [['created_at', 'DESC']]
      });

      const student = req.user.role === 'student' ? await User.findByPk(req.user.id) : null;
      const studentBatch = student ? student.batch : null;

      const resources = allResources.filter(resrc => isAccessible(resrc, req.user, studentBatch));

      return res.json({ resources });
    }

    // CASE 2: Fetching root Study Materials view (no folderId query parameter)
    const allFolders = await ClassroomFolder.findAll({
      where: { classroom_id: classroomId },
      order: [['created_at', 'ASC']]
    });

    const whereCondition = {
      classroom_id: classroomId,
      folder_id: null
    };

    const allRootResources = await ClassroomResource.findAll({
      where: whereCondition,
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    const student = req.user.role === 'student' ? await User.findByPk(req.user.id) : null;
    const studentBatch = student ? student.batch : null;

    const folders = allFolders.filter(f => isAccessible(f, req.user, studentBatch));
    const rootResources = allRootResources.filter(resrc => isAccessible(resrc, req.user, studentBatch));

    return res.json({ folders, resources: rootResources });

  } catch (error) {
    console.error('Error in getClassroomResources:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching resources.',
      error: error.message
    });
  }
};

export const createFolder = async (req, res) => {
  try {
    const { classroomId, name } = req.body;

    if (!classroomId || !name) {
      return res.status(400).json({ message: 'Classroom ID and folder name are required.' });
    }

    // Verify classroom and authorization
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroomId,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    const folder = await ClassroomFolder.create({
      classroom_id: classroomId,
      name,
      visibility: 'hidden'
    });

    return res.status(201).json({
      message: 'Folder created successfully.',
      folder
    });
  } catch (error) {
    console.error('Error in createFolder:', error);
    return res.status(500).json({
      message: 'Internal server error while creating folder.',
      error: error.message
    });
  }
};

export const deleteFolder = async (req, res) => {
  try {
    const { folderId } = req.params;

    const folder = await ClassroomFolder.findByPk(folderId);

    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    // Verify classroom authorization
    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: folder.classroom_id,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Delete all resources in folder from S3/Drive/local uploads
    const resources = await ClassroomResource.findAll({
      where: { folder_id: folderId }
    });

    for (const resrc of resources) {
      if (resrc.drive_file_id) {
        const usedInBank = await MaterialBankItem.findOne({ where: { drive_file_id: resrc.drive_file_id } });
        const otherRefs = await ClassroomResource.findOne({
          where: { drive_file_id: resrc.drive_file_id, id: { [Op.ne]: resrc.id } }
        });
        if (!usedInBank && !otherRefs) {
          await deleteFile(resrc.drive_file_id, resrc.drive_link);
        }
      }
    }

    // Delete folder from database
    await folder.destroy();

    return res.json({ message: 'Folder deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteFolder:', error);
    return res.status(500).json({
      message: 'Internal server error while deleting folder.',
      error: error.message
    });
  }
};

export const deleteResource = async (req, res) => {
  try {
    const { resourceId } = req.params;

    const resource = await ClassroomResource.findByPk(resourceId, {
      include: [{
        model: Classroom,
        as: 'classroom'
      }]
    });

    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    // Verify ownership/authorization: either organization admin or the uploader of the resource
    const isAdmin = req.user.role === 'admin';
    const isUploader = resource.uploaded_by === req.user.id;

    if (!isAdmin && !isUploader) {
      return res.status(403).json({ message: 'You do not have permission to delete this resource.' });
    }

    // Verify organization matches
    if (resource.classroom.organization_id !== req.user.organizationId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Safely delete from Google Drive / S3 / local filesystem only if not referenced anywhere else
    if (resource.drive_file_id) {
      const usedInBank = await MaterialBankItem.findOne({ where: { drive_file_id: resource.drive_file_id } });
      const otherRefs = await ClassroomResource.findOne({
        where: { drive_file_id: resource.drive_file_id, id: { [Op.ne]: resource.id } }
      });
      if (!usedInBank && !otherRefs) {
        await deleteFile(resource.drive_file_id, resource.drive_link);
      }
    }

    // Delete database entry
    await resource.destroy();

    return res.json({ message: 'Resource deleted successfully.' });

  } catch (error) {
    console.error('Error in deleteResource:', error);
    return res.status(500).json({
      message: 'Internal server error while deleting resource.',
      error: error.message
    });
  }
};

export const assignResource = async (req, res) => {
  try {
    const { resourceId } = req.params;
    const { visibility, batch, assignedStudentIds, assignedTeacherIds, scheduledAt, expiryAt } = req.body;

    const resource = await ClassroomResource.findByPk(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    resource.visibility = visibility || 'all_students';
    resource.batch = batch || null;
    resource.assigned_student_ids = assignedStudentIds || null;
    resource.assigned_teacher_ids = assignedTeacherIds || null;
    resource.scheduled_at = scheduledAt ? new Date(scheduledAt) : null;
    resource.expiry_at = expiryAt ? new Date(expiryAt) : null;
    await resource.save();

    return res.json({ message: 'Resource assignments updated successfully.', resource });
  } catch (error) {
    console.error('Error in assignResource:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

export const assignFolder = async (req, res) => {
  try {
    const { folderId } = req.params;
    const { visibility, batch, assignedStudentIds, assignedTeacherIds, scheduledAt, expiryAt } = req.body;

    const folder = await ClassroomFolder.findByPk(folderId);
    if (!folder) {
      return res.status(404).json({ message: 'Folder not found.' });
    }

    folder.visibility = visibility || 'all_students';
    folder.batch = batch || null;
    folder.assigned_student_ids = assignedStudentIds || null;
    folder.assigned_teacher_ids = assignedTeacherIds || null;
    folder.scheduled_at = scheduledAt ? new Date(scheduledAt) : null;
    folder.expiry_at = expiryAt ? new Date(expiryAt) : null;
    await folder.save();

    return res.json({ message: 'Folder assignments updated successfully.', folder });
  } catch (error) {
    console.error('Error in assignFolder:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

// Import materials/folders from Material Bank into Classroom Study Materials (reuses file keys without re-uploading)
export const importFromMaterialBank = async (req, res) => {
  try {
    const { classroomId, targetFolderId, itemIds = [], folderIds = [] } = req.body;

    if (!classroomId) {
      return res.status(400).json({ message: 'Classroom ID is required.' });
    }

    // Verify classroom authorization
    const classroom = await Classroom.findOne({
      where: {
        id: classroomId,
        organization_id: req.user.organizationId
      }
    });

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found.' });
    }

    if (req.user.role === 'teacher') {
      const isMember = await ClassroomTeacher.findOne({
        where: {
          classroom_id: classroomId,
          user_id: req.user.id,
          status: 'approved'
        }
      });
      if (!isMember) {
        return res.status(403).json({ message: 'Access denied.' });
      }
    }

    let destFolderId = targetFolderId ? parseInt(targetFolderId, 10) : null;
    const createdResources = [];

    // 1. Import individual selected items directly to target classroom folder (or root)
    if (Array.isArray(itemIds) && itemIds.length > 0) {
      const bankItems = await MaterialBankItem.findAll({
        where: {
          id: itemIds,
          organization_id: req.user.organizationId
        }
      });

      for (const item of bankItems) {
        const resource = await ClassroomResource.create({
          classroom_id: classroomId,
          name: item.name,
          drive_file_id: item.drive_file_id,
          drive_link: item.file_url,
          mime_type: item.mime_type || (item.type === 'youtube' ? 'youtube' : 'application/octet-stream'),
          uploaded_by: req.user.id,
          folder_id: destFolderId,
          visibility: 'hidden'
        });
        createdResources.push(resource);
      }
    }

    // 2. Import entire selected Material Bank folders (recursively copy folders & items)
    if (Array.isArray(folderIds) && folderIds.length > 0) {
      const importFolderRecursively = async (bankFolderId, parentClassroomFolderId) => {
        const bankFolder = await MaterialBankFolder.findByPk(bankFolderId);
        if (!bankFolder) return;

        // Create matching ClassroomFolder
        const newClassroomFolder = await ClassroomFolder.create({
          classroom_id: classroomId,
          name: bankFolder.name
        });

        // Copy items inside bankFolder
        const folderItems = await MaterialBankItem.findAll({
          where: { folder_id: bankFolderId }
        });

        for (const item of folderItems) {
          const resource = await ClassroomResource.create({
            classroom_id: classroomId,
            name: item.name,
            drive_file_id: item.drive_file_id,
            drive_link: item.file_url,
            mime_type: item.mime_type || (item.type === 'youtube' ? 'youtube' : 'application/octet-stream'),
            uploaded_by: req.user.id,
            folder_id: newClassroomFolder.id,
            visibility: 'hidden'
          });
          createdResources.push(resource);
        }

        // Copy subfolders recursively
        const subfolders = await MaterialBankFolder.findAll({
          where: { parent_id: bankFolderId }
        });

        for (const sf of subfolders) {
          await importFolderRecursively(sf.id, newClassroomFolder.id);
        }
      };

      for (const fId of folderIds) {
        await importFolderRecursively(fId, destFolderId);
      }
    }

    return res.json({
      message: 'Successfully imported materials into classroom.',
      importedCount: createdResources.length
    });

  } catch (error) {
    console.error('Error in importFromMaterialBank:', error);
    return res.status(500).json({
      message: 'Failed to import materials from Material Bank.',
      error: error.message
    });
  }
};

