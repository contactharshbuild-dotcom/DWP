import { ClassroomResource, User, Classroom, ClassroomTeacher, ClassroomFolder } from '../models/index.js';
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

    // Default unassigned uploads to Extras folder if no folder specifies
    let targetFolderId = folderId ? parseInt(folderId) : null;
    if (!targetFolderId) {
      const extrasFolder = await ClassroomFolder.findOne({
        where: { classroom_id: classroomId, name: 'Extras' }
      });
      if (extrasFolder) {
        targetFolderId = extrasFolder.id;
      }
    }

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
      visibility: visibility || 'all_students',
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
    const { classroomId, name, link, folderId, moduleSession, visibility, batch } = req.body;

    if (!classroomId || !name || !link) {
      return res.status(400).json({ message: 'Classroom ID, name, and link are required.' });
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

    // Save link in database (no actual file upload)
    let mimeType = 'url';
    if (link.includes('youtube.com') || link.includes('youtu.be')) {
      mimeType = 'youtube';
    }

    // Default unassigned links to Extras folder if no folder specified
    let targetFolderId = folderId ? parseInt(folderId) : null;
    if (!targetFolderId) {
      const extrasFolder = await ClassroomFolder.findOne({
        where: { classroom_id: classroomId, name: 'Extras' }
      });
      if (extrasFolder) {
        targetFolderId = extrasFolder.id;
      }
    }

    const { assignedStudentIds } = req.body;
    const resource = await ClassroomResource.create({
      classroom_id: classroomId,
      name,
      drive_file_id: null,
      drive_link: link,
      mime_type: mimeType,
      uploaded_by: req.user.id,
      folder_id: targetFolderId,
      module_session: moduleSession || null,
      visibility: visibility || 'all_students',
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

    // CASE 1: Fetching resources inside a specific folder (folderId query parameter provided)
    if (folderId) {
      const targetFolderId = parseInt(folderId, 10);
      const extrasFolder = await ClassroomFolder.findOne({
        where: { classroom_id: classroomId, name: 'Extras' }
      });

      const whereCondition = {
        classroom_id: classroomId,
        [Op.or]: [
          { folder_id: targetFolderId },
          ...(extrasFolder && extrasFolder.id === targetFolderId ? [{ folder_id: null }] : [])
        ]
      };

      let resources = [];
      if (req.user.role === 'admin' || req.user.role === 'teacher') {
        resources = await ClassroomResource.findAll({
          where: whereCondition,
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }],
          order: [['created_at', 'DESC']]
        });
      } else {
        const allResources = await ClassroomResource.findAll({
          where: whereCondition,
          include: [{
            model: User,
            as: 'uploader',
            attributes: ['id', 'name', 'email']
          }],
          order: [['created_at', 'DESC']]
        });

        const student = await User.findByPk(req.user.id);
        const studentBatch = student ? student.batch : null;

        resources = allResources.filter(resrc => {
          const assignedIds = resrc.assigned_student_ids || [];
          if (assignedIds.length > 0) {
            return assignedIds.includes(req.user.id);
          }
          if (resrc.visibility === 'specific_batch') {
            return resrc.batch === studentBatch;
          }
          if (resrc.visibility === 'hidden') {
            return false;
          }
          return true;
        });
      }

      resources = resources.map(resrc => {
        if (!resrc.folder_id && extrasFolder) {
          const item = resrc.toJSON ? resrc.toJSON() : resrc;
          return { ...item, folder_id: extrasFolder.id };
        }
        return resrc;
      });

      // Cost effective: Return ONLY resources for this folder, do NOT query or return all other folders!
      return res.json({ resources });
    }

    // CASE 2: Fetching root Study Materials view (no folderId query parameter)
    let folders = await ClassroomFolder.findAll({
      where: { classroom_id: classroomId },
      order: [['created_at', 'ASC']]
    });

    if (folders.length === 0) {
      const defaultFolders = ['Notes', 'PPT', 'Recordings', 'Assignments', 'Extras'];
      folders = await Promise.all(
        defaultFolders.map(folderName => 
          ClassroomFolder.create({
            classroom_id: classroomId,
            name: folderName
          })
        )
      );
    }

    // Return ONLY folders for the root view, 0 resources fetched!
    return res.json({ folders, resources: [] });

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
      name
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
        await deleteFile(resrc.drive_file_id, resrc.drive_link);
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

    // Delete from Google Drive / local filesystem if it's a file
    if (resource.drive_file_id) {
      await deleteFile(resource.drive_file_id, resource.drive_link);
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
    const { visibility, batch, assignedStudentIds } = req.body;

    const resource = await ClassroomResource.findByPk(resourceId);
    if (!resource) {
      return res.status(404).json({ message: 'Resource not found.' });
    }

    resource.visibility = visibility || 'all_students';
    resource.batch = batch || null;
    resource.assigned_student_ids = assignedStudentIds || null;
    await resource.save();

    return res.json({ message: 'Resource assignments updated successfully.', resource });
  } catch (error) {
    console.error('Error in assignResource:', error);
    return res.status(500).json({ message: 'Internal server error.', error: error.message });
  }
};

