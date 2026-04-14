import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  FileDown, 
  Settings2, 
  ChevronDown, 
  ChevronUp, 
  LayoutDashboard, 
  ClipboardCheck, 
  FileBarChart, 
  Building2,
  CalendarDays,
  UserCheck,
  FileText
} from 'lucide-react';
import CCEvaluationTable from '../reports/CCEvaluationTable';
import SQDEvaluationTable from '../reports/SQDEvaluationTable';
import CSMTabulationTable from '../reports/CSMTabulationTable';
import ScorePerService from '../reports/ScorePerService';

export const ReportsPage = ({ data = [], allOffices = [], user }) => {
  // Logic Preserved

  const hadMultipleOffices = useMemo(() => {
    if (!data || data.length === 0) return false;
    const uniqueIds = [...new Set(data.map(d => d.office_id))];
    return uniqueIds.length > 1;
  }, [data]);
  
  const isGlobalView = ['super_admin', 'auditor', 'admin'].includes(user.role) ||
                        user.is_auditor === 1 || user.is_auditor === true || hadMultipleOffices;
  const isManager = user.role === 'manager';
  const isOffice = user.role === 'office' && !isGlobalView;

  const [activeReport, setActiveReport] = useState('cc');
  const [targetOffice, setTargetOffice] = useState(isGlobalView ? 'All' : user.office_name);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const reportRef = useRef();

  const [reportPeriod, setReportPeriod] = useState({
    range: "JANUARY TO MARCH",
    year: "2026"
  });

  const [allPossibleServices, setAllPossibleServices] = useState([]);

  const fullPeriodString = `${reportPeriod.range} ${reportPeriod.year}`;

  const handleDownloadPDF = async () => {
    const element = reportRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
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
    } catch (err) {
      console.error("PDF Error:", err);
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

  // If the user is identified as having Global View, default them to 'All'
  useEffect(() => {
    if (isGlobalView && targetOffice !== 'All' && !isManager) {
      setTargetOffice('All');
    }
  }, [isGlobalView, isManager]);

  useEffect(() => {
    localStorage.setItem('report_signatories', JSON.stringify(signatories));
  }, [signatories]);

  const updateSignatory = (key, value) => {
    setSignatories(prev => ({ ...prev, [key]: value }));
  };

  const reportData = useMemo(() => {
      if (!data || data.length === 0) return [];
      if (isGlobalView && targetOffice === 'All') return data;
      return data.filter(d => d.office_name?.toString().toUpperCase() === targetOffice.toUpperCase());
    }, [data, targetOffice, isGlobalView]);

 
  const offices = useMemo(() => {
    const masterList = Array.isArray(allOffices) ? allOffices : [];
    
    // Get unique names from the data actually returned by the PHP
    const namesFromData = [...new Set(data.map(d => d.office_name?.toUpperCase()))].filter(Boolean).sort();

    if (isGlobalView) {
      // Use masterList if available, otherwise fallback to names present in the data
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

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-10 font-sans selection:bg-indigo-100">
      
      {/* HEADER & GLOBAL CONTROLS */}
      <div className="max-w-5xl mx-auto mb-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em]">Compliance Intelligence</span>
            </div>
            <h1 className="text-4xl font-black text-[#001d3d] uppercase tracking-tighter italic">Compliance Center</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
               <UserCheck size={12} className="text-slate-300"/> Access: {user.role} <span className="text-slate-200">|</span> 
               <LayoutDashboard size={12} className="text-slate-300"/> Samples: {reportData.length} of {data.length}
            </p>
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            {!isOffice && (
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm transition-all focus-within:ring-2 focus-within:ring-indigo-500/20">
                <Building2 size={14} className="text-slate-400" />
                <select 
                  value={targetOffice}
                  onChange={(e) => setTargetOffice(e.target.value)}
                  className="text-[11px] font-black text-indigo-900 bg-transparent outline-none cursor-pointer uppercase tracking-tight"
                >
                  {offices.map(off => <option key={off} value={off}>{off}</option>)}
                </select>
              </div>
            )}

            <button 
              onClick={handleDownloadPDF}
              className="bg-[#001d3d] hover:bg-indigo-800 text-white px-8 py-3.5 rounded-2xl font-black shadow-xl shadow-indigo-100 transition-all active:scale-95 flex items-center gap-3 text-[10px] uppercase tracking-widest"
            >
              <FileDown size={16} /> Download Report
            </button>
          </div>
        </div>

        {/* SETTINGS PANEL */}
        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden mb-10 transition-all">
          <button 
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="w-full flex justify-between items-center px-8 py-5 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
                <Settings2 size={18} className={`transition-transform duration-500 ${isConfigOpen ? 'rotate-180 text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 group-hover:text-indigo-600">
                  Configure Report Parameters & Signatories
                </span>
            </div>
            {isConfigOpen ? <ChevronUp size={16} className="text-slate-300"/> : <ChevronDown size={16} className="text-slate-300"/>}
          </button>

          {isConfigOpen && (
            <div className="p-10 space-y-10 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* PERIOD SELECTION */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10 border-b border-slate-100">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <CalendarDays size={14} className="text-indigo-500"/> Reporting Period (Quarterly)
                  </label>
                  <select 
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none uppercase"
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

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Fiscal Year
                  </label>
                  <div className="relative">
                    <select 
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] font-black text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                      value={reportPeriod.year}
                      onChange={(e) => setReportPeriod(prev => ({ ...prev, year: e.target.value }))}
                    >
                      {/* Generates a dynamic list starting from 2024 
                          up to 50 years beyond the current date 
                      */}
                      {Array.from(
                        { length: (new Date().getFullYear() + 50) - 2024 + 1 }, 
                        (_, i) => 2024 + i
                      ).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                    
                    {/* Visual indicator since appearance-none removes the default arrow */}
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* SIGNATORIES SECTION */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <SignatoryInput label="Prepared By" nKey="preparedName" tKey="preparedTitle" vals={signatories} update={updateSignatory} />
                <SignatoryInput label="Reviewed By" nKey="reviewedName" tKey="reviewedTitle" vals={signatories} update={updateSignatory} />
                <SignatoryInput label="Approved By" nKey="approvedName" tKey="approvedTitle" vals={signatories} update={updateSignatory} />

                {/* DYNAMIC SIGNATORY SLOT */}
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.2em]">Custom Role Label</span>
                    <input 
                      type="text"
                      placeholder="E.G. NOTED BY / VERIFIED BY"
                      className="bg-white border-b-2 border-slate-200 px-1 py-1 text-[10px] font-black uppercase outline-none focus:border-indigo-500 transition-all text-slate-700 placeholder:text-slate-300"
                      value={signatories.additionalLabel || ''}
                      onChange={(e) => updateSignatory('additionalLabel', e.target.value)}
                    />
                  </div>
                  <SignatoryInput 
                    label={signatories.additionalLabel || "Additional Signatory"} 
                    nKey="additionalName" 
                    tKey="additionalTitle" 
                    vals={signatories} 
                    update={updateSignatory} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {isGlobalView && targetOffice === 'All' && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
              <p className="text-2xl font-black text-[#001d3d]">{data.length}</p>
            </div>
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Offices</p>
              <p className="text-2xl font-black text-indigo-600">
                {[...new Set(data.map(d => d.office_id))].length}
              </p>
            </div>
            {/* Add more stats like average rating here */}
          </div>
        )}

        {/* TAB NAVIGATION */}
        <div className="flex flex-wrap gap-2 p-1.5 bg-slate-200/50 rounded-2xl backdrop-blur-sm w-fit mx-auto mb-12 border border-slate-200">
          <TabButton active={activeReport === 'cc'} onClick={() => setActiveReport('cc')} icon={<ClipboardCheck size={14}/>} label="Part A: CC Report" />
          <TabButton active={activeReport === 'sqd'} onClick={() => setActiveReport('sqd')} icon={<FileBarChart size={14}/>} label="Part B: SQD Analysis" />
          <TabButton active={activeReport === 'csm-tab'} onClick={() => setActiveReport('csm-tab')} icon={<LayoutDashboard size={14}/>} label="Part C: CSM Tabulation" />
          <TabButton active={activeReport === 'csm-score'} onClick={() => setActiveReport('csm-score')} icon={<FileText size={14}/>} label="Part D: Score per Service" />
        </div>
      </div>

      {/* REPORT CANVAS */}
      <div className="max-w-5xl mx-auto flex justify-center pb-32">
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
            <CSMTabulationTable services={reportData} allPossibleServices={allPossibleServices} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          ) : activeReport === 'csm-score' ? (
            <ScorePerService services={reportData} user={user} office={displayOfficeName} signatories={signatories} period={fullPeriodString} />
          ) : (
            <div className="p-32 w-[8.5in] text-center italic bg-white text-slate-300 font-medium uppercase tracking-[0.3em]">
              Select Report Component
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- MODERN SUB-COMPONENTS ---

const TabButton = ({ active, onClick, icon, label }) => (
    <button 
      onClick={onClick} 
      className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
        active 
          ? 'bg-white text-indigo-700 shadow-md translate-y-[-1px]' 
          : 'text-slate-500 hover:text-indigo-600 hover:bg-white/50'
      }`}
    >
      {icon}
      {label}
    </button>
);

const SignatoryInput = ({ label, nKey, tKey, vals, update }) => (
  <div className="space-y-4 p-6 bg-slate-50 rounded-2xl border border-slate-100 transition-colors focus-within:border-indigo-200">
    <p className="text-[9px] font-black text-indigo-600 uppercase tracking-[0.2em]">{label}</p>
    <div className="space-y-2">
        <input 
          type="text" 
          placeholder="ENTER FULL NAME"
          className="w-full bg-white px-4 py-2.5 text-[11px] border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 font-black uppercase placeholder:text-slate-300 transition-all"
          value={vals[nKey]}
          onChange={(e) => update(nKey, e.target.value)}
        />
        <input 
          type="text" 
          placeholder="DESIGNATION"
          className="w-full bg-white px-4 py-2 text-[9px] border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-500 font-bold uppercase placeholder:text-slate-300 transition-all"
          value={vals[tKey]}
          onChange={(e) => update(tKey, e.target.value)}
        />
    </div>
  </div>
);