// backend/routes/croquisRoutes.js
const { Router } =require('express');
require('dotenv/config');

const router = Router();

// 🔑 Configura OpenAI con tu API key


const generarPrompt = (evento) => {
  const actividades = [
    ...evento.actividadesPrevias || [],
    ...evento.actividadesDurante || [],
    ...evento.actividadesPost || []
  ].map(act => act.nombreActividad).filter(Boolean);

  const actividadesTexto = actividades.length > 0 
    ? actividades.join(', ')
    : 'actividades no especificadas';

  return `Croquis esquemático 2D profesional de un evento universitario titulado "${evento.nombreevento || 'Evento Universitario'}", 
  ubicado en "${evento.lugarevento || 'lugar no especificado'}". 
  Fecha: ${evento.fechaevento || 'no especificada'}, Hora: ${evento.horaevento || 'no especificada'}.
  Actividades principales: ${actividadesTexto}.
  Incluye zonas claramente etiquetadas: entrada/preregistro, área principal/presentación, zona de descanso/coffee break, baños, y salida.
  Estilo: plano técnico simple, esquemático, sin personas, colores institucionales (azul universitario y naranja), fondo blanco, texto legible.
  Formato: imagen cuadrada clara y profesional.`;
};


module.exports = router;