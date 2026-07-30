require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const { GoogleGenerativeAI } = require('@google/generative-ai');
const PORT = process.env.PORT || 3001;

// 🔍 DEBUG
console.log('🔍 [DEBUG] DB_USER:', process.env.DB_USER ? '***' : 'undefined');
console.log('🔍 [DEBUG] DB_HOST:', process.env.DB_HOST);
console.log('🔍 [DEBUG] DB_NAME:', process.env.DB_NAME);
console.log('🔍 [DEBUG] PORT:', PORT);

/*const FRONTEND_PATH = path.join(__dirname, '../public_html/frontendEvento.cidtec-uc.com');
console.log('🔍 [DEBUG] FRONTEND_PATH:', FRONTEND_PATH);*/
const fs = require('fs');
const FRONTEND_PATH = process.env.API_BASE_URL || null;
const frontendExists = FRONTEND_PATH ? fs.existsSync(FRONTEND_PATH) : false;
console.log('🔍 [DEBUG] FRONTEND_PATH:', FRONTEND_PATH, '| Existe:', frontendExists);

  const allowedOrigins = [
  'https://backendgestion-production-e2aa.up.railway.app',
  'https://frontendgestion-production-d088.up.railway.app',
  'http://localhost:3000',
  'http://localhost:8081',
  'http://localhost:19006'
];

app.use(cors({
  origin: 'https://frontendgestion-production-d088.up.railway.app',
  //true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
  // 🔧 IMPORTANTE para Railway/Heroku
  pingTimeout: 60000,
  pingInterval: 25000,
  connectTimeout: 45000,
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
if (frontendExists) app.use(express.static(FRONTEND_PATH));




app.use('/uploads', (req, res, next) => {
  console.log('📁 Solicitud de archivo:', req.url);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

if (frontendExists) {
  app.get('/', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'index.html')));
  app.get('/Login', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'Login.html')));
  app.get('/Home', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'Home.html')));
  app.get('/HomeAdministrador', (req, res) => res.sendFile(path.join(FRONTEND_PATH, 'HomeAdministrador.html')));
} else {
  app.get('/', (req, res) => res.json({ status: '✅ API online', servidor: 'Railway' }));
}
const { telegramWebhook } = require('./controllers/botController.js');
app.post('/api/chat/telegram', telegramWebhook);
const startServer = async () => {
  try {
    const { initModels } = require('./models/index.js');
    const { sequelize, models } = await initModels();

    console.log('✅ PostgreSQL Conectado Exitosamente.');
    console.log('✅ Modelos y asociaciones inicializados correctamente.');

    app.use('/auth',          require('./routes/authRoutes.js'));
    app.use('/categories',    require('./routes/categoryRoutes.js'));
    app.use('/locations',     require('./routes/locationRoutes.js'));
    app.use('/users',         require('./routes/userRoutes.js'));
    app.use('/eventos',       require('./routes/eventos.js'));
    app.use('/proyectos',     require('./routes/proyectosRoutes.js'));
    app.use('/recursos',      require('./routes/recursosRoutes.js'));
    app.use('/notificaciones',require('./routes/notificacionesRoutes.js'));
    app.use('/facultades',    require('./routes/facultadRoutes.js'));
    app.use('/carreras',      require('./routes/carrerasRoutes.js'));
    app.use('/dashboard',     require('./routes/dashboardRoutes.js'));
    app.use('/croquis',       require('./routes/croquisRoutes.js'));
    app.use('/profile',       require('./routes/profileRoutes.js'));
    app.use('/layouts',       require('./routes/layoutsRoutes.js'));
    app.use('/estudiantes',   require('./routes/estudiantesRoutes.js'));
    app.use('/bot',           require('./routes/botRoutes.js'));
    app.use('/daf',           require('./routes/dafRoutes.js'));
    const chatSocket = require('./sockets/chatSocket.js');
    chatSocket(io);
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', message: '✅ API Funcionando!', timestamp: new Date().toISOString() });
    });

    app.get('/test-api', (req, res) => {
      res.json({ ok: true, message: '✅ Rutas funcionando!' });
    });
    

    app.use((err, req, res, next) => {
      console.error('❌ Error no manejado:', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        original: err.original?.message,
        parent: err.parent?.message
      });
      res.status(500).json({
        message: 'Error interno del servidor',
        error: err.message,
        details: process.env.NODE_ENV === 'development'
          ? (err.original?.message || err.parent?.message)
          : undefined
      });
    });

    server.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
    });

  } catch (err) {
    console.error('❌ Error crítico al iniciar:', err);
    if (err.name === 'SequelizeConnectionError') {
      console.error('💡 Verifica DB_HOST, DB_NAME, DB_USER, DB_PASSWORD en .env');
    }
    process.exit(1);
  }
  require('./services/recordatorios');
  console.log('🤖 Servicios de notificaciones iniciados');
};

startServer();