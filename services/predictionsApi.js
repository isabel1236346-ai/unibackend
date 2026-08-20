const API_BASE_URL = 'https://unibackend-production.up.railway.app';
/**
 * Obtiene el análisis predictivo completo para el Dashboard del Admin
 */
export const fetchPredictionAnalysis = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/predictions/analysis`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Si usas JWT, agrega tu token aquí:
        // 'Authorization': `Bearer ${token}` 
      },
    });

    if (!response.ok) throw new Error('Error al obtener el análisis de IA');
    return await response.json();
  } catch (error) {
    console.error('Error en fetchPredictionAnalysis:', error);
    throw error;
  }
};

/**
 * Predice la asistencia de un evento específico (Útil al crear/editar eventos)
 */
export const predictSingleEvent = async (eventData) => {
  try {
    const response = await fetch(`${API_BASE_URL}/predictions/predict`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(eventData),
    });

    if (!response.ok) throw new Error('Error al generar predicción');
    return await response.json();
  } catch (error) {
    console.error('Error en predictSingleEvent:', error);
    throw error;
  }
};