const express = require('express');
const router = express.Router();
const reportesController = require('../controllers/reportesController');

router.get('/asistencias-por-grado', reportesController.obtenerAsistenciasPorGrado);
router.get('/ranking-entrada-salida', reportesController.obtenerRankingEntradaSalida);
router.get('/ranking-diario', reportesController.obtenerRankingDiario);
router.get('/alumnos-ausentes', reportesController.obtenerAlumnosAusentes);
router.get('/ausencias-por-dia', reportesController.obtenerAusenciasPorDia);
router.get('/ausencias-por-mes', reportesController.obtenerAusenciasPorMes);
router.get('/promedio-asistencia', reportesController.obtenerPromedioAsistencia);
router.get('/tiempo-promedio-entrada', reportesController.obtenerTiempoPromedioEntrada);
router.get('/actividad-maestros', reportesController.obtenerActividadMaestros);
router.get('/entradas-tarde', reportesController.obtenerEntradasTarde); // 🔴 NUEVA RUTA

module.exports = router;