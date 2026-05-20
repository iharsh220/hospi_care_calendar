const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { Admin, Organogram } = require('../models');
const { ACTIVE_STATUSES } = require('../services/assignmentService');

// Super-admin static credentials (no database lookup)
const SUPER_ADMIN = {
  username: 'admin',
  password: 'admin'
};

// POST /login
// Handles both super-admin (static username+password) and field user (emailid+sap_code)
const login = async (req, res) => {
  try {
    const { username, password, email, emailid, sap_code } = req.body;
    const loginEmail = email || emailid;

    // ── Super Admin login (static credentials, no DB) ──
    if (username && password) {
      if (username !== SUPER_ADMIN.username || password !== SUPER_ADMIN.password) {
        return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
      }

      const token = jwt.sign(
        { id: 0, role: 'admin', username: SUPER_ADMIN.username, isSuperAdmin: true },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        role: 'admin',
        token,
        user: {
          id: 0,
          name: 'Super Admin',
          username: SUPER_ADMIN.username,
          isSuperAdmin: true
        }
      });
    }

    // ── Field user login (email + sap_code) ──
    if (loginEmail && sap_code) {
      const user = await Organogram.findOne({
        where: { emailid: loginEmail, sap_code, status: { [Op.in]: ACTIVE_STATUSES } }
      });
      if (!user) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        {
          id: user.id,
          role: 'field',
          emailid: user.emailid,
          level: user.level,
          emp_code: user.emp_code
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      return res.json({
        success: true,
        role: 'field',
        token,
        user: {
          id: user.id,
          emp_code: user.emp_code,
          emp_name: user.emp_name,
          emailid: user.emailid,
          sap_code: user.sap_code,
          level: user.level,
          region: user.region,
          division: user.division,
          hq: user.hq,
          mobileno: user.mobileno,
          is_admin: user.is_admin,
          initials: user.getInitials()
        }
      });
    }

    return res.status(400).json({
      success: false,
      message: 'Provide (username + password) for admin or (email + sap_code) for field user'
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { login };
