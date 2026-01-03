const express  = require('express');
const router   = express.Router();
const { financeSummary } = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth'); // your JWT middleware

router.use(protect); // entire analytics module protected
router.get('/financeSummary', financeSummary);

module.exports = router;
