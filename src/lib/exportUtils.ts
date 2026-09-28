import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/**
 * Exports data to a clean CSV spreadsheet file (compatible with Excel, Google Sheets, LibreOffice)
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const sanitize = (val: string | number | undefined | null) => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const headerRow = headers.map(sanitize).join(',');
  const dataRows = rows.map((row) => row.map(sanitize).join(',')).join('\r\n');
  const csvContent = '\uFEFF' + headerRow + '\r\n' + dataRows; // UTF-8 BOM for Excel

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename.replace(/\.csv$/i, '')}_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive institutional tabular PDF report with professional typography & auto-wrapped cell columns
 */
export function exportToPDFReport(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  orientation: 'portrait' | 'landscape' = 'landscape'
) {
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = orientation === 'landscape' ? 297 : 210;
  const pageHeight = orientation === 'landscape' ? 210 : 297;
  const margin = 12;

  // Header Banner
  doc.setFillColor(26, 20, 18); // Espresso Obsidian
  doc.rect(0, 0, pageWidth, 26, 'F');

  // Institution Logo / Title
  doc.setTextColor(212, 154, 91); // Crema Gold
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('AUREVIA INSTITUTE OF SPECIALTY COFFEE', margin, 11);

  // Subtitle / Report Type
  doc.setTextColor(230, 230, 230);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`${title.toUpperCase()} • ${subtitle}`, margin, 18);

  // Meta stats
  const dateStr = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  doc.setTextColor(180, 180, 180);
  doc.setFontSize(8);
  doc.text(`Generated: ${dateStr}   |   Total Records: ${rows.length}`, pageWidth - margin - 85, 18);

  // Use jspdf-autotable for pixel-perfect table rendering with word wrapping
  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: 30,
    margin: { top: 30, left: margin, right: margin, bottom: 16 },
    theme: 'striped',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      textColor: [40, 40, 40],
      cellPadding: { top: 3, right: 2.5, bottom: 3, left: 2.5 },
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [26, 20, 18],
      textColor: [212, 154, 91],
      fontStyle: 'bold',
      fontSize: 7.8,
      cellPadding: { top: 3.5, right: 2.5, bottom: 3.5, left: 2.5 },
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 246, 243],
    },
    tableLineColor: [225, 220, 215],
    tableLineWidth: 0.1,
    didDrawPage: (data) => {
      // Header on subsequent pages
      if (data.pageNumber > 1) {
        doc.setFillColor(26, 20, 18);
        doc.rect(0, 0, pageWidth, 12, 'F');
        doc.setTextColor(212, 154, 91);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(`AUREVIA INSTITUTE OF SPECIALTY COFFEE — ${title.toUpperCase()} (Page ${data.pageNumber})`, margin, 8);
      }

      // Footer
      doc.setDrawColor(220, 220, 220);
      doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
      doc.setFontSize(7);
      doc.setTextColor(130, 130, 130);
      doc.text('Confidential Institutional Record • Aurevia Specialty Coffee Academy Admissions & Academic Registry', margin, pageHeight - 5);
      doc.text(`Page ${data.pageNumber} of ${doc.getNumberOfPages()}`, pageWidth - margin - 20, pageHeight - 5);
    },
  });

  doc.save(`${filename.replace(/\.pdf$/i, '')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
