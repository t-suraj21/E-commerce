const { Address } = require('../models');

// @desc    Get user addresses
// @route   GET /api/addresses
// @access  Private (Customer)
const getAddresses = async (req, res) => {
  try {
    const addresses = await Address.findAll({
      where: { userId: req.user.id },
      order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json({ success: true, count: addresses.length, addresses });
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ success: false, message: 'Server error fetching addresses' });
  }
};

// @desc    Create a new address
// @route   POST /api/addresses
// @access  Private (Customer)
const createAddress = async (req, res) => {
  try {
    const { fullName, mobile, houseNumber, street, landmark, city, state, pincode, isDefault } = req.body;

    if (!fullName || !mobile || !houseNumber || !street || !city || !state || !pincode) {
      return res.status(400).json({ success: false, message: 'Please provide all required fields' });
    }

    // If making this default, unset previous default address
    if (isDefault) {
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    const address = await Address.create({
      userId: req.user.id,
      fullName,
      mobile,
      houseNumber,
      street,
      landmark,
      city,
      state,
      pincode,
      isDefault: isDefault || false
    });

    res.status(201).json({ success: true, address });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ success: false, message: 'Server error creating address' });
  }
};

// @desc    Update an address
// @route   PUT /api/addresses/:id
// @access  Private (Customer)
const updateAddress = async (req, res) => {
  try {
    const { fullName, mobile, houseNumber, street, landmark, city, state, pincode, isDefault } = req.body;
    const address = await Address.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    if (isDefault) {
      // Unset other default addresses
      await Address.update(
        { isDefault: false },
        { where: { userId: req.user.id } }
      );
    }

    await address.update({
      fullName: fullName !== undefined ? fullName : address.fullName,
      mobile: mobile !== undefined ? mobile : address.mobile,
      houseNumber: houseNumber !== undefined ? houseNumber : address.houseNumber,
      street: street !== undefined ? street : address.street,
      landmark: landmark !== undefined ? landmark : address.landmark,
      city: city !== undefined ? city : address.city,
      state: state !== undefined ? state : address.state,
      pincode: pincode !== undefined ? pincode : address.pincode,
      isDefault: isDefault !== undefined ? isDefault : address.isDefault
    });

    res.json({ success: true, address });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ success: false, message: 'Server error updating address' });
  }
};

// @desc    Delete an address
// @route   DELETE /api/addresses/:id
// @access  Private (Customer)
const deleteAddress = async (req, res) => {
  try {
    const address = await Address.findOne({
      where: { id: req.params.id, userId: req.user.id }
    });

    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await address.destroy();
    res.json({ success: true, message: 'Address deleted successfully' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ success: false, message: 'Server error deleting address' });
  }
};

module.exports = {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress
};
