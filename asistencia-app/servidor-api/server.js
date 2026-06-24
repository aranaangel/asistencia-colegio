// ============ IMPORTACIONES ============
require('dotenv').config(); // Cargar variables de .env
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

// ============ CONFIGURACIÓN ============
const app = express();
const PORT = process.env.PORT || 3000;

// Conectar con Supabase (NO pongas /rest/v1 al final de la URL)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Middleware
app.use(cors());
app.use(express.json());

// ============ RUTAS / ENDPOINTS ============

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

// 3. VALIDAR QR - Verificar que el código del estudiante sea válido
app.post('/api/validar-qr', async (req, res) => {
  try {
    const { codigo } = req.body;

    if (!codigo) {
      return res.status(400).json({
        exito: false,
        error: 'Código requerido',
      });
    }

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
      return res.json({
        exito: false,
        valido: false,
        error: 'Código QR no válido',
      });
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
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
    });
  }
});

// 4. REGISTRAR ASISTENCIA - Entrada o Salida (Con validación de duplas robusta)
app.post('/api/registrar-asistencia', async (req, res) => {
  try {
    const { estudiante_codigo, tipo_movimiento, maestro_id } = req.body;

    // Validaciones
    if (!estudiante_codigo || !tipo_movimiento || !maestro_id) {
      return res.status(400).json({
        exito: false,
        error: 'Faltan datos: codigo, tipo y maestro_id',
      });
    }

    if (tipo_movimiento !== 'entrada' && tipo_movimiento !== 'salida') {
      return res.status(400).json({
        exito: false,
        error: 'Tipo debe ser "entrada" o "salida"',
      });
    }

    // 1. Buscar al estudiante
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
      return res.status(404).json({
        exito: false,
        error: 'Estudiante no encontrado',
      });
    }

    // 2. Obtener fecha y hora actual
    const ahora = new Date();
    const fecha = ahora.toISOString().split('T')[0]; // YYYY-MM-DD
    const hora = ahora.toTimeString().split(' ')[0]; // HH:MM:SS

    // ==========================================
    // 🟢 3. VALIDACIÓN DE SECUENCIA LÓGICA (CORREGIDA SIN .maybe())
    // ==========================================
    const { data: registrosPrevios, error: errorRegistroPrev } = await supabase
      .from('registros')
      .select('*')
      .eq('estudiante_username', estudiante.username)
      .eq('fecha', fecha)
      .order('created_at', { ascending: false })
      .limit(1);

    // Obtenemos el tipo de movimiento del último registro (si existe)
    let ultimoMovimiento = null;
    if (!errorRegistroPrev && registrosPrevios && registrosPrevios.length > 0) {
      ultimoMovimiento = registrosPrevios[0].tipo_movimiento;
    }

    // A. Si no hay registro previo en el día, y es SALIDA -> Rechazar
    if (!ultimoMovimiento && tipo_movimiento === 'salida') {
      return res.status(400).json({
        exito: false,
        error: 'El día debe comenzar con ENTRADA. No se puede registrar una SALIDA sin una entrada previa.',
      });
    }

    // B. Si el movimiento actual es IGUAL al anterior -> Rechazar
    if (ultimoMovimiento === tipo_movimiento) {
      const siguienteMovimiento = tipo_movimiento === 'entrada' ? 'una SALIDA' : 'una ENTRADA';
      return res.status(400).json({
        exito: false,
        error: `Movimiento inválido. No pueden haber dos ${tipo_movimiento.toUpperCase()} consecutivos. Debe registrarse ${siguienteMovimiento}.`,
      });
    }
    // ==========================================
    // 🟢 FIN DE NUEVA VALIDACIÓN
    // ==========================================

    // 4. Insertar registro en Supabase
    const { data: nuevoRegistro, error: errorRegistro } = await supabase
      .from('registros')
      .insert([
        {
          tipo_movimiento: tipo_movimiento,
          fecha: fecha,
          hora: hora,
          maestro_id: maestro_id,
          sincronizado: true,
          estudiante_username: estudiante.username
        },
      ])
      .select();

    if (errorRegistro) {
      console.error('❌ ERROR DE SUPABASE AL INSERTAR EN REGISTROS:', errorRegistro);
      return res.status(500).json({
        exito: false,
        error: `Error de Supabase: ${errorRegistro.message || errorRegistro.error || 'Error al registrar asistencia'}`,
      });
    }

    // 5. Respuesta exitosa
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
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
    });
  }
});

// 5. OBTENER HISTORIAL
app.get('/api/historial', async (req, res) => {
  try {
    const { fecha, grado, maestro_id } = req.query;

    let query = supabase
      .from('registros')
      .select(`
        id_registro,
        tipo_movimiento,
        fecha,
        hora,
        sincronizado,
        maestro:maestro_id (id, username, nombres, apellidos),
        estudiante:estudiantes (username, nombres, apellidos, grado)
      `)
      .order('created_at', { ascending: false });

    if (fecha) query = query.eq('fecha', fecha);
    if (grado) query = query.eq('estudiante.grado', grado);
    if (maestro_id) query = query.eq('maestro_id', maestro_id);

    const { data: registros, error } = await query.limit(100);

    if (error) {
      console.error('Error al obtener historial:', error);
      return res.status(500).json({
        exito: false,
        error: 'Error al obtener historial',
      });
    }

    res.json({
      exito: true,
      total: registros.length,
      registros: registros,
    });

  } catch (error) {
    console.error('Error en historial:', error);
    res.status(500).json({
      exito: false,
      error: 'Error interno del servidor',
    });
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
📡 CORS habilitado para React Native

Endpoints disponibles:
  GET  /                          (Verificar servidor)
  POST /api/login                 (Autenticar maestro)
  POST /api/registrar-asistencia  (Registrar entrada/salida)
  POST /api/validar-qr            (Validar código QR)
  GET  /api/historial             (Obtener registros)
  `);
});