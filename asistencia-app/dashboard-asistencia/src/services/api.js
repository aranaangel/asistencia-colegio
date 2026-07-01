import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
});

// Reportes
export const getAsistenciasPorGrado = (fecha_inicio, fecha_fin) => 
  api.get('/reportes/asistencias-por-grado', { params: { fecha_inicio, fecha_fin } });

export const getRanking = (mes, anio) => 
  api.get('/reportes/ranking-entrada-salida', { params: { mes, anio } });

export const getRankingDiario = (fecha) => 
  api.get('/reportes/ranking-diario', { params: { fecha } });

export const getAusentes = (fecha) => 
  api.get('/reportes/alumnos-ausentes', { params: { fecha } });

export const getAusenciasPorDia = (fecha_inicio, fecha_fin) => 
  api.get('/reportes/ausencias-por-dia', { params: { fecha_inicio, fecha_fin } });

export const getAusenciasPorMes = (mes, anio) => 
  api.get('/reportes/ausencias-por-mes', { params: { mes, anio } });

export const getPromedioAsistencia = (mes, anio) => 
  api.get('/reportes/promedio-asistencia', { params: { mes, anio } });

export const getTiempoPromedioEntrada = (mes, anio) => 
  api.get('/reportes/tiempo-promedio-entrada', { params: { mes, anio } });

// 🔴 NUEVA LLAMADA PARA ACTIVIDAD DE MAESTROS
export const getActividadMaestros = (fecha) => 
  api.get('/reportes/actividad-maestros', { params: { fecha } });
export const getEntradasTarde = (fecha) => 
  api.get('/reportes/entradas-tarde', { params: { fecha } });
export default api;