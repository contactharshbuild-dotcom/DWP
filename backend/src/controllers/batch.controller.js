import { Batch, User, Classroom } from '../models/index.js';
import { Op } from 'sequelize';

// Get all batches for current organization
export const getBatches = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to an organization.' });
    }

    const batches = await Batch.findAll({
      where: { organization_id: organizationId },
      order: [['name', 'ASC']]
    });

    // Also get student counts per batch
    const students = await User.findAll({
      where: {
        organization_id: organizationId,
        role: 'student',
        batch: { [Op.ne]: null }
      },
      attributes: ['batch']
    });

    const countMap = {};
    students.forEach(s => {
      if (s.batch) {
        countMap[s.batch] = (countMap[s.batch] || 0) + 1;
      }
    });

    const batchesWithCount = batches.map(b => {
      const plain = b.toJSON ? b.toJSON() : b;
      return {
        ...plain,
        studentCount: countMap[b.name] || 0
      };
    });

    return res.json({ batches: batchesWithCount });
  } catch (error) {
    console.error('Error in getBatches:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching batches.',
      error: error.message
    });
  }
};

// Create a new batch in organization
export const createBatch = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to an organization.' });
    }

    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Batch name is required.' });
    }

    const cleanName = name.trim();
    if (cleanName.length > 100) {
      return res.status(400).json({ message: 'Batch name cannot exceed 100 characters.' });
    }

    // Check if batch name already exists for this organization
    const existing = await Batch.findOne({
      where: {
        organization_id: organizationId,
        name: cleanName
      }
    });

    if (existing) {
      return res.status(400).json({ message: 'A batch with this name already exists in your organization.' });
    }

    const batch = await Batch.create({
      organization_id: organizationId,
      name: cleanName
    });

    return res.status(201).json({
      message: 'Batch created successfully.',
      batch
    });
  } catch (error) {
    console.error('Error in createBatch:', error);
    return res.status(500).json({
      message: 'Internal server error while creating batch.',
      error: error.message
    });
  }
};

// Update / Rename batch
export const updateBatch = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Batch name is required.' });
    }

    const cleanName = name.trim();
    const batch = await Batch.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found.' });
    }

    const oldName = batch.name;
    if (cleanName.toLowerCase() !== oldName.toLowerCase()) {
      const existing = await Batch.findOne({
        where: {
          organization_id: organizationId,
          name: cleanName
        }
      });
      if (existing) {
        return res.status(400).json({ message: 'A batch with this name already exists.' });
      }
    }

    await batch.update({ name: cleanName });

    // Optionally update students referencing the old batch name to the new name
    if (oldName !== cleanName) {
      await User.update(
        { batch: cleanName },
        { where: { organization_id: organizationId, batch: oldName } }
      );
    }

    return res.json({
      message: 'Batch updated successfully.',
      batch
    });
  } catch (error) {
    console.error('Error in updateBatch:', error);
    return res.status(500).json({
      message: 'Internal server error while updating batch.',
      error: error.message
    });
  }
};

// Delete batch
export const deleteBatch = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    const { id } = req.params;

    const batch = await Batch.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found.' });
    }

    await batch.destroy();

    return res.json({ message: 'Batch deleted successfully.' });
  } catch (error) {
    console.error('Error in deleteBatch:', error);
    return res.status(500).json({
      message: 'Internal server error while deleting batch.',
      error: error.message
    });
  }
};

// Get students assigned to a specific batch
export const getBatchStudents = async (req, res) => {
  try {
    const organizationId = req.user.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to an organization.' });
    }

    const { id } = req.params;
    const batch = await Batch.findOne({
      where: { id, organization_id: organizationId }
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found.' });
    }

    const students = await User.findAll({
      where: {
        organization_id: organizationId,
        role: 'student',
        batch: batch.name
      },
      attributes: ['id', 'name', 'email', 'phone', 'status', 'created_at', 'profile_url'],
      order: [['name', 'ASC']]
    });

    return res.json({
      batch,
      students
    });
  } catch (error) {
    console.error('Error in getBatchStudents:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching batch students.',
      error: error.message
    });
  }
};

// Public batches lookup by classroom ID / numeric code
export const getPublicBatches = async (req, res) => {
  try {
    const { classroomId } = req.query;
    if (!classroomId) {
      return res.json({ batches: [] });
    }

    const parsed = parseInt(classroomId);
    if (isNaN(parsed)) {
      return res.json({ batches: [] });
    }

    const classroom = await Classroom.findOne({
      where: {
        [Op.or]: [
          { classroom_id: parsed },
          { id: parsed }
        ]
      }
    });

    if (!classroom || !classroom.organization_id) {
      return res.json({ batches: [] });
    }

    const batches = await Batch.findAll({
      where: { organization_id: classroom.organization_id },
      order: [['name', 'ASC']]
    });

    return res.json({ batches });
  } catch (error) {
    console.error('Error in getPublicBatches:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching public batches.',
      error: error.message
    });
  }
};

