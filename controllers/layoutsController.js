const { getModels } = require('../models/index.js');
const asyncHandler = require('express-async-handler');
const fs = require('fs');
const path = require('path');

const crearLayout = asyncHandler(async (req, res) => {
  try {
    const { nombre } = req.body;
    const imagen = req.file;

    if (!nombre?.trim()) {
      return res.status(400).json({ 
        success: false, 
        message: 'El nombre del layout es requerido' 
      });
    }

    if (!imagen) {
      return res.status(400).json({ 
        success: false, 
        message: 'La imagen del layout es requerida' 
      });
    }

    const models = getModels();
    const { Layout } = models;

    const nuevoLayout = await Layout.create({
      nombre: nombre.trim(),
      url_imagen: `layouts/${imagen.filename}` // guarda: "layouts/imagen-123.jpg"
    });

    res.status(201).json({ 
      success: true, 
      message: 'Layout creado exitosamente',
      layout: {
        id: nuevoLayout.idlayout,
        nombre: nuevoLayout.nombre,
        url_imagen: nuevoLayout.url_imagen,
        imagenUrl: `${req.protocol}://${req.get('host')}/uploads/${nuevoLayout.url_imagen}`
      }
    });

  } catch (error) {
    console.error('Error al crear layout:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        success: false, 
        message: 'El archivo es demasiado grande (máximo 10MB)' 
      });
    }

    if (error.message?.includes('Solo se permiten imágenes')) {
      return res.status(400).json({ 
        success: false, 
        message: 'Solo se permiten archivos de imagen (jpg, png, gif, webp)' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Error interno del servidor al crear el layout' 
    });
  }
});

const obtenerLayouts = asyncHandler(async (req, res) => {
  const models = getModels();
  const { Layout } = models;

  const layouts = await Layout.findAll({
    attributes: ['idlayout', 'nombre', 'url_imagen'],
    order: [['created_at', 'DESC']]
  });

  const layoutsConUrlCompleta = layouts.map(layout => {
    // url_imagen ya es "layouts/imagen-123.jpg", no necesita limpieza
    const imagenUrl = `${req.protocol}://${req.get('host')}/uploads/${layout.url_imagen}`;

    return {
      idlayout: layout.idlayout,
      nombre: layout.nombre,
      url_imagen: layout.url_imagen,
      imagenUrl: imagenUrl
    };
  });

  res.json(layoutsConUrlCompleta);
});

const eliminarLayout = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const models = getModels();
    const { Layout } = models;

    const layout = await Layout.findByPk(id);

    if (!layout) {
      return res.status(404).json({ success: false, message: 'Layout no encontrado' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', layout.url_imagen);
    fs.unlink(filePath, (err) => {
      if (err) console.warn('⚠️ No se pudo borrar el archivo físico:', err.message);
    });

    await layout.destroy();

    res.json({ success: true, message: 'Layout eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar layout:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor al eliminar el layout' });
  }
});
module.exports = {
  crearLayout,
  obtenerLayouts,
  eliminarLayout
};