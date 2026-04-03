// General User inputs

import React, { useState, useEffect, useRef, useMemo} from 'react';
import html2pdf from 'html2pdf.js';
import { Search, RotateCcw, Filter, ChevronLeft, ChevronRight, Download, Printer, FileText, PieChart, User, Calendar, Layers, X } from 'lucide-react';

const A4_PRINT_STYLE = `
  @media print {
    /* 1. Reset the Page */
    @page {
      size: A4;
      margin: 0;
    }

    /* 2. Nuclear hide of UI - Only print-container will survive */
    body * {
      visibility: hidden !important;
    }

    /* 3. The Modal Wrapper Fix */
    /* We must force the fixed overlays to stay out of the way */
    .fixed.inset-0 {
      position: absolute !important;
      display: block !important;
      background: white !important;
      padding: 0 !important;
      overflow: visible !important;
      visibility: visible !important;
    }

    /* 4. The Paper Container */
    .print-container, .print-container * {
      visibility: visible !important;
    }

    .print-container {
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 12mm 15mm !important; /* Adjusted for better layout */
      border: none !important;
      box-shadow: none !important;
      background: white !important;
      display: block !important;
    }

    /* 5. Cleanup */
    .no-print, button, .backdrop-blur-sm {
      display: none !important;
    }
  }
`;

const SurveyResults = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user')) || {});
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const printRef = useRef();

  const API_URL = 'http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php';

  useEffect(() => { fetchResults(); }, []);

  const fetchResults = () => {
    setLoading(true);
    fetch(API_URL, { method: 'GET', credentials: 'include' })
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Fetch Error:", err);
        setLoading(false);
      });
  };

  const handleDownload = () => {
    const element = printRef.current;
    const opt = {
      margin: 0,
      filename: `CSM_${selectedSurvey.full_name}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { scale: 4, useCORS: true, width: 794, windowWidth: 794 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
      const totalPages = pdf.internal.getNumberOfPages();
      if (totalPages > 1) pdf.deletePage(totalPages);
    }).save();
  };

  const filteredData = useMemo(() => {
    return data
      .filter(item => {
        const name = (item.full_name || "").toLowerCase();
        const email = (item.email || "").toLowerCase();
        const office = (item.office_name || "").toLowerCase();
        const service = (item.service_name || "").toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search) || email.includes(search) || office.includes(search) || service.includes(search);
      })
      .sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      });
  }, [data, searchTerm, sortOrder]);

  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem); 
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const userInsights = (searchTerm.length >= 2 && filteredData.length > 0) ? {
    title: user.role === 'manager' ? `${user.plant_name} Overview` : "Unit Dashboard",
    subtitle: user.role === 'manager' ? "Department-Wide Feed" : "Office Feed",
    totalVisits: filteredData.length,
    offices: [...new Set(filteredData.map(d => d.office_name))],
    services: [...new Set(filteredData.map(d => d.service_name))],
    avgRating: (filteredData.reduce((acc, curr) => acc + parseFloat(curr.avg_rating || 0), 0) / filteredData.length).toFixed(1),
  } : null;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Syncing Secure Records...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 antialiased">
      
      {/* HEADER SECTION */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-8 gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-2">
             <span className="bg-[#001d3d] text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Data Stream</span>
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Live Submission Logs</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 uppercase italic flex items-center gap-3">
            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
            {user.role === 'manager' ? `${user.plant_name} Submissions` : 'Survey Feed'}
          </h1>
          <p className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mt-1">
            {user.role === 'manager' && "Monitoring all offices under your jurisdiction"}
            {user.role === 'office' && !user.is_auditor_enabled && `Restricted to ${user.office_name}`}
            {(user.role === 'super_admin' || user.is_auditor_enabled == 1) && "Global System Oversight Access"}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {(user.role === 'super_admin' || user.role === 'manager' || user.is_auditor_enabled == 1) && (
            <button onClick={fetchResults} className="flex items-center gap-2 bg-[#001d3d] hover:bg-blue-800 px-5 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95">
              <RotateCcw size={14} /> Refresh ({data.length})
            </button>
          )}
        </div>
      </header>

      {/* CONTROLS */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between print:hidden">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="FILTER BY CLIENT, OFFICE, OR SERVICE..." 
            className="w-full pl-12 pr-12 py-3.5 bg-white border border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-tight focus:ring-2 focus:ring-blue-600 outline-none transition-all shadow-sm"
            value={searchTerm}
            onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-500">
              <X size={18} />
            </button>
          )}
        </div>

        <button 
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="bg-white border border-slate-200 px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-3 shadow-sm active:scale-95"
        >
          <Filter size={14} className="text-blue-600" />
          {sortOrder === 'desc' ? 'Newest First' : 'Oldest First'}
        </button>
      </div>

      {/* INSIGHT MAPPING TABLE */}
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
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><PieChart size={12}/> Unit Reach</p>
                <div className="flex flex-wrap gap-1.5">
                  {userInsights.offices.map((off, i) => (
                    <span key={i} className="bg-blue-500/20 border border-blue-400/30 px-2 py-1 rounded-lg text-[9px] font-black uppercase text-blue-100">
                      {off}
                    </span>
                  ))}
                </div>
              </div>

              <div className="lg:col-span-1">
                <p className="text-[9px] text-blue-400 font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Layers size={12}/> Service Context</p>
                <p className="text-[10px] text-blue-100/80 leading-relaxed font-bold uppercase">
                  {userInsights.services.slice(0, 3).join(" • ")}{userInsights.services.length > 3 && "..."}
                </p>
              </div>

              <div className="lg:col-span-1 flex flex-col items-center justify-center bg-blue-800/30 rounded-2xl py-4 border border-blue-700/50">
                <p className="text-[9px] text-blue-300 font-black uppercase tracking-widest mb-1">Index Rating</p>
                <div className="text-4xl font-black text-white italic tracking-tighter">
                  {userInsights.avgRating}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN DATA TABLE */}
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
                  ? filteredData.length - (indexOfFirstItem + index) 
                  : indexOfFirstItem + index + 1;

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
                      <span className={`inline-flex items-center justify-center w-12 py-1.5 rounded-xl font-black text-[11px] shadow-sm ${
                        parseFloat(row.avg_rating) >= 4 
                          ? 'text-emerald-700 bg-emerald-50 border border-emerald-100' 
                          : 'text-slate-800 bg-slate-100 border border-slate-200'
                      }`}>
                        {parseFloat(row.avg_rating || 0).toFixed(1)}
                      </span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1.5">
                           <Calendar size={12}/> {new Date(row.created_at).toLocaleDateString()}
                        </p>
                      </div>
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

        {/* PAGINATION */}
        <div className="flex flex-col md:flex-row items-center justify-between px-8 py-6 bg-slate-50/50 border-t border-slate-100 gap-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Showing <span className="text-slate-700">{indexOfFirstItem + 1}</span> to <span className="text-slate-700">{Math.min(indexOfLastItem, filteredData.length)}</span> of {filteredData.length} Registry Entries
          </p>

          <div className="flex items-center gap-4">
            <div className="flex bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-3 hover:bg-slate-50 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border-r border-slate-100"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="px-6 flex items-center text-[10px] font-black text-slate-700 uppercase tracking-widest italic bg-white">
                Block {currentPage} / {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-3 hover:bg-slate-50 text-slate-400 hover:text-blue-600 disabled:opacity-20 transition-all border-l border-slate-100"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* MODAL / DETAILS VIEW (Preserved Logic) */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#001d3d]/90 backdrop-blur-md animate-in fade-in duration-300">
           {/* Detailed view content remains similar, just styled with rounded-3xl and slate/indigo accents */}
           <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl overflow-hidden">
              <div className="px-10 py-8 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase italic tracking-tighter">{selectedSurvey.full_name}</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Entry ID: {selectedSurvey.id}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedSurvey(null)} className="p-3 hover:bg-white rounded-full transition-all text-slate-400 hover:text-red-500 shadow-sm border border-transparent hover:border-slate-100">
                  <X size={24} />
                </button>
              </div>

              <div className="p-10">
                <div className="grid grid-cols-2 gap-8 mb-8">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Operational Office</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedSurvey.office_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">Service Profile</p>
                    <p className="text-sm font-black text-slate-800 uppercase italic">{selectedSurvey.service_name}</p>
                  </div>
                </div>

                <div className="flex gap-4 pt-8 border-t border-slate-100">
                  <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 py-4 bg-[#001d3d] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-800 transition-all active:scale-95 shadow-xl">
                    <Download size={16} /> Export PDF Document
                  </button>
                  <button onClick={() => window.print()} className="flex items-center justify-center px-6 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95">
                    <Printer size={16} />
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* FORM OVERLAY (THE FORMAL TEMPLATE) */}
      {selectedSurvey && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
        
        
            {/* Controls */}
            {/* FLOATING CONTROLS - Positioned fixed to the screen, not the paper */}
              <div className="fixed top-6 right-6 flex gap-3 z-[100] no-print print:hidden">
              {/* Direct Download Button */}
              <button 
                onClick={handleDownload} 
                className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-xl hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download PDF
              </button>

              {/* Existing Print Button */}
              <button onClick={() => window.print()} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2">
               Print Document
            </button>

              {/* Close Modal */}
              <button 
                onClick={() => setSelectedSurvey(null)} 
                className="bg-white text-slate-700 px-6 py-3 rounded-xl font-bold text-xs uppercase shadow-xl hover:bg-slate-50 active:scale-95 transition-all border border-slate-200"
              >
                Close
              </button>
            </div>

            <style>{A4_PRINT_STYLE}</style>

            {/* The main container */}
            <div 
            ref={printRef}
            className="print-container bg-white w-[210mm] min-h-[297mm] shadow-2xl p-[16mm] relative animate-in zoom-in-95 print:shadow-none print:m-0 mx-auto overflow-hidden"
            style={{
              /* Force font-rendering to stay consistent */
              WebkitFontSmoothing: 'antialiased',
              fontVariantLigatures: 'none',
              boxSizing: 'border-box',
              maxHeight: '297mm',
              position: 'relative',
              backgroundColor: 'white'

            }}
            >
            

            {/* AGENCY HEADER  done */}
            <div className="absolute top-[5mm] left-0 right-0 flex flex-col items-center text-center">
              <div className="mb-1">
                <img 
                  src="/npc-docs-logo.png" 
                  alt="NPC Logo" 
                  className="w-15 h-15 object-contain" 
                />
              </div>
              <div className="leading-tight">
                <h2 className="text-[10pt] font-bold">NATIONAL POWER CORPORATION</h2>
                <h3 className="text-[10pt] font-bold">MINDANAO GENERATION</h3>
                <h4 className="text-[10pt] font-bold">INTEGRATED MANAGEMENT SYSTEM</h4>
              </div>
            </div>

            <div className="h-[19mm]"></div>

            {/* DOCUMENT TITLE done */}
            <div className="text-center mb-1 font-['Arial']">
              <h1 className="text-medium font-bold uppercase tracking-tight">Customer Satisfaction Measurement</h1>
              <p className="text-[9pt] leading-snug text-justify mx-auto max-w-[180mm]">
                This Client Satisfaction Measurement (CSM) tracks the customer experience of government offices. 
                Your feedback on your recently concluded transaction will help this office provide a better service. 
                Personal information shared will be kept confidential and you always have the option not to answer this form.
              </p>
            </div>

            {/* SECTION I: PERSONAL INFO - EXACT REPLICA */}
            <div className="border-1 border-black font-['Arial'] text-[9pt] mb-2">
              {/* Row 1: Name and Signature */}
              <div className="border-b-1 border-black p-2 flex items-end relative min-h-[30px]">
                <span className="mr-2">Customer Name/Signature:</span>
                <span className="uppercase font-bold">{selectedSurvey.full_name}</span>
                {selectedSurvey.signature && (
                  <img 
                    src={selectedSurvey.signature} 
                    className="absolute right-4 bottom-1 h-10 object-contain" 
                    alt="Signature" 
                  />
                )}
              </div>

              {/* Row 2: Designation */}
              <div className="border-b-1 border-black p-2">
                <span>Designation/Position:</span>
                <span className="ml-2 font-bold uppercase">{selectedSurvey.designation || ''}</span>
              </div>

              {/* Row 3: Client Type */}
              <div className="border-b-1 border-black p-2 flex gap-4 items-center">
                <span>Client type:</span>
                <div className="flex gap-3">
                  <span className="flex items-center">
                    <span className="mr-1">{selectedSurvey.client_type === 'Citizen' ? '☒' : '☐'}</span> Citizen
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">{selectedSurvey.client_type === 'Business' ? '☒' : '☐'}</span> Business
                  </span>
                  <span className="flex items-center">
                    <span className="mr-1">{selectedSurvey.client_type === 'Government' ? '☒' : '☐'}</span> Government (Employee or another agency)
                  </span>
                </div>
              </div>

              {/* Row 4: Date, Sex, Age */}
              <div className="grid grid-cols-[1fr_0.8fr_0.8fr] border-b-1 border-black">
                <div className="border-r-1 border-black p-2">
                  <span>Date:</span>
                  <span className="ml-2 font-bold">
                    {new Date(selectedSurvey.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="border-r-1 border-black p-2 flex gap-2">
                  <span>Sex:</span>
                  <span>{selectedSurvey.sex === 'Male' ? '☒' : '☐'} Male</span>
                  <span>{selectedSurvey.sex === 'Female' ? '☒' : '☐'} Female</span>
                </div>
                <div className="p-2">
                  <span>Age:</span>
                  <span className="ml-2 font-bold">
                    {selectedSurvey.age}
                  </span>
                </div>
              </div>

              {/* Row 5: Region and Service */}
              <div className="grid grid-cols-[0.8fr_1.2fr] border-b-1 border-black">
                <div className="border-r-1 border-black p-2">
                  <span>Region of residence:</span>
                  <span className="ml-2 font-bold uppercase">
                    {selectedSurvey.region || ''}
                  </span>
                </div>
                <div className="p-1">
                  <span>Service Availed:</span>
                  <span className="ml-1 underline text-[7pt] font-bold uppercase">
                    {selectedSurvey.service_name}
                  </span>
                </div>
              </div>

              {/* Row 6: Email and Phone */}
              <div className="grid grid-cols-[1fr_1fr]">
                <div className="border-r-1 border-black p-2">
                  <span className="mr-2">Email address:</span>
                  <span className="ml-2 font-bold">{selectedSurvey.email || ''}</span>
                </div>
                <div className="p-2">
                  <span>Telephone/Cellphone:</span>
                  <span className="ml-2 font-bold">{selectedSurvey.phone || ''}</span>
                </div>
              </div>
            </div>

            {/* SECTION II: CC - EXACT VISUAL REPLICA */}
            <div className="font-['Arial'] text-[8.5pt] mb-2 leading-tight">
              <p className="mb-2">
                <span className="font-bold">INSTRUCTIONS:</span> Check mark ( ✔ ) your answer to the Citizen's Charter (CC) questions. The Citizen's Charter is an official document that reflects the services of a government agency/office including its requirements, fees, and processing times among others.
              </p>

              {/* CC1 */}
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC1</div>
                <div className="flex-1">
                  <p className="mb-1">Which of the following best describes your awareness of a CC?</p>
                  <div className="grid grid-cols-1 gap-1 ml-2">
                    <div className="flex items-start gap-1">
                      <span>{selectedSurvey.CC1 == '1' ? '☒' : '☐'}</span> 1. I know what a CC is and I saw this office's CC.
                    </div>
                    <div className="flex items-start gap-2">
                      <span>{selectedSurvey.CC1 == '2' ? '☒' : '☐'}</span> 2. I know what a CC is but I did NOT see this office's CC.
                    </div>
                    <div className="flex items-start gap-2">
                      <span>{selectedSurvey.CC1 == '3' ? '☒' : '☐'}</span> 3. I learned of the CC only when I saw this office's CC.
                    </div>
                    <div className="flex items-start gap-2">
                      <span>{selectedSurvey.CC1 == '4' ? '☒' : '☐'}</span> 4. I do not know what a CC is and I did not see one in this office. (Answer 'N/A' on CC2 and CC3)
                    </div>
                  </div>
                </div>
              </div>

              {/* CC2 */}
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC2</div>
                <div className="flex-1">
                  <p className="mb-1">If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC2 == '1' ? '☒' : '☐'}</span> 1. Easy to see
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC2 == '4' ? '☒' : '☐'}</span> 4. Not visible at all 
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC2 == '2' ? '☒' : '☐'}</span> 2. Somewhat easy to see
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC2 == '5' ? '☒' : '☐'}</span> 5. N/A 
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC2 == '3' ? '☒' : '☐'}</span> 3. Difficult to see
                    </div>
                  </div>
                </div>
              </div>

              {/* CC3 */}
              <div className="flex text-[7pt] gap-1">
                <div className="font-bold w-10">CC3</div>
                <div className="flex-1">
                  <p className="mb-1">If aware of CC (answered codes 1-3 in CC1), how much did the CC help you in your transaction? </p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1 ml-2">
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC3 == '1' ? '☒' : '☐'}</span> 1. Helped very much
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC3 == '3' ? '☒' : '☐'}</span> 3. Did not help
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC3 == '2' ? '☒' : '☐'}</span> 2. Somewhat helped
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{selectedSurvey.CC3 == '4' ? '☒' : '☐'}</span> 4. N/A
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION III: SQD TABLE - EXACT REPLICA */}
            <div className="font-['Arial'] mb-2">
              <p className="text-[8pt] mb-1">
                <span className="text-[9pt] font-bold">INSTRUCTIONS: </span>
                 For SQD 0-8, please put a check mark ( ✔ ) on the column that best corresponds to your answer. 
              </p>
              
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
                  {renderSQDRow("SQD2. The office followed the transaction’s requirements and steps based on the information provided.", selectedSurvey.SQD2)}
                  {renderSQDRow("SQD3. The steps (including payment) I needed to do for my transaction were easy and simple.", selectedSurvey.SQD3)}
                  {renderSQDRow("SQD4. I easily found information about my transaction from the office or its website.", selectedSurvey.SQD4)}
                  {renderSQDRow("SQD5. I paid a reasonable amount of fees for my transaction. (If service was free, mark the “N/A” column)", selectedSurvey.SQD5)}
                  {renderSQDRow("SQD6. I feel the office was fair to everyone, or “walang palakasan”, during my transaction.", selectedSurvey.SQD6)}
                  {renderSQDRow("SQD7. I was treated courteously by the staff, and (if asked for help) the staff was helpful.", selectedSurvey.SQD7)}
                  {renderSQDRow("SQD8. I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.", selectedSurvey.SQD8)}
                </tbody>
              </table>
            </div>

            {/* SUGGESTIONS - EXACT REPLICA WITH PERSISTENT LINES */}
            <div className="font-['Arial'] mb-1">
              <p className="text-[9pt]">
                Suggestions on how we can further improve our services (optional):
              </p>
              <div 
                className="ml-2 text-[9pt] underline font-normal"  
                
              >
                {selectedSurvey.suggestions || ""}
              </div>
            </div>

            {/* FOOTER INFO (Rev Number) */}
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
  // Increased height to 32px to create natural top/bottom padding
  // Using flex items-center ensures the content NEVER touches the bottom line
  const cellStyle = "border-t-[0.5pt] border-l-[0.5pt] border-black p-0 h-[32px] w-[8%]";
  const checkStyle = "flex items-center justify-center w-full h-full text-[12pt] leading-none";

  return (
    <tr className="border-none">
      <td className="border-t-[0.5pt] border-l-[0.5pt] border-black px-3 h-[30px] w-[45%]">
        <div className="flex items-center h-full text-[7.5pt] leading-tight">
          {question}
        </div>
      </td>
      
      {/* Rating Cells */}
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '1' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '2' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '3' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '4' ? '✔' : ''}</div></td>
      <td className={cellStyle}><div className={checkStyle}>{ratingValue == '5' ? '✔' : ''}</div></td>
      
      {/* N/A Cell - Closing with border-r */}
      <td className={`${cellStyle} border-r-[0.5pt]`}>
        <div className={checkStyle}>{(ratingValue == '0' || !ratingValue) ? '✔' : ''}</div>
      </td>
    </tr>
  );
};

export default SurveyResults;