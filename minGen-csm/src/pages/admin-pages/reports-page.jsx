import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import CCEvaluationTable from '../reports/CCEvaluationTable';
import SQDEvaluationTable from '../reports/SQDEvaluationTable';

export const ReportsPage = ({ data = [] }) => {
  const [activeReport, setActiveReport] = useState('cc');
  const [targetOffice, setTargetOffice] = useState('All');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const reportRef = useRef();

  const [reportPeriod, setReportPeriod] = useState({
    range: "JANUARY TO MARCH",
    year: "2026"
  });

  const fullPeriodString = `${reportPeriod.range} ${reportPeriod.year}`;
  // --- PDF LOGIC ---
  const handleDownloadPDF = async () => {
  const element = reportRef.current;
  if (!element) return;

  try {
    // 2. We use 'html2canvas' directly (the pro version supports oklch)
    console.log("Capturing report...");
    
    const canvas = await html2canvas(element, {
      scale: 2, // Keeps it sharp but not too heavy
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      // This is the secret sauce for Tailwind v4:
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
    pdf.save(`CSM_Report_${targetOffice}.pdf`);
    
    console.log("Success!");
  } catch (err) {
    console.error("PDF Error:", err);
    alert("Snapshot failed. Please check the console for oklch errors.");
  }
};

  // --- SIGNATORIES STATE ---
  const [signatories, setSignatories] = useState(() => {
    const saved = localStorage.getItem('report_signatories');
    return saved ? JSON.parse(saved) : {
      preparedName: '', preparedTitle: '',
      reviewedName: '', reviewedTitle: '',
      approvedName: '', approvedTitle: ''
    };
  });

  useEffect(() => {
    localStorage.setItem('report_signatories', JSON.stringify(signatories));
  }, [signatories]);

  const updateSignatory = (key, value) => {
    setSignatories(prev => ({ ...prev, [key]: value }));
  };

  // --- DATA FILTERING ---
  const reportData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return targetOffice === 'All' 
      ? data 
      : data.filter(d => d.office_name?.toString().toUpperCase() === targetOffice.toUpperCase());
  }, [data, targetOffice]);

  const offices = useMemo(() => {
    const unique = [...new Set(data.map(d => d.office_name?.toUpperCase()))]
      .filter(Boolean).sort();
    return ['All', ...unique];
  }, [data]);

  // Determine the office display name for the child component
  const displayOfficeName = targetOffice === 'All' ? 'NPC Mindanao Generation' : targetOffice;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      
      {/* 1. TOP CONTROLS (Hidden in PDF) */}
      <div className="max-w-5xl mx-auto mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-black text-[#002855] uppercase tracking-tight">Compliance Center</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">
                RAW DATA: {data.length} | FILTERED: {reportData.length}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-400 uppercase pl-2">Filter Office:</span>
              <select 
                value={targetOffice}
                onChange={(e) => setTargetOffice(e.target.value)}
                className="text-xs font-bold text-indigo-600 bg-transparent outline-none pr-4 cursor-pointer uppercase"
              >
                {offices.map(off => <option key={off} value={off}>{off}</option>)}
              </select>
            </div>

            <button 
              onClick={handleDownloadPDF}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl font-bold shadow-md transition-all active:scale-95 flex items-center gap-2 text-xs"
            >
              📥 DOWNLOAD PDF
            </button>
          </div>
        </div>

        {/* SIGNATORY CONFIG PANEL */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full flex justify-between items-center px-6 py-4 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 underline decoration-indigo-500 underline-offset-4">
              {isConfigOpen ? 'Close Settings' : 'Edit Report Signatories & Period'}
            </span>
            <span className="text-xs text-slate-400">{isConfigOpen ? '▲' : '▼'}</span>
          </button>

          {isConfigOpen && (
            <div className="p-6 space-y-6">
              {/* NEW: PERIOD SELECTION SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 border-b border-slate-100">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Month Range (Quarter)</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={reportPeriod.range}
                    onChange={(e) => setReportPeriod(prev => ({ ...prev, range: e.target.value }))}
                  >
                    <option value="JANUARY TO MARCH">1st Quarter (Jan - Mar)</option>
                    <option value="APRIL TO JUNE">2nd Quarter (Apr - Jun)</option>
                    <option value="JULY TO SEPTEMBER">3rd Quarter (Jul - Sep)</option>
                    <option value="OCTOBER TO DECEMBER">4th Quarter (Oct - Dec)</option>
                    <option value="JANUARY TO DECEMBER">Full Year</option>
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</label>
                  <select 
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    value={reportPeriod.year}
                    onChange={(e) => setReportPeriod(prev => ({ ...prev, year: e.target.value }))}
                  >
                    {/* Generates years from 2024 up to 10 years into the future from the current date */}
                    {Array.from(
                      { length: (new Date().getFullYear() + 10) - 2024 + 1 }, 
                      (_, i) => 2024 + i
                    ).map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* EXISTING: SIGNATORIES SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SignatoryInput label="Prepared By" nKey="preparedName" tKey="preparedTitle" vals={signatories} update={updateSignatory} />
                <SignatoryInput label="Reviewed By" nKey="reviewedName" tKey="reviewedTitle" vals={signatories} update={updateSignatory} />
                <SignatoryInput label="Approved By" nKey="approvedName" tKey="approvedTitle" vals={signatories} update={updateSignatory} />
              </div>
            </div>
          )}
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-4 border-b border-slate-200 mb-8">
          <button onClick={() => setActiveReport('cc')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeReport === 'cc' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Part A: CC Report</button>
          <button onClick={() => setActiveReport('sqd')} className={`pb-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeReport === 'sqd' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400'}`}>Part B: SQD Analysis</button>
        </div>
      </div>

      {/* 2. THE PRINTABLE SHEET AREA */}
      <div className="max-w-5xl mx-auto flex justify-center pb-20">
        {/* Added inline styles to force standard HEX colors and avoid oklch errors */}
        <div 
          ref={reportRef} 
          className="shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: '#ffffff', // Standard Hex White
            color: '#000000',           // Standard Hex Black
            display: 'block'            // Ensures clear boundaries for the PDF capture
          }}
        >
          {activeReport === 'cc' ? (
            <CCEvaluationTable 
              reportData={reportData} 
              office={displayOfficeName} 
              signatories={signatories} 
              period={fullPeriodString}
            />
          ) : activeReport === 'sqd' ? (
            <SQDEvaluationTable
              reportData={reportData}
              office={displayOfficeName}
              signatories={signatories}
              period={fullPeriodString}
            />
          ) : (
            <div className="p-20 w-[8.5in] text-center italic bg-white border border-dashed text-slate-400">
              Please select a report type to continue.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- SUB-COMPONENT ---
const SignatoryInput = ({ label, nKey, tKey, vals, update }) => (
  <div className="space-y-3">
    <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tighter">{label}</p>
    <input 
      type="text" 
      placeholder="Full Name"
      className="w-full p-2 text-xs border border-slate-200 rounded outline-none focus:border-indigo-500 font-bold uppercase"
      value={vals[nKey]}
      onChange={(e) => update(nKey, e.target.value)}
    />
    <input 
      type="text" 
      placeholder="Designation / Position"
      className="w-full p-2 text-[10px] border border-slate-100 rounded outline-none focus:border-indigo-500 text-slate-500"
      value={vals[tKey]}
      onChange={(e) => update(tKey, e.target.value)}
    />
  </div>
);