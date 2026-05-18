const express = require('express');
const router = express.Router();

const loginRoutes = require('./loginRoutes');
const adminEventRoutes = require('./adminEventRoutes');

router.use('/', loginRoutes);
router.use('/admin', adminEventRoutes);

module.exports = router;