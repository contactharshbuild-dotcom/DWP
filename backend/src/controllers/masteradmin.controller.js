import { Organization, User } from '../models/index.js';

export const getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.findAll({
      include: [{
        model: User,
        as: 'users',
        where: { role: 'admin' },
        required: false,
        attributes: ['name', 'email', 'phone']
      }],
      order: [['created_at', 'DESC']]
    });

    const formattedOrgs = organizations.map(org => {
      const admin = org.users && org.users.length > 0 ? org.users[0] : null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        email: org.email || (admin ? admin.email : 'N/A'),
        phone: org.phone || (admin ? admin.phone : 'N/A'),
        status: org.status,
        createdAt: org.created_at,
        adminName: admin ? admin.name : 'N/A',
        adminEmail: admin ? admin.email : 'N/A',
        adminPhone: admin ? admin.phone : 'N/A'
      };
    });

    return res.json({
      success: true,
      organizations: formattedOrgs
    });
  } catch (error) {
    console.error('Error in getOrganizations:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching organizations.',
      error: error.message
    });
  }
};

export const toggleOrganizationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value. Must be active or suspended.' });
    }

    const organization = await Organization.findByPk(id);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    await organization.update({ status });

    return res.json({
      success: true,
      message: `Organization status updated to ${status} successfully.`,
      organization: {
        id: organization.id,
        name: organization.name,
        status: organization.status
      }
    });
  } catch (error) {
    console.error('Error in toggleOrganizationStatus:', error);
    return res.status(500).json({
      message: 'Internal server error while updating organization status.',
      error: error.message
    });
  }
};
