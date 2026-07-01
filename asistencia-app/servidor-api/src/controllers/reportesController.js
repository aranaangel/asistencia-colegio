const supabase = require('../config/supabase');

// 1. Asistencias por Grado (Con total de alumnos y cálculo de ausentes)
exports.obtenerAsistenciasPorGrado = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    
    let queryAsistencias = supabase
      .from('registros')
      .select('estudiante:estudiantes (grado)')
      .eq('tipo_movimiento', 'entrada');
    if (fecha_inicio && fecha_fin) {
      queryAsistencias = queryAsistencias.gte('fecha', fecha_inicio).lte('fecha', fecha_fin);
    }
    const { data: asistenciasData, error } = await queryAsistencias;

    if (error) {
      console.error('Error en reporte asistencias:', error);
      return res.status(500).json({ exito: false, error: 'Error al generar reporte' });
    }

    const { data: estudiantesData, error: errEst } = await supabase
      .from('estudiantes')
      .select('grado');

    if (errEst) {
      console.error('Error al obtener total de estudiantes:', errEst);
      return res.status(500).json({ exito: false, error: 'Error al obtener total de estudiantes' });
    }

    const asistenciasPorGrado = {};
    asistenciasData.forEach(item => {
      const grado = item.estudiante.grado;
      asistenciasPorGrado[grado] = (asistenciasPorGrado[grado] || 0) + 1;
    });

    const totalPorGrado = {};
    estudiantesData.forEach(item => {
      const grado = item.grado;
      totalPorGrado[grado] = (totalPorGrado[grado] || 0) + 1;
    });

    const resultado = Object.keys(totalPorGrado).map(grado => ({
      grado,
      total_estudiantes: totalPorGrado[grado],
      asistencias: asistenciasPorGrado[grado] || 0,
      ausencias: totalPorGrado[grado] - (asistenciasPorGrado[grado] || 0)
    }));

    res.json({ exito: true, data: resultado });
  } catch (error) {
    console.error('Error en asistencias-por-grado:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 2. Ranking Mensual
exports.obtenerRankingEntradaSalida = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Debe enviar mes y anio' });

    const inicioMes = `${anio}-${String(mes).padStart(2, '0')}-01`;
    const lastDay = new Date(anio, mes, 0).getDate();
    const finMes = `${anio}-${String(mes).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    const { data: entradas } = await supabase
      .from('registros')
      .select('estudiante_username, hora, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes).lte('fecha', finMes);

    const { data: salidas } = await supabase
      .from('registros')
      .select('estudiante_username, hora, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'salida')
      .gte('fecha', inicioMes).lte('fecha', finMes);

    const calcularPromedios = (registros, tipo) => {
      const agrupados = {};
      (registros || []).forEach(r => {
        if (!r.estudiante) return;
        const key = r.estudiante_username;
        if (!agrupados[key]) {
          agrupados[key] = { 
            nombre: `${r.estudiante.nombres} ${r.estudiante.apellidos}`, 
            codigo: r.estudiante_username, 
            grado: r.estudiante.grado, 
            sumaMinutos: 0, 
            count: 0 
          };
        }
        const [h, m] = r.hora.split(':').map(Number);
        agrupados[key].sumaMinutos += (h * 60 + m);
        agrupados[key].count++;
      });

      let resultado = Object.values(agrupados).map(item => {
        const avgMin = Math.round(item.sumaMinutos / item.count);
        const horas = Math.floor(avgMin / 60);
        const minutos = avgMin % 60;
        return {
          nombre: item.nombre,
          codigo: item.codigo,
          grado: item.grado,
          hora: `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`
        };
      });

      if (tipo === 'entrada') {
        resultado.sort((a, b) => a.hora.localeCompare(b.hora));
      } else {
        resultado.sort((a, b) => b.hora.localeCompare(a.hora));
      }
      return resultado.slice(0, 10);
    };

    res.json({
      exito: true,
      primeros_en_entrar: calcularPromedios(entradas, 'entrada'),
      ultimos_en_salir: calcularPromedios(salidas, 'salida')
    });

  } catch (error) {
    console.error('Error en ranking:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
};

// 3. Ranking Diario
exports.obtenerRankingDiario = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });

    const { data: entradas } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'entrada').eq('fecha', fecha)
      .order('hora', { ascending: true });

    const { data: salidas } = await supabase
      .from('registros')
      .select('estudiante_username, hora, fecha, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'salida').eq('fecha', fecha)
      .order('hora', { ascending: false });

    res.json({
      exito: true,
      primeros_en_entrar: (entradas || []).slice(0, 10).map(e => ({ 
        nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`, 
        codigo: e.estudiante_username, grado: e.estudiante.grado, hora: e.hora, fecha: e.fecha 
      })),
      ultimos_en_salir: (salidas || []).slice(0, 10).map(e => ({ 
        nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`, 
        codigo: e.estudiante_username, grado: e.estudiante.grado, hora: e.hora, fecha: e.fecha 
      }))
    });
  } catch (error) {
    console.error('Error en ranking-diario:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
};

// 4. Alumnos Ausentes
exports.obtenerAlumnosAusentes = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });

    const { data: todosEstudiantes } = await supabase.from('estudiantes').select('username, nombres, apellidos, grado');
    const { data: entradas } = await supabase
      .from('registros').select('estudiante_username')
      .eq('tipo_movimiento', 'entrada').eq('fecha', fecha);

    const usernamesQueEntraron = new Set((entradas || []).map(e => e.estudiante_username));
    const ausentes = (todosEstudiantes || [])
      .filter(est => !usernamesQueEntraron.has(est.username))
      .map(est => ({ codigo: est.username, nombre: `${est.nombres} ${est.apellidos}`, grado: est.grado }));

    res.json({ exito: true, fecha, total_estudiantes: todosEstudiantes.length, total_ausentes: ausentes.length, listado_ausentes: ausentes });
  } catch (error) {
    console.error('Error en alumnos-ausentes:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 5. Ausencias por Día
exports.obtenerAusenciasPorDia = async (req, res) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return res.status(400).json({ exito: false, error: 'Debe enviar fecha_inicio y fecha_fin' });

    const { count: totalEstudiantes } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true });
    const { data: asistencias } = await supabase
      .from('registros').select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', fecha_inicio).lte('fecha', fecha_fin);

    const asistenciasPorDia = {};
    (asistencias || []).forEach(reg => {
      if (!asistenciasPorDia[reg.fecha]) asistenciasPorDia[reg.fecha] = new Set();
      asistenciasPorDia[reg.fecha].add(reg.estudiante_username);
    });

    const reporteDia = [];
    for (const fecha in asistenciasPorDia) {
      const presentes = asistenciasPorDia[fecha].size;
      reporteDia.push({ fecha, total_estudiantes: totalEstudiantes, presentes, ausentes: totalEstudiantes - presentes });
    }
    res.json({ exito: true, reporte_por_dia: reporteDia });
  } catch (error) {
    console.error('Error en ausencias-por-dia:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 6. Ausencias por Mes
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

    const { data: estudiantes } = await supabase.from('estudiantes').select('username, grado, nombres, apellidos');
    const { data: asistenciasMes } = await supabase
      .from('registros').select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes.toISOString().split('T')[0])
      .lte('fecha', finMes.toISOString().split('T')[0]);

    const asistenciasPorAlumno = {};
    (asistenciasMes || []).forEach(r => {
      const key = r.estudiante_username;
      if (!asistenciasPorAlumno[key]) asistenciasPorAlumno[key] = new Set();
      asistenciasPorAlumno[key].add(r.fecha);
    });

    const resultados = (estudiantes || []).map(est => {
      const asistencias = asistenciasPorAlumno[est.username]?.size || 0;
      return { codigo: est.username, nombre: `${est.nombres} ${est.apellidos}`, grado: est.grado, total_dias_habiles: diasHabiles, asistencias, ausencias: diasHabiles - asistencias };
    });

    res.json({ exito: true, mes, anio, dias_habiles: diasHabiles, detalle_alumnos: resultados });
  } catch (error) {
    console.error('Error en ausencias-por-mes:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 7. Promedio Asistencia
exports.obtenerPromedioAsistencia = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Faltan mes y anio' });

    const inicioMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
    const finMes = new Date(anio, mes, 0).toISOString().split('T')[0];

    const { count: totalAlumnos } = await supabase.from('estudiantes').select('*', { count: 'exact', head: true });
    const { data: entradas } = await supabase
      .from('registros').select('fecha, estudiante_username')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes).lte('fecha', finMes);

    const asistenciasPorDia = {};
    (entradas || []).forEach(r => {
      if (!asistenciasPorDia[r.fecha]) asistenciasPorDia[r.fecha] = new Set();
      asistenciasPorDia[r.fecha].add(r.estudiante_username);
    });

    const totalAsistenciasGlobal = Object.values(asistenciasPorDia).reduce((sum, set) => sum + set.size, 0);
    const promedio = totalAsistenciasGlobal / (totalAlumnos * Object.keys(asistenciasPorDia).length || 1);
    res.json({ exito: true, total_alumnos: totalAlumnos, dias_con_marcaje: Object.keys(asistenciasPorDia).length, promedio_asistencia_global: parseFloat(promedio.toFixed(2)) });
  } catch (error) {
    console.error('Error en promedio-asistencia:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 8. Tiempo Promedio Entrada
exports.obtenerTiempoPromedioEntrada = async (req, res) => {
  try {
    const { mes, anio } = req.query;
    if (!mes || !anio) return res.status(400).json({ exito: false, error: 'Faltan mes y anio' });

    const inicioMes = new Date(anio, mes - 1, 1).toISOString().split('T')[0];
    const finMes = new Date(anio, mes, 0).toISOString().split('T')[0];

    const { data: entradas } = await supabase
      .from('registros').select('hora')
      .eq('tipo_movimiento', 'entrada')
      .gte('fecha', inicioMes).lte('fecha', finMes);

    if (!entradas || entradas.length === 0) return res.json({ exito: true, promedio_entrada: 'Sin registros', total_entradas: 0 });

    let totalMinutos = 0;
    entradas.forEach(e => {
      const [h, m] = e.hora.split(':').map(Number);
      totalMinutos += (h * 60 + m);
    });
    const promedioMinutos = Math.floor(totalMinutos / entradas.length);
    const promHoras = Math.floor(promedioMinutos / 60);
    const promMinutos = promedioMinutos % 60;
    const horaPromedio = `${String(promHoras).padStart(2, '0')}:${String(promMinutos).padStart(2, '0')}`;

    res.json({ exito: true, total_entradas_procesadas: entradas.length, tiempo_promedio_entrada: horaPromedio });
  } catch (error) {
    console.error('Error en tiempo-promedio-entrada:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 9. Actividad de Maestros
exports.obtenerActividadMaestros = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });

    const { data, error } = await supabase
      .from('registros')
      .select(`
        maestro:maestro_id (id, nombres, apellidos, username),
        tipo_movimiento
      `)
      .eq('fecha', fecha);

    if (error) {
      console.error('Error en actividad-maestros:', error);
      return res.status(500).json({ exito: false, error: 'Error al obtener datos de maestros' });
    }

    const actividad = {};
    (data || []).forEach(reg => {
      if (!reg.maestro) return;
      const id = reg.maestro.id;
      if (!actividad[id]) {
        actividad[id] = {
          id: id,
          nombre: `${reg.maestro.nombres} ${reg.maestro.apellidos}`,
          username: reg.maestro.username,
          entradas: 0,
          salidas: 0
        };
      }
      if (reg.tipo_movimiento === 'entrada') actividad[id].entradas++;
      if (reg.tipo_movimiento === 'salida') actividad[id].salidas++;
    });

    res.json({ exito: true, fecha: fecha, actividad: Object.values(actividad) });
  } catch (error) {
    console.error('Error en actividad-maestros:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};

// 🔴 NUEVO ENDPOINT: 10. Entradas Tarde (Después de las 7am)
exports.obtenerEntradasTarde = async (req, res) => {
  try {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ exito: false, error: 'Debe enviar una fecha' });

    const { data, error } = await supabase
      .from('registros')
      .select('estudiante_username, hora, estudiante:estudiantes (nombres, apellidos, grado)')
      .eq('tipo_movimiento', 'entrada')
      .eq('fecha', fecha)
      .gte('hora', '07:00:00') // 🔴 Incluye a partir de las 7:00 AM
      .order('hora', { ascending: true });

    if (error) {
      console.error('Error al obtener entradas tarde:', error);
      return res.status(500).json({ exito: false, error: 'Error al obtener entradas tarde' });
    }

    const resultado = data.map(e => ({
      nombre: `${e.estudiante.nombres} ${e.estudiante.apellidos}`,
      codigo: e.estudiante_username,
      grado: e.estudiante.grado,
      hora: e.hora.slice(0, 5) // Solo HH:MM
    }));

    res.json({ exito: true, data: resultado });
  } catch (error) {
    console.error('Error en entradas-tarde:', error);
    res.status(500).json({ exito: false, error: 'Error interno' });
  }
};