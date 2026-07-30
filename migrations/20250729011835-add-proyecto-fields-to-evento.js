'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {

    /*await queryInterface.addColumn('evento', 'argumentacion', {
      type: Sequelize.TEXT, // TEXT es ideal para textos largos
      allowNull: true,
    }, { transaction });*/

    await queryInterface.addColumn('evento', 'objetivos', {
      type: Sequelize.JSONB, // JSONB es el tipo correcto para JSON en PostgreSQL
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'objetivos_pdi', {
      type: Sequelize.JSONB,
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'segmento_objetivo', {
      type: Sequelize.JSONB,
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'total_ingresos', {
      type: Sequelize.DECIMAL(10, 2), // Para dinero
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'total_egresos', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'balance', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'ingresos', {
      type: Sequelize.JSONB,
      allowNull: true,
    }, { transaction });

    await queryInterface.addColumn('evento', 'egresos', {
      type: Sequelize.JSONB,
      allowNull: true,
    }, { transaction });

    // --- CORREGIMOS LA COLUMNA 'resultados_esperados' ---
    // 1. Eliminamos la columna vieja e incorrecta 'idresultados_esperados'
    await queryInterface.removeColumn('evento', 'idresultados_esperados', { transaction });

    // 2. Añadimos la columna nueva y correcta 'resultados_esperados'
    await queryInterface.addColumn('evento', 'resultados_esperados', {
      type: Sequelize.JSONB,
      allowNull: true,
    }, { transaction });

    // Si todo sale bien, confirmamos los cambios
    await transaction.commit();

  } catch (err) {
    // Si algo falla, revertimos todo
    await transaction.rollback();
    throw err;
  }
}
export async function down(queryInterface, Sequelize) {
  // 'down' se ejecuta si necesitas revertir la migración.
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.removeColumn('evento', 'argumentacion', { transaction });
    await queryInterface.removeColumn('evento', 'objetivos', { transaction });
    await queryInterface.removeColumn('evento', 'objetivos_pdi', { transaction });
    await queryInterface.removeColumn('evento', 'segmento_objetivo', { transaction });
    await queryInterface.removeColumn('evento', 'total_ingresos', { transaction });
    await queryInterface.removeColumn('evento', 'total_egresos', { transaction });
    await queryInterface.removeColumn('evento', 'balance', { transaction });
    await queryInterface.removeColumn('evento', 'ingresos', { transaction });
    await queryInterface.removeColumn('evento', 'egresos', { transaction });
    await queryInterface.removeColumn('evento', 'resultados_esperados', { transaction });

    // Volvemos a añadir la columna original para que la reversión sea perfecta
    await queryInterface.addColumn('evento', 'idresultados_esperados', {
      type: Sequelize.INTEGER,
      allowNull: true,
    }, { transaction });

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}