const express = require('express');
const router = express.Router();

const { validateOfficer, listOfficerQueries, getOfficerFarmsOverview } = require('../controllers/officerController');
const { authMiddleware } = require('../utils/auth');

// POST /api/officer/validate
router.post('/validate', validateOfficer);

// GET /api/officer/queries
router.get('/queries', authMiddleware, listOfficerQueries);

// GET /api/officer/farms-overview
router.get('/farms-overview', authMiddleware, getOfficerFarmsOverview);

module.exports = router;


