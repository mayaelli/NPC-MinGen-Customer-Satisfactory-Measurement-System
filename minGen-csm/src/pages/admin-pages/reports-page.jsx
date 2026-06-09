/**
 * reports-page.jsx — Compliance Center Module
 *
 * Generates the four official ARTA/IMS compliance reports from survey data.
 * This module is export-heavy — it uses html2canvas-pro, jsPDF, JSZip,
 * SheetJS (xlsx), and FileSaver together.
 *
 * Report components (each lives in src/pages/reports/):
 *   CCEvaluationTable  → MGG-IMS-006.F03 — Citizen's Charter awareness tally
 *   SQDEvaluationTable → MGG-IMS-006.F04 — Service Quality Dimensions matrix
 *   CSMTabulationTable → MGG-IMS-006.F02 — Submission count per service (INTERNAL/EXTERNAL split)
 *   ScorePerService    → MGG-IMS-006.F05 — Satisfaction % per individual service
 *
 * Data flow:
 *   `data` prop = survey submissions (pre-fetched by admin-pages.jsx, RBAC-scoped).
 *   `allOffices` prop = full office list (used to resolve abbreviations for filenames).
 *   All filtering (targetOffice, period, date range) is CLIENT-SIDE via reportData useMemo.
 *   allPossibleServices is fetched separately from manage_services.php to populate
 *   the "services with no clients" section in CSM Tabulation.
 *
 * Export methods:
 *   handleDownloadCurrent  → captures reportRef (visible report) as single PDF
 *   handleDownloadAll      → captures all 4 refs sequentially into one multi-page PDF
 *   handleDownloadAllPDF   → same as above but as a ZIP of individual PDFs
 *   handleDownloadExcel    → builds a 4-sheet Excel workbook via buildExcelWorkbook()
 *   handleDownloadBundle   → Excel + all 4 PDFs in one ZIP (full audit package)
 *
 * Signatories:
 *   Stored in localStorage under 'report_signatories' and auto-saved on change.
 *   Passed as props to each report component to populate the signature block.
 *   To add a new signatory slot, add a key here, update the SignatoryInput
 *   component, and update each report component's footer section.
 *
 * isGlobalView flag:
 *   Controls whether the office selector shows "All" + full office list or
 *   just the user's assigned offices. Derived from role + hadMultipleOffices.
 *   hadMultipleOffices is a fallback for provisioned users whose data already
 *   spans multiple offices — avoids relying on stale localStorage values.
 */
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  FileDown, LayoutDashboard, ClipboardCheck, FileBarChart,
  Building2, FileText, ChevronDown, FileSpreadsheet, Archive
} from 'lucide-react';
import CCEvaluationTable from '../reports/CCEvaluationTable';
import SQDEvaluationTable from '../reports/SQDEvaluationTable';
import CSMTabulationTable from '../reports/CSMTabulationTable';
import ScorePerService from '../reports/ScorePerService';

export const ReportsPage = ({ data = [], allOffices = [], user }) => {

  const hadMultipleOffices = useMemo(() => {
    if (!data || data.length === 0) return false;
    const uniqueIds = [...new Set(data.map(d => d.office_id))];
    return uniqueIds.length > 1;
  }, [data]);

  const isGlobalView = ['super_admin', 'auditor', 'admin', 'provisioned'].includes(user.role) ||
    user.is_auditor === 1 || user.is_auditor === true || hadMultipleOffices;
  const isManager = user.role === 'manager';
  const isOffice = user.role === 'office' && !isGlobalView;

  const [activeReport, setActiveReport] = useState('cc');
  const [targetOffice, setTargetOffice] = useState(isGlobalView ? 'All' : user.office_name);
  const reportRef = useRef();
  const ccRef = useRef();
  const sqdRef = useRef();
  const tabRef = useRef();
  const scoreRef = useRef();
  const [showDlMenu, setShowDlMenu] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Document codes per report type — must match the footer of each report component
  const DOC_CODES = {
    cc: 'MGG-IMS-006.F03',
    sqd: 'MGG-IMS-006.F04',
    'csm-tab': 'MGG-IMS-006.F02',
    'csm-score': 'MGG-IMS-006.F05',
  };

  // Get office abbreviation from the allOffices master list (uses the abbreviation field from office-management)
  const officeAbbr = useMemo(() => {
    if (!targetOffice || targetOffice === 'All' || targetOffice === 'NPC Mindanao Generation') return 'ALL';
    const match = (Array.isArray(allOffices) ? allOffices : [])
      .find(o => o.name?.toUpperCase() === (targetOffice ?? '').toUpperCase());
    return (match?.abbreviation || targetOffice).toUpperCase().replace(/\s+/g, '');
  }, [targetOffice, allOffices]);

  const [reportPeriod] = useState({ range: "JANUARY TO MARCH", year: "2026" }); // kept for legacy, replaced by filter
  const [allPossibleServices, setAllPossibleServices] = useState([]);

  // Separate filter state — controls what data is shown in the report
  const [filterMode, setFilterMode] = useState('quarter'); // 'quarter' | 'range'
  const [filterPeriod, setFilterPeriod] = useState({ range: "ALL", year: String(new Date().getFullYear()) });
  const [dateRange, setDateRange] = useState({
    fromMonth: '1', fromYear: String(new Date().getFullYear()),
    toMonth: '12', toYear: String(new Date().getFullYear()),
  });

  const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

  // fullPeriodString derived from the active filter — drives the printed label on all reports
  const fullPeriodString = useMemo(() => {
    if (filterMode === 'range') {
      const fm = MONTHS[parseInt(dateRange.fromMonth) - 1];
      const tm = MONTHS[parseInt(dateRange.toMonth) - 1];
      return dateRange.fromYear === dateRange.toYear
        ? `${fm} to ${tm} ${dateRange.toYear}`
        : `${fm} ${dateRange.fromYear} to ${tm} ${dateRange.toYear}`;
    }
    if (filterPeriod.range === 'ALL') return `Full Year ${filterPeriod.year}`;
    return `${filterPeriod.range} ${filterPeriod.year}`;
  }, [filterMode, filterPeriod, dateRange]);

  // Compact period string for filenames e.g. Q1-2026, Jan-Nov-2026
  const filenamePeriod = useMemo(() => {
    const SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    if (filterMode === 'range') {
      const fm = SHORT[parseInt(dateRange.fromMonth) - 1];
      const tm = SHORT[parseInt(dateRange.toMonth) - 1];
      return dateRange.fromYear === dateRange.toYear
        ? `${fm}-${tm}-${dateRange.toYear}`
        : `${fm}${dateRange.fromYear}-${tm}${dateRange.toYear}`;
    }
    if (filterPeriod.range === 'ALL') return `FY${filterPeriod.year}`;
    const qMap = {
      'JANUARY TO MARCH': 'Q1', 'APRIL TO JUNE': 'Q2',
      'JULY TO SEPTEMBER': 'Q3', 'OCTOBER TO DECEMBER': 'Q4',
      'JANUARY TO DECEMBER': 'FY',
    };
    return `${qMap[filterPeriod.range] || 'Q'}${filterPeriod.year}`;
  }, [filterMode, filterPeriod, dateRange]);

  const QUARTER_MONTHS = {
    "JANUARY TO MARCH": { start: 1, end: 3 },
    "APRIL TO JUNE": { start: 4, end: 6 },
    "JULY TO SEPTEMBER": { start: 7, end: 9 },
    "OCTOBER TO DECEMBER": { start: 10, end: 12 },
    "JANUARY TO DECEMBER": { start: 1, end: 12 },
  };

  // Fetch all arta_services for the selected office scope
  useEffect(() => {
    const uid = user?.id || '';
    fetch(`http://localhost/MinGen%20CSM/minGen-api/survey/manage_services.php?user_id=${uid}`, {
      credentials: 'include'
    })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setAllPossibleServices(res.data || []);
      })
      .catch(() => { });
  }, [user?.id]);

  // Render a single ref to PDF blob
  const renderToPDF = async (element) => {
    const canvas = await html2canvas(element, {
      scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
      onclone: (clonedDoc) => {
        const el = clonedDoc.getElementById('printable-report');
        if (el) el.style.colorScheme = 'light';
      }
    });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 10;
    const imgWidth = pageWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
    return pdf;
  };

  const handleDownloadCurrent = async () => {
    setIsDownloading(true);
    setShowDlMenu(false);
    try {
      const element = reportRef.current;
      if (!element) return;
      const pdf = await renderToPDF(element);
      const code = DOC_CODES[activeReport] || 'CSM-REPORT';
      pdf.save(`${code}_${officeAbbr}_${filenamePeriod}.pdf`);
    } catch (err) {
      console.error("PDF Error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDownloadAll = async () => {
    setIsDownloading(true);
    setShowDlMenu(false);
    try {
      const zip = new JSZip();
      const refs = [
        { key: 'cc', ref: ccRef },
        { key: 'sqd', ref: sqdRef },
        { key: 'csm-tab', ref: tabRef },
        { key: 'csm-score', ref: scoreRef },
      ];
      for (const { key, ref } of refs) {
        if (!ref.current) continue;
        const pdf = await renderToPDF(ref.current);
        const code = DOC_CODES[key];
        const blob = pdf.output('blob');
        zip.file(`${code}_${officeAbbr}_${filenamePeriod}.pdf`, blob);
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `CSM_Reports_${officeAbbr}_${filenamePeriod}.zip`);
    } catch (err) {
      console.error("ZIP Error:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Excel workbook builder ────────────────────────────────────────────────
  const buildExcelWorkbook = () => {
    const wb = XLSX.utils.book_new();
    const total = reportData.length;

    const ratingLabel = (score) => {
      if (score === null || score === undefined) return '—';
      if (score >= 95) return 'Outstanding';
      if (score >= 90) return 'Very Satisfactory';
      if (score >= 80) return 'Satisfactory';
      if (score >= 60) return 'Fair';
      return 'Poor';
    };

    // Sheet 1: CC Report
    const ccCnt = (code, val) =>
      reportData.filter(d => Number(d[`${code.toLowerCase()}_val`] || d[code]) === Number(val)).length;
    const ccPct = (n) => total > 0 ? `${((n / total) * 100).toFixed(0)}%` : '0%';

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['CSM Evaluation Sheet — Part A: CC Report'],
      ['Office', displayOfficeName, 'Period', fullPeriodString],
      ['Total Submissions', total],
      [],
      ['Question / Option', '', 'Responses', 'Percentage'],
      ['CC1: Which best describes awareness of a CC?'],
      ['', '1 — I know what a CC is and I saw this office\'s CC.', ccCnt('CC1', 1), ccPct(ccCnt('CC1', 1))],
      ['', '2 — I know what a CC is but did NOT see this office\'s CC.', ccCnt('CC1', 2), ccPct(ccCnt('CC1', 2))],
      ['', '3 — I learned of the CC only when I saw this office\'s CC.', ccCnt('CC1', 3), ccPct(ccCnt('CC1', 3))],
      ['', '4 — I do not know what a CC is and did not see one.', ccCnt('CC1', 4), ccPct(ccCnt('CC1', 4))],
      ['CC2: If aware of CC, was the CC...?'],
      ['', '1 — Easy to see', ccCnt('CC2', 1), ccPct(ccCnt('CC2', 1))],
      ['', '2 — Somewhat easy to see', ccCnt('CC2', 2), ccPct(ccCnt('CC2', 2))],
      ['', '3 — Difficult to see', ccCnt('CC2', 3), ccPct(ccCnt('CC2', 3))],
      ['', '4 — Not visible at all', ccCnt('CC2', 4), ccPct(ccCnt('CC2', 4))],
      ['CC3: How much did the CC help you?'],
      ['', '1 — Helped very much', ccCnt('CC3', 1), ccPct(ccCnt('CC3', 1))],
      ['', '2 — Somewhat helped', ccCnt('CC3', 2), ccPct(ccCnt('CC3', 2))],
      ['', '3 — Did not help', ccCnt('CC3', 3), ccPct(ccCnt('CC3', 3))],
    ]), 'CC Report');

    // Sheet 2: SQD Analysis
    const sqdDims = [
      { id: 'sqd0', label: 'SQD0 — Overall Experience' },
      { id: 'sqd1', label: 'SQD1 — Responsiveness' },
      { id: 'sqd2', label: 'SQD2 — Reliability' },
      { id: 'sqd3', label: 'SQD3 — Access and Facilities' },
      { id: 'sqd4', label: 'SQD4 — Communication' },
      { id: 'sqd5', label: 'SQD5 — Costs' },
      { id: 'sqd6', label: 'SQD6 — Integrity' },
      { id: 'sqd7', label: 'SQD7 — Assurance' },
      { id: 'sqd8', label: 'SQD8 — Outcome' },
    ];
    const sqdCnt = (id, rating) => reportData.filter(d => {
      const key = `${id.toLowerCase()}_val`;
      return Number(d[key] || d[id.toUpperCase()]) === Number(rating);
    }).length;
    const sqdScore = (id) => {
      const key = `${id.toLowerCase()}_val`;
      const valid = reportData.filter(d => {
        const v = d[key] || d[id.toUpperCase()];
        return v && Number(v) !== 0;
      });
      if (!valid.length) return 0;
      const sum = valid.reduce((acc, d) => acc + Number(d[key] || d[id.toUpperCase()]), 0);
      return parseFloat(((sum / valid.length / 5) * 100).toFixed(2));
    };
    const mainSqdDims = sqdDims.slice(1);
    const mainSqdScores = mainSqdDims.map(d => sqdScore(d.id));
    const overallSqdAvg = parseFloat((mainSqdScores.reduce((a, b) => a + b, 0) / 8).toFixed(2));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['CSM Evaluation Sheet — Part B: SQD Analysis'],
      ['Office', displayOfficeName, 'Period', fullPeriodString],
      [],
      ['Dimension', 'Strongly Agree (5)', 'Agree (4)', 'Neither (3)', 'Disagree (2)', 'Strongly Disagree (1)', 'N/A (0)', 'Total Responses', 'Overall Score (%)', 'Rating'],
      ...sqdDims.map(dim => {
        const score = sqdScore(dim.id);
        const rowTotal = reportData.filter(d => d[`${dim.id}_val`] !== undefined || d[dim.id.toUpperCase()] !== undefined).length;
        return [dim.label, sqdCnt(dim.id, 5), sqdCnt(dim.id, 4), sqdCnt(dim.id, 3), sqdCnt(dim.id, 2), sqdCnt(dim.id, 1), sqdCnt(dim.id, 0), rowTotal, score, ratingLabel(score)];
      }),
      [
        'Overall (SQD1–8)',
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 5), 0),
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 4), 0),
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 3), 0),
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 2), 0),
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 1), 0),
        mainSqdDims.reduce((a, d) => a + sqdCnt(d.id, 0), 0),
        reportData.length * 8,
        overallSqdAvg,
        ratingLabel(overallSqdAvg),
      ],
    ]), 'SQD Analysis');

    // Sheet 3: CSM Tabulation
    const tabMap = {};
    filteredPossibleServices.forEach(s => {
      const name = s.service_name?.toUpperCase().trim();
      if (!name) return;
      tabMap[name] = { service_name: name, type: (s.service_type || 'INTERNAL').toUpperCase(), responses: 0, transactions: 0 };
    });
    reportData.forEach(sub => {
      const name = sub.service_name?.toUpperCase().trim();
      if (!name) return;
      const type = (sub.service_type || 'INTERNAL').toUpperCase();
      if (tabMap[name]) {
        tabMap[name].responses += 1;
        tabMap[name].transactions += 1;
        tabMap[name].type = type;
      } else {
        tabMap[name] = { service_name: name, type, responses: 1, transactions: 1 };
      }
    });
    const tabServices = Object.values(tabMap);
    const tabExt = tabServices.filter(s => s.type === 'EXTERNAL' && s.responses > 0);
    const tabInt = tabServices.filter(s => s.type === 'INTERNAL' && s.responses > 0);
    const tabNoClients = tabServices.filter(s => s.transactions === 0);
    const tabTotalR = tabServices.reduce((sum, s) => sum + s.responses, 0);
    const tabTotalT = tabServices.reduce((sum, s) => sum + s.transactions, 0);
    const tabRows = [
      ['CSM Tabulation — Part C'],
      ['Office', displayOfficeName, 'Period', fullPeriodString],
      [],
      ['Service Name', 'Type', 'Responses', 'Total Transactions'],
      ...tabExt.map(s => [s.service_name, 'EXTERNAL', s.responses, s.transactions]),
      ...tabInt.map(s => [s.service_name, 'INTERNAL', s.responses, s.transactions]),
      ['TOTAL', '', tabTotalR, tabTotalT],
    ];
    if (tabNoClients.length) {
      tabRows.push([], ['Services with No Clients for Period:'], ...tabNoClients.map(s => [s.service_name, s.type, 0, 0]));
    }
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tabRows), 'CSM Tabulation');

    // Sheet 4: Score Per Service
    const SQD_KEYS = ['SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8'];
    const computeAgreePct = (subs) => {
      let agree = 0, valid = 0;
      subs.forEach(sub => {
        SQD_KEYS.forEach(key => {
          const raw = sub[key] ?? sub[key.toLowerCase()] ?? sub[key.toLowerCase() + '_val'];
          const r = parseInt(raw);
          if (!raw || isNaN(r) || r === 0) return;
          valid++;
          if (r >= 4) agree++;
        });
      });
      return valid > 0 ? parseFloat(((agree / valid) * 100).toFixed(2)) : null;
    };
    const scoreMap = {};
    filteredPossibleServices.forEach(s => {
      const name = s.service_name?.toUpperCase().trim();
      if (!name) return;
      scoreMap[name] = { service_name: name, type: (s.service_type || 'INTERNAL').toUpperCase(), subs: [] };
    });
    reportData.forEach(sub => {
      const name = sub.service_name?.toUpperCase().trim() || 'UNKNOWN';
      const type = (sub.service_type || 'INTERNAL').toUpperCase();
      if (!scoreMap[name]) scoreMap[name] = { service_name: name, type, subs: [] };
      scoreMap[name].subs.push(sub);
    });
    const scoreServices = Object.values(scoreMap).map(g => ({ ...g, respondents: g.subs.length, score: computeAgreePct(g.subs) }));
    const scoreExt = scoreServices.filter(s => s.type === 'EXTERNAL');
    const scoreInt = scoreServices.filter(s => s.type === 'INTERNAL');
    const computeGroupPct = (group) => computeAgreePct(group.flatMap(g => g.subs));
    const extGroupScore = computeGroupPct(scoreExt);
    const intGroupScore = computeGroupPct(scoreInt);
    const overallPct = computeAgreePct(reportData);

    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
      ['Score Per Service — Part D'],
      ['Office', displayOfficeName, 'Period', fullPeriodString],
      [],
      ['Service Name', 'Type', 'Respondents', 'Overall Score (%)', 'Rating'],
      ['— EXTERNAL SERVICES —'],
      ...scoreExt.map(s => [s.service_name, 'EXTERNAL', s.respondents, s.score ?? 0, ratingLabel(s.score)]),
      ['External Total', '', scoreExt.reduce((a, s) => a + s.respondents, 0), extGroupScore ?? 0, ratingLabel(extGroupScore)],
      ['— INTERNAL SERVICES —'],
      ...scoreInt.map(s => [s.service_name, 'INTERNAL', s.respondents, s.score ?? 0, ratingLabel(s.score)]),
      ['Internal Total', '', scoreInt.reduce((a, s) => a + s.respondents, 0), intGroupScore ?? 0, ratingLabel(intGroupScore)],
      ['Overall Total', '', reportData.length, overallPct ?? 0, ratingLabel(overallPct)],
    ]), 'Score Per Service');

    return wb;
  };

  // ─── All Reports — single multi-page PDF ───────────────────────────────────
  const handleDownloadAllPDF = async () => {
    setIsDownloading(true);
    setShowDlMenu(false);
    try {
      const refs = [ccRef, sqdRef, tabRef, scoreRef];
      let pdf = null;
      for (const ref of refs) {
        if (!ref.current) continue;
        const canvas = await html2canvas(ref.current, {
          scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff',
          onclone: (clonedDoc) => {
            const el = clonedDoc.getElementById('printable-report') || clonedDoc.getElementById('printable-tabulation');
            if (el) el.style.colorScheme = 'light';
          }
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (!pdf) {
          pdf = new jsPDF('p', 'mm', 'a4');
        } else {
          pdf.addPage();
        }
        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 10;
        const imgWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        pdf.addImage(imgData, 'JPEG', margin, margin, imgWidth, imgHeight);
      }
      if (pdf) pdf.save(`CSM_AllReports_${officeAbbr}_${filenamePeriod}.pdf`);
    } catch (err) {
      console.error('All PDF Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  // ─── Excel Workbook ────────────────────────────────────────────────────────
  const handleDownloadExcel = () => {
    setShowDlMenu(false);
    const wb = buildExcelWorkbook();
    XLSX.writeFile(wb, `CSM_Reports_${officeAbbr}_${filenamePeriod}.xlsx`);
  };

  // ─── Full Audit Bundle — Excel + all PDFs in ZIP ───────────────────────────
  const handleDownloadBundle = async () => {
    setIsDownloading(true);
    setShowDlMenu(false);
    try {
      const zip = new JSZip();
      const wb = buildExcelWorkbook();
      zip.file(`CSM_Reports_${officeAbbr}_${filenamePeriod}.xlsx`, XLSX.write(wb, { bookType: 'xlsx', type: 'array' }));
      const refs = [
        { key: 'cc', ref: ccRef },
        { key: 'sqd', ref: sqdRef },
        { key: 'csm-tab', ref: tabRef },
        { key: 'csm-score', ref: scoreRef },
      ];
      for (const { key, ref } of refs) {
        if (!ref.current) continue;
        const pdf = await renderToPDF(ref.current);
        zip.file(`${DOC_CODES[key]}_${officeAbbr}_${filenamePeriod}.pdf`, pdf.output('blob'));
      }
      saveAs(await zip.generateAsync({ type: 'blob' }), `CSM_AuditBundle_${officeAbbr}_${filenamePeriod}.zip`);
    } catch (err) {
      console.error('Bundle Error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const [signatories, setSignatories] = useState(() => {
    const saved = localStorage.getItem('report_signatories');
    return saved ? JSON.parse(saved) : {
      preparedName: '', preparedTitle: '',
      reviewedName: '', reviewedTitle: '',
      approvedName: '', approvedTitle: '',
      additionalName: '', additionalTitle: '', additionalLabel: 'Noted By'
    };
  });

  useEffect(() => {
    if (!showDlMenu) return;
    const close = (e) => setShowDlMenu(false);
    // Use setTimeout so this listener doesn't catch the same click that opened the menu
    const timer = setTimeout(() => document.addEventListener('click', close), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', close);
    };
  }, [showDlMenu]);

  useEffect(() => {
    if (isGlobalView && targetOffice !== 'All' && !isManager) setTargetOffice('All');
  }, [isGlobalView, isManager]);

  useEffect(() => {
    localStorage.setItem('report_signatories', JSON.stringify(signatories));
  }, [signatories]);

  const updateSignatory = (key, value) => setSignatories(prev => ({ ...prev, [key]: value }));

  const reportData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let filtered = isGlobalView && targetOffice === 'All'
      ? data
      : data.filter(d => d.office_name?.toString().toUpperCase() === (targetOffice ?? '').toUpperCase());

    if (filterMode === 'quarter') {
      // Quarter + year filter
      if (filterPeriod.range !== 'ALL') {
        const { start, end } = QUARTER_MONTHS[filterPeriod.range] || {};
        const year = parseInt(filterPeriod.year);
        if (start && end && year) {
          filtered = filtered.filter(d => {
            const date = new Date(d.created_at);
            const m = date.getMonth() + 1;
            const y = date.getFullYear();
            return y === year && m >= start && m <= end;
          });
        }
      } else {
        const year = parseInt(filterPeriod.year);
        filtered = filtered.filter(d => new Date(d.created_at).getFullYear() === year);
      }
    } else {
      // Custom date range filter
      const from = new Date(parseInt(dateRange.fromYear), parseInt(dateRange.fromMonth) - 1, 1);
      const to = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth), 0); // last day of toMonth
      filtered = filtered.filter(d => {
        const date = new Date(d.created_at);
        return date >= from && date <= to;
      });
    }

    return filtered;
  }, [data, targetOffice, isGlobalView, filterMode, filterPeriod, dateRange]);

  // Filter allPossibleServices to match the selected office — keeps "no clients" section accurate
  const filteredPossibleServices = useMemo(() => {
    if (!allPossibleServices.length) return [];
    if (isGlobalView && targetOffice === 'All') return allPossibleServices;
    return allPossibleServices.filter(
      s => s.office_name?.toUpperCase() === (targetOffice ?? '').toUpperCase()
    );
  }, [allPossibleServices, targetOffice, isGlobalView]);

  const offices = useMemo(() => {
    const masterList = Array.isArray(allOffices) ? allOffices : [];
    const namesFromData = [...new Set(data.map(d => d.office_name?.toUpperCase()))].filter(Boolean).sort();

    if (isGlobalView) {
      // Provisioned users: backend already scoped the data to their offices.
      // Derive the dropdown from the returned data — avoids stale assigned_office_ids in localStorage.
      if (user.role === 'provisioned') {
        return ['All', ...namesFromData];
      }
      // Super-admin / global roles: show every office
      const unique = masterList.length > 0
        ? [...new Set(masterList.map(o => o.name?.toUpperCase()))].filter(Boolean).sort()
        : namesFromData;
      return ['All', ...unique];
    }
    if (isManager) {
      const plantOffices = masterList.filter(o =>
        String(o.plant_name || '').toLowerCase() === String(user.plant_name || '').toLowerCase()
      );
      return plantOffices.length > 0
        ? plantOffices.map(o => (o.name || 'Unknown').toUpperCase()).sort()
        : [user.office_name?.toUpperCase()];
    }
    return [user.office_name?.toUpperCase() || 'OFFICE NOT FOUND'];
  }, [allOffices, data, user, isGlobalView, isManager]);

  const displayOfficeName = targetOffice === 'All' ? 'NPC Mindanao Generation' : targetOffice;
  const activeOfficeCount = [...new Set(data.map(d => d.office_id))].length;

  return (
    <div className="max-w-7xl mx-auto p-2 md:px-8 md:py-1 space-y-5 antialiased text-slate-800 animate-in fade-in duration-700">
      <div className="max-w-5xl mx-auto">

        {/* PAGE HEADER */}
        <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0] mb-4">
          <div className="shrink-0">
            <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Page</p>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">Compliance Center</h1>
          </div>
          <div className="ml-auto flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] leading-none mb-0.5">Office Context</p>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{user.plant_name || 'General HQ'}</p>
            </div>
            <div className="h-9 w-9 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black italic">05</div>
          </div>
        </header>

        {/* SETTINGS RIBBON */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 mb-4 space-y-3">

          {/* Signatories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <SignatoryInput label="Prepared By" nKey="preparedName" tKey="preparedTitle" vals={signatories} update={updateSignatory} />
            <SignatoryInput label="Reviewed By" nKey="reviewedName" tKey="reviewedTitle" vals={signatories} update={updateSignatory} />
            <SignatoryInput label="Approved By" nKey="approvedName" tKey="approvedTitle" vals={signatories} update={updateSignatory} />
            <div className="flex flex-col gap-1">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">Custom Role</span>
              <input type="text" placeholder="e.g. Noted By"
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all placeholder:normal-case placeholder:text-slate-300 placeholder:font-normal"
                value={signatories.additionalLabel || ''} onChange={(e) => updateSignatory('additionalLabel', e.target.value)} />
              <input type="text" placeholder="Full Name"
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all placeholder:normal-case placeholder:text-slate-300 placeholder:font-normal"
                value={signatories.additionalName} onChange={(e) => updateSignatory('additionalName', e.target.value)} />
              <input type="text" placeholder="Designation"
                className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all placeholder:normal-case placeholder:text-slate-300 placeholder:font-normal"
                value={signatories.additionalTitle} onChange={(e) => updateSignatory('additionalTitle', e.target.value)} />
            </div>
          </div>
        </div>

        {/* CONTROL BAR */}
        <div className="flex flex-wrap justify-between items-center gap-y-2 border-y border-slate-200 bg-slate-50 px-4 py-2 mb-4">

          {/* Left: Period filter + Live Stats */}
          <div className="flex flex-wrap items-center gap-2">

            {/* Mode toggle */}
            <div className="flex bg-white border border-slate-200 rounded-md overflow-hidden h-7 shrink-0">
              <button
                onClick={() => setFilterMode('quarter')}
                className={`px-3 text-[8px] font-black uppercase tracking-widest transition-all ${filterMode === 'quarter' ? 'bg-[#001d3d] text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >Quarter</button>
              <button
                onClick={() => setFilterMode('range')}
                className={`px-3 text-[8px] font-black uppercase tracking-widest transition-all ${filterMode === 'range' ? 'bg-[#001d3d] text-white' : 'text-slate-400 hover:text-slate-600'}`}
              >Range</button>
            </div>

            <div className="w-px h-4 bg-slate-200 shrink-0"></div>

            {/* Quarter mode */}
            {filterMode === 'quarter' && (
              <>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={filterPeriod.range}
                  onChange={(e) => setFilterPeriod(prev => ({ ...prev, range: e.target.value }))}
                >
                  <option value="ALL">All Quarters</option>
                  <option value="JANUARY TO MARCH">Q1 — Jan to Mar</option>
                  <option value="APRIL TO JUNE">Q2 — Apr to Jun</option>
                  <option value="JULY TO SEPTEMBER">Q3 — Jul to Sep</option>
                  <option value="OCTOBER TO DECEMBER">Q4 — Oct to Dec</option>
                  <option value="JANUARY TO DECEMBER">Full Year</option>
                </select>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={filterPeriod.year}
                  onChange={(e) => setFilterPeriod(prev => ({ ...prev, year: e.target.value }))}
                >
                  {Array.from({ length: (new Date().getFullYear() + 5) - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </>
            )}

            {/* Range mode */}
            {filterMode === 'range' && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">From</span>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={dateRange.fromMonth}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fromMonth: e.target.value }))}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={dateRange.fromYear}
                  onChange={(e) => setDateRange(prev => ({ ...prev, fromYear: e.target.value }))}
                >
                  {Array.from({ length: (new Date().getFullYear() + 5) - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest shrink-0">To</span>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={dateRange.toMonth}
                  onChange={(e) => setDateRange(prev => ({ ...prev, toMonth: e.target.value }))}
                >
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
                <select
                  className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 appearance-none cursor-pointer"
                  value={dateRange.toYear}
                  onChange={(e) => setDateRange(prev => ({ ...prev, toYear: e.target.value }))}
                >
                  {Array.from({ length: (new Date().getFullYear() + 5) - 2024 + 1 }, (_, i) => 2024 + i).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="w-px h-4 bg-slate-200 shrink-0"></div>
            <div className="flex flex-col leading-tight shrink-0">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Submissions: <span className="text-slate-700">{reportData.length}</span></span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Active Offices: <span className="text-slate-700">{activeOfficeCount}</span></span>
            </div>
          </div>

          {/* Right: Office Selector + Download */}
          <div className="flex items-center gap-2">
            {!isOffice && (
              <div className="flex items-center gap-1.5 px-2.5 h-8 border border-slate-200 rounded-lg bg-white">
                <Building2 size={11} className="text-slate-400 shrink-0" />
                <select
                  value={targetOffice}
                  onChange={(e) => setTargetOffice(e.target.value)}
                  className="text-[10px] font-bold text-slate-600 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                >
                  {offices.map(off => <option key={off} value={off}>{off}</option>)}
                </select>
              </div>
            )}
            <div className="relative">
              <button
                onClick={() => setShowDlMenu(v => !v)}
                disabled={isDownloading}
                className="h-8 flex items-center gap-1.5 bg-[#001d3d] hover:bg-slate-800 disabled:opacity-50 text-white px-4 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all active:scale-95"
              >
                <FileDown size={11} />
                {isDownloading ? 'Processing...' : 'Download'}
                <ChevronDown size={10} />
              </button>
              {showDlMenu && (
                <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[220px] animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100">
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Export Options</span>
                  </div>
                  <button onClick={handleDownloadCurrent} className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-blue-50 transition-colors flex items-center gap-2.5">
                    <FileDown size={11} className="text-blue-500 shrink-0" />
                    <span>Current Page <span className="text-slate-400 font-medium normal-case tracking-normal">— PDF</span></span>
                  </button>
                  <button onClick={handleDownloadAllPDF} className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-indigo-50 transition-colors flex items-center gap-2.5">
                    <FileDown size={11} className="text-indigo-500 shrink-0" />
                    <span>All Reports <span className="text-slate-400 font-medium normal-case tracking-normal">— PDF</span></span>
                  </button>
                  <div className="h-px bg-slate-100 mx-3 my-0.5"></div>
                  <button onClick={handleDownloadExcel} className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-emerald-50 transition-colors flex items-center gap-2.5">
                    <FileSpreadsheet size={11} className="text-emerald-500 shrink-0" />
                    <span>Excel Workbook <span className="text-slate-400 font-medium normal-case tracking-normal">— XLSX</span></span>
                  </button>
                  <div className="h-px bg-slate-100 mx-3 my-0.5"></div>
                  <button onClick={handleDownloadBundle} className="w-full text-left px-4 py-2.5 text-[9px] font-black uppercase tracking-widest text-slate-700 hover:bg-amber-50 transition-colors flex items-center gap-2.5">
                    <Archive size={11} className="text-amber-500 shrink-0" />
                    <span>Audit Bundle <span className="text-slate-400 font-medium normal-case tracking-normal">— ZIP</span></span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100/60 rounded-xl w-fit mx-auto mb-6 border border-slate-200">
          <TabButton active={activeReport === 'cc'} onClick={() => setActiveReport('cc')} icon={<ClipboardCheck size={13} />} label="Part A: CC Report" />
          <TabButton active={activeReport === 'sqd'} onClick={() => setActiveReport('sqd')} icon={<FileBarChart size={13} />} label="Part B: SQD Analysis" />
          <TabButton active={activeReport === 'csm-tab'} onClick={() => setActiveReport('csm-tab')} icon={<LayoutDashboard size={13} />} label="Part C: CSM Tabulation" />
          <TabButton active={activeReport === 'csm-score'} onClick={() => setActiveReport('csm-score')} icon={<FileText size={13} />} label="Part D: Score per Service" />
        </div>

        {/* REPORT CANVAS */}
        <div className="flex justify-center pb-32">
          <div
            ref={reportRef}
            id="printable-report"
            className="shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-sm overflow-hidden ring-1 ring-slate-200"
            style={{ backgroundColor: '#ffffff', color: '#000000', display: 'block' }}
          >
            {activeReport === 'cc' ? (
              <CCEvaluationTable reportData={reportData} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
            ) : activeReport === 'sqd' ? (
              <SQDEvaluationTable reportData={reportData} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
            ) : activeReport === 'csm-tab' ? (
              <CSMTabulationTable services={reportData} allPossibleServices={filteredPossibleServices} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
            ) : activeReport === 'csm-score' ? (
              <ScorePerService services={reportData} allPossibleServices={filteredPossibleServices} user={user} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
            ) : (
              <div className="p-32 w-[8.5in] text-center italic bg-white text-slate-300 font-medium uppercase tracking-[0.3em]">
                Select Report Component
              </div>
            )}
          </div>
        </div>

        {/* Hidden off-screen renders for "Download All" — always mounted, invisible */}
        <div style={{ position: 'fixed', top: '-9999px', left: '-9999px', pointerEvents: 'none', zIndex: -1 }}>
          <div ref={ccRef} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            <CCEvaluationTable reportData={reportData} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          </div>
          <div ref={sqdRef} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            <SQDEvaluationTable reportData={reportData} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          </div>
          <div ref={tabRef} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            <CSMTabulationTable services={reportData} allPossibleServices={filteredPossibleServices} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          </div>
          <div ref={scoreRef} style={{ backgroundColor: '#ffffff', color: '#000000' }}>
            <ScorePerService services={reportData} allPossibleServices={filteredPossibleServices} user={user} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          </div>
        </div>

      </div>
    </div>
  );
};

// --- SUB-COMPONENTS ---

const TabButton = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-200 ${active
      ? 'bg-white text-[#001d3d] shadow-sm'
      : 'text-slate-500 hover:text-slate-700 hover:bg-white/60'
      }`}
  >
    {icon}
    {label}
  </button>
);

const SignatoryInput = ({ label, nKey, tKey, vals, update }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em]">{label}</span>
    <input type="text" placeholder="Full Name"
      className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all placeholder:normal-case placeholder:text-slate-300 placeholder:font-normal"
      value={vals[nKey]} onChange={(e) => update(nKey, e.target.value)} />
    <input type="text" placeholder="Designation"
      className="h-8 px-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:border-blue-500 uppercase transition-all placeholder:normal-case placeholder:text-slate-300 placeholder:font-normal"
      value={vals[tKey]} onChange={(e) => update(tKey, e.target.value.toUpperCase())} />
  </div>
);
