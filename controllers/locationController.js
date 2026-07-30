const { getModels } = require('../models/index.js');

const getAllLocations = async (req, res) => {
  try {
    const models = getModels();
    const Location = models.Location;  // ✅ CORRECCIÓN: Obtener el modelo desde getModels()

    if (!Location) {
      console.error('❌ Modelo Location no encontrado');
      return res.status(500).json({ message: 'Error interno: Modelo Location no disponible' });
    }

    const locations = await Location.findAll();
    res.status(200).json(locations);
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    res.status(500).json({ message: 'Error al obtener ubicaciones', error: error.message });
  }
};

const createLocation = async (req, res) => {
  const { name, address, capacity } = req.body;
  
  try {
    if (!name) {
      return res.status(400).json({ message: 'El nombre de la ubicación es obligatorio.' });
    }

    const models = getModels();
    const Location = models.Location;

    if (!Location) {
      return res.status(500).json({ message: 'Error interno: Modelo Location no disponible' });
    }

    const newLocation = await Location.create({ name, address, capacity });
    res.status(201).json(newLocation);
  } catch (error) {
    console.error('Error al crear ubicación:', error);
    
    // Manejo de errores de Sequelize
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errors: error.errors.map(e => e.message) 
      });
    }
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'La ubicación ya existe' });
    }
    
    res.status(500).json({ message: 'Error al crear ubicación', error: error.message });
  }
};

const updateLocation = async (req, res) => {
  const { id } = req.params;
  const { name, address, capacity } = req.body;
  
  try {
    const models = getModels();
    const Location = models.Location;

    if (!Location) {
      return res.status(500).json({ message: 'Error interno: Modelo Location no disponible' });
    }

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }

    // Actualizar solo los campos proporcionados
    if (name !== undefined) location.name = name;
    if (address !== undefined) location.address = address;
    if (capacity !== undefined) location.capacity = capacity;

    await location.save();
    res.status(200).json(location);
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        message: 'Error de validación', 
        errors: error.errors.map(e => e.message) 
      });
    }
    
    res.status(500).json({ message: 'Error al actualizar ubicación', error: error.message });
  }
};

const deleteLocation = async (req, res) => {
  const { id } = req.params;
  
  try {
    const models = getModels();
    const Location = models.Location;

    if (!Location) {
      return res.status(500).json({ message: 'Error interno: Modelo Location no disponible' });
    }

    const location = await Location.findByPk(id);
    if (!location) {
      return res.status(404).json({ message: 'Ubicación no encontrada' });
    }

    // Considerar qué sucede con los eventos que usan esta ubicación
    await location.destroy();
    res.status(200).json({ message: 'Ubicación eliminada exitosamente' });
  } catch (error) {
    console.error('Error al eliminar ubicación:', error);
    res.status(500).json({ message: 'Error al eliminar ubicación', error: error.message });
  }
};
module.exports = {
  getAllLocations,
  createLocation,
  updateLocation,
  deleteLocation
};