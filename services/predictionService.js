// src/services/predictionService.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

/**
 * Servicio de Análisis Predictivo de Asistencia
 * Adaptado a la estructura real de las tablas evento y resultado de UNIFRANZ
 */
class PredictionService {

  /**
   * Convierte fechaevento (varchar) a objeto Date
   * Maneja formatos comunes: 'YYYY-MM-DD', 'DD/MM/YYYY', etc.
   */
  _parseFecha(fechaStr) {
    if (!fechaStr) return null;
    
    // Intentar formato YYYY-MM-DD
    let date = new Date(fechaStr);
    if (!isNaN(date.getTime())) return date;
    
    // Intentar formato DD/MM/YYYY
    const parts = fechaStr.split('/');
    if (parts.length === 3) {
      date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      if (!isNaN(date.getTime())) return date;
    }
    
    return null;
  }

  /**
   * Extrae características del evento para el modelo de ML
   * Usa los IDs de clasificación como features numéricas
   */
  _encodeFeatures(evento) {
    const fecha = this._parseFecha(evento.fechaevento);
    
    if (!fecha) {
      return {
        idclasificacion: evento.idclasificacion || 0,
        idacademico: evento.idacademico || 0,
        idsubcategoria: evento.idsubcategoria || 0,
        dia_semana: 1,
        es_fin_de_semana: 0,
        evento_externo: evento.evento_externo ? 1 : 0
      };
    }

    const diasSemana = { 
      'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 
      'Jueves': 4, 'Viernes': 5, 'Sábado': 6 
    };
    
    const diaSemana = fecha.getDay();
    const esFinDeSemana = (diaSemana === 0 || diaSemana === 6) ? 1 : 0;

    return {
      idclasificacion: evento.idclasificacion || 0,
      idacademico: evento.idacademico || 0,
      idsubcategoria: evento.idsubcategoria || 0,
      dia_semana: diaSemana,
      es_fin_de_semana: esFinDeSemana,
      evento_externo: evento.evento_externo ? 1 : 0
    };
  }

  /**
   * Obtiene el historial de eventos pasados con su participación real
   * JOIN entre evento y resultado usando idevento
   */
  async _getHistorialParticipacion() {
    const query = `
      SELECT 
        e.idevento,
        e.nombreevento,
        e.fechaevento,
        e.horaevento,
        e.idclasificacion,
        e.idacademico,
        e.idsubcategoria,
        e.evento_externo,
        r.participacion_real,
        r.satisfaccion_real
      FROM evento e
      INNER JOIN resultado r ON e.idevento = r.idevento
      WHERE r.participacion_real IS NOT NULL
        AND e.estado = 'aprobado'
      ORDER BY e.fechaevento DESC
      LIMIT 100
    `;
    
    try {
      const result = await pool.query(query);
      
      // Filtrar solo eventos pasados (fechaevento < hoy)
      const hoy = new Date();
      const eventosPasados = result.rows.filter(row => {
        const fecha = this._parseFecha(row.fechaevento);
        return fecha && fecha < hoy;
      });
      
      return eventosPasados;
    } catch (error) {
      console.error('Error al obtener historial:', error);
      return [];
    }
  }

  /**
   * Algoritmo de predicción basado en eventos similares
   * Analiza eventos con misma clasificación y características
   */
  async predecirAsistencia(evento) {
    const historial = await this._getHistorialParticipacion();
    
    if (historial.length === 0) {
      return { 
        prediccion: 0, 
        confianza: 'baja', 
        mensaje: 'Sin datos históricos suficientes en la tabla resultado' 
      };
    }

    const features = this._encodeFeatures(evento);
    
    // Filtrar eventos similares del historial
    // Prioridad: misma clasificación > mismo académico > mismo día de semana
    const eventosSimilares = historial.filter(h => {
      const hFeatures = this._encodeFeatures(h);
      
      // Criterio de similitud: misma clasificación O mismo académico
      return hFeatures.idclasificacion === features.idclasificacion || 
             hFeatures.idacademico === features.idacademico;
    });

    if (eventosSimilares.length === 0) {
      // Si no hay eventos similares, usar promedio general
      const promedioGeneral = historial.reduce(
        (sum, h) => sum + parseInt(h.participacion_real), 0
      ) / historial.length;
      
      return {
        prediccion: Math.round(promedioGeneral),
        confianza: 'media',
        eventos_analizados: historial.length,
        mensaje: 'Predicción basada en promedio general de todos los eventos'
      };
    }

    // Calcular promedio ponderado de eventos similares
    const totalParticipacion = eventosSimilares.reduce(
      (sum, h) => sum + parseInt(h.participacion_real), 0
    );
    const promedio = totalParticipacion / eventosSimilares.length;
    
    // Ajustar según día de la semana (factor de peso)
    const factorDia = features.es_fin_de_semana ? 0.85 : 1.15;
    const prediccionFinal = Math.round(promedio * factorDia);

    // Calcular nivel de confianza
    let confianza = 'baja';
    if (eventosSimilares.length >= 10) confianza = 'alta';
    else if (eventosSimilares.length >= 5) confianza = 'media';

    return {
      prediccion: prediccionFinal,
      confianza: confianza,
      eventos_analizados: eventosSimilares.length,
      promedio_historico: Math.round(promedio),
      factor_ajuste: factorDia,
      mensaje: `Se predicen ${prediccionFinal} asistentes basado en ${eventosSimilares.length} eventos similares`
    };
  }

  /**
   * Genera análisis completo para el dashboard del administrador
   * Incluye predicción vs realidad para eventos futuros
   */
  async generarAnalisisCompleto() {
    const query = `
      SELECT 
        e.idevento,
        e.nombreevento,
        e.fechaevento,
        e.horaevento,
        e.idclasificacion,
        e.idacademico,
        e.idsubcategoria,
        e.evento_externo,
        r.participacion_esperada,
        r.participacion_real,
        r.satisfaccion_real,
        r.satisfaccion_esperada
      FROM evento e
      LEFT JOIN resultado r ON e.idevento = r.idevento
      WHERE e.estado = 'aprobado'
      ORDER BY e.fechaevento ASC
    `;
    
    try {
      const result = await pool.query(query);
      const hoy = new Date();
      
      const analisis = [];
      for (const evento of result.rows) {
        const fechaEvento = this._parseFecha(evento.fechaevento);
        
        // Solo predecir eventos futuros
        if (fechaEvento && fechaEvento >= hoy) {
          const prediccion = await this.predecirAsistencia(evento);
          
          // Calcular tasa de cumplimiento si ya hay datos reales
          let tasaCumplimiento = null;
          if (evento.participacion_real && evento.participacion_esperada) {
            const esperada = parseInt(evento.participacion_esperada) || 0;
            if (esperada > 0) {
              tasaCumplimiento = ((evento.participacion_real / esperada) * 100).toFixed(1) + '%';
            }
          }

          analisis.push({
            idevento: evento.idevento,
            nombreevento: evento.nombreevento,
            fechaevento: evento.fechaevento,
            horaevento: evento.horaevento,
            participacion_esperada: evento.participacion_esperada,
            participacion_real: evento.participacion_real,
            satisfaccion_real: evento.satisfaccion_real,
            prediccion_ia: prediccion.prediccion,
            tasa_cumplimiento: tasaCumplimiento,
            confianza_ia: prediccion.confianza
          });
        }
      }

      return analisis;
    } catch (error) {
      console.error('Error al generar análisis:', error);
      return [];
    }
  }

  /**
   * Análisis de satisfacción post-evento
   * Analiza la satisfacción real vs esperada
   */
  async analizarSatisfaccion() {
    const query = `
      SELECT 
        e.nombreevento,
        e.fechaevento,
        r.satisfaccion_real,
        r.satisfaccion_esperada,
        r.participacion_real,
        r.lecciones_aprendidas
      FROM evento e
      INNER JOIN resultado r ON e.idevento = r.idevento
      WHERE r.satisfaccion_real IS NOT NULL
      ORDER BY r.satisfaccion_real DESC
    `;
    
    try {
      const result = await pool.query(query);
      
      // Calcular promedio de satisfacción
      const totalSatisfaccion = result.rows.reduce(
        (sum, r) => sum + parseInt(r.satisfaccion_real || 0), 0
      );
      const promedioSatisfaccion = result.rows.length > 0 
        ? (totalSatisfaccion / result.rows.length).toFixed(2) 
        : 0;

      return {
        total_eventos_analizados: result.rows.length,
        promedio_satisfaccion: promedioSatisfaccion,
        eventos: result.rows
      };
    } catch (error) {
      console.error('Error al analizar satisfacción:', error);
      return { total_eventos_analizados: 0, promedio_satisfaccion: 0, eventos: [] };
    }
  }
}

module.exports = new PredictionService();