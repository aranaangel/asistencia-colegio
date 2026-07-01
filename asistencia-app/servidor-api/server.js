// ============ IMPORTACIONES ============
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const supabase = require('./src/config/supabase');

// ============ CONFIGURACIÓN ============
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============ RUTAS DE REPORTES (Importadas) ============
const reportesRoutes = require('./src/routes/reportesRoutes');
app.use('/api/reportes', reportesRoutes);

// ============ RUTAS / ENDPOINTS PRINCIPALES ============

// 1. RUTA DE PRUEBA
app.get('/', (req, res) => {
  res.json({
    mensaje: '✅ Servidor funcionando correctamente',
    timestamp: new Date().toISOString(),
  });
});

// 2. LOGIN - Autenticar maestro
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        exito: false,
        error: 'Usuario y contraseña requeridos',
      });
    }

    let maestro;
    try {
      const { data, error } = await supabase
        .from('maestros')
        .select('*')
        .eq('username', username)
        .eq('password', password)
        .single();
      
      if (error) throw error;
      maestro = data;
    } catch (error) {
      return res.status(401).json({
        exito: false,
        error: 'Usuario o contraseña incorrectos',
      });
    }

    // 🔴 LOG DE AUDITORÍA (LOGIN EXITOSO)
    try {
      await supabase.from('auditoria_logs').insert([
        { maestro_id: maestro.id, accion: 'LOGIN', detalles: { username: maestro.username } }
      ]);
    } catch (auditError) {
      console.error('Error guardando auditoría de login:', auditError);
      // No bloqueamos la respuesta si falla la auditoría
    }

    return res.json({
      exito: true,
      mensaje: 'Login exitoso',
      maestro: {
        id: maestro.id,
        username: maestro.username,
        nombres: maestro.nombres,
        apellidos: maestro.apellidos,
        email: maestro.email,
      },
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
    });
  }
});

// 3. VALIDAR QR
app.post('/api/validar-qr', async (req, res) => {
  try {
    const { codigo } = req.body;
    if (!codigo) return res.status(400).json({ exito: false, error: 'Código requerido' });

    let estudiante;
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('username', codigo)
        .single();
      if (error) throw error;
      estudiante = data;
    } catch (error) {
      return res.json({ exito: false, valido: false, error: 'Código QR no válido' });
    }

    res.json({
      exito: true,
      valido: true,
      datos: {
        codigo: estudiante.username,
        nombres: estudiante.nombres,
        apellidos: estudiante.apellidos,
        grado: estudiante.grado,
      },
    });
  } catch (error) {
    console.error('Error en validar-qr:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
});

// 4. REGISTRAR ASISTENCIA
app.post('/api/registrar-asistencia', async (req, res) => {
  try {
    const { estudiante_codigo, tipo_movimiento, maestro_id } = req.body;

    if (!estudiante_codigo || !tipo_movimiento || !maestro_id) {
      return res.status(400).json({ exito: false, error: 'Faltan datos: codigo, tipo y maestro_id' });
    }
    if (tipo_movimiento !== 'entrada' && tipo_movimiento !== 'salida') {
      return res.status(400).json({ exito: false, error: 'Tipo debe ser "entrada" o "salida"' });
    }

    let estudiante;
    try {
      const { data, error } = await supabase
        .from('estudiantes')
        .select('*')
        .eq('username', estudiante_codigo)
        .single();
      if (error) throw error;
      estudiante = data;
    } catch (error) {
      return res.status(404).json({ exito: false, error: 'Estudiante no encontrado' });
    }

    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0];
    const hora = ahora.toTimeString().split(' ')[0];

    // Validación de secuencia (Entrada / Salida alternada)
    const { data: registrosPrevios } = await supabase
      .from('registros')
      .select('*')
      .eq('estudiante_username', estudiante.username)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
      .limit(1);

    let ultimoMovimiento = null;
    if (registrosPrevios && registrosPrevios.length > 0) {
      ultimoMovimiento = registrosPrevios[0].tipo_movimiento;
    }

    if (!ultimoMovimiento && tipo_movimiento === 'salida') {
      return res.status(400).json({ exito: false, error: 'El día debe comenzar con ENTRADA.' });
    }
    if (ultimoMovimiento === tipo_movimiento) {
      const siguienteMovimiento = tipo_movimiento === 'entrada' ? 'una SALIDA' : 'una ENTRADA';
      return res.status(400).json({
        exito: false,
        error: `Movimiento inválido. Debe registrarse ${siguienteMovimiento}.`,
      });
    }

    const { data: nuevoRegistro, error: errorRegistro } = await supabase
      .from('registros')
      .insert([{
        tipo_movimiento: tipo_movimiento,
        fecha: fecha,
        hora: hora,
        maestro_id: maestro_id,
        sincronizado: true,
        estudiante_username: estudiante.username
      }])
      .select();

    if (errorRegistro) {
      console.error('❌ ERROR DE SUPABASE AL INSERTAR EN REGISTROS:', errorRegistro);
      return res.status(500).json({ exito: false, error: 'Error al registrar asistencia' });
    }

    // 🔴 LOG DE AUDITORÍA (REGISTRO ENTRADA/SALIDA)
    try {
      await supabase.from('auditoria_logs').insert([
        { 
          maestro_id: maestro_id, 
          accion: tipo_movimiento === 'entrada' ? 'REGISTRO_ENTRADA' : 'REGISTRO_SALIDA',
          detalles: { estudiante_username: estudiante.username }
        }
      ]);
    } catch (auditError) {
      console.error('Error guardando auditoría de movimiento:', auditError);
    }

    res.json({
      exito: true,
      mensaje: `${tipo_movimiento.toUpperCase()} registrada exitosamente`,
      datos: {
        estudiante_nombre_completo: `${estudiante.nombres} ${estudiante.apellidos}`,
        estudiante_codigo: estudiante.username,
        estudiante_grado: estudiante.grado,
        tipo: tipo_movimiento,
        hora: hora,
        fecha: fecha,
      },
    });

  } catch (error) {
    console.error('Error grave en registrar-asistencia:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
});

// 5. OBTENER HISTORIAL
app.get('/api/historial', async (req, res) => {
  try {
    const { fecha, grado, maestro_id } = req.query;
    let query = supabase
      .from('registros')
      .select(`
        id_registro, tipo_movimiento, fecha, hora, sincronizado,
        maestro:maestro_id (id, username, nombres, apellidos),
        estudiante:estudiantes (username, nombres, apellidos, grado)
      `)
      .order('created_at', { ascending: false });

    if (fecha) query = query.eq('fecha', fecha);
    if (grado) query = query.eq('estudiante.grado', grado);
    if (maestro_id) query = query.eq('maestro_id', maestro_id);

    const { data: registros, error } = await query.limit(100);
    if (error) return res.status(500).json({ exito: false, error: 'Error al obtener historial' });

    res.json({ exito: true, total: registros.length, registros: registros });
  } catch (error) {
    console.error('Error en historial:', error);
    res.status(500).json({ exito: false, error: 'Error interno del servidor' });
  }
});

// ============ INICIAR SERVIDOR ============
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════╗
║   🚀 SERVIDOR CORRIENDO EXITOSO   ║
╚════════════════════════════════════╝
📍 URL: http://localhost:${PORT}
🔌 Conectado a Supabase
  `);
});