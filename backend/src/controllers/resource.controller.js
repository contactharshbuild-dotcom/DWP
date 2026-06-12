import { ClassroomResource, User, Classroom, ClassroomTeacher } from '../models/index.js';
import { uploadFile, deleteFile } from '../services/storage.service.js';

export const uploadResource = async (req, res) => {
  try {
    const { classroomId } = req.body;
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

    // Upload using Google Drive service
    const { fileId, webViewLink } = await uploadFile(file.buffer, file.originalname, file.mimetype);

    // Save metadata in database
    const resource = await ClassroomResource.create({
      classroom_id: classroomId,
      name: file.originalname,
      drive_file_id: fileId,
      drive_link: webViewLink,
      mime_type: file.mimetype,
      uploaded_by: req.user.id
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

export const getClassroomResources = async (req, res) => {
  try {
    const { classroomId } = req.params;

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

    const resources = await ClassroomResource.findAll({
      where: { classroom_id: classroomId },
      include: [{
        model: User,
        as: 'uploader',
        attributes: ['id', 'name', 'email']
      }],
      order: [['created_at', 'DESC']]
    });

    return res.json({ resources });

  } catch (error) {
    console.error('Error in getClassroomResources:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching resources.',
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

    // Delete from Google Drive / local filesystem
    await deleteFile(resource.drive_file_id, resource.drive_link);

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
