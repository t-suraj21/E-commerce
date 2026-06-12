const { User, Order, Payment } = require('../models');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const { secret, expiresIn } = require('../config/jwt');
const crypto = require('crypto');
const { sequelize } = require('../config/db');
const { Op } = require('sequelize');

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const generateToken = (id) => {
  return jwt.sign({ id }, secret, { expiresIn });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ where: { email } });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists with this email' });
    }

    // Determine role - hardcode to customer for self-registration
    // Admin is created via seed script
    const userRole = 'customer';

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: userRole,
      phone
    });

    res.status(201).json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
};

// @desc    Login user & get token
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email/phone and password' });
    }

    // Find user by email or phone
    const user = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: email },
          { phone: email }
        ]
      } 
    });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email/phone or password' });
    }

    res.json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching profile' });
  }
};

// @desc    Request password recovery OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Please provide email address' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found with this email' });
    }

    // Generate 6 digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    user.otp = otp;
    user.otpExpiry = expiry;
    await user.save();

    console.log(`=========================================`);
    console.log(` OTP Generated for ${email}: ${otp}`);
    console.log(` Expires at: ${expiry}`);
    console.log(`=========================================`);

    // In production, send SMS/Email. In dev, we return it in response and log it.
    const responsePayload = {
      success: true,
      message: 'OTP sent successfully (Simulated)'
    };

    if (process.env.NODE_ENV !== 'production') {
      responsePayload.otp = otp;
    }

    res.json(responsePayload);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ success: false, message: 'Server error generating OTP' });
  }
};

// @desc    Verify OTP for recovery
// @route   POST /api/auth/verify-otp
// @access  Public
const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide email and OTP code' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if OTP matches and has not expired
    if (!user.otp || user.otp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP code' });
    }

    if (new Date() > new Date(user.otpExpiry)) {
      return res.status(400).json({ success: false, message: 'OTP has expired. Request a new one.' });
    }

    // Generate short-lived reset token (15m validity)
    const resetToken = jwt.sign(
      { id: user.id, purpose: 'reset_password' },
      secret,
      { expiresIn: '15m' }
    );

    res.json({
      success: true,
      message: 'OTP verified successfully',
      resetToken
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error verifying OTP' });
  }
};

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide reset token and new password' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters long' });
    }

    // Decode and verify reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, secret);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'reset_password') {
      return res.status(400).json({ success: false, message: 'Invalid token purpose' });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update password (model beforeUpdate hook handles hashing)
    user.password = newPassword;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, message: 'Server error resetting password' });
  }
};

// @desc    Save/update push notification token
// @route   POST /api/auth/push-token
// @access  Private
const savePushToken = async (req, res) => {
  try {
    const { pushToken } = req.body;
    if (!pushToken) {
      return res.status(400).json({ success: false, message: 'Please provide a push token' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    await user.update({ pushToken });

    res.json({
      success: true,
      message: 'Push token registered successfully',
      user: {
        id: user.id,
        name: user.name,
        pushToken: user.pushToken
      }
    });
  } catch (error) {
    console.error('Save push token error:', error);
    res.status(500).json({ success: false, message: 'Server error registering push token' });
  }
};

// @desc    Login or Register via Google OAuth
// @route   POST /api/auth/google
// @access  Public
const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google ID token is required' });
    }

    // 1. Verify Google token
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const email = payload.email;
    const name = payload.name;
    // const googleId = payload.sub; // Can be saved if DB is updated

    // 2. Check if user exists
    let user = await User.findOne({ where: { email } });

    // 3. If not, create them
    if (!user) {
      // Generate secure random password since they use Google to login
      const randomPassword = crypto.randomBytes(32).toString('hex');
      
      user = await User.create({
        name,
        email,
        password: randomPassword,
        role: 'customer'
      });
    }

    // 4. Send our standard JWT token back
    res.json({
      success: true,
      token: generateToken(user.id),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, password } = req.body;
    const user = await User.findByPk(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone; // Allow empty phone
    if (password) user.password = password; // Sets password, will be hashed in beforeUpdate hook

    await user.save();

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ success: false, message: 'Server error updating profile' });
  }
};

// @desc    Delete user account permanently
// @route   DELETE /api/auth/profile
// @access  Private
const deleteProfile = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const user = await User.findByPk(req.user.id, { transaction });
    if (!user) {
      await transaction.rollback();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Unlink orders and payments from the user and their addresses to prevent RESTRICT constraint errors
    await Order.update({ userId: null, addressId: null }, { where: { userId: user.id }, transaction });
    await Payment.update({ userId: null }, { where: { userId: user.id }, transaction });

    // Now delete the user (will cascade to Address, CartItem, Notification)
    await user.destroy({ transaction });

    await transaction.commit();
    res.json({ success: true, message: 'Account deleted permanently' });
  } catch (error) {
    await transaction.rollback();
    console.error('Delete profile error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting account' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getProfile,
  forgotPassword,
  verifyOtp,
  resetPassword,
  savePushToken,
  googleLogin,
  updateProfile,
  deleteProfile
};
