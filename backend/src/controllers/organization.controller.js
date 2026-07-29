import { Organization } from '../models/index.js';
import { uploadFile } from '../services/storage.service.js';

// Get current user's organization profile
export const getMyOrganization = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to any organization.' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    return res.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        phone: organization.phone,
        logo_url: organization.logo_url,
        logoUrl: organization.logo_url,
        address: organization.address,
        status: organization.status
      }
    });
  } catch (error) {
    console.error('Error in getMyOrganization:', error);
    return res.status(500).json({
      message: 'Internal server error while fetching organization profile.',
      error: error.message
    });
  }
};

// Update current user's organization details (Admin only)
export const updateMyOrganization = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to any organization.' });
    }

    const { name, logo_url, logoUrl, email, phone, address } = req.body;

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    const newLogoUrl = logo_url !== undefined ? logo_url : (logoUrl !== undefined ? logoUrl : organization.logo_url);

    await organization.update({
      name: name !== undefined ? name : organization.name,
      logo_url: newLogoUrl,
      email: email !== undefined ? email : organization.email,
      phone: phone !== undefined ? phone : organization.phone,
      address: address !== undefined ? address : organization.address
    });

    return res.json({
      success: true,
      message: 'Organization details updated successfully.',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        email: organization.email,
        phone: organization.phone,
        logo_url: organization.logo_url,
        logoUrl: organization.logo_url,
        address: organization.address,
        status: organization.status
      }
    });
  } catch (error) {
    console.error('Error in updateMyOrganization:', error);
    return res.status(500).json({
      message: 'Internal server error while updating organization.',
      error: error.message
    });
  }
};

// Upload organization logo image (Admin only)
export const uploadOrgLogo = async (req, res) => {
  try {
    const organizationId = req.user?.organizationId;
    if (!organizationId) {
      return res.status(400).json({ message: 'User does not belong to any organization.' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No logo file uploaded.' });
    }

    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return res.status(404).json({ message: 'Organization not found.' });
    }

    // Upload file using storage service
    const { webViewLink } = await uploadFile(req.file.buffer, req.file.originalname, req.file.mimetype);

    // Save logo_url to organization
    await organization.update({ logo_url: webViewLink });

    return res.json({
      success: true,
      message: 'Organization logo uploaded successfully.',
      logo_url: webViewLink,
      logoUrl: webViewLink,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        logo_url: webViewLink,
        logoUrl: webViewLink
      }
    });
  } catch (error) {
    console.error('Error in uploadOrgLogo:', error);
    return res.status(500).json({
      message: 'Internal server error while uploading organization logo.',
      error: error.message
    });
  }
};
