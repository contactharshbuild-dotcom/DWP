import express from 'express';
import { getInviteDetails, acceptInvite } from '../controllers/invite.controller.js';

const router = express.Router();

// Public routes for accepting invitations
router.get('/details', getInviteDetails);
router.post('/accept', acceptInvite);

export default router;
