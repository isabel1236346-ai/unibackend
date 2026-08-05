const  {getModels} = require('../models/index.js');
const  { Op, where } = require('sequelize');
const  bcrypt = require('bcryptjs'); 
const  asyncHandler = require('express-async-handler'); 
const  jwt = require('jsonwebtoken');


const createUser = asyncHandler(async (req, res) => {
  const models = getModels();
  const {User,Academico,Estudiante,Docente} = models;
  const {
    username,
    nombre,
    apellidopat,
    apellidomat,
    email,
    contrasenia, 
    role,
    habilitado,
     idfacultad,     
    idcarrera,      
    idusuarioexterno,
    idestudiante,  
  } = req.body;

  // 1. Validar datos de entrada
  if (!username || !nombre || !apellidopat || !email || !contrasenia || !role) {
    res.status(400);
    throw new Error('Por favor, completa todos los campos requeridos: userName, nombre, apellidopat, email, contrasenia, role.');
  }

  // 2. Verificar si el email o userName ya existen
  const emailExists = await User.findOne({ where: { email } });
  if (emailExists) {
    res.status(400);
    throw new Error('El correo electrónico ya está registrado.');
  }

  const userNameExists = await User.findOne({ where: { username } });
  if (userNameExists) {
    res.status(400);
    throw new Error('El nombre de usuario ya está en uso.');
  }

  // 3. Hashear la contraseña
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(contrasenia, salt);

  // 4. Crear el usuario en la base de datos
  const newUser = await User.create({
    username,
    nombre,
    apellidopat,
    apellidomat: apellidomat || null,
    email,
    contrasenia,
    role,
   habilitado: habilitado !== undefined 
  ? (habilitado === true || habilitado === 'true' || habilitado === 1 ? 'true' : 'false')
  : 'true',
  });

   if (!newUser) {
    res.status(400);
    throw new Error('No se pudo crear el usuario.');
  }

  if (role === 'academico') {
    if (!idcarrera || !idfacultad) {
      res.status(400);
      throw new Error('idcarrera e idfacultad son requeridos para el rol academico.');
    }
    await Academico.create({
      idusuario: newUser.idusuario,
      idcarrera: idcarrera,
      facultad_id: idfacultad, // ← aquí se mapea idfacultad → facultad_id del modelo
    });
  } else if (role === 'student') {
    if (!idcarrera) {
      res.status(400);
      throw new Error('idcarrera es requerido para el rol student.');
    }
    await Estudiante.create({
      idusuario: newUser.idusuario,
      idcarrera: idcarrera,
    });
  } else if (role === 'docente') {
    if (!carreras_ids || carreras_ids.length === 0) {
      res.status(400);
      throw new Error('carreras_ids es requerido para el rol docente.');
    }
    // Si tienes una tabla docente_carrera (relación muchos a muchos)
    for (const cid of carreras_ids) {
      await Docente.create({
        idusuario: newUser.idusuario,
        idcarrera: cid,
      });
    }
  }

  res.status(201).json({
    idusuario: newUser.idusuario,
    username: newUser.username,
    nombre: newUser.nombre,
    apellidopat: newUser.apellidopat,
    apellidomat: newUser.apellidomat,
    email: newUser.email,
    role: newUser.role,
    habilitado: newUser.habilitado,
  });
  
});

const getAllUsers = asyncHandler(async (req, res) => {
  const models = getModels();
  const {User,Academico, Carrera} = models;
  const users = await User.findAll({
    where:{ habilitado:'true' },
     include: [
    {
      model: Academico,
      as: 'academico',
      include: [{
        model: Carrera,
        as: 'carrera',
        attributes: ['nombreCarrera'] // Solo el nombre de la carrera
      }],
       attributes: []
  }
  ],
  attributes: { exclude: ['contrasenia'] } // Excluye la contraseña por seguridad
});
  res.status(200).json(users);
});
const getUsersDaf = asyncHandler(async (req, res) => {
  const models = getModels();
  const { User,Daf } = models;
  const usersDaf = await User.findAll({
    where: { role: 'daf' }, // Filtra por usuarios con rol 'daf'
    include: [
      {
        model: Daf,
        as: 'daf', // Asegúrate de que este alias coincida con tu asociación
        attributes: ['nivelAcceso'] // Solo traer el nivel de acceso
      }
    ],
    attributes: { exclude: ['contrasenia'] } // Excluye la contraseña por seguridad
  });

  res.status(200).json(usersDaf);
})
const getCarrera= asyncHandler(async (req,res)=>{
  try {
      const models =  getModels();
      const {Carrera} = models;
    const carreras = await Carrera.findAll(); // Suponiendo que usas un ORM como Sequelize
    res.status(200).json(carreras);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener carreras', error });
  }
});


const getUserProfile = asyncHandler(async (req, res) => {
  try {
    // Usar idusuario que es tu PK real
    const userId = req.user.idusuario; 
    const models = getModels();
    const { User, Facultad } = models;

    const user = await User.findByPk(userId, {
      include: [{
        model: Facultad,
        as: 'facultad', // Asegúrate de que este alias esté en tu index.js
        attributes: ['nombre_facultad']
      }],
      attributes: { exclude: ['contrasenia'] }
    });

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    res.json({
      id: user.idusuario,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      facultad: user.facultad?.nombre_facultad || 'Sin facultad',
      facultad_id: user.facultad_id,
      telegram_chat_id: user.telegram_chat_id,
      telegram_username: user.telegram_username,
      theme: user.theme || 'light', // Valor por defecto si no está definido
      color_acento: user.color_acento || '#E95A0C' // Valor por defecto si no está definido
    });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener perfil', error: error.message });
  }
});
const getUserById = asyncHandler(async (req, res) => {
   const models = getModels();
  const {User} = models;
  try {
    const { id } = req.params; // ✅ Obtiene el ID de la URL
    
    console.log('Backend: Consultando usuario con ID:', id);

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    const user = await User.findByPk(id, {
      attributes: { exclude: ['contrasenia'] } // No enviar la contraseña
    });

    if (!user) {
      console.log('Backend: Usuario no encontrado con ID:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    console.log('Backend: Usuario encontrado:', user.toJSON());

    // ✅ Enviar respuesta en el formato que espera el frontend
    res.status(200).json({
      user: {
        idusuario: user.idusuario,
        username: user.username,
        nombre: user.nombre,
        apellidopat: user.apellidopat,
        apellidomat: user.apellidomat,
        email: user.email,
        role: user.role,
        habilitado: user.habilitado
      }
    });
  } catch (error) {
    console.error('Error en getUserById:', error);
    res.status(500).json({ 
      message: 'Error al obtener usuario',
      error: error.message 
    });
  }
});

const getUserById1 = asyncHandler(async (req, res) => {
     const models = getModels();
  const {User} = models;
  const user = await User.findByPk(req.params.id, {
    attributes: { exclude: ['contrasenia'] }, // Excluir 'contrasenia'
  });

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }
  res.status(200).json(user);
});

const updateUserDaf = asyncHandler(async (req, res) => {
  const models = getModels();
  const { User, Academico, Estudiante } = models;
  
  try {
    const targetUserId = parseInt(req.params.id);
    const requestingUserId = req.user.idusuario; // ID del usuario que hace la petición (viene del token)
    const requestingUserRole = req.user.role;    // Rol del usuario que hace la petición

    const { username, nombre,
       apellidopat, apellidomat,
        email, habilitado, contrasenia, idcarrera, idfacultad, theme, color_acento } = req.body;

      console.log('🔥 [updateUserDaf] Solicitante ID:', requestingUserId, 'Rol:', requestingUserRole);
    console.log('🔥 [updateUserDaf] Target ID:', targetUserId);
    console.log('🔥 [updateUserDaf] theme recibido:', theme);
    console.log('🔥 [updateUserDaf] color_acento recibido:', color_acento);


    if (!targetUserId) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    if (requestingUserRole !== 'admin' && requestingUserId !== targetUserId) {
      return res.status(403).json({ 
        message: "Acceso denegado. No tienes permisos para editar este usuario." 
      });
    }

    const user = await User.findByPk(targetUserId);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar email duplicado (solo si el email cambió)
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return res.status(409).json({ message: 'El email ya está en uso' });
    }

    // Actualizar campos básicos
    if (nombre) user.nombre = nombre;
    if (apellidopat) user.apellidopat = apellidopat;
    if (apellidomat !== undefined) user.apellidomat = apellidomat;
    if (email) user.email = email;

    if (habilitado !== undefined) {
      let valorHabilitado;
      if (typeof habilitado === 'string') {
        valorHabilitado = (habilitado === 'true' || habilitado === '1' || habilitado === 't') ? 'true' : 'false';
      } else {
        valorHabilitado = habilitado ? 'true' : 'false';
      }
      user.habilitado = valorHabilitado;
    }

    if (contrasenia && contrasenia.trim() !== '') {
      user.contrasenia = contrasenia.trim(); // El hook beforeUpdate de Sequelize lo hasheará
    }

    if (requestingUserRole === 'admin') {
      if (user.role === 'academico' && idfacultad) {
        user.facultad_id = idfacultad;
      }
      }

       if (theme !== undefined) {
      if (theme === 'light' || theme === 'dark') {
        user.theme = theme;
        console.log('🎨 [updateUserDaf] Actualizando tema a:', theme);
      }
    }

    if (color_acento !== undefined) {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (hexRegex.test(color_acento)) {
        user.color_acento = color_acento;
        console.log('🎨 [updateUserDaf] Actualizando color de acento a:', color_acento);
      }
    }
    await user.save();
    console.log('✅ Usuario guardado correctamente');

    // Actualizar tablas relacionadas (Solo si es Admin y el rol lo requiere)
    if (requestingUserRole === 'admin') {
      if (idcarrera && user.role === 'academico') {
        let academico = await Academico.findOne({ where: { idusuario: targetUserId } });
        if (academico) {
          academico.idcarrera = idcarrera;
          if (academico.facultad_id !== undefined && idfacultad) {
            academico.facultad_id = idfacultad;
          }
          await academico.save();
        } else {
          await Academico.create({
            idusuario: targetUserId,
            idcarrera: idcarrera,
            facultad_id: idfacultad || null
          });
        }
      } else if (idcarrera && user.role === 'student') {
        let estudiante = await Estudiante.findOne({ where: { idusuario: targetUserId } });
        if (estudiante) {
          estudiante.idcarrera = idcarrera;
          await estudiante.save();
        } else {
          await Estudiante.create({ idusuario: targetUserId, idcarrera: idcarrera });
        }
      }
    }

    // Respuesta final
    const updatedUser = await User.findByPk(targetUserId, {
      attributes: { exclude: ['contrasenia'] }
    });

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('❌ Error en updateUser:', error);
    res.status(500).json({ 
      message: 'Error al actualizar el usuario', 
      error: error.message 
    });
  }
});

const updateUser = asyncHandler(async (req, res) => {
  const models = getModels();
  const { User, Academico, Estudiante } = models;
  
  try {
    const { id } = req.params;
    const { 
      username, 
      nombre, 
      apellidopat, 
      apellidomat, 
      email, 
      habilitado, 
      contrasenia, 
      idcarrera, 
      idfacultad,
      theme,
      color_acento,
    } = req.body;

    console.log('🔥 [updateUser] ID:', id);
    console.log('🔥 [updateUser] idfacultad recibido:', idfacultad);
    console.log('🔥 [updateUser] idcarrera recibido:', idcarrera);
    console.log('🔥 [updateUser] theme recibido:', theme);
    console.log('🔥 [updateUser] color_acento recibido:', color_acento);

    if (!id) {
      return res.status(400).json({ message: 'ID de usuario requerido' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      console.error('❌ Usuario no encontrado:', id);
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Verificar email duplicado
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ where: { email } });
      if (existingEmail) return res.status(409).json({ message: 'El email ya está en uso' });
    }

    // Actualizar campos básicos
    if (nombre) user.nombre = nombre;
    if (apellidopat) user.apellidopat = apellidopat;
    if (apellidomat !== undefined) user.apellidomat = apellidomat;
    if (email) user.email = email;

    if (habilitado !== undefined) {
      let valorHabilitado;
      if (typeof habilitado === 'string') {
        valorHabilitado = (habilitado === 'true' || habilitado === '1' || habilitado === 't') ? 'true' : 'false';
      } else if (typeof habilitado === 'boolean') {
        valorHabilitado = habilitado ? 'true' : 'false';
      } else {
        valorHabilitado = habilitado ? 'true' : 'false';
      }
      console.log('📝 Actualizando habilitado a:', valorHabilitado);
      user.habilitado = valorHabilitado;
    }

    if (contrasenia && contrasenia.trim() !== '') {
      user.contrasenia = contrasenia.trim();
    }

    // ✅ Actualizar el tema si viene en la petición
    if (theme !== undefined) {
      if (theme === 'light' || theme === 'dark') {
        user.theme = theme;
        console.log('🎨 Actualizando tema del usuario a:', theme);
      } else {
        console.warn('⚠️ Valor de tema no válido recibido:', theme);
      }
    }

    // ✅ Actualizar el color de acento si viene en la petición
    if (color_acento !== undefined) {
      const hexRegex = /^#[0-9A-Fa-f]{6}$/;
      if (hexRegex.test(color_acento)) {
        user.color_acento = color_acento;
        console.log('🎨 Actualizando color de acento del usuario a:', color_acento);
      } else {
        console.warn('⚠️ Valor de color_acento no válido recibido:', color_acento);
      }
    }

    // ✅ ACTUALIZAR facultad_id en tabla usuario (si existe la columna)
    if (user.role === 'academico' && idfacultad) {
      console.log('📝 Actualizando usuario.facultad_id a:', idfacultad);
      user.facultad_id = idfacultad;
    }

    await user.save(); // <-- Aquí es donde se guarda user.theme en la base de datos
    console.log('✅ Usuario guardado correctamente');

    // ✅ ACTUALIZAR/CREAR registro en academico o estudiante
    if (idcarrera && user.role === 'academico') {
      console.log('📝 Buscando/creando registro en academico...');
      
      let academico = await Academico.findOne({ where: { idusuario: id } });
      
      if (academico) {
        console.log('✏️ Actualizando registro existente en academico');
        academico.idcarrera = idcarrera;
        
        if (academico.facultad_id !== undefined) {
          academico.facultad_id = idfacultad;
          console.log('📝 academico.facultad_id =', idfacultad);
        }
        
        await academico.save();
        console.log('✅ Academico actualizado:', academico.toJSON());
      } else {
        console.log('➕ Creando nuevo registro en academico');
        academico = await Academico.create({
          idusuario: id,
          idcarrera: idcarrera,
          facultad_id: idfacultad || null
        });
        console.log('✅ Academico creado:', academico.toJSON());
      }
    } else if (idcarrera && user.role === 'student') {
      console.log('📝 Buscando/creando registro en estudiante...');
      
      let estudiante = await Estudiante.findOne({ where: { idusuario: id } });
      
      if (estudiante) {
        estudiante.idcarrera = idcarrera;
        await estudiante.save();
        console.log('✅ Estudiante actualizado');
      } else {
        estudiante = await Estudiante.create({
          idusuario: id,
          idcarrera: idcarrera
        });
        console.log('✅ Estudiante creado');
      }
    }

    // Respuesta final
    const updatedUser = await User.findByPk(id, {
      attributes: { exclude: ['contrasenia'] }
    });

    res.status(200).json({
      message: 'Usuario actualizado correctamente',
      user: updatedUser,
      debug: {
        facultad_id_usuario: updatedUser.facultad_id,
        idcarrera_enviado: idcarrera,
        idfacultad_enviado: idfacultad,
        theme_guardado: updatedUser.theme,
        color_acento_guardado: updatedUser.color_acento
      }
    });

  } catch (error) {
    console.error('❌ Error en updateUser:', error);
    console.error('❌ Stack:', error.stack);
    res.status(500).json({ 
      message: 'Error al actualizar el usuario', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});
const getDirectoresCarrera = asyncHandler(async(req, res) => {
   const models = getModels();
  const {User,Role} = models;
  try{ 
  const directorRole = await Role.findOne({
      where: { nombrerol: 'Director de carrera' }
    });
  if (!directorRole) {
      res.status(404);
      throw new Error('Rol "Director de carrera" no encontrado.');
    }

    const directores = await User.findAll({
      attributes: ['idusuario', 'nombre', 'apellidopat', 'apellidomat'],
      include: [{
        model: Role,
        where: { idrol: directorRole.idrol },
        through: { attributes: [] } // No incluir atributos de la tabla de unión
      }],
      limit: 5, // Según tu consulta original
    });

    // Formatea la respuesta para que coincida con el 'nombreCompleto' esperado por tu frontend
    const formattedDirectores = directores.map(director => ({
      id: director.idusuario,
      nombreCompleto: `${director.nombre} ${director.apellidopat} ${director.apellidomat ? director.apellidomat : ''}`.trim()
    }));

    res.status(200).json(formattedDirectores);
  } catch (error) {
    console.error('Error al obtener directores de carrera:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }

});


const deleteUserByAdmin = asyncHandler(async (req, res) => {
   const models = getModels();
  const {User} = models;
  const { id } = req.params;
  const user = await User.findByPk(id);

  if (!user) {
    res.status(404);
    throw new Error('Usuario no encontrado.');
  }

  if (user.idusuario === req.user.idusuario) { // Compara con la PK correcta
    res.status(400);
    throw new Error('No puedes eliminar tu propia cuenta de administrador.');
  }

  await user.destroy();
  res.status(200).json({ message: 'Usuario eliminado exitosamente.' });
});

const getComite = asyncHandler(async (req, res) => {
  const models = getModels();
  const { sequelize } = models;

  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.idusuario,
        u.nombre,
        u.apellidopat,
        u.apellidomat,
        u.email,
        u.role,
        f.nombre_facultad AS facultad,
        c.nombre_carrera AS carrera
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN facultad f ON a.facultad_id = f.facultad_id
      LEFT JOIN carrera c ON a.idcarrera = c.idcarrera
      WHERE u.role = 'academico' 
        AND u.habilitado::boolean = true
      ORDER BY u.nombre, u.apellidopat
    `);

    console.log('✅ Usuarios encontrados:', results.length);

    const usuariosFormateados = results.map(row => ({
      id: row.idusuario,
      nombreCompleto: `${row.nombre || ''} ${row.apellidopat || ''} ${row.apellidomat || ''}`.trim(),
      email: row.email,
      role: row.role,
      facultad: row.facultad || null,
      carrera: row.carrera || null
    }));

    res.status(200).json(usuariosFormateados);

  } catch (error) {
    console.error('❌ Error al obtener comité:', error.message);
    res.status(500).json({ 
      message: 'Error interno del servidor',
      detail: error.message
    });
  }
});

const getComiteUser = asyncHandler(async (req, res) => {
  const models = getModels();
  const { sequelize } = models;

  try {
    const [results] = await sequelize.query(`
      SELECT 
        u.idusuario,
        u.nombre,
        u.apellidopat,
        u.apellidomat,
        u.email,
        u.role,
        f.nombre_facultad AS facultad,
        c.nombrecarrera AS carrera
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN facultad f ON a.facultad_id = f.facultad_id
      LEFT JOIN carrera c ON a.idcarrera = c.idcarrera
      WHERE u.role = 'academico' 
        AND u.habilitado::boolean = true
      ORDER BY u.nombre, u.apellidopat
    `);

    console.log('✅ Usuarios encontrados:', results.length);

    const usuariosFormateados = results.map(row => ({
      id: row.idusuario,
      nombreCompleto: `${row.nombre || ''} ${row.apellidopat || ''} ${row.apellidomat || ''}`.trim(),
      email: row.email,
      role: row.role,
      facultad: row.facultad || null,
      carrera: row.carrera || null
    }));

    res.status(200).json(usuariosFormateados);
  } catch (error) {
    console.error('❌ Error al obtener usuarios para comité:', error);
    res.status(500).json({ message: 'Error interno del servidor', error: error.message });
  }
});
 const getId = asyncHandler(async(req, res)=>{
  try {
    const { id } = req.params;

    // Asegúrate de que el ID sea un entero
    const userId = parseInt(id);
    if (isNaN(userId)) {
      return res.status(400).json({ message: 'ID de usuario inválido' });
    }

    const query = `
      SELECT 
        u.idusuario, 
        u.username, 
        u.email, 
        u.role, 
        u.habilitado,
        a.idarea AS area_id,
        c.idcarrera AS carrera_id,
        c.nombrecarrera
      FROM usuario u
      LEFT JOIN academico a ON u.idusuario = a.idusuario
      LEFT JOIN carrera c ON a.idcarrera = c.idcarrera
      WHERE u.idusuario = ?
    `;

    const [rows] = await db.query(query, [userId]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    const user = rows[0];

    // Formatear el objeto para incluir datos anidados si es académico
    const response = {
      idusuario: user.idusuario,
      username: user.username,
      email: user.email,
      role: user.role,
      habilitado: user.habilitado,
    };

    if (user.role === 'academico') {
      response.academico = {
        idarea: user.area_id,
        carrera: user.carrera_id
          ? { idcarrera: user.carrera_id, nombrecarrera: user.nombrecarrera }
          : null,
      };
    }

    res.json(response);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

const linkTelegramAccount = asyncHandler(async (req, res) => {
    try {
    const userId = req.user.idusuario;
    const models = getModels();
    const { User } = models;

    await User.update(
      { 
        telegram_chat_id: null,
        telegram_username: null 
      },
      { where: { idusuario: userId } }
    );

    res.json({ message: 'Telegram desvinculado correctamente' });
  } catch (error) {
    console.error('Error al desvincular Telegram:', error);
    res.status(500).json({ error: error.message });
  }
});
const unlinkTelegram = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.idusuario; // ✅ Cambiado de req.user.id a req.user.idusuario
    const models = getModels();
    const { User } = models; // ✅ Obtener el modelo User
    
    console.log(`🔗 Desvinculando Telegram del usuario ${userId}`);
    
    // ✅ Actualizar usando el modelo User correcto
    const [updated] = await User.update(
      { 
        telegram_chat_id: null, 
        telegram_username: null 
      },
      { 
        where: { idusuario: userId }
      }
    );

    if (updated) {
      console.log('✅ Telegram desvinculado correctamente');
      res.json({ 
        success: true, 
        message: 'Telegram desvinculado correctamente',
        data: { telegram_chat_id: null, telegram_username: null }
      });
    } else {
      res.status(404).json({ message: 'Usuario no encontrado' });
    }
  } catch (error) {
    console.error('❌ Error al desvincular Telegram:', error);
    res.status(500).json({ 
      message: 'Error al desvincular Telegram', 
      error: error.message 
    });
  }
});

 const getProfile = asyncHandler(async (req, res) => {
  
    if (!req.user.idusuario) {
    return res.status(401).json({ message: 'No autorizado: usuario no autenticado' });
  }

  const userId = req.user.idusuario;
  if (!userId) {
    console.error('req.user no tiene idusuario:', req.user);
    return res.status(500).json({ message: 'Error: usuario autenticado sin ID válido' });
  }

  const models = getModels();
  const { User, Facultad } = models; // o 'User', según el nombre real de tu modelo

  try {
    const user = await User.findByPk(userId,{
      attributes: [
        'idusuario', 'nombre', 'apellidopat',
        'apellidomat', 'email', 'role', 'facultad_id', 'telegram_chat_id', 'telegram_username',
        'theme','color_acento'
      ],
      include: [
        {
          model: Facultad,
          as: 'facultad', // debe coincidir con el alias de la asociación
          attributes: ['nombre_facultad']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.idusuario,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      facultad: user.facultad?.nombre_facultad || 'Sin facultad',
      facultad_id: user.facultad_id,
      telegram_chat_id: user.telegram_chat_id,
      telegram_username: user.telegram_username,
      theme: user.theme || 'light', // Valor por defecto si no está definido
      color_acento: user.color_acento || '#E95A0C' // Valor por defecto si no está definido
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      message: 'Error al obtener el perfil del usuario',
      error: error.message 
    });
  }
  
});
const getFacultades = asyncHandler(async(req,res)=>{
try{
  const models = getModels();
  const {Facultad} = models;
  const facultad = await Facultad.findAll();
  res.status(200).json(facultad);

}catch(error){
  res.status(500).json({message: 'Error al obtener', error})

}

});
const getUserByEmail = asyncHandler(async (req, res) => {
  const models = getModels();
  const { User } = models;
  const { email } = req.params;

  const user = await User.findOne({ 
    where: { email },
    attributes: ['idusuario', 'nombre', 'telegram_chat_id'] 
  });

  if (!user) {
    return res.status(404).json({ message: 'Usuario no encontrado' });
  }

  res.status(200).json(user);
});
const getUserMe = asyncHandler(async (req, res) => {
  try {
    const models = getModels(); 
    const { User } = models;   
    
    const user = await User.findByPk(req.user.idusuario, {
      attributes: { exclude: ['contrasenia'] } // ✅ Sintaxis de Sequelize
    });

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    res.json({
      id: user.idusuario,
      username: user.username,
      nombre: user.nombre,
      apellidopat: user.apellidopat,
      apellidomat: user.apellidomat,
      email: user.email,
      role: user.role,
      habilitado: user.habilitado,
      theme: user.theme || 'light',
      color_acento: user.color_acento || '#E95A0C'
    });
  } catch (error) {
    console.error('Error en getUserMe:', error);
    res.status(500).json({ message: 'Error del servidor', error: error.message });
  }
});
module.exports = {
  createUser,
  getAllUsers,  
  getUserById,
  getUserById1,
  updateUser,
  updateUserDaf,
  getDirectoresCarrera,
  deleteUserByAdmin,
  getComite,
  getComiteUser,
  getId,
  linkTelegramAccount,
  unlinkTelegram,
  getProfile,
  getFacultades,
  getCarrera,
  getUserProfile,
  getUserByEmail,
  getUsersDaf,
  getUserMe
};