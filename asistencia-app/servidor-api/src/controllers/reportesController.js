const supabase = require('../config/supabase');

// 1. Asistencias por Grado
exports.obtenerAsistenciasPorGrado = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;

    let query = supabase
      .from('registros')
      .select('estudiante:estudiantes (grado)')
      .eq('tipo_movimiento', 'entrada');

    if (fecha_inicio && fecha_fin) {
      query = query.gte('fecha', fecha_inicio).lte('fecha', fecha_fin);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error en reporte:', error);
      return res.status(500).json({ exito: false, error: 'Error al generar reporte' });
    }

    const conteoPorGrado = {};
    data.forEach(item => {
      const grado = item.estudiante.grado;
      conteoPorGrado[grado] = (conteoPorGrado[grado] || 0) + 1;
    });

    res.json({
      exito: true,
      total_asistencias: data.length,
      por_grado: conteoPorGrado
    });

  } catch (error) {
    console.error('Error en asistencias-por-grado:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 2. Primeros 10 en entrar y Últimos 10 en salir (MENSUAL)
exports.obtenerRankingEntradaSalida = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) {
      return res.status(400).json({ exito: false, error: 'Debe enviar mes y anio (Ej: mes=6&anio=2026)' });
    }

    const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const lastDay = new Date(anio, mes, 0).getDate();
    const finMes = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data: entradas, error: err1 } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('hora', { ascending: true });

    const { data: salidas, error: err2 } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'salida')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('hora', { ascending: false });

    if (err1 || err2) {
      console.error("❌ Error en consulta de Supabase (Entradas):", err1);
      console.error("❌ Error en consulta de Supabase (Salidas):", err2);
      return res.status(500).json({ exito: false, error: 'Error al obtener datos de la base de datos' });
    }

    const primeros10Entrada = entradas.slice(0, 10).map(e => ({
      nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`,
      codigo: e.estudiante_username,
      grado: e.estudiante.grado,
      hora: e.hora,
      fecha: e.fecha
    }));

    const ultimos10Salida = salidas.slice(0, 10).map(e => ({
      nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`,
      codigo: e.estudiante_username,
      grado: e.estudiante.grado,
      hora: e.hora,
      fecha: e.fecha
    }));

    res.json({
      exito: true,
      primeros_en_entrar: primeros10Entrada,
      ultimos_en_salir: ultimos10Salida
    });

  } catch (error) {
    console.error('Error en ranking:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
};

// 3. Ranking DIARIO (Entradas y Salidas del día)
exports.obtenerRankingDiario = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });
    }

    // 🔴 CONSULTA DE ENTRADAS DEL DÍA
    const { data: entradas, error: err1 } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'entrada')
      .eq('fecha', fecha)
      .order('hora', { ascending: true });

    // 🔴 CONSULTA DE SALIDAS DEL DÍA
    const { data: salidas, error: err2 } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'salida')
      .eq('fecha', fecha)
      .order('hora', { ascending: false }); // Orden descendente para obtener los últimos en salir

    if (err1 || err2) {
      console.error("❌ Error en consulta de Supabase (Entradas Diarias):", err1);
      console.error("❌ Error en consulta de Supabase (Salidas Diarias):", err2);
      return res.status(500).json({ exito: false, error: 'Error al obtener datos del día' });
    }

    const primeros10Entrada = entradas.slice(0, 10).map(e => ({
      nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`,
      codigo: e.estudiante_username,
      grado: e.estudiante.grado,
      hora: e.hora,
      fecha: e.fecha
    }));

    const ultimos10Salida = salidas.slice(0, 10).map(e => ({
      nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`,
      codigo: e.estudiante_username,
      grado: e.estudiante.grado,
      hora: e.hora,
      fecha: e.fecha
    }));

    res.json({
      exito: true,
      primeros_en_entrar: primeros10Entrada,
      ultimos_en_salir: ultimos10Salida // 🔴 NUEVO CAMPO DEVUELTO
    });

  } catch (error) {
    console.error('Error en ranking-diario:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
};

// 4. ESTUDIANTES AUSENTES EN UN DÍA
exports.obtenerAlumnosAusentes = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) {
      return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });
    }

    const { data: todosEstudiantes, error: err1 } = await supabase
      .from('estudiantes')
      .select('username, nombres, apellidos, grado');

    const { data: entradas, error: err2 } = await supabase
      .from('registros')
      .select('estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .eq('fecha', fecha);

    if (err1 || err2) {
      return res.status(500).json({ exito: false, error: 'Error al obtener datos' });
    }

    const usernamesQueEntraron = new Set(entradas.map(e => e.estudiante_username));

    const ausentes = todosEstudiantes
      .filter(est => !usernamesQueEntraron.has(est.username))
      .map(est => ({
        codigo: est.username,
        nombre: `${est.nombres} ${est.apellidos}`,
        grado: est.grado
      }));

    res.json({
      exito: true,
      fecha: fecha,
      total_estudiantes: todosEstudiantes.length,
      total_ausentes: ausentes.length,
      listado_ausentes: ausentes
    });

  } catch (error) {
    console.error('Error en alumnos-ausentes:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 5. AUSENCIAS POR DÍA
exports.obtenerAusenciasPorDia = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) {
      return res.status(400).json({ exito: false, error: 'Debe enviar fecha_inicio y fecha_fin' });
    }

    const { count: totalEstudiantes } = await supabase
      .from('estudiantes')
      .select('*', { count: 'exact', head: true });

    const { data: asistencias, error } = await supabase
      .from('registros')
      .select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', fecha_inicio)
      .lte('fecha', fecha_fin);

    if (error) return res.status(500).json({ exito: false, error: 'Error en consulta' });

    const asistenciasPorDia = {};
    asistencias.forEach(reg => {
      if (!asistenciasPorDia[reg.fecha]) {
        asistenciasPorDia[reg.fecha] = new Set();
      }
      asistenciasPorDia[reg.fecha].add(reg.estudiante_username);
    });

    const reporteDia = [];
    for (const fecha in asistenciasPorDia) {
      const estudiantesQueFueron = asistenciasPorDia[fecha].size;
      reporteDia.push({
        fecha: fecha,
        total_estudiantes: totalEstudiantes,
        presentes: estudiantesQueFueron,
        ausentes: totalEstudiantes - estudiantesQueFueron
      });
    }

    res.json({ exito: true, reporte_por_dia: reporteDia });
  } catch (error) {
    console.error('Error en ausencias-por-dia:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 6. AUSENCIAS POR MES
exports.obtenerAusenciasPorMes = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Faltan mes y anio' });

    const inicioMes = new Date(anio, mes - 1, 1);
    const finMes = new Date(anio, mes, 0);
    let diasHabiles = 0;
    let diaIter = new Date(inicioMes);
    while (diaIter <= finMes) {
      if (diaIter.getDay() !== 0 && diaIter.getDay() !== 6) diasHabiles++;
      diaIter.setDate(diaIter.getDate() + 1);
    }

    const { data: estudiantes, error: err1 } = await supabase
      .from('estudiantes')
      .select('username, grado, nombres, apellidos');

    const { data: asistenciasMes, error: err2 } = await supabase
      .from('registros')
      .select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes.toISOString().split('T')[0])
      .lte('fecha', finMes.toISOString().split('T')[0]);

    if (err1 || err2) return res.status(500).json({ exito: false, error: 'Error en datos' });

    const asistenciasPorAlumno = {};
    asistenciasMes.forEach(r => {
      const key = r.estudiante_username;
      if (!asistenciasPorAlumno[key]) asistenciasPorAlumno[key] = new Set();
      asistenciasPorAlumno[key].add(r.fecha);
    });

    const resultados = estudiantes.map(est => {
      const asistencias = asistenciasPorAlumno[est.username]?.size || 0;
      return {
        codigo: est.username,
        nombre: `${est.nombres} ${est.apellidos}`,
        grado: est.grado,
        total_dias_habiles: diasHabiles,
        asistencias: asistencias,
        ausencias: diasHabiles - asistencias
      };
    });

    res.json({ exito: true, mes: mes, anio: anio, dias_habiles: diasHabiles, detalle_alumnos: resultados });
  } catch (error) {
    console.error('Error en ausencias-por-mes:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 7. PROMEDIO DE ASISTENCIA GENERAL
exports.obtenerPromedioAsistencia = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Faltan mes y anio' });

    const inicioMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
    const finMes = new Date(anio, mes, 0).toISOString().split('T')[0];

    const { count: totalAlumnos } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true });
    const { data: entradas, error } = await supabase
      .from('registros')
      .select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes);

    if (error) return res.status(500).json({ exito: false, error: 'Error en datos' });

    const asistenciasPorDia = {};
    entradas.forEach(r => {
      if (!asistenciasPorDia[r.fecha]) asistenciasPorDia[r.fecha] = new Set();
      asistenciasPorDia[r.fecha].add(r.estudiante_username);
    });

    const totalAsistenciasGlobal = Object.values(asistenciasPorDia).reduce((sum, set) => sum + set.size, 0);
    const promedio = totalAsistenciasGlobal / (totalAlumnos * Object.keys(asistenciasPorDia).length || 1);

    res.json({
      exito: true,
      total_alumnos: totalAlumnos,
      dias_con_marcaje: Object.keys(asistenciasPorDia).length,
      promedio_asistencia_global: parseFloat(promedio.toFixed(2))
    });
  } catch (error) {
    console.error('Error en promedio-asistencia:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 8. TIEMPO PROMEDIO DE ENTRADA
exports.obtenerTiempoPromedioEntrada = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Faltan mes y anio' });

    const inicioMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
    const finMes = new Date(anio, mes, 0).toISOString().split('T')[0];

    const { data: entradas, error } = await supabase
      .from('registros')
      .select('hora')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes)
      .lte('fecha', finMes);

    if (error) return res.status(500).json({ exito: false, error: 'Error al obtener horas' });

    if (entradas.length === 0) {
      return res.json({ exito: true, promedio_entrada: 'Sin registros', total_entradas: 0 });
    }

    let totalMinutos = 0;
    entradas.forEach(e => {
      const [h, m] = e.hora.split(':').map(Number);
      totalMinutos += (h * 60 + m);
    });

    const promedioMinutos = Math.floor(totalMinutos / entradas.length);
    const promHoras = Math.floor(promedioMinutos / 60);
    const promMinutos = promedioMinutos % 60;

    const horaPromedio = `${String(promHoras).padStart(2, '0')}:${String(promMinutos).padStart(2, '0')}`;

    res.json({
      exito: true,
      total_entradas_procesadas: entradas.length,
      tiempo_promedio_entrada: horaPromedio
    });
  } catch (error) {
    console.error('Error en tiempo-promedio-entrada:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};