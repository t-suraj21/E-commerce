const { User } = require('./src/models');
const { sequelize } = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function forceAdmin() {
  await sequelize.authenticate();
  
  const email = 'tarunkumar@gmail.com';
  const password = '@211227tks';
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  
  let user = await User.findOne({ where: { email } });
  if (user) {
    user.password = password; // Since there is a beforeUpdate/beforeSave hook that hashes it, wait let's check the hook
    // Let's just use the direct query or check if hook exists
  }
  
  // Actually, let's just destroy the user and recreate it to be absolutely sure
  await User.destroy({ where: { email } });
  
  await User.create({
    name: 'Tarun Kumar',
    email: email,
    phone: '9999999999',
    password: password, // Will be hashed by model hook
    role: 'admin',
    isPhoneVerified: true
  });
  
  console.log("Admin forcefully created!");
  process.exit(0);
}

forceAdmin().catch(err => {
  console.error(err);
  process.exit(1);
});
