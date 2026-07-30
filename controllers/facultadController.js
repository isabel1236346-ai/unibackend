const  {getModels} = require ('../models/index.js');

const getFacultades = async (req, res) => {
  try {
    const models =  getModels();
    const Facultad = models.Facultad;
    if (!Facultad) {
      return res.status(500).json({ message: 'Modelo Facultad no encontrado.' });
    }
    const facultades = await Facultad.findAll({
      where: { habilitado: 1 },
      attributes: ['facultad_id', 'nombre_facultad']
    });
     const formatted = facultades.map(f => ({
      facultad_id: f.facultad_id,
      nombre_facultad: f.nombre_facultad
    }));

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Error al obtener facultades:', error);
    res.status(500).json({ message: 'Error al cargar las facultades.' });
  }
};
module.exports = {
  getFacultades
};