import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RankingEntry } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Printer, Download, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { exportRankingsToExcel, ExportSignatures } from '../../utils/excelExporter';

interface PrintReportModalProps {
  periodTitle: string;
  scopeTitle: string;
  rankings: RankingEntry[];
  selectedCampusId?: string;
  periodType?: 'week' | 'month' | 'semester' | 'year';
  periodNumber?: number;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  periodTitle,
  scopeTitle: _initialScopeTitle,
  rankings: initialRankings,
  selectedCampusId: initialCampusId = 'all',
  periodType = 'week',
  periodNumber = 4,
  onClose,
}) => {
  const {
    settings,
    campuses,
    classes,
    campusWeeklyDuties,
    getWeeklyRankings,
    getMonthlyRankings,
    getSemesterRankings,
    getYearlyRankings,
  } = useApp();

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [activeCampusId, setActiveCampusId] = useState<string>(initialCampusId);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  // Lock background scroll (body, html, main) strictly when modal is open and restore exactly on unmount (Requirement IV)
  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const mainElement = document.querySelector('main');
    const originalMainOverflow = mainElement ? mainElement.style.overflow : '';

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    if (mainElement) {
      mainElement.style.overflow = 'hidden';
    }
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
      if (mainElement) {
        mainElement.style.overflow = originalMainOverflow;
      }
      document.body.style.paddingRight = '';
    };
  }, []);

  // Handle ESC key to safely close modal (Requirement IV)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isGeneratingPdf) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isGeneratingPdf]);

  // Compute active campus info
  const activeCampus = useMemo(() => {
    if (activeCampusId === 'all') return null;
    return campuses.find((c) => c.id === activeCampusId) || null;
  }, [campuses, activeCampusId]);

  // Determine active scope title
  const activeScopeTitle = useMemo(() => {
    if (activeCampus) return activeCampus.name;
    return 'Toàn trường (6 Phân hiệu)';
  }, [activeCampus]);

  // Compute full rankings for the selected campus / scope (Requirement VI & VII)
  const displayRankings = useMemo(() => {
    switch (periodType) {
      case 'week':
        return getWeeklyRankings(periodNumber, activeCampusId, 'all');
      case 'month':
        return getMonthlyRankings(periodNumber, activeCampusId, 'all');
      case 'semester':
        return getSemesterRankings((periodNumber as 1 | 2) || 1, activeCampusId, 'all');
      case 'year':
        return getYearlyRankings(activeCampusId, 'all');
      default:
        if (activeCampusId === 'all') return initialRankings;
        return initialRankings.filter((r) => r.campus.id === activeCampusId);
    }
  }, [
    periodType,
    periodNumber,
    activeCampusId,
    initialRankings,
    getWeeklyRankings,
    getMonthlyRankings,
    getSemesterRankings,
    getYearlyRankings,
  ]);

  // Dynamic signers from System Configuration
  const tptName = settings.leadershipSignatures?.tptName || 'Cô Lê Thị Hoa';
  const principalName = settings.leadershipSignatures?.principalName || 'Thầy Nguyễn Văn Sơn';

  const { vicePrincipalTitle, vicePrincipalName } = useMemo(() => {
    if (activeCampus) {
      const leader =
        activeCampus.leaderName ||
        settings.leadershipSignatures?.campusVicePrincipals?.[activeCampus.id] ||
        settings.leadershipSignatures?.vicePrincipalEmulationName ||
        'Thầy Hoàng Văn Sơn';
      return {
        vicePrincipalTitle: `Phó Hiệu trưởng phụ trách ${activeCampus.name}`,
        vicePrincipalName: leader,
      };
    }
    return {
      vicePrincipalTitle: 'Phó Hiệu trưởng phụ trách Thi đua',
      vicePrincipalName: settings.leadershipSignatures?.vicePrincipalEmulationName || 'Thầy Hoàng Văn Sơn',
    };
  }, [activeCampus, settings.leadershipSignatures]);

  // Dynamic Duty Teacher from weekly duty assignments
  const { dutyTeacherName, dutyTeacherTitle } = useMemo(() => {
    if (campusWeeklyDuties && campusWeeklyDuties.length > 0) {
      const targetWeek = periodType === 'week' ? periodNumber : undefined;
      const duty = campusWeeklyDuties.find((d) => {
        const matchWeek = targetWeek !== undefined ? d.week === targetWeek : true;
        const matchCampus = activeCampusId === 'all' || d.campusId === activeCampusId;
        return matchWeek && matchCampus;
      });

      if (duty?.homeroomTeacher) {
        return {
          dutyTeacherName: duty.homeroomTeacher,
          dutyTeacherTitle: duty.className ? `GVCN Lớp ${duty.className}` : 'Giáo viên trực ban tuần',
        };
      }
    }
    return {
      dutyTeacherName: 'Giáo viên trực tuần',
      dutyTeacherTitle: 'Giáo viên trực ban',
    };
  }, [campusWeeklyDuties, periodType, periodNumber, activeCampusId]);

  // Administrative date formatting
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = String(now.getFullYear());

  /**
   * Helper to generate compliant filename (Requirement II):
   * Bao_cao_thi_dua_[Phan_hieu]_[Tuan_hoac_Ky]_[Nam_hoc].pdf
   * Ví dụ: Bao_cao_thi_dua_Toan_truong_Tuan_4_2026-2027.pdf
   */
  const getStandardFilename = (ext: 'pdf' | 'xls') => {
    const sanitize = (str: string) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .replace(/[^a-zA-Z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');

    let phanHieu = 'Toan_truong';
    if (activeCampus) {
      phanHieu = sanitize(activeCampus.name.replace(/^phân hiệu\s*/i, '').trim() || 'Hau_Loc');
    }

    const kyDanhGia = sanitize(periodTitle || `Tuan_${periodNumber}`);
    const namHoc = sanitize(settings.academicYear || '2026-2027').replace(/_/g, '-');
    return `Bao_cao_thi_dua_${phanHieu}_${kyDanhGia}_${namHoc}.${ext}`;
  };

  // Stats calculation
  const totalClasses = displayRankings.length;
  const avgScore =
    totalClasses > 0
      ? (displayRankings.reduce((sum, r) => sum + r.totalScore, 0) / totalClasses).toFixed(2)
      : '0';

  /**
   * Dedicated HTML Generator for PDF and Printing (Requirement I & VI)
   * Strictly uses standard CSS with HEX colors (#000000, #ffffff, #1e293b, etc.).
   * Absolutely NO oklch(), lab(), lch(), or modern color functions.
   */
  const generateCleanReportHtml = () => {
    const rowsHtml = displayRankings
      .map((r, idx) => {
        const bonus = r.bonusPoints || r.monthBonusPoints || r.yearBonusPoints || 0;
        const penalty = r.penaltyPoints || r.monthPenaltyPoints || 0;
        const rankDisplay = r.isDisqualifiedYearly ? 'Không XL' : String(r.rank);
        const classNameStr = String(r.classItem.name); // Text preservation strictly as String

        return `
          <tr style="text-align: center; background-color: ${idx % 2 === 1 ? '#f8fafc' : '#ffffff'};">
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; color: #475569;">${idx + 1}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10.5pt; font-weight: bold; color: #0f172a;">${rankDisplay}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 8px; font-size: 10.5pt; font-weight: bold; text-align: left; color: #0f172a;">Lớp ${classNameStr}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; color: #334155;">Khối ${r.classItem.grade}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 8px; font-size: 10pt; text-align: left; color: #334155;">${r.campus.name}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 8px; font-size: 10pt; text-align: left; color: #334155;">${r.classItem.homeroomTeacher || 'Chưa phân công'}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; color: #0f172a;">${r.baseScore}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; font-weight: bold; color: #15803d;">+${bonus}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; font-weight: bold; color: #be123c;">-${penalty}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 11pt; font-weight: bold; background-color: #f1f5f9; color: #0f172a;">${r.totalScore}</td>
            <td style="border: 1px solid #1e293b; padding: 4px 6px; font-size: 10pt; font-weight: bold; color: #0f172a;">${r.performanceTier}</td>
          </tr>
        `;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${getStandardFilename('pdf').replace('.pdf', '')}</title>
        <style id="pdf-clean-style">
          @page {
            size: A4 portrait;
            margin: 8mm 8mm 10mm 8mm;
          }
          * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            font-size: 11pt;
            color: #000000;
            background-color: #ffffff;
            margin: 0;
            padding: 8mm;
            line-height: 1.35;
          }
          .pdf-report-container {
            width: 100%;
            max-width: 194mm;
            margin: 0 auto;
            background-color: #ffffff;
          }
          .header-grid {
            display: table;
            width: 100%;
            border-bottom: 1px solid #94a3b8;
            padding-bottom: 8px;
            margin-bottom: 12px;
          }
          .header-left, .header-right {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            text-align: center;
          }
          .doc-title {
            text-align: center;
            margin: 14px 0 12px 0;
          }
          .doc-title h1 {
            font-size: 14pt;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin: 0 0 4px 0;
            color: #0f172a;
          }
          .doc-title p {
            margin: 2px 0;
            font-size: 10pt;
            color: #334155;
          }
          table.report-table {
            width: 100%;
            border-collapse: collapse;
            border: 1.5px solid #0f172a;
            margin: 10px 0;
            page-break-inside: auto;
          }
          table.report-table tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          table.report-table thead {
            display: table-header-group;
          }
          table.report-table th {
            border: 1px solid #1e293b;
            background-color: #e2e8f0;
            color: #0f172a;
            font-weight: bold;
            font-size: 10pt;
            padding: 6px 4px;
            text-align: center;
          }
          .summary-box {
            background-color: #f8fafc;
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            margin: 12px 0;
            font-size: 9.5pt;
            color: #1e293b;
            border-radius: 4px;
          }
          .signatures-grid {
            display: table;
            width: 100%;
            margin-top: 24px;
            page-break-inside: avoid;
          }
          .sig-cell {
            display: table-cell;
            width: 33.33%;
            text-align: center;
            vertical-align: top;
            padding: 0 6px;
          }
          .sig-space {
            height: 55px;
          }
        </style>
      </head>
      <body>
        <div id="print-report" class="pdf-report-container">
          <!-- Administrative Vietnamese Header -->
          <div class="header-grid">
            <div class="header-left">
              ${settings.governingBody && settings.governingBody.trim() ? `<div style="font-size: 10pt; font-weight: bold; text-transform: uppercase;">${settings.governingBody.trim().toUpperCase()}</div>` : ''}
              <div style="font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-top: 2px;">${(settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP').trim().toUpperCase()}</div>
              <div style="font-size: 9pt; color: #475569; font-style: italic; margin-top: 3px;">Số: 26/BC-TĐ-LHL</div>
            </div>
            <div class="header-right">
              <div style="font-size: 10.5pt; font-weight: bold; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style="font-size: 10.5pt; font-weight: bold; text-decoration: underline; margin-top: 2px;">Độc lập – Tự do – Hạnh phúc</div>
              <div style="font-size: 9pt; color: #475569; font-style: italic; margin-top: 4px;">
                Hậu Lộc, ngày ${dayStr} tháng ${monthStr} năm ${yearStr}
              </div>
            </div>
          </div>

          <!-- Document Title -->
          <div class="doc-title">
            <h1>BIÊN BẢN TỔNG HỢP XẾP LOẠI THI ĐUA CÁC LỚP</h1>
            <p style="font-style: italic; font-size: 10.5pt;">
              Kỳ đánh giá: <strong>${periodTitle}</strong> — Phạm vi: <strong>${activeScopeTitle}</strong>
            </p>
            <p style="font-size: 9.5pt; color: #475569;">
              Năm học ${settings.academicYear} · Điểm cơ sở: ${settings.basePointsPerWeek} điểm/tuần · Tổng số: <strong>${totalClasses} lớp</strong>
            </p>
          </div>

          <!-- Official Table -->
          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 32px;">STT</th>
                <th style="width: 40px;">Hạng</th>
                <th style="width: 70px;">Lớp</th>
                <th style="width: 52px;">Khối</th>
                <th>Phân hiệu</th>
                <th>Giáo viên chủ nhiệm</th>
                <th style="width: 58px;">Điểm gốc</th>
                <th style="width: 60px; color: #15803d;">Thưởng (+)</th>
                <th style="width: 60px; color: #be123c;">Phạt (-)</th>
                <th style="width: 68px; background-color: #cbd5e1;">Tổng điểm</th>
                <th style="width: 75px;">Xếp loại</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <!-- Summary Box -->
          <div class="summary-box">
            <div style="font-weight: bold; margin-bottom: 4px; text-transform: uppercase;">THỐNG KÊ KẾT QUẢ XẾP LOẠI:</div>
            <div style="display: table; width: 100%;">
              <div style="display: table-cell; width: 25%;">Tổng số lớp: <strong>${totalClasses} lớp</strong></div>
              <div style="display: table-cell; width: 25%;">Điểm trung bình: <strong>${avgScore} điểm</strong></div>
              <div style="display: table-cell; width: 25%;">Lớp Xuất sắc: <strong>${displayRankings.filter((r) => r.performanceTier === 'Xuất sắc').length} lớp</strong></div>
              <div style="display: table-cell; width: 25%;">Lớp Tốt: <strong>${displayRankings.filter((r) => r.performanceTier === 'Tốt').length} lớp</strong></div>
            </div>
          </div>

          <!-- Official Signatures Block - 3 Chữ Ký Chuẩn Quy Định -->
          <div class="signatures-grid">
            <div class="sig-cell">
              <div style="font-weight: bold; text-transform: uppercase; font-size: 10pt;">NGƯỜI LẬP BIỂU / TPT ĐỘI</div>
              <div style="font-size: 8.5pt; color: #64748b; font-style: italic;">(Ký, ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; font-size: 10.5pt; color: #0f172a;">${tptName}</div>
              <div style="font-size: 8.5pt; color: #475569;">Tổng phụ trách Đội</div>
            </div>

            <div class="sig-cell">
              <div style="font-weight: bold; text-transform: uppercase; font-size: 10pt;">${vicePrincipalTitle.toUpperCase()}</div>
              <div style="font-size: 8.5pt; color: #64748b; font-style: italic;">(Ký, ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; font-size: 10.5pt; color: #0f172a;">${vicePrincipalName}</div>
              <div style="font-size: 8.5pt; color: #475569;">${vicePrincipalTitle}</div>
            </div>

            <div class="sig-cell">
              <div style="font-weight: bold; text-transform: uppercase; font-size: 10pt;">GIÁO VIÊN TRỰC</div>
              <div style="font-size: 8.5pt; color: #64748b; font-style: italic;">(Ký, ghi rõ họ tên)</div>
              <div class="sig-space"></div>
              <div style="font-weight: bold; font-size: 10.5pt; color: #0f172a;">${dutyTeacherName}</div>
              <div style="font-size: 8.5pt; color: #475569;">${dutyTeacherTitle}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  /**
   * 1. Direct PDF Generation & Download via Blob & Object URL (Requirement II)
   * Uses an isolated iframe with clean standard CSS, completely bypassing all oklch errors.
   * Leverages html2canvas + jsPDF to generate an authentic A4 PDF with multi-page handling.
   */
  const handleDownloadPdf = async () => {
    if (isGeneratingPdf) return;

    if (!displayRankings || displayRankings.length === 0) {
      setStatusMessage({
        text: 'Không có dữ liệu lớp để xuất báo cáo PDF. Vui lòng kiểm tra lại cấu hình phân hiệu.',
        type: 'error',
      });
      return;
    }

    setIsGeneratingPdf(true);
    setStatusMessage({
      text: 'Đang tạo PDF...',
      type: 'info',
    });

    const pdfFileName = getStandardFilename('pdf');
    let renderIframe: HTMLIFrameElement | null = null;
    let blobUrl: string | null = null;

    try {
      const cleanHtml = generateCleanReportHtml();

      renderIframe = document.createElement('iframe');
      renderIframe.id = 'pdf-isolated-render-frame';
      renderIframe.style.position = 'fixed';
      renderIframe.style.left = '-9999px';
      renderIframe.style.top = '0';
      renderIframe.style.width = '794px'; // 210mm at 96 DPI
      renderIframe.style.height = '1123px';
      renderIframe.style.border = '0';
      renderIframe.style.backgroundColor = '#ffffff';
      renderIframe.style.zIndex = '-999';
      document.body.appendChild(renderIframe);

      const iframeDoc = renderIframe.contentWindow?.document;
      if (!iframeDoc) {
        throw new Error('Không thể truy cập môi trường render PDF');
      }

      iframeDoc.open();
      iframeDoc.write(cleanHtml);
      iframeDoc.close();

      // Ensure DOM parsing and font rendering settle
      await new Promise((resolve) => setTimeout(resolve, 350));

      const targetReportNode = iframeDoc.getElementById('print-report') || iframeDoc.body;

      // Render to clean canvas with html2canvas
      const canvas = await html2canvas(targetReportNode as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      // Construct A4 PDF via jsPDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pdfWidth = 210; // mm
      const pdfHeight = 297; // mm
      const margin = 8; // mm
      const printableWidth = pdfWidth - margin * 2; // 194 mm
      const printableHeight = pdfHeight - margin * 2; // 281 mm

      const totalHeightMm = (canvas.height * printableWidth) / canvas.width;

      if (totalHeightMm <= printableHeight) {
        // Single page document
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        pdf.addImage(imgData, 'JPEG', margin, margin, printableWidth, totalHeightMm);
      } else {
        // Multi-page document pagination for large lists (e.g. 59 classes Toàn trường)
        const pageHeightPx = Math.floor((printableHeight * canvas.width) / printableWidth);
        let renderedHeightPx = 0;
        let pageIndex = 0;

        while (renderedHeightPx < canvas.height) {
          const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeightPx);
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const pageCtx = pageCanvas.getContext('2d');

          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, canvas.width, sliceHeightPx);
            pageCtx.drawImage(
              canvas,
              0,
              renderedHeightPx,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );

            const sliceData = pageCanvas.toDataURL('image/jpeg', 0.98);
            const sliceHeightMm = (sliceHeightPx * printableWidth) / canvas.width;

            if (pageIndex > 0) {
              pdf.addPage();
            }
            pdf.addImage(sliceData, 'JPEG', margin, margin, printableWidth, sliceHeightMm);
          }

          renderedHeightPx += sliceHeightPx;
          pageIndex++;
        }
      }

      // Safe Blob & Object URL download workflow (Requirement II)
      const pdfBlob = pdf.output('blob');
      blobUrl = URL.createObjectURL(pdfBlob);

      const downloadLink = document.createElement('a');
      downloadLink.href = blobUrl;
      downloadLink.download = pdfFileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setStatusMessage({
        text: 'Đã tải PDF thành công.',
        type: 'success',
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('PDF generation error caught safely:', err);
      setStatusMessage({
        text: 'Không thể tạo PDF. Vui lòng thử lại.',
        type: 'error',
      });
    } finally {
      // Clean up temporary DOM iframe immediately
      if (renderIframe && renderIframe.parentNode) {
        renderIframe.parentNode.removeChild(renderIframe);
      }
      // Release Object URL if created (Requirement II)
      if (blobUrl) {
        setTimeout(() => {
          URL.revokeObjectURL(blobUrl!);
        }, 1500);
      }
      setIsGeneratingPdf(false);
    }
  };

  /**
   * 2. Reliable Printing via Browser Print Dialog (Requirement III)
   * Opens standard browser print dialog for the report content ONLY, avoiding sidebar/header clutter.
   */
  const handlePrint = () => {
    try {
      window.print();
    } catch (e) {
      console.warn('Native window.print() failed, falling back to print iframe:', e);
      try {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '794px';
        iframe.style.height = '1123px';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow?.document;
        if (doc) {
          doc.open();
          doc.write(generateCleanReportHtml());
          doc.close();
          setTimeout(() => {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            setTimeout(() => {
              iframe.remove();
            }, 1500);
          }, 350);
        }
      } catch (err) {
        console.error('Print fallback failed:', err);
      }
    }
  };

  /**
   * 3. Matching Excel Export Button (Requirement VIII)
   */
  const handleExportExcel = () => {
    const signatures: ExportSignatures = {
      tptName,
      leaderTitle: vicePrincipalTitle,
      leaderName: vicePrincipalName,
      principalName,
      campusName: activeScopeTitle,
    };

    exportRankingsToExcel(
      displayRankings,
      periodTitle,
      settings.academicYear,
      activeScopeTitle,
      signatures
    );
  };

  return (
    // Modal Overlay (Fixed, covers full viewport, prevents background interaction, traps scroll - Requirement IV)
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/65 backdrop-blur-xs select-none overscroll-contain"
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onClick={(e) => {
        // Close modal when clicking directly on backdrop outside the modal card
        if (e.target === e.currentTarget && !isGeneratingPdf) {
          onClose();
        }
      }}
    >
      {/* Modal Container */}
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[96vh] flex flex-col overflow-hidden border border-slate-300 animate-in fade-in zoom-in-95 duration-150 select-text print:max-h-none print:overflow-visible print:border-none print:shadow-none print:w-full print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar / Toolbar (Hidden during print - Requirement III) */}
        <div className="shrink-0 p-3 sm:p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-slate-100 no-print print-hide">
          <div className="flex items-center gap-3">
            <span className="font-black text-slate-800 text-sm sm:text-base tracking-tight">
              Xem trước văn bản in - Báo cáo thi đua
            </span>

            {/* Scope / Campus Switcher (Requirement VII) */}
            <div className="flex items-center gap-1.5 text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1">
              <span className="text-slate-500 font-medium">Phân hiệu:</span>
              <select
                value={activeCampusId}
                onChange={(e) => setActiveCampusId(e.target.value)}
                disabled={isGeneratingPdf}
                className="bg-transparent font-bold text-indigo-700 outline-none cursor-pointer disabled:opacity-60"
                title="Chọn phân hiệu để xem đầy đủ toàn bộ các lớp của phân hiệu đó"
              >
                <option value="all">Toàn trường (59 lớp / 6 Phân hiệu)</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({classes.filter((cls) => cls.campusId === c.id).length} lớp)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Primary Print / Save as PDF Button (Requirement III) */}
            <button
              onClick={handlePrint}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Mở hộp thoại in trình duyệt và chọn In ra giấy hoặc Save as PDF"
            >
              <Printer size={16} />
              <span>In báo cáo / Lưu PDF</span>
            </button>

            {/* Direct PDF Download Button (Requirement II & V) */}
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Tải trực tiếp tệp PDF chuẩn khổ A4 về máy tính"
            >
              {isGeneratingPdf ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              <span>{isGeneratingPdf ? 'Đang tạo PDF...' : 'Tải file PDF (.pdf)'}</span>
            </button>

            {/* Matching Excel Export Button (Requirement VIII) */}
            <button
              onClick={handleExportExcel}
              disabled={isGeneratingPdf}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer shadow-xs disabled:opacity-50"
              title="Tải file Microsoft Excel (.xls) có dữ liệu số và xếp loại khớp 100%"
            >
              <FileSpreadsheet size={16} />
              <span>Xuất Excel</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              disabled={isGeneratingPdf}
              className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer disabled:opacity-40"
              title="Đóng cửa sổ xem trước (ESC)"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Toast Message (Requirement V) */}
        {statusMessage && (
          <div
            className={`shrink-0 px-4 py-2.5 text-xs font-bold flex items-center justify-between transition-all no-print print-hide ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200'
                : statusMessage.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-b border-blue-200'
                : 'bg-rose-50 text-rose-800 border-b border-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' && <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />}
              {statusMessage.type === 'info' && <Loader2 size={16} className="animate-spin text-blue-600 shrink-0" />}
              {statusMessage.type === 'error' && <AlertTriangle size={16} className="text-rose-600 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
            <div className="flex items-center gap-2">
              {statusMessage.type === 'error' && (
                <button
                  onClick={handleDownloadPdf}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RefreshCw size={12} />
                  <span>Thử lại</span>
                </button>
              )}
              <button
                onClick={() => setStatusMessage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                title="Đóng thông báo"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Document Content Area (Requirement IV: only this area scrolls, overscroll-contain) */}
        <div
          className="modal-content flex-1 overflow-y-auto p-6 sm:p-10 font-serif text-slate-900 bg-white overscroll-contain print:overflow-visible print:p-0"
          onWheel={(e) => e.stopPropagation()}
        >
          <div ref={printAreaRef} className="max-w-[210mm] mx-auto bg-white print:max-w-none print:w-full print:mx-0">
            {/* Official Administrative Vietnamese Header */}
            <div className="grid grid-cols-2 gap-4 pb-4 border-b border-slate-300 text-xs sm:text-sm">
              <div className="text-center space-y-1">
                {settings.governingBody && settings.governingBody.trim() && (
                  <div className="font-semibold uppercase tracking-wide">{settings.governingBody.trim()}</div>
                )}
                <div className="font-bold uppercase tracking-wide">{settings.schoolName || 'TRƯỜNG THCS LÊ HỮU LẬP'}</div>
                <div className="text-[11px] text-slate-600 italic">Số: 26/BC-TĐ-LHL</div>
              </div>
              <div className="text-center space-y-1">
                <div className="font-bold uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="font-semibold underline decoration-slate-400 underline-offset-4">
                  Độc lập – Tự do – Hạnh phúc
                </div>
                <div className="text-[11px] text-slate-600 italic pt-1">
                  Hậu Lộc, ngày {dayStr} tháng {monthStr} năm {yearStr}
                </div>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center my-6 space-y-1.5">
              <h1 className="text-lg sm:text-xl font-bold uppercase tracking-wider text-slate-900">
                BIÊN BẢN TỔNG HỢP XẾP LOẠI THI ĐUA CÁC LỚP
              </h1>
              <p className="text-xs sm:text-sm font-medium italic text-slate-700">
                Kỳ đánh giá: <strong>{periodTitle}</strong> — Phạm vi: <strong>{activeScopeTitle}</strong>
              </p>
              <p className="text-xs text-slate-500 font-sans">
                Năm học {settings.academicYear} · Điểm cơ sở: {settings.basePointsPerWeek} điểm/tuần · Tổng số:{' '}
                <strong>{totalClasses} lớp</strong>
              </p>
            </div>

            {/* Rankings Table (Requirement VI) */}
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse border border-slate-800 text-[11px] sm:text-xs">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold">
                    <th className="border border-slate-700 p-2 w-10">STT</th>
                    <th className="border border-slate-700 p-2 w-12">Hạng</th>
                    <th className="border border-slate-700 p-2">Lớp</th>
                    <th className="border border-slate-700 p-2 w-14">Khối</th>
                    <th className="border border-slate-700 p-2">Phân hiệu</th>
                    <th className="border border-slate-700 p-2">Giáo viên chủ nhiệm</th>
                    <th className="border border-slate-700 p-2 w-16">Điểm gốc</th>
                    <th className="border border-slate-700 p-2 w-16 text-emerald-800">Thưởng (+)</th>
                    <th className="border border-slate-700 p-2 w-16 text-rose-800">Phạt (-)</th>
                    <th className="border border-slate-700 p-2 w-20 bg-slate-200">Tổng điểm</th>
                    <th className="border border-slate-700 p-2 w-24">Xếp loại</th>
                  </tr>
                </thead>
                <tbody>
                  {displayRankings.map((r, idx) => {
                    const bonus = r.bonusPoints || r.monthBonusPoints || r.yearBonusPoints || 0;
                    const penalty = r.penaltyPoints || r.monthPenaltyPoints || 0;
                    const classNameStr = String(r.classItem.name); // Text preservation strictly as String

                    return (
                      <tr key={r.classItem.id} className="text-center hover:bg-slate-50">
                        <td className="border border-slate-700 p-1.5 tabular-nums text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="border border-slate-700 p-1.5 font-bold tabular-nums">
                          {r.isDisqualifiedYearly ? 'Không XL' : r.rank}
                        </td>
                        <td className="border border-slate-700 p-1.5 font-bold text-left px-2">
                          Lớp {classNameStr}
                        </td>
                        <td className="border border-slate-700 p-1.5">Khối {r.classItem.grade}</td>
                        <td className="border border-slate-700 p-1.5 text-left px-2">
                          {r.campus.name}
                        </td>
                        <td className="border border-slate-700 p-1.5 text-left px-2">
                          {r.classItem.homeroomTeacher || 'Chưa phân công'}
                        </td>
                        <td className="border border-slate-700 p-1.5 tabular-nums">{r.baseScore}</td>
                        <td className="border border-slate-700 p-1.5 tabular-nums text-emerald-700 font-bold">
                          +{bonus}
                        </td>
                        <td className="border border-slate-700 p-1.5 tabular-nums text-rose-700 font-bold">
                          -{penalty}
                        </td>
                        <td className="border border-slate-700 p-1.5 font-bold text-sm bg-slate-100 tabular-nums">
                          {r.totalScore}
                        </td>
                        <td className="border border-slate-700 p-1.5 font-bold">
                          {r.performanceTier}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Summary Statistics */}
            <div className="p-3 bg-slate-50 border border-slate-300 rounded-lg text-xs font-sans text-slate-700 space-y-1 my-3">
              <div className="font-bold text-slate-900">THỐNG KÊ KẾT QUẢ XẾP LOẠI:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                <div>Tổng số lớp: <strong>{totalClasses} lớp</strong></div>
                <div>Điểm trung bình: <strong>{avgScore} điểm</strong></div>
                <div>Lớp Xuất sắc: <strong>{displayRankings.filter((r) => r.performanceTier === 'Xuất sắc').length} lớp</strong></div>
                <div>Lớp Tốt: <strong>{displayRankings.filter((r) => r.performanceTier === 'Tốt').length} lớp</strong></div>
              </div>
            </div>

            {/* Official Signatures Block - 3 Chữ Ký Chuẩn Quy Định */}
            <div className="signatures-block grid grid-cols-3 gap-4 text-center mt-10 text-xs sm:text-sm font-serif pt-4">
              <div className="space-y-1">
                <div className="font-semibold uppercase">NGƯỜI LẬP BIỂU / TPT ĐỘI</div>
                <div className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">{tptName}</div>
                <div className="text-[11px] text-slate-600 font-sans">Tổng phụ trách Đội</div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold uppercase">{vicePrincipalTitle.toUpperCase()}</div>
                <div className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">{vicePrincipalName}</div>
                <div className="text-[11px] text-slate-600 font-sans">{vicePrincipalTitle}</div>
              </div>

              <div className="space-y-1">
                <div className="font-semibold uppercase">GIÁO VIÊN TRỰC</div>
                <div className="text-[11px] text-slate-500 italic">(Ký, ghi rõ họ tên)</div>
                <div className="h-16"></div>
                <div className="font-bold text-slate-900">{dutyTeacherName}</div>
                <div className="text-[11px] text-slate-600 font-sans">{dutyTeacherTitle}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
