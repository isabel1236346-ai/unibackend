// Temporary script to hash a password
import bcrypt from 'bcryptjs';
import { User, sequelize } from './models/index.js'; // Adjust path to your models/DB setup

const updateUserPassword = async () => {
  try {
    await sequelize.authenticate(); // Ensure connection
    const emailToUpdate = 'flavia@gmail';
    const newPlainTextPassword = '1234'; // The password you want to set

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPlainTextPassword, salt);

    console.log(`Plain text: ${newPlainTextPassword}`);
    console.log(`Hashed: ${hashedPassword}`);

    const [numberOfAffectedRows] = await User.update(
      { contrasenia: hashedPassword },
      { where: { email: emailToUpdate } }
    );

    if (numberOfAffectedRows > 0) {
      console.log(`Password for ${emailToUpdate} updated successfully with hash.`);
    } else {
      console.log(`User ${emailToUpdate} not found.`);
    }
  } catch (error) {
    console.error('Error updating password:', error);
  } finally {
    await sequelize.close();
  }
};

updateUserPassword();