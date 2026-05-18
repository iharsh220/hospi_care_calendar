const express = require('express');
const router = express.Router();

const loginRoutes = require('./loginRoutes');

router.use('/', loginRoutes);

module.exports = router;