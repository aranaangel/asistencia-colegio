import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const MonthlyExportModal = ({ isOpen, onClose, data, mes, anio }) => {
  if (!isOpen) return null;

  const exportToPDF = () => {
    const doc = new jsPDF();
    const titulo = `Reporte de Ausencias - ${mes}/${anio}`;
    doc.setFontSize(16);
    doc.text(titulo, 14, 20);

    const tableData = data.map((item) => [
      item.grado || 'Sin grado',
      item.nombre,
      `${item.ausencias} faltas`
    ]);

    autoTable(doc, {
      head: [['Grado', 'Nombre del Estudiante', 'Faltas']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [245, 158, 11] }, // Naranja corporativo
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 25 },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 35 }
      }
    });

    doc.save(`ausencias_mensuales_${mes}_${anio}.pdf`);
    onClose();
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    const excelData = data.map((item) => ({
      'Grado': item.grado || 'Sin grado',
      'Nombre': item.nombre,
      'Total Faltas': item.ausencias
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws, 'Ausencias Mensuales');
    XLSX.writeFile(wb, `ausencias_mensuales_${mes}_${anio}.xlsx`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Exportar reporte mensual</h3>
        <p className="text-sm text-gray-500 mb-6">
          Selecciona el formato para descargar el listado de ausencias de {mes}/{anio}.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={exportToPDF}
            className="w-full py-3 px-4 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            📄 Descargar como PDF
          </button>
          <button
            onClick={exportToExcel}
            className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg flex items-center justify-center gap-2"
          >
            📊 Descargar como Excel
          </button>
          <button
            onClick={onClose}
            className="w-full py-2 px-4 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MonthlyExportModal;