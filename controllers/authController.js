const jwt = require('jsonwebtoken');
const { Organogram } = require('../models');
const { Op } = require('sequelize');
require('dotenv').config();


function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// POST /login — handles both admin and field user
async function login(req, res) {
  try {
    const { username, password, email, sap_code } = req.body;
    console.log(username, password, process.env.ADMIN_USERNAME,process.env.ADMIN_PASSWORD);
    // ── Admin login ──
    if (username !== undefined || (email === undefined && sap_code === undefined)) {
      if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
      ) {
        const token = signToken({ role: 'admin', id: 0 });

        return res.json({
          success: true,
          role: 'admin',
          token,
          user: {
            id: 0,
            name: 'Admin',
            username: 'admin',
            avatar_initials: 'AD',
          },
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // ── Field user login (email + sap_code) ──
    if (!email || !sap_code) {
      return res.status(400).json({ success: false, message: 'Email and SAP code required' });
    }

    const user = await Organogram.findOne({
      where: {
        emailid: { [Op.eq]: email.trim() },
        sap_code: { [Op.eq]: sap_code.trim() },
        status: { [Op.not]: 'inactive' },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signToken({ role: 'field', id: user.id, sap_code: user.sap_code });

    const nameParts = (user.emp_name || '').trim().split(' ');
    const initials =
      nameParts.length >= 2
        ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
        : (nameParts[0] || 'U').slice(0, 2).toUpperCase();

    return res.json({
      success: true,
      role: 'field',
      token,
      user: {
        id: user.id,
        name: user.emp_name,
        email: user.emailid,
        sap_code: user.sap_code,
        employee_id: user.emp_code,
        region: user.region,
        level: user.level,
        avatar_initials: initials,
      },
    });
  } catch (err) {
    console.error('[login]', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

module.exports = { login };
