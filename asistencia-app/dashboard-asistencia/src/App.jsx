import { useEffect, useState } from 'react';
import ExportModal from './components/ExportModal';
import Header from './components/Header';
import MonthlyExportModal from './components/MonthlyExportModal';
import {
  getActividadMaestros,
  getAsistenciasPorGrado,
  getAusenciasPorMes,
  getAusentes,
  getEntradasTarde,
  getPromedioAsistencia,
  getRanking,
  getRankingDiario,
  getTiempoPromedioEntrada
} from './services/api';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg text-base">
        <p className="font-bold text-gray-800 mb-1 text-lg">{data.grado}</p>
        <div className="space-y-1">
          <p className="text-gray-600">Total alumnos: <span className="font-bold text-gray-800">{data.total_estudiantes}</span></p>
          <p className="text-green-600">Asistencias: <span className="font-bold">{data.asistencias}</span></p>
          <p className="text-red-600 font-medium">Ausentes: <span className="font-bold">{data.ausencias}</span></p>
        </div>
      </div>
    );
  }
  return null;
};

function App() {
  const hoy = new Date();
  const fechaActual = hoy.toISOString().split('T')[0];
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [fechaDiaria, setFechaDiaria] = useState(fechaActual);

  const [mesMensual, setMesMensual] = useState(mesActual);
  const [anioMensual, setAnioMensual] = useState(anioActual);
  const años = Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i);

  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);

  const [diario, setDiario] = useState({
    totalEstudiantes: 0,
    ausentesHoy: 0,
    asistenciasPorGrado: [],
    primeros10EntradaHoy: [],
    ultimos10SalidaHoy: [],
    listaAusentesHoy: [],
  });

  const [actividadMaestros, setActividadMaestros] = useState([]);
  const [entradasTarde, setEntradasTarde] = useState([]);

  const [mensual, setMensual] = useState({
    promedioAsistencia: 0,
    horaPromedio: '--:--',
    recordEntradaMes: [],
    recordSalidaMes: [],
    ausentesPorMes: [], 
  });

  const [cargando, setCargando] = useState(false);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);
      try {
        const [resGrado, resAusentesHoy, resRankingHoy, resActividadMaestros, resEntradasTarde, resPromedio, resHora, resRankingMes, resAusenciasMes] = await Promise.all([
          getAsistenciasPorGrado(fechaDiaria, fechaDiaria),
          getAusentes(fechaDiaria),
          getRankingDiario(fechaDiaria),
          getActividadMaestros(fechaDiaria),
          getEntradasTarde(fechaDiaria),
          getPromedioAsistencia(mesMensual, anioMensual),
          getTiempoPromedioEntrada(mesMensual, anioMensual),
          getRanking(mesMensual, anioMensual),
          getAusenciasPorMes(mesMensual, anioMensual)
        ]);

        const gradosData = resGrado.data.data || [];

        const totalAsistenciasHoy = gradosData.reduce((sum, item) => sum + item.asistencias, 0);
        const primeros10EntradaHoy = totalAsistenciasHoy > 0 ? (resRankingHoy.data.primeros_en_entrar || []) : [];
        const ultimos10SalidaHoy = resRankingHoy.data.ultimos_en_salir || [];

        setDiario({
          totalEstudiantes: resAusentesHoy.data.total_estudiantes,
          ausentesHoy: resAusentesHoy.data.total_ausentes,
          asistenciasPorGrado: gradosData,
          primeros10EntradaHoy: primeros10EntradaHoy, 
          ultimos10SalidaHoy: ultimos10SalidaHoy,
          listaAusentesHoy: resAusentesHoy.data.listado_ausentes || [],
        });

        setActividadMaestros(resActividadMaestros.data.actividad || []);
        setEntradasTarde(resEntradasTarde.data.data || []);

        setMensual({
          promedioAsistencia: resPromedio.data.promedio_asistencia_global || 0,
          horaPromedio: resHora.data.tiempo_promedio_entrada || 'Sin datos',
          recordEntradaMes: resRankingMes.data.primeros_en_entrar || [],
          recordSalidaMes: resRankingMes.data.ultimos_en_salir || [],
          ausentesPorMes: resAusenciasMes.data.detalle_alumnos || [],
        });

      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [fechaDiaria, mesMensual, anioMensual]);

  return (
    <div className="min-h-screen bg-gray-50 pb-10">
      <Header />

      <ExportModal 
        isOpen={isDailyModalOpen} 
        onClose={() => setIsDailyModalOpen(false)} 
        data={diario.listaAusentesHoy}
        fecha={fechaDiaria}
      />
      <MonthlyExportModal
        isOpen={isMonthlyModalOpen}
        onClose={() => setIsMonthlyModalOpen(false)}
        data={mensual.ausentesPorMes}
        mes={mesMensual}
        anio={anioMensual}
      />

      {/* El main ahora usa max-w-[90%] y las fuentes están agrandadas */}
      <main className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {cargando ? (
          <div className="text-center py-20 text-gray-500 font-medium text-xl">
            Cargando datos del panel...
          </div>
        ) : (
          <>
            {/* ========================================= */}
            {/* 1. SECCIÓN REPORTE DIARIO */}
            {/* ========================================= */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-2 gap-4">
                {/* 🔴 TÍTULO PRINCIPAL AUMENTADO A text-3xl (30px) */}
                <h2 className="text-3xl font-bold text-gray-800">📊 Reporte Diario</h2>
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1 px-3 shadow-sm text-base">
                  <label htmlFor="fechaDiaria" className="text-base font-medium text-gray-600">Fecha:</label>
                  <input 
                    type="date" 
                    id="fechaDiaria"
                    value={fechaDiaria}
                    onChange={(e) => setFechaDiaria(e.target.value)}
                    className="bg-transparent text-gray-700 text-base focus:outline-none border-none p-1"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                
                {/* KPIs Diarios */}
                <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    {/* 🔴 ETIQUETAS AUMENTADAS A text-base (16px) */}
                    <p className="text-base text-gray-500 font-medium">Estudiantes totales</p>
                    {/* 🔴 VALORES AUMENTADOS A text-4xl (36px) */}
                    <p className="text-4xl font-bold text-gray-800 mt-2">{diario.totalEstudiantes}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-base text-gray-500 font-medium">Ausentes hoy</p>
                    <p className="text-4xl font-bold text-red-600 mt-2">{diario.ausentesHoy}</p>
                  </div>

                  {/* Actividad Maestros - CORREGIDO PARA MOSTRAR NOMBRE COMPLETO */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-base text-gray-500 font-medium">👨‍🏫 Actividad Maestros</p>
                    <div className="mt-2 space-y-1 max-h-20 overflow-y-auto">
                      {actividadMaestros.length > 0 ? (
                        actividadMaestros.slice(0, 3).map((m, i) => (
                          /* 🔴 CAMBIO: Se eliminó el truncate y max-w-[70px]. Ahora usa flex-1 y gap-2 */
                          <div key={i} className="text-sm flex justify-between items-center border-b border-gray-100 pb-1 last:border-0 gap-2">
                            <span className="font-medium text-gray-700 flex-1 text-2xl">{m.nombre}</span>
                            <span className="text-xs flex gap-1 shrink-0">
                              <span className="bg-green-100 text-green-700  text-2xl px-1 rounded">E:{m.entradas}</span>
                              <span className="bg-orange-100 text-orange-700 text-2xl px-1 rounded">S:{m.salidas}</span>
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 mt-1">Sin actividad hoy.</p>
                      )}
                    </div>
                  </div>
                </section>

                {/* Gráfico Diario */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 w-full">
                  {/* 🔴 TÍTULO DE PANEL A text-2xl (24px) */}
                  <h3 className="text-2xl font-semibold text-gray-800 mb-4">Asistencias - Día Actual ({fechaDiaria})</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diario.asistenciasPorGrado}>
                        <XAxis dataKey="grado" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar dataKey="asistencias" radius={[4, 4, 0, 0]}>
                          {diario.asistenciasPorGrado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* LISTAS DIARIAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  
                  {/* Entradas Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">🕐 Primeros en entrar</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {diario.primeros10EntradaHoy.length > 0 ? (
                        diario.primeros10EntradaHoy.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-base">#{index + 1}</span>
                              <span className="text-base text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-sm text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora.slice(0, 5)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-base text-center py-6">Sin datos hoy.</p>
                      )}
                    </div>
                  </div>

                  {/* Salidas Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">⬇️ Últimos en salir</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {diario.ultimos10SalidaHoy.length > 0 ? (
                        diario.ultimos10SalidaHoy.map((alumno, index) => (
                          <div key={index} className="flex items-center  justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-1 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-base">#{index + 1}</span>
                              <span className="text-base text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-sm text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora.slice(0, 5)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-base text-center py-6">Sin datos hoy.</p>
                      )}
                    </div>
                  </div>

                  {/* Ausentes Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="w-full mb-4 flex justify-center">
                      <span className="bg-red-100 text-red-700 font-bold px-4 py-2 rounded-full flex items-center gap-1 text-base">
                        🚫 Ausentes hoy
                      </span>
                    </div>
                    
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1 space-y-2">
                      {diario.listaAusentesHoy.length > 0 ? (
                        diario.listaAusentesHoy.map((alumno, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded-md border border-red-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-base font-medium text-gray-700 truncate">{alumno.nombre}</span>
                            </div>
                            <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 shrink-0">
                              {alumno.grado}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-base text-gray-400 italic mt-2 text-center py-4">🎉 ¡No hay ausentes hoy!</p>
                      )}
                    </div>

                    {diario.listaAusentesHoy.length > 0 && (
                      <button
                        onClick={() => setIsDailyModalOpen(true)}
                        className="w-full mt-4 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors border border-gray-300 flex items-center justify-center gap-2 text-base"
                      >
                        ⬇️ Exportar reporte
                      </button>
                    )}
                  </div>

                  {/* Entradas Tarde (Panel Morado) */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4 text-purple-700 flex items-center gap-2">
                      <span className="text-2xl">🕒</span> Entradas tarde (&gt;7am)
                    </h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {entradasTarde.length > 0 ? (
                        entradasTarde.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded-lg border border-purple-100">
                            <div className="flex flex-col sm:flex-row sm:items-center  sm:gap-1 flex-1 min-w-0">
                              <span className="font-bold text-purple-400 text-base">#{index + 1}</span>
                              <span className="text-base text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-sm text-purple-500 bg-white px-2 py-0.5 rounded-full border border-purple-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-sm text-purple-600 font-bold bg-purple-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-base text-center py-6 text-purple-400">🎉 Sin entradas tarde hoy.</p>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </section>

            {/* ========================================= */}
            {/* 2. SECCIÓN REPORTE MENSUAL */}
            {/* ========================================= */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-2 gap-4">
                <h2 className="text-3xl font-bold text-gray-800">📈 Reporte Mensual</h2>
                <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg p-1 px-3 shadow-sm text-base">
                  <div className="flex items-center gap-1">
                    <label htmlFor="mesMensual" className="text-base font-medium text-gray-600">Mes:</label>
                    <select 
                      id="mesMensual"
                      value={mesMensual}
                      onChange={(e) => setMesMensual(Number(e.target.value))}
                      className="bg-transparent text-gray-700 text-base focus:outline-none border-none p-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2024, m - 1, 1).toLocaleString('es', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-1">
                    <label htmlFor="anioMensual" className="text-base font-medium text-gray-600">Año:</label>
                    <select 
                      id="anioMensual"
                      value={anioMensual}
                      onChange={(e) => setAnioMensual(Number(e.target.value))}
                      className="bg-transparent text-gray-700 text-base focus:outline-none border-none p-1"
                    >
                      {años.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* KPIs Mensuales */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-base text-gray-500 font-medium">Promedio asistencia mes</p>
                    <p className="text-4xl font-bold text-blue-600 mt-2">{(mensual.promedioAsistencia * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-base text-gray-500 font-medium">Hora promedio de entrada</p>
                    <p className="text-4xl font-bold text-green-600 mt-2">{mensual.horaPromedio}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Entradas Mensuales */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">🏆 Record mensual - Entradas</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {mensual.recordEntradaMes.length > 0 ? (
                        mensual.recordEntradaMes.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-base">#{index + 1}</span>
                              <span className="text-base text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-sm text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora.slice(0, 5)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-base">Sin datos este mes.</p>
                      )}
                    </div>
                  </div>

                  {/* Salidas Mensuales */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-2xl font-semibold text-gray-800 mb-4">🏆 Record mensual - Salidas</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {mensual.recordSalidaMes.length > 0 ? (
                        mensual.recordSalidaMes.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-base">#{index + 1}</span>
                              <span className="text-base text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-sm text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora.slice(0, 5)}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-base">Sin datos este mes.</p>
                      )}
                    </div>
                  </div>

                  {/* Ausencias por alumno (Mes) */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-2xl font-semibold text-gray-800">📉 Ausencias por alumno (Mes)</h3>
                    </div>
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1 space-y-2">
                      {mensual.ausentesPorMes.length > 0 ? (
                        mensual.ausentesPorMes
                          .sort((a, b) => b.ausencias - a.ausencias)
                          .filter(alumno => alumno.ausencias > 0)
                          .map((alumno, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded-md border border-orange-100">
                              <div className="flex items-center gap-2 overflow-hidden">
                                {/* 🔴 GRADO A text-sm */}
                                <span className="text-sm font-bold text-orange-600 bg-orange-200 px-1.5 py-0.5 rounded-full shrink-0">
                                  {alumno.grado}
                                </span>
                                <span className="text-base font-medium text-gray-700 truncate">{alumno.nombre}</span>
                              </div>
                              <span className="text-sm text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 shrink-0">
                                {alumno.ausencias} faltas
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-base text-gray-400 italic mt-2 text-center py-4">🎉 ¡Asistencia perfecta este mes!</p>
                      )}
                    </div>

                    {mensual.ausentesPorMes.length > 0 && (
                      <button
                        onClick={() => setIsMonthlyModalOpen(true)}
                        className="w-full mt-4 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors border border-gray-300 flex items-center justify-center gap-2 text-base"
                      >
                        ⬇️ Exportar reporte mensual
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

export default App;