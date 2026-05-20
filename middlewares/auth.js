const jwt = require('jsonwebtoken');
const { Organogram } = require('../models');

const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  authenticate(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }
    next();
  });
};

/**
 * requireField — authenticates field-user JWT and loads the full user record.
 * The attached req.fieldUser object carries the `level` field (ZM | RM | KAM)
 * which controllers use to enforce organogram hierarchy:
 *   ZM  → sees reports of all RM and KAM under them
 *   RM  → sees reports of all KAM under them
 *   KAM → sees only their own report
 */
const requireField = async (req, res, next) => {
  authenticate(req, res, async () => {
    if (req.user.role !== 'field') {
      return res.status(403).json({ success: false, message: 'Field user access required' });
    }
    try {
      const fieldUser = await Organogram.findByPk(req.user.id, {
        attributes: ['id', 'emp_code', 'emp_name', 'emailid', 'sap_code', 'level', 'region', 'division', 'hq', 'mobileno', 'am_sapcode', 'rm_sapcode', 'zm_sapcode', 'is_admin', 'status']
      });
      if (!fieldUser) {
        return res.status(403).json({ success: false, message: 'Field user account is inactive' });
      }
      req.fieldUser = fieldUser;
      next();
    } catch (err) {
      console.error('Field auth error:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
};

module.exports = { authenticate, requireAdmin, requireField };
