// src/components/ExportModal.jsx
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable'; // 🔴 FORMA CORRECTA DE IMPORTAR EL PLUGIN

const ExportModal = ({ isOpen, onClose, data, fecha }) => {
  if (!isOpen) return null;

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Reporte de Ausentes - ${fecha}`, 14, 20);

    const tableData = data.map((item) => [item.nombre, item.grado]);

    // 🔴 Usamos el plugin importado explícitamente
    autoTable(doc, {
      head: [['Nombre del Estudiante', 'Grado']],
      body: tableData,
      startY: 30,
      theme: 'grid',
      headStyles: { fillColor: [220, 38, 38] },
      styles: { fontSize: 10, cellPadding: 4 },
      columnStyles: {
        0: { cellWidth: 'auto' },
        1: { cellWidth: 30 }
      }
    });

    doc.save(`ausentes_${fecha}.pdf`);
    onClose();
  };

  const exportToExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      const excelData = data.map((item) => ({
        'Nombre': item.nombre,
        'Grado': item.grado,
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ausentes');
      XLSX.writeFile(wb, `ausentes_${fecha}.xlsx`);
      onClose();
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">Exportar reporte</h3>
        <p className="text-sm text-gray-500 mb-6">
          Selecciona el formato para descargar la lista del día {fecha}.
        </p>
        <div className="flex flex-col gap-3">
          <button onClick={exportToPDF} className="w-full py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg">📄 Descargar como PDF</button>
          <button onClick={exportToExcel} className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg">📊 Descargar como Excel</button>
          <button onClick={onClose} className="w-full py-2 px-4 mt-2 bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium rounded-lg">Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;