const jwt = require('jsonwebtoken');
const { Organogram } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key';

// Admin credentials (in production, store in database or environment variables)
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Single login endpoint - handles both admin and regular user
const login = async (req, res) => {
  try {
    const { email, sap_code, username, password } = req.body;

    // Check if this is an admin login
    if (username && password) {
      if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        const token = jwt.sign(
          {
            id: 0,
            emp_code: 'ADMIN',
            emp_name: 'Administrator',
            is_admin: 1,
            type: 'admin'
          },
          JWT_SECRET,
          { expiresIn: '24h' }
        );

        return res.json({
          success: true,
          message: 'Admin login successful',
          token: token,
          user: {
            id: 0,
            emp_code: 'ADMIN',
            emp_name: 'Administrator',
            is_admin: 1,
            type: 'admin'
          }
        });
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid username or password'
        });
      }
    }

    // Regular user login with email and sap_code
    if (!email || !sap_code) {
      return res.status(400).json({
        success: false,
        message: 'email and sap_code are required'
      });
    }
    
    const user = await Organogram.findOne({
      where: {
        emailid: email,
        sap_code: parseInt(sap_code)
      }
    });
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or sap_code'
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        emp_code: user.emp_code,
        emp_name: user.emp_name,
        hq: user.hq,
        level: user.level,
        region: user.region,
        status: user.status,
        division: user.division,
        sap_code: user.sap_code,
        is_admin: user.is_admin || 0,
        type: 'user'
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        emp_code: user.emp_code,
        emp_name: user.emp_name,
        hq: user.hq,
        level: user.level,
        region: user.region,
        status: user.status,
        division: user.division,
        sap_code: user.sap_code,
        mobileno: user.mobileno,
        emailid: user.emailid,
        doj: user.doj,
        am_sapcode: user.am_sapcode,
        rm_sapcode: user.rm_sapcode,
        zm_sapcode: user.zm_sapcode,
        is_admin: user.is_admin || 0,
        type: 'user'
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

const verifyToken = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({
      success: true,
      user: decoded
    });
  } catch (error) {
    res.status(403).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

module.exports = {
  login,
  verifyToken
};