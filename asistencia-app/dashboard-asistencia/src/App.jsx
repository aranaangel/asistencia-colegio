import { useEffect, useState } from 'react';
import ExportModal from './components/ExportModal';
import Header from './components/Header';
import {
  getAsistenciasPorGrado,
  getAusenciasPorMes,
  getAusentes,
  getPromedioAsistencia,
  getRanking,
  getRankingDiario,
  getTiempoPromedioEntrada
} from './services/api';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

function App() {
  const hoy = new Date();
  const fechaActual = hoy.toISOString().split('T')[0];
  const mesActual = hoy.getMonth() + 1;
  const anioActual = hoy.getFullYear();

  const [fechaDiaria, setFechaDiaria] = useState(fechaActual);

  const [mesMensual, setMesMensual] = useState(mesActual);
  const [anioMensual, setAnioMensual] = useState(anioActual);
  const años = Array.from({ length: 2050 - 2024 + 1 }, (_, i) => 2024 + i);

  const [isModalOpen, setIsModalOpen] = useState(false);

  // 🔴 ESTADO DIARIO (Incluye salidas)
  const [diario, setDiario] = useState({
    totalEstudiantes: 0,
    ausentesHoy: 0,
    asistenciasPorGrado: [],
    primeros10EntradaHoy: [],
    ultimos10SalidaHoy: [],
    listaAusentesHoy: [],
  });

  // 🔴 ESTADO MENSUAL (Incluye salidas)
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
        const [resGrado, resAusentesHoy, resRankingHoy, resPromedio, resHora, resRankingMes, resAusenciasMes] = await Promise.all([
          getAsistenciasPorGrado(fechaDiaria, fechaDiaria),
          getAusentes(fechaDiaria),
          getRankingDiario(fechaDiaria),
          getPromedioAsistencia(mesMensual, anioMensual),
          getTiempoPromedioEntrada(mesMensual, anioMensual),
          getRanking(mesMensual, anioMensual),
          getAusenciasPorMes(mesMensual, anioMensual)
        ]);

        // Procesar datos diarios
        const gradosData = Object.entries(resGrado.data.por_grado).map(([grado, cantidad]) => ({
          grado,
          cantidad,
        }));

        const totalAsistenciasHoy = gradosData.reduce((sum, item) => sum + item.cantidad, 0);
        
        // 🔴 Validación: Si no hay asistencias hoy, vaciamos las listas de entrada
        const primeros10EntradaHoy = totalAsistenciasHoy > 0 ? (resRankingHoy.data.primeros_en_entrar || []) : [];
        // 🔴 Validación: Si el array de salidas viene vacío, se queda vacío y el componente muestra "Sin datos"
        const ultimos10SalidaHoy = resRankingHoy.data.ultimos_en_salir || [];

        setDiario({
          totalEstudiantes: resAusentesHoy.data.total_estudiantes,
          ausentesHoy: resAusentesHoy.data.total_ausentes,
          asistenciasPorGrado: gradosData,
          primeros10EntradaHoy: primeros10EntradaHoy, 
          ultimos10SalidaHoy: ultimos10SalidaHoy,
          listaAusentesHoy: resAusentesHoy.data.listado_ausentes || [],
        });

        // Procesar datos mensuales
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
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        data={diario.listaAusentesHoy}
        fecha={fechaDiaria}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-10">
        {cargando ? (
          <div className="text-center py-20 text-gray-500 font-medium">
            Cargando datos del panel...
          </div>
        ) : (
          <>
            {/* ========================================= */}
            {/* 1. SECCIÓN REPORTE DIARIO */}
            {/* ========================================= */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 border-b pb-2 gap-4">
                <h2 className="text-2xl font-bold text-gray-800">📊 Reporte Diario</h2>
                
                <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg p-1 px-3 shadow-sm">
                  <label htmlFor="fechaDiaria" className="text-sm font-medium text-gray-600">Fecha:</label>
                  <input 
                    type="date" 
                    id="fechaDiaria"
                    value={fechaDiaria}
                    onChange={(e) => setFechaDiaria(e.target.value)}
                    className="bg-transparent text-gray-700 text-sm focus:outline-none border-none p-1"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                {/* KPI Diarios */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Estudiantes totales</p>
                    <p className="text-3xl font-bold text-gray-800 mt-2">{diario.totalEstudiantes}</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Ausentes hoy</p>
                    <p className="text-3xl font-bold text-red-600 mt-2">{diario.ausentesHoy}</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 w-full">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Asistencias - Día Actual ({fechaDiaria})</h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={diario.asistenciasPorGrado}>
                        <XAxis dataKey="grado" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
                          {diario.asistenciasPorGrado.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Listas Diarias */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Entradas Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🕐 Top 10 primeros en entrar hoy</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {diario.primeros10EntradaHoy.length > 0 ? (
                        diario.primeros10EntradaHoy.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-sm">#{index + 1}</span>
                              <span className="text-sm text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-6">Sin datos hoy.</p>
                      )}
                    </div>
                  </div>

                  {/* Salidas Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">⬇️ Últimos 10 en salir hoy</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {diario.ultimos10SalidaHoy.length > 0 ? (
                        diario.ultimos10SalidaHoy.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-sm">#{index + 1}</span>
                              <span className="text-sm text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm text-center py-6">Sin datos hoy.</p>
                      )}
                    </div>
                  </div>

                  {/* Ausentes Hoy */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">🚫 Ausentes hoy</h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsModalOpen(true)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-full border border-gray-300 transition-colors flex items-center gap-1"
                          disabled={diario.listaAusentesHoy.length === 0}
                        >
                          ⬇️ Exportar
                        </button>
                        <button 
                          onClick={() => window.location.reload()}
                          className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1 rounded-full border border-blue-200 transition-colors flex items-center gap-1"
                        >
                          🔄 Refrescar
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1 space-y-2">
                      {diario.listaAusentesHoy.length > 0 ? (
                        diario.listaAusentesHoy.map((alumno, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded-md border border-red-100">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <span className="text-xs font-bold text-red-500 bg-red-200 px-1.5 py-0.5 rounded-full shrink-0">Ausente</span>
                              <span className="text-sm font-medium text-gray-700 truncate">{alumno.nombre}</span>
                            </div>
                            <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 shrink-0">
                              {alumno.grado}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-2 text-center py-4">🎉 ¡No hay ausentes hoy!</p>
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
                <h2 className="text-2xl font-bold text-gray-800">📈 Reporte Mensual</h2>
                
                <div className="flex items-center gap-3 bg-white border border-gray-300 rounded-lg p-1 px-3 shadow-sm">
                  <div className="flex items-center gap-1">
                    <label htmlFor="mesMensual" className="text-sm font-medium text-gray-600">Mes:</label>
                    <select 
                      id="mesMensual"
                      value={mesMensual}
                      onChange={(e) => setMesMensual(Number(e.target.value))}
                      className="bg-transparent text-gray-700 text-sm focus:outline-none border-none p-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {new Date(2024, m - 1, 1).toLocaleString('es', { month: 'long' })}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <label htmlFor="anioMensual" className="text-sm font-medium text-gray-600">Año:</label>
                    <select 
                      id="anioMensual"
                      value={anioMensual}
                      onChange={(e) => setAnioMensual(Number(e.target.value))}
                      className="bg-transparent text-gray-700 text-sm focus:outline-none border-none p-1"
                    >
                      {años.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Promedio asistencia mes</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{(mensual.promedioAsistencia * 100).toFixed(1)}%</p>
                  </div>
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <p className="text-sm text-gray-500 font-medium">Hora promedio de entrada</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">{mensual.horaPromedio}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Entradas Mensuales */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Record mensual - Primeros en entrar</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {mensual.recordEntradaMes.length > 0 ? (
                        mensual.recordEntradaMes.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-sm">#{index + 1}</span>
                              <span className="text-sm text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm">Sin datos este mes.</p>
                      )}
                    </div>
                  </div>

                  {/* Salidas Mensuales */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">🏆 Record mensual - Últimos en salir</h3>
                    <div className="space-y-3 overflow-y-auto max-h-64">
                      {mensual.recordSalidaMes.length > 0 ? (
                        mensual.recordSalidaMes.map((alumno, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg border border-orange-100">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 flex-1 min-w-0">
                              <span className="font-bold text-gray-400 text-sm">#{index + 1}</span>
                              <span className="text-sm text-gray-700 font-medium truncate">{alumno.nombre}</span>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 font-medium">
                                {alumno.grado || 'Sin grado'}
                              </span>
                            </div>
                            <span className="text-xs text-orange-600 font-bold bg-orange-100 px-2 py-0.5 rounded-full ml-2 shrink-0">
                              {alumno.hora}
                            </span>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-sm">Sin datos este mes.</p>
                      )}
                    </div>
                  </div>

                  {/* Ausentes por Mes */}
                  <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-800">📉 Ausencias por alumno (Mes)</h3>
                    </div>
                    <div className="mt-2 max-h-64 overflow-y-auto pr-1 space-y-2">
                      {mensual.ausentesPorMes.length > 0 ? (
                        mensual.ausentesPorMes
                          .sort((a, b) => b.ausencias - a.ausencias)
                          .filter(alumno => alumno.ausencias > 0)
                          .map((alumno, index) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-orange-50 rounded-md border border-orange-100">
                              <div className="flex items-center gap-2 overflow-hidden">
                                <span className="text-xs font-bold text-orange-500 bg-orange-200 px-1.5 py-0.5 rounded-full shrink-0">{alumno.ausencias}x</span>
                                <span className="text-sm font-medium text-gray-700 truncate">{alumno.nombre}</span>
                              </div>
                              <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200 shrink-0">
                                {alumno.ausencias} faltas
                              </span>
                            </div>
                          ))
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-2 text-center py-4">🎉 ¡Asistencia perfecta este mes!</p>
                      )}
                    </div>
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