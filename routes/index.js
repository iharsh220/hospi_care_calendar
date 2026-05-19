const express = require('express');
const router = express.Router();

const loginRoutes = require('./loginRoutes');
const adminEventRoutes = require('./adminEventRoutes');
const userEventRoutes = require('./userEventRoutes');

router.use('/', loginRoutes);
router.use('/admin', adminEventRoutes);
router.use('/user', userEventRoutes);

module.exports = router;