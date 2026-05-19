const express = require('express');
const router = express.Router();
const { requireField } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const { getMyEvents, submitCompletion, getMyHistory } = require('../controllers/fieldController');
const { getReports } = require('../controllers/fieldReportController');

// All field routes require field JWT
router.use(requireField);

router.get('/my-events', getMyEvents);                            // #12
router.post('/complete', upload.single('proof_image'), submitCompletion); // #13
router.get('/my-history', getMyHistory);                          // #14
router.get('/reports', getReports);                               // #15 — organogram hierarchy reports

module.exports = router;
