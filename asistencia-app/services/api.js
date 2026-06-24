// ============ CONFIGURACIÓN DEL SERVIDOR ============
const API_BASE_URL = 'http://192.168.0.105:3000'; // Cambiar por tu IP de la VM

// ============ FUNCIONES DE API ============

/**
 * 1. LOGIN - Autenticar maestro
 */
export const loginMaestro = async (username, password) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        password,
      }),
    });

    const data = await response.json();

    if (!data.exito) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    return data.maestro;
  } catch (error) {
    console.error('❌ Error en loginMaestro:', error);
    throw error;
  }
};

/**
 * 2. VALIDAR QR
 */
export const validarQR = async (codigo) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/validar-qr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        codigo,
      }),
    });

    const data = await response.json();

    if (!data.valido) {
      throw new Error(data.error || 'QR no válido');
    }

    return data.datos;
  } catch (error) {
    console.error('❌ Error en validarQR:', error);
    throw error;
  }
};

/**
 * 3. REGISTRAR ASISTENCIA
 */
export const registrarAsistencia = async (
  estudiante_codigo,
  tipo_movimiento,
  maestro_id
) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/registrar-asistencia`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        estudiante_codigo,
        tipo_movimiento,
        maestro_id,
      }),
    });

    const data = await response.json();

    if (!data.exito) {
      throw new Error(data.error || 'Error al registrar asistencia');
    }

    return data.datos;
  } catch (error) {
    console.error('❌ Error en registrarAsistencia:', error);
    throw error;
  }
};

/**
 * 4. OBTENER HISTORIAL
 */
export const obtenerHistorial = async (fecha = null, grado = null, maestro_id = null) => {
  try {
    let url = `${API_BASE_URL}/api/historial`;
    const params = [];

    if (fecha) params.push(`fecha=${fecha}`);
    if (grado) params.push(`grado=${grado}`);
    if (maestro_id) params.push(`maestro_id=${maestro_id}`);

    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!data.exito) {
      throw new Error(data.error || 'Error al obtener historial');
    }

    return data.registros;
  } catch (error) {
    console.error('❌ Error en obtenerHistorial:', error);
    throw error;
  }
};

/**
 * 5. VERIFICAR CONEXIÓN
 */
export const verificarConexion = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
    });

    return response.ok;
  } catch (error) {
    console.error('❌ No hay conexión al servidor:', error);
    return false;
  }
};