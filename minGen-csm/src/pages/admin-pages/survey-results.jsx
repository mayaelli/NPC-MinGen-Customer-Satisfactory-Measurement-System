/**
 * survey-results.jsx — Feedback Stream Module
 *
 * Displays all survey submissions the logged-in user is authorized to see,
 * with filtering, pagination, individual PDF export, and bulk ZIP export.
 *
 * Data flow:
 *   Fetched once on mount from get_survey_results.php (already RBAC-scoped).
 *   All filtering (period, office, search, sort) is done CLIENT-SIDE in
 *   filteredData useMemo — no re-fetch on filter change. This keeps the UI
 *   fast but means the full authorized dataset is loaded upfront.
 *
 * Period filter:
 *   Two modes — Quarter (Q1–Q4 + Full Year) and date Range (from/to month+year).
 *   Mirrors the filter in reports-page.jsx. If you change the filter logic here,
 *   apply the same change there for consistency.
 *
 * Single-record PDF export (handleDownload):
 *   Captures the live React A4 template (printRef) using html2pdf.js.
 *   The template is the on-screen modal — Tailwind classes and images are
 *   already resolved because the element is in the DOM.
 *
 * Bulk ZIP export (handleBulkExport + renderSurveyToPDFBlob):
 *   For each filtered record, renders the A4 template as a hidden off-screen
 *   DOM node (left: -9999px), captures it with html2pdf.js using the same
 *   settings as single export, then packs all blobs into one JSZip archive.
 *   IMPORTANT: The hidden node uses the same Tailwind class names as the modal
 *   so the stylesheet applies correctly and the output is pixel-identical to
 *   single-record exports. Do NOT switch this to an HTML string approach —
 *   that was tried and broke font rendering and image loading.
 *
 * A4_PRINT_STYLE:
 *   Injected as a <style> tag when the modal is open. Controls browser print
 *   behavior for the window.print() fallback button.
 */
// General User inputs

import React, { useState, useEffect, useRef, useMemo } from 'react';
import html2pdf from 'html2pdf.js';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import {
  Search, RotateCcw, Filter, ChevronLeft, ChevronRight,
  Download, FileText, PieChart, User, Calendar, Layers,
  X, Printer, Archive
} from 'lucide-react';

const A4_PRINT_STYLE = `
  @media print {
    @page { size: A4; margin: 0; }
    body * { visibility: hidden !important; }
    .fixed.inset-0 {
      position: absolute !important; display: block !important;
      background: white !important; padding: 0 !important;
      overflow: visible !important; visibility: visible !important;
    }
    .print-container, .print-container * { visibility: visible !important; }
    .print-container {
      position: absolute !important; top: 0 !important; left: 0 !important;
      width: 210mm !important; height: 297mm !important; margin: 0 !important;
      padding: 12mm 15mm !important; border: none !important;
      box-shadow: none !important; background: white !important; display: block !important;
    }
    .no-print, button, .backdrop-blur-sm { display: none !important; }
  }
`;

// ── Quarter/month helpers (mirrors reports-page.jsx) ─────────────────────────
const MONTHS = [
  'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
];
const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const QUARTER_MONTHS = {
  'JANUARY TO MARCH': { start: 1, end: 3 },
  'APRIL TO JUNE': { start: 4, end: 6 },
  'JULY TO SEPTEMBER': { start: 7, end: 9 },
  'OCTOBER TO DECEMBER': { start: 10, end: 12 },
  'JANUARY TO DECEMBER': { start: 1, end: 12 },
};

// ── Render one survey into a PDF blob using the same html2pdf approach
//    as the single-record export — so fonts, Tailwind classes, and the
//    logo image are all resolved identically. ────────────────────────────────
const renderSurveyToPDFBlob = (survey) => {
  return new Promise((resolve, reject) => {
    // 1. Create a wrapper that positions the A4 node off-screen but still
    //    in the document so Tailwind styles and image URLs resolve normally.
    const wrapper = document.createElement('div');
    wrapper.style.cssText =
      'position:fixed;left:-9999px;top:0;width:794px;background:white;z-index:-1;';

    // 2. Build the same HTML structure used by the on-screen print-container.
    //    We inline the Tailwind class names here because the element is real
    //    DOM, not a React component — Tailwind's stylesheet already covers them.
    const sqdRow = (question, val) => {
      const c = (n) => (val == n ? '✔' : '');
      const na = (val == '0' || !val) ? '✔' : '';
      return `
        <tr>
          <td class="border-t-[0.5pt] border-l-[0.5pt] border-black px-3 h-[30px] w-[45%]">
            <div class="flex items-center h-full text-[7.5pt] leading-tight">${question}</div>
          </td>
          ${[1, 2, 3, 4, 5].map(n => `
            <td class="border-t-[0.5pt] border-l-[0.5pt] border-black p-0 h-[32px]">
              <div class="flex items-center justify-center w-full h-full text-[12pt] leading-none">${c(n)}</div>
            </td>`).join('')}
          <td class="border-t-[0.5pt] border-l-[0.5pt] border-r-[0.5pt] border-black p-0 h-[32px]">
            <div class="flex items-center justify-center w-full h-full text-[12pt] leading-none">${na}</div>
          </td>
        </tr>`;
    };
    const chk = (cond) => cond ? '☒' : '☐';
    const s = survey;

    wrapper.innerHTML = `
      <div
        class="bg-white w-[210mm] min-h-[297mm] p-[16mm] relative overflow-hidden"
        style="box-sizing:border-box;max-height:297mm;background:white;-webkit-font-smoothing:antialiased;"
      >
        <!-- AGENCY HEADER -->
        <div class="absolute top-[5mm] left-0 right-0 flex flex-col items-center text-center">
          <div class="mb-1">
            <img src="/npc-new-logo.png" alt="NPC Logo" class="w-15 h-15 object-contain"
                 style="width:60px;height:60px;object-fit:contain;" crossorigin="anonymous"/>
          </div>
          <div class="leading-tight">
            <h2 class="text-[10pt] font-bold">NATIONAL POWER CORPORATION</h2>
            <h3 class="text-[10pt] font-bold">MINDANAO GENERATION</h3>
            <h4 class="text-[10pt] font-bold">INTEGRATED MANAGEMENT SYSTEM</h4>
          </div>
        </div>

        <div class="h-[19mm]"></div>

        <!-- TITLE -->
        <div class="text-center mb-1 font-['Arial']">
          <h1 class="text-medium font-bold uppercase tracking-tight">Customer Satisfaction Measurement</h1>
          <p class="text-[9pt] leading-snug text-justify mx-auto max-w-[180mm]">
            This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices.
            Your feedback on your recently concluded transaction will help this office provide a better service.
            Personal information shared will be kept confidential and you always have the option not to answer this form.
          </p>
        </div>

        <!-- SECTION I: PERSONAL INFO -->
        <div class="border-1 border-black font-['Arial'] text-[9pt] mb-2">
          <div class="border-b-1 border-black p-2 flex items-end relative min-h-[30px]">
            <span class="mr-2">Customer Name/Signature:</span>
            <span class="uppercase font-bold">${s.full_name || ''}</span>
            ${s.signature ? `<img src="${s.signature}" class="absolute right-4 bottom-1 h-10 object-contain" alt="Signature"/>` : ''}
          </div>
          <div class="border-b-1 border-black p-2">
            <span>Designation/Position:</span><span class="ml-2 font-bold uppercase">${s.designation || ''}</span>
          </div>
          <div class="border-b-1 border-black p-2 flex gap-4 items-center">
            <span>Client type:</span>
            <div class="flex gap-3">
              <span class="flex items-center"><span class="mr-1">${chk(s.client_type === 'Citizen')}</span> Citizen</span>
              <span class="flex items-center"><span class="mr-1">${chk(s.client_type === 'Business')}</span> Business</span>
              <span class="flex items-center"><span class="mr-1">${chk(s.client_type === 'Government')}</span> Government (Employee or another agency)</span>
            </div>
          </div>
          <div class="grid grid-cols-[1fr_0.8fr_0.8fr] border-b-1 border-black">
            <div class="border-r-1 border-black p-2"><span>Date:</span><span class="ml-2 font-bold">${new Date(s.created_at).toLocaleDateString()}</span></div>
            <div class="border-r-1 border-black p-2 flex gap-2">
              <span>Sex:</span>
              <span>${s.sex === 'Male' ? '☒' : '☐'} Male</span>
              <span>${s.sex === 'Female' ? '☒' : '☐'} Female</span>
            </div>
            <div class="p-2"><span>Age:</span><span class="ml-2 font-bold">${s.age || ''}</span></div>
          </div>
          <div class="grid grid-cols-[0.8fr_1.2fr] border-b-1 border-black">
            <div class="border-r-1 border-black p-2"><span>Region of residence:</span><span class="ml-2 font-bold uppercase">${s.region || ''}</span></div>
            <div class="p-1"><span>Service Availed:</span><span class="ml-1 underline text-[7pt] font-bold uppercase">${s.service_name || ''}</span></div>
          </div>
          <div class="grid grid-cols-[1fr_1fr]">
            <div class="border-r-1 border-black p-2"><span class="mr-2">Email address:</span><span class="ml-2 font-bold">${s.email || ''}</span></div>
            <div class="p-2"><span>Telephone/Cellphone:</span><span class="ml-2 font-bold">${s.phone || ''}</span></div>
          </div>
        </div>

        <!-- SECTION II: CC -->
        <div class="font-['Arial'] text-[8.5pt] mb-2 leading-tight">
          <p class="mb-2"><span class="font-bold">INSTRUCTIONS:</span> Check mark ( ✔ ) your answer to the Citizen's Charter (CC) questions. The Citizen's Charter is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.</p>
          <div class="flex text-[7pt] gap-1">
            <div class="font-bold w-10">CC1</div>
            <div class="flex-1">
              <p class="mb-1">Which of the following best describes your awareness of a CC?</p>
              <div class="grid grid-cols-1 gap-1 ml-2">
                <div class="flex items-start gap-1"><span>${chk(s.CC1 == '1')}</span> 1. I know what a CC is and I saw this office's CC.</div>
                <div class="flex items-start gap-2"><span>${chk(s.CC1 == '2')}</span> 2. I know what a CC is but I did NOT see this office's CC.</div>
                <div class="flex items-start gap-2"><span>${chk(s.CC1 == '3')}</span> 3. I learned of the CC only when I saw this office's CC.</div>
                <div class="flex items-start gap-2"><span>${chk(s.CC1 == '4')}</span> 4. I do not know what a CC is and did not see one in this office. (Answer 'N/A' on CC2 and CC3)</div>
              </div>
            </div>
          </div>
          <div class="flex text-[7pt] gap-1">
            <div class="font-bold w-10">CC2</div>
            <div class="flex-1">
              <p class="mb-1">If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</p>
              <div class="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                <div class="flex items-center gap-2"><span>${chk(s.CC2 == '1')}</span> 1. Easy to see</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC2 == '4')}</span> 4. Not visible at all</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC2 == '2')}</span> 2. Somewhat easy to see</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC2 == '5')}</span> 5. N/A</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC2 == '3')}</span> 3. Difficult to see</div>
              </div>
            </div>
          </div>
          <div class="flex text-[7pt] gap-1">
            <div class="font-bold w-10">CC3</div>
            <div class="flex-1">
              <p class="mb-1">If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?</p>
              <div class="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                <div class="flex items-center gap-2"><span>${chk(s.CC3 == '1')}</span> 1. Helped very much</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC3 == '3')}</span> 3. Did not help</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC3 == '2')}</span> 2. Somewhat helped</div>
                <div class="flex items-center gap-2"><span>${chk(s.CC3 == '4')}</span> 4. N/A</div>
              </div>
            </div>
          </div>
        </div>

        <!-- SECTION III: SQD TABLE -->
        <div class="font-['Arial'] mb-2">
          <p class="text-[8pt] mb-1"><span class="text-[9pt] font-bold">INSTRUCTIONS: </span>For SQD 0-8, please put a check mark ( ✔ ) on the column that best corresponds to your answer.</p>
          <table class="w-full border-collapse border-[0.5pt] border-black text-[7pt] leading-none">
            <thead>
              <tr class="text-center">
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black p-2 w-[40%]"></th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Strongly Disagree</th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Disagree</th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[10%]">Neither Agree nor Disagree</th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Agree</th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Strongly Agree</th>
                <th class="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[3%]">N/A</th>
              </tr>
            </thead>
            <tbody>
              ${sqdRow('SQD0. I am satisfied with the service that I availed.', s.SQD0)}
              ${sqdRow('SQD1. I spent a reasonable amount of time for my transaction.', s.SQD1)}
              ${sqdRow("SQD2. The office followed the transaction's requirements and steps based on the information provided.", s.SQD2)}
              ${sqdRow('SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.', s.SQD3)}
              ${sqdRow('SQD4. I easily found information about my transaction from the office or its website.', s.SQD4)}
              ${sqdRow('SQD5. I paid a reasonable amount of fees for my transaction. (If service was free, mark the "N/A" column)', s.SQD5)}
              ${sqdRow('SQD6. I feel the office was fair to everyone, or "walang palakasan", during my transaction.', s.SQD6)}
              ${sqdRow('SQD7. I was treated courteously by the staff, and (if asked for help) the staff was helpful.', s.SQD7)}
              ${sqdRow('SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.', s.SQD8)}
            </tbody>
          </table>
        </div>

        <!-- SUGGESTIONS -->
        <div class="font-['Arial'] mb-1">
          <p class="text-[9pt]">Suggestions on how we can further improve our services (optional):</p>
          <div class="ml-2 text-[9pt] underline font-normal">${s.suggestions || ''}</div>
        </div>

        <!-- FOOTER -->
        <div class="absolute bottom-[8mm] left-[12mm] font-['Arial'] text-[6pt] flex flex-col items-start font-bold">
          <span>MGG-IMS-006.F01</span>
          <span>Rev. No. 0</span>
        </div>
      </div>
    `;

    document.body.appendChild(wrapper);

    const element = wrapper.firstElementChild;
    const opt = {
      margin: 0,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 4, useCORS: true, width: 794, windowWidth: 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    html2pdf()
      .set(opt)
      .from(element)
      .toPdf()
      .get('pdf')
      .then((pdf) => {
        const totalPages = pdf.internal.getNumberOfPages();
        if (totalPages > 1) pdf.deletePage(totalPages);
        return pdf.output('blob');
      })
      .then((blob) => {
        document.body.removeChild(wrapper);
        resolve(blob);
      })
      .catch((err) => {
        if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
        reject(err);
      });
  });
};

// ─────────────────────────────────────────────────────────────────────────────

const SurveyResults = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user] = useState(() => JSON.parse(localStorage.getItem('user')) || {});
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const printRef = useRef();

  // ── Period filter state (mirrors reports-page) ────────────────────────────
  const [filterMode, setFilterMode] = useState('quarter');
  const [filterPeriod, setFilterPeriod] = useState({ range: 'ALL', year: String(new Date().getFullYear()) });
  const [dateRange, setDateRange] = useState({
    fromMonth: '1', fromYear: String(new Date().getFullYear()),
    toMonth: '12', toYear: String(new Date().getFullYear()),
  });

  // ── Office filter ─────────────────────────────────────────────────────────
  const [selectedOffice, setSelectedOffice] = useState('All');

  // ── Bulk export state ─────────────────────────────────────────────────────
  const [exportProgress, setExportProgress] = useState(null);
  // null | { current: number, total: number, status: 'running'|'done'|'error' }

  const API_URL = 'http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php';

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = () => {
    setLoading(true);
    setError(null);
    const userId = user?.id;
    const url = userId ? `${API_URL}?user_id=${userId}` : API_URL;
    fetch(url, { method: 'GET', credentials: 'include' })
      .then(r => r.json())
      .then(res => {
        if (res.status === 'success') setData(res.data);
        else setError(res.message || 'Failed to load data.');
      })
      .catch(() => setError('Network error — could not reach the server.'))
      .finally(() => setLoading(false));
  };

  // ── Single-record PDF (existing behaviour, unchanged) ─────────────────────
  const handleDownload = () => {
    const element = printRef.current;
    const opt = {
      margin: 0,
      filename: `CSM_${selectedSurvey.full_name}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 4, useCORS: true, width: 794, windowWidth: 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };
    html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      if (totalPages > 1) pdf.deletePage(totalPages);
    }).save();
  };

  // ── Derive unique office names from loaded data ───────────────────────────
  const officeOptions = useMemo(() => {
    const names = [...new Set(data.map(d => d.office_name).filter(Boolean))].sort();
    return ['All', ...names];
  }, [data]);

  // ── Period label for filenames ────────────────────────────────────────────
  const filenamePeriod = useMemo(() => {
    if (filterMode === 'range') {
      const fm = SHORT_MONTHS[parseInt(dateRange.fromMonth) - 1];
      const tm = SHORT_MONTHS[parseInt(dateRange.toMonth) - 1];
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

  // ── Master filtered dataset (search + period + office) ───────────────────
  const filteredData = useMemo(() => {
    let result = [...data];

    // 1. Period filter
    if (filterMode === 'quarter') {
      if (filterPeriod.range !== 'ALL') {
        const { start, end } = QUARTER_MONTHS[filterPeriod.range] || {};
        const year = parseInt(filterPeriod.year);
        if (start && end && year) {
          result = result.filter(d => {
            const date = new Date(d.created_at);
            const m = date.getMonth() + 1;
            return date.getFullYear() === year && m >= start && m <= end;
          });
        }
      } else {
        const year = parseInt(filterPeriod.year);
        result = result.filter(d => new Date(d.created_at).getFullYear() === year);
      }
    } else {
      const from = new Date(parseInt(dateRange.fromYear), parseInt(dateRange.fromMonth) - 1, 1);
      const to = new Date(parseInt(dateRange.toYear), parseInt(dateRange.toMonth), 0);
      result = result.filter(d => {
        const date = new Date(d.created_at);
        return date >= from && date <= to;
      });
    }

    // 2. Office filter
    if (selectedOffice !== 'All') {
      result = result.filter(d =>
        (d.office_name || '').toUpperCase() === selectedOffice.toUpperCase()
      );
    }

    // 3. Search
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      result = result.filter(d =>
        (d.full_name || '').toLowerCase().includes(s) ||
        (d.email || '').toLowerCase().includes(s) ||
        (d.office_name || '').toLowerCase().includes(s) ||
        (d.service_name || '').toLowerCase().includes(s)
      );
    }

    // 4. Sort
    result.sort((a, b) => {
      const da = new Date(a.created_at), db = new Date(b.created_at);
      return sortOrder === 'asc' ? da - db : db - da;
    });

    return result;
  }, [data, filterMode, filterPeriod, dateRange, selectedOffice, searchTerm, sortOrder]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const itemsPerPage = 10;
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  // Reset to page 1 whenever filters change
  useEffect(() => { setCurrentPage(1); }, [filterMode, filterPeriod, dateRange, selectedOffice, searchTerm]);

  // ── Insight panel (only when search is active) ────────────────────────────
  const userInsights = (searchTerm.length >= 2 && filteredData.length > 0) ? {
    title: user.role === 'manager' ? `${user.plant_name} Overview` : 'Unit Dashboard',
    subtitle: user.role === 'manager' ? 'Department-Wide Feed' : 'Office Feed',
    totalVisits: filteredData.length,
    offices: [...new Set(filteredData.map(d => d.office_name))],
    services: [...new Set(filteredData.map(d => d.service_name))],
    avgRating: (filteredData.reduce((acc, cur) => acc + parseFloat(cur.avg_rating || 0), 0) / filteredData.length).toFixed(1),
  } : null;

  // ── Bulk ZIP export ───────────────────────────────────────────────────────
  const handleBulkExport = async () => {
    if (filteredData.length === 0) return;

    const officeLabel = selectedOffice === 'All' ? 'ALL-OFFICES' : selectedOffice.replace(/\s+/g, '_');
    const zipName = `CSM_Surveys_${officeLabel}_${filenamePeriod}.zip`;

    setExportProgress({ current: 0, total: filteredData.length, status: 'running' });

    const zip = new JSZip();

    for (let i = 0; i < filteredData.length; i++) {
      const survey = filteredData[i];
      setExportProgress({ current: i + 1, total: filteredData.length, status: 'running' });

      try {
        const blob = await renderSurveyToPDFBlob(survey);
        const safeName = (survey.full_name || `record_${survey.id}`).replace(/[^a-zA-Z0-9_\- ]/g, '');
        const serial = String(i + 1).padStart(3, '0');
        zip.file(`CSM_${serial}_${safeName}.pdf`, blob);
      } catch (err) {
        console.error(`Failed to render survey ${survey.id}:`, err);
      }

      // Yield to the browser between renders so the UI stays responsive
      await new Promise(r => setTimeout(r, 0));
    }

    try {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, zipName);
      setExportProgress(prev => ({ ...prev, status: 'done' }));
    } catch (err) {
      console.error('ZIP generation failed:', err);
      setExportProgress(prev => ({ ...prev, status: 'error' }));
    }

    setTimeout(() => setExportProgress(null), 3000);
  };

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Records...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
      <p className="text-[11px] font-black text-red-500 uppercase tracking-widest">Failed to Load Data</p>
      <p className="text-[10px] text-slate-400">{error}</p>
      <button onClick={fetchResults} className="mt-2 px-4 py-2 bg-[#001d3d] text-white text-[9px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-800 transition-all">
        Retry
      </button>
    </div>
  );

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

  return (
    <div className="max-w-7xl mx-auto p-2 md:p-8 md:py-1 space-y-5 antialiased">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto mb-6">
        <header className="flex items-center gap-6 pb-3 border-b border-[#E2E8F0] print:hidden">
          <div className="shrink-0">
            <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.4em] leading-none mb-1">Page</p>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none">
              {user.role === 'manager' ? `${user.plant_name} Submissions` : 'Survey Feed'}
            </h1>
          </div>
          <div className="ml-auto flex items-center gap-4 shrink-0">
            {(user.role === 'super_admin' || user.role === 'admin' || user.role === 'manager' || user.is_auditor_enabled == 1) && (
              <button onClick={fetchResults} className="flex items-center gap-2 bg-[#001d3d] hover:bg-blue-800 px-4 py-2 rounded-lg text-white font-black text-[9px] uppercase tracking-widest transition-all active:scale-95">
                <RotateCcw size={12} /> Refresh ({data.length})
              </button>
            )}
            <div className="text-right">
              <p className="text-[8px] font-semibold text-slate-400 uppercase tracking-[0.3em] leading-none mb-0.5">Office Context</p>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none">{user.plant_name || 'General HQ'}</p>
            </div>
            <div className="h-9 w-9 border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-black italic">04</div>
          </div>
        </header>
      </div>

      {/* ── FILTER RIBBON ──────────────────────────────────────────────────── */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl px-5 py-3 space-y-3 print:hidden">

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

          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* Quarter mode selectors */}
          {filterMode === 'quarter' && (
            <>
              <select
                className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={filterPeriod.range}
                onChange={e => setFilterPeriod(p => ({ ...p, range: e.target.value }))}
              >
                <option value="ALL">All Quarters</option>
                <option value="JANUARY TO MARCH">Q1 — Jan to Mar</option>
                <option value="APRIL TO JUNE">Q2 — Apr to Jun</option>
                <option value="JULY TO SEPTEMBER">Q3 — Jul to Sep</option>
                <option value="OCTOBER TO DECEMBER">Q4 — Oct to Dec</option>
                <option value="JANUARY TO DECEMBER">Full Year</option>
              </select>
              <select
                className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={filterPeriod.year}
                onChange={e => setFilterPeriod(p => ({ ...p, year: e.target.value }))}
              >
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}

          {/* Range mode selectors */}
          {filterMode === 'range' && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">From</span>
              <select className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={dateRange.fromMonth} onChange={e => setDateRange(p => ({ ...p, fromMonth: e.target.value }))}>
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m.slice(0, 3)}</option>)}
              </select>
              <select className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={dateRange.fromYear} onChange={e => setDateRange(p => ({ ...p, fromYear: e.target.value }))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">To</span>
              <select className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={dateRange.toMonth} onChange={e => setDateRange(p => ({ ...p, toMonth: e.target.value }))}>
                {MONTHS.map((m, i) => <option key={m} value={String(i + 1)}>{m.slice(0, 3)}</option>)}
              </select>
              <select className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer"
                value={dateRange.toYear} onChange={e => setDateRange(p => ({ ...p, toYear: e.target.value }))}>
                {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          )}

          <div className="w-px h-4 bg-slate-200 shrink-0" />

          {/* Office filter — only shown for roles that see multiple offices */}
          {officeOptions.length > 2 && (
            <select
              className="h-7 px-2 bg-white border border-slate-200 rounded-md text-[9px] font-bold text-slate-600 outline-none focus:border-blue-500 cursor-pointer max-w-[200px]"
              value={selectedOffice}
              onChange={e => setSelectedOffice(e.target.value)}
            >
              {officeOptions.map(o => <option key={o} value={o}>{o === 'All' ? 'All Offices' : o}</option>)}
            </select>
          )}

          {/* Live count chip */}
          <span className="ml-auto text-[8px] font-black text-slate-400 bg-white border border-slate-200 px-2 py-1 rounded-md uppercase tracking-widest">
            {filteredData.length} record{filteredData.length !== 1 ? 's' : ''}
          </span>

          {/* Bulk export button */}
          <button
            onClick={handleBulkExport}
            disabled={filteredData.length === 0 || exportProgress?.status === 'running'}
            className="h-7 flex items-center gap-1.5 px-3 bg-[#001d3d] hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[8px] font-black uppercase tracking-widest rounded-md transition-all active:scale-95"
          >
            <Archive size={11} />
            Export ZIP ({filteredData.length})
          </button>
        </div>

        {/* ── Progress bar ── */}
        {exportProgress && (
          <div className="space-y-1.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">
                {exportProgress.status === 'running'
                  ? `Rendering ${exportProgress.current} of ${exportProgress.total}...`
                  : exportProgress.status === 'done'
                    ? `✓ Done — ${exportProgress.total} PDF${exportProgress.total !== 1 ? 's' : ''} packaged`
                    : '✗ Export failed'}
              </p>
              <p className="text-[8px] font-black tabular-nums text-slate-400">
                {Math.round((exportProgress.current / exportProgress.total) * 100)}%
              </p>
            </div>
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${exportProgress.status === 'done' ? 'bg-emerald-500' :
                  exportProgress.status === 'error' ? 'bg-red-500' : 'bg-blue-600'
                  }`}
                style={{ width: `${Math.round((exportProgress.current / exportProgress.total) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── SEARCH + SORT ───────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input
            type="text"
            placeholder="FILTER BY CLIENT, OFFICE, OR SERVICE..."
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
              <X size={18} />
            </button>
          )}
        </div>

        <button
          onClick={() => setSortOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm active:scale-95"
        >
          <Filter size={14} className="text-blue-600" />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* ── INSIGHT PANEL ───────────────────────────────────────────────────── */}
      {userInsights && (
        <div className="animate-in slide-in-from-top-4 duration-500">
          <div className="bg-[#001d3d] rounded-2xl shadow-2xl overflow-hidden border border-blue-900 ring-4 ring-blue-50/50">
            <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-8 items-center">
              <div className="lg:col-span-1 border-r border-blue-800/50 pr-6">
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-[0.2em] mb-1">{userInsights.subtitle}</p>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">{userInsights.title}</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                  <p className="text-[10px] text-blue-300 font-bold uppercase">{userInsights.totalVisits} Matches Found</p>
                </div>
              </div>
              <div className="lg:col-span-1">
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><PieChart size={12} /> Unit Reach</p>
                <div className="flex flex-wrap gap-1.5">
                  {userInsights.offices.map((off, i) => (
                    <span key={i} className="bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-blue-100">{off}</span>
                  ))}
                </div>
              </div>
              <div className="lg:col-span-1">
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Layers size={12} /> Service Context</p>
                <p className="text-[10px] text-blue-100/80 leading-relaxed font-bold uppercase">
                  {userInsights.services.slice(0, 3).join(' • ')}{userInsights.services.length > 3 && '...'}
                </p>
              </div>
              <div className="lg:col-span-1 flex flex-col items-center justify-center bg-blue-800/30 rounded-2xl py-4 border border-blue-700/50">
                <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest mb-1">Index Rating</p>
                <div className="text-4xl font-black text-white italic tracking-tighter">{userInsights.avgRating}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MAIN TABLE ──────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden animate-in fade-in duration-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                <th className="px-8 py-5 w-24">Serial</th>
                <th className="px-8 py-5">Client Identity</th>
                <th className="px-8 py-5">Operational Node</th>
                <th className="px-8 py-5 text-center">CSM Score</th>
                <th className="px-8 py-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentItems.length > 0 ? currentItems.map((row, index) => {
                const seqId = sortOrder === 'desc'
                  ? filteredData.length - (indexOfFirst + index)
                  : indexOfFirst + index + 1;
                return (
                  <tr
                    key={row.id}
                    onClick={() => setSelectedSurvey(row)}
                    className="hover:bg-blue-50/50 cursor-pointer transition-all group border-l-4 border-transparent hover:border-blue-600"
                  >
                    <td className="px-8 py-6 font-mono text-[11px] font-black text-slate-300 group-hover:text-blue-600 transition-colors">
                      #{String(seqId).padStart(3, '0')}
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                          <User size={14} />
                        </div>
                        <div>
                          <p className="text-[11px] font-black text-slate-700 uppercase tracking-tight">{row.full_name}</p>
                          <p className="text-[9px] font-bold text-slate-400 lowercase">{row.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 uppercase">
                      <p className="text-[11px] font-black text-slate-600 tracking-tighter">{row.office_name}</p>
                      <p className="text-[9px] font-bold text-slate-400 italic truncate max-w-[200px] mt-0.5">{row.service_name}</p>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <span className={`inline-flex items-center justify-center w-12 py-1.5 rounded-xl font-black text-[11px] shadow-sm ${parseFloat(row.avg_rating) >= 4 ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' : 'text-slate-800 bg-slate-100 border border-slate-200'}`}>
                        {parseFloat(row.avg_rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center justify-end gap-1.5">
                        <Calendar size={12} /> {new Date(row.created_at).toLocaleDateString()}
                      </p>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan="5" className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center justify-center opacity-30">
                      <Search size={48} className="mb-4" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em]">No matching records found</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100 gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-700">{indexOfFirst + 1}</span> to <span className="text-slate-700">{Math.min(indexOfLast, filteredData.length)}</span> of {filteredData.length} Registry Entries
          </p>
          <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="p-3 hover:bg-slate-50 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border-r border-slate-100">
              <ChevronLeft size={16} />
            </button>
            <div className="px-6 flex items-center text-[10px] font-black text-slate-700 uppercase tracking-widest italic bg-white">
              Block {currentPage} / {totalPages || 1}
            </div>
            <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0} className="p-3 hover:bg-slate-50 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border-l border-slate-100">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ── SINGLE RECORD MODAL (unchanged) ────────────────────────────────── */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
          <div className="fixed top-6 right-6 flex gap-3 z-[100] no-print print:hidden">
            <button onClick={handleDownload} className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <button onClick={() => setSelectedSurvey(null)} className="bg-white text-slate-700 px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-xl hover:bg-slate-50 active:scale-95 transition-all border border-slate-200">
              Close
            </button>
          </div>

          <style>{A4_PRINT_STYLE}</style>

          <div
            ref={printRef}
            className="print-container bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[16mm] relative animate-in zoom-in-95 print:shadow-none print:m-0 mx-auto overflow-hidden"
            style={{ WebkitFontSmoothing: 'antialiased', fontVariantLigatures: 'none', boxSizing: 'border-box', maxHeight: '297mm', position: 'relative', backgroundColor: 'white' }}
          >
            <div className="absolute top-[5mm] left-0 right-0 flex flex-col items-center text-center">
              <div className="mb-1"><img src="/npc-new-logo.png" alt="NPC Logo" className="w-15 h-15 object-contain" /></div>
              <div className="leading-tight">
                <h2 className="text-[10pt] font-bold">NATIONAL POWER CORPORATION</h2>
                <h3 className="text-[10pt] font-bold">MINDANAO GENERATION</h3>
                <h4 className="text-[10pt] font-bold">INTEGRATED MANAGEMENT SYSTEM</h4>
              </div>
            </div>

            <div className="h-[19mm]"></div>

            <div className="text-center mb-1 font-['Arial']">
              <h1 className="text-medium font-bold uppercase tracking-tight">Customer Satisfaction Measurement</h1>
              <p className="text-[9pt] leading-snug text-justify mx-auto max-w-[180mm]">
                This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices.
                Your feedback on your recently concluded transaction will help this office provide a better service.
                Personal information shared will be kept confidential and you always have the option not to answer this form.
              </p>
            </div>

            <div className="border-1 border-black font-['Arial'] text-[9pt] mb-2">
              <div className="border-b-1 border-black p-2 flex items-end relative min-h-[30px]">
                <span className="mr-2">Customer Name/Signature:</span>
                <span className="uppercase font-bold">{selectedSurvey.full_name}</span>
                {selectedSurvey.signature && <img src={selectedSurvey.signature} className="absolute right-4 bottom-1 h-10 object-contain" alt="Signature" />}
              </div>
              <div className="border-b-1 border-black p-2"><span>Designation/Position:</span><span className="ml-2 font-bold uppercase">{selectedSurvey.designation || ''}</span></div>
              <div className="border-b-1 border-black p-2 flex gap-4 items-center">
                <span>Client type:</span>
                <div className="flex gap-3">
                  <span className="flex items-center"><span className="mr-1">{selectedSurvey.client_type === 'Citizen' ? '☒' : '☐'}</span> Citizen</span>
                  <span className="flex items-center"><span className="mr-1">{selectedSurvey.client_type === 'Business' ? '☒' : '☐'}</span> Business</span>
                  <span className="flex items-center"><span className="mr-1">{selectedSurvey.client_type === 'Government' ? '☒' : '☐'}</span> Government (Employee or another agency)</span>
                </div>
              </div>
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr] border-b-1 border-black">
                <div className="border-r-1 border-black p-2"><span>Date:</span><span className="ml-2 font-bold">{new Date(selectedSurvey.created_at).toLocaleDateString()}</span></div>
                <div className="border-r-1 border-black p-2 flex gap-2"><span>Sex:</span><span>{selectedSurvey.sex === 'Male' ? '☒' : '☐'} Male</span><span>{selectedSurvey.sex === 'Female' ? '☒' : '☐'} Female</span></div>
                <div className="p-2"><span>Age:</span><span className="ml-2 font-bold">{selectedSurvey.age}</span></div>
              </div>
              <div className="grid grid-cols-[0.8fr_1.2fr] border-b-1 border-black">
                <div className="border-r-1 border-black p-2"><span>Region of residence:</span><span className="ml-2 font-bold uppercase">{selectedSurvey.region || ''}</span></div>
                <div className="p-1"><span>Service Availed:</span><span className="ml-1 underline text-[7pt] font-bold uppercase">{selectedSurvey.service_name}</span></div>
              </div>
              <div className="grid grid-cols-[1fr_1fr]">
                <div className="border-r-1 border-black p-2"><span className="mr-2">Email address:</span><span className="ml-2 font-bold">{selectedSurvey.email || ''}</span></div>
                <div className="p-2"><span>Telephone/Cellphone:</span><span className="ml-2 font-bold">{selectedSurvey.phone || ''}</span></div>
              </div>
            </div>

            <div className="font-['Arial'] text-[8.5pt] mb-2 leading-tight">
              <p className="mb-2"><span className="font-bold">INSTRUCTIONS:</span> Check mark ( ✔ ) your answer to the Citizen's Charter (CC) questions. The Citizen's Charter is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.</p>
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC1</div>
                <div className="flex-1">
                  <p className="mb-1">Which of the following best describes your awareness of a CC?</p>
                  <div className="grid grid-cols-1 gap-1 ml-2">
                    <div className="flex items-start gap-1"><span>{selectedSurvey.CC1 == '1' ? '☒' : '☐'}</span> 1. I know what a CC is and I saw this office's CC.</div>
                    <div className="flex items-start gap-2"><span>{selectedSurvey.CC1 == '2' ? '☒' : '☐'}</span> 2. I know what a CC is but I did NOT see this office's CC.</div>
                    <div className="flex items-start gap-2"><span>{selectedSurvey.CC1 == '3' ? '☒' : '☐'}</span> 3. I learned of the CC only when I saw this office's CC.</div>
                    <div className="flex items-start gap-2"><span>{selectedSurvey.CC1 == '4' ? '☒' : '☐'}</span> 4. I do not know what a CC is and did not see one in this office. (Answer 'N/A' on CC2 and CC3)</div>
                  </div>
                </div>
              </div>
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC2</div>
                <div className="flex-1">
                  <p className="mb-1">If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC2 == '1' ? '☒' : '☐'}</span> 1. Easy to see</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC2 == '4' ? '☒' : '☐'}</span> 4. Not visible at all</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC2 == '2' ? '☒' : '☐'}</span> 2. Somewhat easy to see</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC2 == '5' ? '☒' : '☐'}</span> 5. N/A</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC2 == '3' ? '☒' : '☐'}</span> 3. Difficult to see</div>
                  </div>
                </div>
              </div>
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC3</div>
                <div className="flex-1">
                  <p className="mb-1">If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction?</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC3 == '1' ? '☒' : '☐'}</span> 1. Helped very much</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC3 == '3' ? '☒' : '☐'}</span> 3. Did not help</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC3 == '2' ? '☒' : '☐'}</span> 2. Somewhat helped</div>
                    <div className="flex items-center gap-2"><span>{selectedSurvey.CC3 == '4' ? '☒' : '☐'}</span> 4. N/A</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="font-['Arial'] mb-2">
              <p className="text-[8pt] mb-1"><span className="text-[9pt] font-bold">INSTRUCTIONS: </span>For SQD 0-8, please put a check mark ( ✔ ) on the column that best corresponds to your answer.</p>
              <table className="w-full border-collapse border-[0.5pt] border-black text-[7pt] leading-none">
                <thead>
                  <tr className="text-center">
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black p-2 w-[40%]"></th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Strongly Disagree</th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Disagree</th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[10%]">Neither Agree nor Disagree</th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Agree</th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[7%]">Strongly Agree</th>
                    <th className="border-t-[0.5pt] border-l-[0.5pt] border-black px-1 py-2 w-[3%]">N/A</th>
                  </tr>
                </thead>
                <tbody>
                  {renderSQDRow("SQD0. I am satisfied with the service that I availed.", selectedSurvey.SQD0)}
                  {renderSQDRow("SQD1. I spent a reasonable amount of time for my transaction.", selectedSurvey.SQD1)}
                  {renderSQDRow("SQD2. The office followed the transaction's requirements and steps based on the information provided.", selectedSurvey.SQD2)}
                  {renderSQDRow("SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.", selectedSurvey.SQD3)}
                  {renderSQDRow("SQD4. I easily found information about my transaction from the office or its website.", selectedSurvey.SQD4)}
                  {renderSQDRow("SQD5. I paid a reasonable amount of fees for my transaction. (If service was free, mark the \"N/A\" column)", selectedSurvey.SQD5)}
                  {renderSQDRow("SQD6. I feel the office was fair to everyone, or \"walang palakasan\", during my transaction.", selectedSurvey.SQD6)}
                  {renderSQDRow("SQD7. I was treated courteously by the staff, and (if asked for help) the staff was helpful.", selectedSurvey.SQD7)}
                  {renderSQDRow("SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.", selectedSurvey.SQD8)}
                </tbody>
              </table>
            </div>

            <div className="font-['Arial'] mb-1">
              <p className="text-[9pt]">Suggestions on how we can further improve our services (optional):</p>
              <div className="ml-2 text-[9pt] underline font-normal">{selectedSurvey.suggestions || ''}</div>
            </div>

            <div className="absolute bottom-[8mm] left-[12mm] font-['Arial'] text-[6pt] flex flex-col items-start font-bold">
              <span>MGG-IMS-006.F01</span>
              <span>Rev. No. 0</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const renderSQDRow = (question, ratingValue) => {
  const cellStyle = "border-t-[0.5pt] border-l-[0.5pt] border-black p-0 h-[32px] w-[8%]";
  const checkStyle = "flex items-center justify-center w-full h-full text-[12pt] leading-none";
  return (
    <tr className="border-none">
      <td className="border-t-[0.5pt] border-l-[0.5pt] border-black px-3 h-[30px] w-[45%]">
        <div className="flex items-center h-full text-[7.5pt] leading-tight">{question}</div>
      </td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '1' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '2' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '3' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '4' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '5' ? '✔' : ''}</div></td>
      <td className={`${cellStyle} border-r-[0.5pt]`}><div className={checkStyle}>{(ratingValue == '0' || !ratingValue) ? '✔' : ''}</div></td>
    </tr>
  );
};

export default SurveyResults;
