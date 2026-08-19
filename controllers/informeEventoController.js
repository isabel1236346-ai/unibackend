const { getModels } = require('../models/index.js');

async function esResponsableDelEvento(evento, usuario, models) {
  console.log('🔍 [esResponsableDelEvento] Verificando permisos...');
  
  if (!usuario) {
    console.log('   ❌ Denegado: No hay usuario en req.user');
    return false;
  }
  
  if (usuario.role === 'admin') {
    console.log('   ✅ Concedido: El usuario tiene rol de admin');
    return true;
  }
  
  const idacademicoDelEvento = evento.idacademico;
  console.log(`    idacademico del evento: ${idacademicoDelEvento}`);
  console.log(`   🆔 idusuario del usuario actual: ${usuario.idusuario || usuario.id}`);
  
  if (!idacademicoDelEvento) {
    console.log('   ❌ Denegado: El evento no tiene idacademico asignado');
    return false;
  }
  
  const { Academico } = models;
  const registroAcademico = await Academico.findOne({
    where: { idacademico: idacademicoDelEvento }
  });
  
  if (!registroAcademico) {
    console.log('   ❌ Denegado: No se encontró el registro en tabla academico');
    return false;
  }
  
  console.log(`   🔗 idusuario vinculado a ese idacademico: ${registroAcademico.idusuario}`);
  
  const userIdActual = usuario.idusuario || usuario.id;
  if (registroAcademico.idusuario && Number(registroAcademico.idusuario) === Number(userIdActual)) {
    console.log('   ✅ Concedido: El usuario es el responsable del evento');
    return true;
  }
  
  console.log(`   ❌ Denegado: El usuario NO es el responsable`);
  return false;
}


const getInformeEvento = async (req, res) => {
  console.log('🔍 [getInformeEvento] Iniciando para evento ID:', req.params.id);
  try {
    const models = getModels();
    const { InformeEvento, Evento, Resultado } = models;
    const idevento = Number(req.params.id);
    
    if (isNaN(idevento)) {
      return res.status(400).json({ message: 'ID de evento inválido' });
    }

    let evento;
    try {
      evento = await Evento.findByPk(idevento);
    } catch (findError) {
      console.error('❌ Error en findByPk:', findError.message);
      return res.status(500).json({ message: 'Error buscando evento', error: findError.message });
    }

    if (!evento) {
      return res.status(404).json({ message: 'Evento no encontrado' });
    }

    let informe;
    try {
      informe = await InformeEvento.findOne({ where: { idevento } });
      if (!informe) {
        console.log('⚠️ No existe informe aún, se devolverá null');
      }
    } catch (informeError) {
      console.warn('⚠️ Error buscando informe:', informeError.message);
      informe = null;
    }

    let resultado;
    try {
      resultado = await Resultado.findOne({ where: { idevento } });
      console.log('📊 Resultado encontrado:', resultado ? 'SÍ' : 'NO');
    } catch (resultadoError) {
      console.error('❌ Error buscando resultado:', resultadoError.message);
      resultado = null;
    }

    let egresos = [];
    let ingresos = [];
    let presupuesto = {};

    try {
      if (evento.getEgresos) egresos = await evento.getEgresos() || [];
      if (evento.getIngresos) ingresos = await evento.getIngresos() || [];
      if (evento.getPresupuesto) presupuesto = await evento.getPresupuesto() || {};
    } catch (assocError) {
      egresos = evento.Egresos || evento.egresos || [];
      ingresos = evento.Ingresos || evento.ingresos || [];
      presupuesto = evento.Presupuesto || evento.presupuesto || {};
    }

    const esperado = {
      nombreEvento: evento.nombreevento || evento.nombreEvento,
      lugarEvento: evento.lugarevento || evento.lugarEvento,
      fechaEvento: evento.fechaevento || evento.fechaEvento,
      horaEvento: evento.horaevento || evento.horaEvento,
      responsable: evento.responsable_evento || evento.responsable || null,
      participacionEsperada: resultado?.participacion_esperada || null,
      satisfaccionEsperada: resultado?.satisfaccion_esperada || null,
      otrosResultadosEsperados: resultado?.otros_resultados || null,
      egresosEsperados: egresos,
      ingresosEsperados: ingresos,
      totalEgresosEsperado: Number(presupuesto?.total_egresos || presupuesto?.totalEgresos || 0),
      totalIngresosEsperado: Number(presupuesto?.total_ingresos || presupuesto?.totalIngresos || 0),
      balanceEsperado: Number(presupuesto?.balance || 0),
    };

    // ✅ 1. PREPARAR EL OBJETO DE RESPUESTA (SIEMPRE, tenga o no informe)
    const informeData = informe ? informe.toJSON() : {};

    // ✅ 2. AGREGAR LOS CAMPOS DE TEXTO SI EXISTE RESULTADO
    if (resultado) {
      informeData.info_prensa = resultado.info_prensa || informeData.info_prensa || null;
      informeData.analisis_desviaciones = resultado.analisis_desviaciones || informeData.analisis_desviaciones || null;
      informeData.lecciones_aprendidas = resultado.lecciones_aprendidas || informeData.lecciones_aprendidas || null;
    }

    // ✅ 3. ASEGURAR QUE LOS ARRAYS JSON SIEMPRE SE ENVÍEN (FUERA DEL IF)
    informeData.egresos_reales = informeData.egresos_reales || [];
    informeData.ingresos_reales = informeData.ingresos_reales || [];

    console.log('✅ [getInformeEvento] Respuesta enviada con éxito');
    console.log('   - egresos_reales enviados:', informeData.egresos_reales.length);
    console.log('   - ingresos_reales enviados:', informeData.ingresos_reales.length);
    
    // ✅ 4. UN SOLO RETURN AL FINAL, SIEMPRE DEVOLVIENDO `informeData`
    return res.json({ esperado, informe: informeData });

  } catch (error) {
    console.error('❌ ERROR CRÍTICO en getInformeEvento:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ message: 'Error interno', error: error.message });
  }
};


const guardarInformeEvento = async (req, res) => {
  console.log('💾 [guardarInformeEvento] Iniciando guardado para evento ID:', req.params.id);
  
  try {
    const models = getModels();
    const { InformeEvento, Evento, Resultado, Egreso, Ingreso, Presupuesto } = models;
    const idevento = Number(req.params.id);
    
    if (isNaN(idevento)) return res.status(400).json({ message: 'ID de evento inválido' });

    const evento = await Evento.findByPk(idevento);
    if (!evento) return res.status(404).json({ message: 'Evento no encontrado' });

    const puedeEditar = await esResponsableDelEvento(evento, req.user, models);
    if (!puedeEditar) {
      return res.status(403).json({ message: 'No tienes permiso para completar el informe.' });
    }

    const {
      segmento_alcanzado_estudiantes, segmento_alcanzado_docentes,
      segmento_alcanzado_publico_externo, segmento_alcanzado_influencers,
      segmento_alcanzado_otro_cual, segmento_alcanzado_otro_cantidad,
      objetivo_alcanzado_modelo_pedagogico, objetivo_alcanzado_posicionamiento,
      objetivo_alcanzado_internacionalizacion, objetivo_alcanzado_rsu,
      objetivo_alcanzado_fidelizacion, objetivo_alcanzado_otro_cual,
      participacion_real, indice_satisfaccion_real, otros_resultados_real,
      egresos_reales, ingresos_reales, info_prensa, analisis_desviaciones,
      lecciones_aprendidas, estado
    } = req.body;

    const egresosArr = Array.isArray(egresos_reales) ? egresos_reales : [];
    const ingresosArr = Array.isArray(ingresos_reales) ? ingresos_reales : [];
    
    const totalEgresosReal = egresosArr.reduce((sum, e) => sum + (Number(e.total) || 0), 0);
    const totalIngresosReal = ingresosArr.reduce((sum, i) => sum + (Number(i.total) || 0), 0);
    const balanceReal = totalIngresosReal - totalEgresosReal;

    // 1. GUARDAR DATOS GENERALES DEL INFORME
    const datosInforme = {
      idevento,
      segmento_alcanzado_estudiantes: Number(segmento_alcanzado_estudiantes) || 0,
      segmento_alcanzado_docentes: Number(segmento_alcanzado_docentes) || 0,
      segmento_alcanzado_publico_externo: Number(segmento_alcanzado_publico_externo) || 0,
      segmento_alcanzado_influencers: Number(segmento_alcanzado_influencers) || 0,
      segmento_alcanzado_otro_cual: segmento_alcanzado_otro_cual || null,
      segmento_alcanzado_otro_cantidad: Number(segmento_alcanzado_otro_cantidad) || 0,
      objetivo_alcanzado_modelo_pedagogico: !!objetivo_alcanzado_modelo_pedagogico,
      objetivo_alcanzado_posicionamiento: !!objetivo_alcanzado_posicionamiento,
      objetivo_alcanzado_internacionalizacion: !!objetivo_alcanzado_internacionalizacion,
      objetivo_alcanzado_rsu: !!objetivo_alcanzado_rsu,
      objetivo_alcanzado_fidelizacion: !!objetivo_alcanzado_fidelizacion,
      objetivo_alcanzado_otro_cual: objetivo_alcanzado_otro_cual || null,
      participacion_real: participacion_real || null,
      indice_satisfaccion_real: indice_satisfaccion_real || null,
      otros_resultados_real: otros_resultados_real || null,
      
      egresos_reales: egresosArr,
      ingresos_reales: ingresosArr,

      total_egresos_real: totalEgresosReal,
      total_ingresos_real: totalIngresosReal,
      balance_real: balanceReal,
      idacademico: req.user.idacademico || evento.idacademico,
      estado: estado === 'finalizado' ? 'finalizado' : 'borrador',
    };

    const [informe, creado] = await InformeEvento.findOrCreate({
      where: { idevento },
      defaults: datosInforme
    });

    if (!creado) {
      await informe.update(datosInforme);
    }

    // 2. GUARDAR LOS 3 CAMPOS DE TEXTO EN RESULTADO
    const datosResultado = {
      idevento,
      info_prensa: info_prensa || null,
      analisis_desviaciones: analisis_desviaciones || null,
      lecciones_aprendidas: lecciones_aprendidas || null,
    };

    const [resultado, resultadoCreado] = await Resultado.findOrCreate({
      where: { idevento },
      defaults: datosResultado
    });

    if (!resultadoCreado) {
      await resultado.update(datosResultado);
    }

    // 3. 🔄 ACTUALIZAR EGRESOS (conservando datos originales)
    console.log(`💰 Actualizando ${egresosArr.length} egresos con datos reales...`);
    
    // Obtener el idpresupuesto del evento
    const presupuesto = await Presupuesto.findOne({ where: { idevento } });
    const idpresupuesto = presupuesto ? presupuesto.idpresupuesto : null;

    if (idpresupuesto) {
      // Obtener todos los egresos existentes de este presupuesto
      const egresosExistentes = await Egreso.findAll({ 
        where: { idpresupuesto },
        order: [['idegreso', 'ASC']]
      });

      console.log(`   📋 Encontrados ${egresosExistentes.length} egresos existentes`);

      // Actualizar cada egreso existente con los campos _real
      for (let i = 0; i < egresosExistentes.length; i++) {
        const egresoDB = egresosExistentes[i];
        const egresoForm = egresosArr[i];

        if (egresoForm) {
          await egresoDB.update({
            descripcion_real: egresoForm.descripcion || null,
            cantidad_real: parseInt(egresoForm.cantidad) || 0,
            precio_unitario_real: parseFloat(egresoForm.precio_unitario) || 0,
            total_real: parseFloat(egresoForm.total) || 0,
          });
          console.log(`   ✅ Egreso ${egresoDB.idegreso} actualizado`);
        }
      }

      // Si hay más egresos en el formulario que en la BD, crearlos
      for (let i = egresosExistentes.length; i < egresosArr.length; i++) {
        const egresoForm = egresosArr[i];
        if (egresoForm && (egresoForm.descripcion || egresoForm.total)) {
          await Egreso.create({
            idpresupuesto: idpresupuesto,
            descripcion: egresoForm.descripcion || null,
            cantidad: parseInt(egresoForm.cantidad) || 0,
            precio_unitario: parseFloat(egresoForm.precio_unitario) || 0,
            total: parseFloat(egresoForm.total) || 0,
            descripcion_real: egresoForm.descripcion || null,
            cantidad_real: parseInt(egresoForm.cantidad) || 0,
            precio_unitario_real: parseFloat(egresoForm.precio_unitario) || 0,
            total_real: parseFloat(egresoForm.total) || 0,
          });
          console.log(`   ➕ Egreso nuevo creado`);
        }
      }
    }

    // 4. 🔄 ACTUALIZAR INGRESOS (conservando datos originales)
    console.log(`💵 Actualizando ${ingresosArr.length} ingresos con datos reales...`);

    if (idpresupuesto) {
      // Obtener todos los ingresos existentes de este presupuesto
      const ingresosExistentes = await Ingreso.findAll({ 
        where: { idpresupuesto },
        order: [['idingreso', 'ASC']]
      });

      console.log(`   📋 Encontrados ${ingresosExistentes.length} ingresos existentes`);

      // Actualizar cada ingreso existente con los campos _real
      for (let i = 0; i < ingresosExistentes.length; i++) {
        const ingresoDB = ingresosExistentes[i];
        const ingresoForm = ingresosArr[i];

        if (ingresoForm) {
          await ingresoDB.update({
            descripcion_real: ingresoForm.descripcion || null,
            cantidad_real: parseInt(ingresoForm.cantidad) || 0,
            precio_unitario_real: parseFloat(ingresoForm.precio_unitario) || 0,
            total_real: parseFloat(ingresoForm.total) || 0,
          });
          console.log(`   ✅ Ingreso ${ingresoDB.idingreso} actualizado`);
        }
      }

      // Si hay más ingresos en el formulario que en la BD, crearlos
      for (let i = ingresosExistentes.length; i < ingresosArr.length; i++) {
        const ingresoForm = ingresosArr[i];
        if (ingresoForm && (ingresoForm.descripcion || ingresoForm.total)) {
          await Ingreso.create({
            idpresupuesto: idpresupuesto,
            descripcion: ingresoForm.descripcion || null,
            cantidad: parseInt(ingresoForm.cantidad) || 0,
            precio_unitario: parseFloat(ingresoForm.precio_unitario) || 0,
            total: parseFloat(ingresoForm.total) || 0,
            descripcion_real: ingresoForm.descripcion || null,
            cantidad_real: parseInt(ingresoForm.cantidad) || 0,
            precio_unitario_real: parseFloat(ingresoForm.precio_unitario) || 0,
            total_real: parseFloat(ingresoForm.total) || 0,
          });
          console.log(`   ➕ Ingreso nuevo creado`);
        }
      }
    }

    console.log('✅ [guardarInformeEvento] Todo guardado con éxito');
    return res.json({ 
      message: creado ? 'Informe creado correctamente' : 'Informe actualizado correctamente', 
      informe 
    });
  } catch (error) {
    console.error('❌ ERROR CRÍTICO en guardarInformeEvento:', error.message);
    console.error('Stack:', error.stack);
    return res.status(500).json({ message: 'Error interno al guardar', error: error.message });
  }
};

module.exports = { getInformeEvento, guardarInformeEvento };