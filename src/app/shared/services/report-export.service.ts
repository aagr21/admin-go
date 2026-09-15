import { Injectable } from '@angular/core';

/** Columna de un reporte tabular. */
export interface ReportColumn {
  header: string;
  align?: 'left' | 'right';
  width?: number;
}

/**
 * Datos normalizados de un reporte (§26): al construirse como estructura
 * plana, el mismo insumo alimenta tanto el PDF como el Excel.
 */
export interface ReportData {
  /** Slug corto para el nombre de archivo, p. ej. "reporte-diario-planta". */
  slug: string;
  title: string;
  /** Referencia del documento técnico, p. ej. "§26". */
  section: string;
  /** Línea de contexto: corte, empresa, umbrales, etc. */
  subtitle: string;
  columns: ReportColumn[];
  rows: string[][];
  /** Filas de totales/resumen al final de la tabla. */
  foot?: string[][];
}

const PDF_PRIMARY: [number, number, number] = [13, 60, 97];

/**
 * Generación client-side de reportes en PDF y Excel (§26).
 * Las librerías se importan de forma diferida: solo se descargan cuando el
 * usuario exporta un reporte, manteniendo liviano el arranque de la app.
 */
@Injectable({ providedIn: 'root' })
export class ReportExportService {
  async exportPdf(report: ReportData): Promise<void> {
    const [{ jsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);

    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    const stamp = this.stamp();

    const drawBand = (): void => {
      doc.setFillColor(...PDF_PRIMARY);
      doc.rect(0, 0, width, 62, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(report.title, 28, 26);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(`AdminGo · ${report.section} · ${report.subtitle}`, 28, 44);
      doc.setTextColor(120, 130, 140);
      doc.setFontSize(7.5);
      doc.text(`Generado el ${stamp}`, 28, height - 16);
      doc.text(`Página ${doc.getNumberOfPages()}`, width - 74, height - 16);
    };

    drawBand();

    const columnStyles: Record<number, { halign: 'left' | 'right' }> = {};
    report.columns.forEach((column, index) => {
      if (column.align === 'right') {
        columnStyles[index] = { halign: 'right' };
      }
    });

    autoTable(doc, {
      head: [report.columns.map((column) => column.header)],
      body: report.rows,
      foot: report.foot,
      startY: 84,
      margin: { top: 84, bottom: 36, left: 28, right: 28 },
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 4 },
      headStyles: { fillColor: PDF_PRIMARY, textColor: 255, fontStyle: 'bold' },
      footStyles: { fillColor: [233, 240, 247], textColor: [30, 41, 59], fontStyle: 'bold' },
      columnStyles,
      didDrawPage: drawBand,
    });

    doc.save(this.fileName(report, 'pdf'));
  }

  async exportXlsx(report: ReportData): Promise<void> {
    const excelModule = await import('exceljs');
    const workbook = new excelModule.Workbook();
    const sheet = workbook.addWorksheet(report.title.slice(0, 28));
    const columnCount = Math.max(report.columns.length, 1);

    sheet.getRow(1).getCell(1).value = report.title;
    sheet.getRow(1).getCell(1).font = { bold: true, size: 14, color: { argb: 'FF0D3C61' } };
    sheet.getRow(2).getCell(1).value = `AdminGo · ${report.section} · ${report.subtitle}`;
    sheet.getRow(2).getCell(1).font = { size: 9, color: { argb: 'FF64748B' } };

    const headerRow = sheet.getRow(4);
    headerRow.values = report.columns.map((column) => column.header);
    headerRow.eachCell((cell: import('exceljs').Cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D3C61' } };
    });

    report.rows.forEach((row, index) => {
      const dataRow = sheet.getRow(5 + index);
      dataRow.values = row;
    });

    if (report.foot?.length) {
      let footIndex = 5 + report.rows.length;
      for (const row of report.foot) {
        const footRow = sheet.getRow(footIndex);
        footRow.values = row;
        footRow.eachCell((cell: import('exceljs').Cell) => {
          cell.font = { bold: true };
          cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } } };
        });
        footIndex++;
      }
    }

    report.columns.forEach((column, index) => {
      const dataColumns = sheet.columns;
      if (dataColumns[index]) {
        dataColumns[index].width = column.width ?? Math.max(column.header.length + 4, 14);
      }
    });

    sheet.views = [{ state: 'frozen', ySplit: 4 }];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    this.saveBlob(blob, this.fileName(report, 'xlsx'));
  }

  /** Nombre de archivo: AG-<slug>-<fecha>.<ext> (fecha real de generación). */
  fileName(report: ReportData, ext: 'pdf' | 'xlsx'): string {
    const date = new Date().toISOString().slice(0, 10);
    return `AG-${report.slug}-${date}.${ext}`;
  }

  private stamp(): string {
    return new Intl.DateTimeFormat('es-BO', {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());
  }

  private saveBlob(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
}
