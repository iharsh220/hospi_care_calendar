const { Router } = require('express');
const { authenticate, requireField } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { myEvents, completeEvent, myHistory, teamTracking } = require('../controllers/fieldController');

const router = Router();
router.use(authenticate, requireField);

router.get('/my-events', myEvents);
router.post('/complete', upload.single('proof_image'), completeEvent);
router.get('/my-history', myHistory);
router.get('/team-tracking', teamTracking);   // ZM / RM / AM hierarchy view

module.exports = router;
