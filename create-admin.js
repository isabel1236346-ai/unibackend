// Importa lo necesario
import { sequelize } from './config/db.js'; // Asegúrate que la ruta a tu config de BD sea correcta
import User from './models/User.js';       // Asegúrate que la ruta a tu modelo User sea correcta

// --- CONFIGURA AQUÍ TUS CREDENCIALES DE ADMIN ---
const adminCredentials = {
  username: 'admin',
  email: 'flavianicole@gmail.com', // Usa un email real si quieres
  contrasenia: '1236346', // Elige una contraseña fuerte
  role: 'admin'
};
// ------------------------------------------------

const createAdminUser = async () => {
  try {
    // Conectar a la base de datos
    await sequelize.authenticate();
    console.log('Conexión a la base de datos establecida correctamente.');

    // Sincronizar el modelo (opcional, pero bueno para asegurar que la tabla existe)
    await User.sync();

    // Buscar si el usuario ya existe
    const existingUser = await User.findOne({ where: { email: adminCredentials.email } });
    if (existingUser) {
      console.log(`El usuario con el email ${adminCredentials.email} ya existe.`);
      return;
    }

    // Crear el usuario administrador
    // El hook 'beforeCreate' se encargará de hashear la contraseña automáticamente
    console.log('Creando usuario administrador...');
    const newUser = await User.create(adminCredentials);
    
    console.log('¡Usuario administrador creado con éxito!');
    console.log({
      id: newUser.idusuario,
      username: newUser.userName,
      email: newUser.email,
      role: newUser.role
    });

  } catch (error) {
    console.error('Error al crear el usuario administrador:', error);
  } finally {
    // Cerrar la conexión a la base de datos
    await sequelize.close();
    console.log('Conexión a la base de datos cerrada.');
  }
};

// Ejecutar la función
createAdminUser();