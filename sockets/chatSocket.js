module.exports = (io) => {
  const eventUsers = new Map();
  const privateRooms = new Map(); // Track private room members

  io.on('connection', (socket) => {
    console.log('🔌 Usuario conectado:', socket.id);

    socket.on('join_private', async ({ roomId, userId, userName }) => {
      console.log('🔒 [PRIVADO] Unirse a sala:', { roomId, userId, userName });
      
      socket.join(roomId);
      socket.data = { ...socket.data, roomId, isPrivate: true, userId, userName };

      // Track room members
      if (!privateRooms.has(roomId)) {
        privateRooms.set(roomId, new Set());
      }
      privateRooms.get(roomId).add(String(userId));

      try {
        const { getModels } = require('../models');
        const { ChatMensaje } = getModels();

        const historial = await ChatMensaje.findAll({
          where: {
            idevento: 0,
            room_id: roomId,
          },
          order: [['createdAt', 'ASC']],
          limit: 100
        });

        socket.emit('history', historial.map(m => ({
          userId: m.idusuario,
          userName: m.username,
          role: m.role,
          message: m.message,
          timestamp: m.created_at || m.createdAt
        })));
        
        console.log(`✅ [PRIVADO] ${userName} unido a ${roomId}, historial: ${historial.length}`);
      } catch (e) {
        console.error('❌ [PRIVADO] Error cargando historial:', e.message);
        socket.emit('history', []);
      }
    });

    socket.on('send_private', async ({ roomId, userId, userName, role, message }) => {
      console.log(' [PRIVADO] Enviando mensaje:', { roomId, userId, userName, message });
      
      try {
        const { getModels } = require('../models');
        const { ChatMensaje } = getModels();
        
        await ChatMensaje.create({
          idevento: 0,
          idusuario: parseInt(userId),
          username: userName || null,
          role,
          message,
          room_id: roomId,
        });

        io.to(roomId).emit('private_message', {
          userId: parseInt(userId),
          userName: userName || 'Usuario',
          role,
          message,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ [PRIVADO] Mensaje emitido a sala ${roomId}`);
      } catch (e) {
        console.error('❌ [PRIVADO] Error:', e.message);
        socket.emit('error', { message: 'Error: ' + e.message });
      }
    });

    socket.on('leave_private', ({ roomId }) => {
      console.log('🚪 [PRIVADO] Usuario sale:', roomId);
      socket.leave(roomId);
      
      if (privateRooms.has(roomId)) {
        privateRooms.get(roomId).delete(String(socket.data?.userId));
        if (privateRooms.get(roomId).size === 0) {
          privateRooms.delete(roomId);
        }
      }
    });

    socket.on('join_event', async ({ eventoId, userId, role, userName }) => {
      const room = `evento_${eventoId}`;
      console.log('👥 [EVENTO] Usuario se une:', { eventoId, userId, userName, room });

      try {
        const { getModels } = require('../models');
        const { ChatMensaje, Comite, Evento } = getModels();

        if (eventoId !== 'general') {
          const [esMiembroComite, evento] = await Promise.all([
            Comite.findOne({
              where: {
                idevento: parseInt(eventoId),
                idusuario: parseInt(userId)
              }
            }),
            Evento.findOne({
              where: { idevento: parseInt(eventoId) }
            })
          ]);

          const esCreador = evento && parseInt(evento.idacademico) === parseInt(userId);

          if (!esMiembroComite && !esCreador) {
            console.warn('⚠️ [EVENTO] Usuario sin acceso:', { userId, eventoId });
            socket.emit('error', { message: 'No tienes acceso a este chat' });
            return;
          }
        }

        socket.join(room);
        socket.data = { userId, role, eventoId, userName };

        if (!eventUsers.has(eventoId)) {
          eventUsers.set(eventoId, new Map());
        }
        eventUsers.get(eventoId).set(String(userId), {
          userId: String(userId),
          userName,
          role,
          socketId: socket.id
        });

        const userList = Array.from(eventUsers.get(eventoId).values());
        io.to(room).emit('user_list', userList);

        const historial = await ChatMensaje.findAll({
          where: { idevento: parseInt(eventoId) },
          order: [['createdAt', 'ASC']],
          limit: 50
        });

        socket.emit('history', historial.map(m => ({
          userId: m.idusuario,
          userName: m.username,
          role: m.role,
          message: m.message,
          timestamp: m.created_at || m.createdAt
        })));

        socket.to(room).emit('user_joined', { userId, userName, role });
        console.log(`✅ [EVENTO] ${userName} (${role}) → sala ${room}`);

      } catch (e) {
        console.warn('️ [EVENTO] Error en join_event:', e.message);
        socket.emit('history', []);
      }
    });

    socket.on('send_message', async ({ eventoId, userId, role, userName, message }) => {
      const room = `evento_${eventoId}`;
      console.log(' [EVENTO] Mensaje:', { eventoId, userId, userName, message });
      
      try {
        const { getModels } = require('../models');
        const { ChatMensaje } = getModels();
        
        await ChatMensaje.create({
          idevento: parseInt(eventoId),
          idusuario: parseInt(userId),
          username: userName || null,
          role,
          message
        });

        io.to(room).emit('receive_message', {
          userId: parseInt(userId),
          userName: userName || 'Usuario',
          role,
          message,
          timestamp: new Date().toISOString()
        });

        console.log(`✅ [EVENTO] Mensaje emitido a: ${room}`);
      } catch (e) {
        console.error('❌ [EVENTO] Error:', e.message);
        socket.emit('error', { message: e.message });
      }
    });

    socket.on('leave_event', ({ eventoId }) => {
      console.log('🚪 [EVENTO] Usuario sale:', eventoId);
      socket.leave(`evento_${eventoId}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Usuario desconectado:', socket.id);

      const { userId, eventoId, userName, role, roomId, isPrivate } = socket.data || {};

      if (isPrivate && roomId && userId) {
        if (privateRooms.has(roomId)) {
          privateRooms.get(roomId).delete(String(userId));
          if (privateRooms.get(roomId).size === 0) {
            privateRooms.delete(roomId);
          }
        }
      }

      if (eventoId && userId && eventUsers.has(eventoId)) {
        const userMap = eventUsers.get(eventoId);
        const user = userMap.get(String(userId));
        userMap.delete(String(userId));

        const room = `evento_${eventoId}`;

        if (userMap.size === 0) {
          eventUsers.delete(eventoId);
        } else {
          const userList = Array.from(userMap.values());
          io.to(room).emit('user_list', userList);
        }

        socket.to(room).emit('user_left', {
          userId,
          userName: user?.userName || userName,
          role: user?.role || role
        });

        console.log(`👋 ${userName || 'Usuario'} salió de ${room}`);
      }
    });
  });

  console.log('✅ [SOCKET] Chat socket inicializado correctamente');
};