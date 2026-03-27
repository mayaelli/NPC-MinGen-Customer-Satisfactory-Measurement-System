// General User inputs

import React, { useState, useEffect, useRef} from 'react';
import html2pdf from 'html2pdf.js';

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
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Printing State
  const printRef = useRef();

  const handleDownload = () => {
  const element = printRef.current;
  
  const opt = {
    margin: 0,
    filename: `CSM_${selectedSurvey.full_name}.pdf`,
    image: { type: 'jpeg', quality: 1.0 },
    html2canvas: { 
      scale: 4, 
      useCORS: true, 
      width: 794,
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
      letterRendering: true,
      y: 0

    },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait', putOnlyUsedFonts: true, compress: true }
  };

  html2pdf().set(opt).from(element).toPdf().get('pdf').then((pdf) => {
    const totalPages = pdf.internal.getNumberOfPages();
    
    // If a blank page exists, delete it before saving
    if (totalPages > 1) {
      pdf.deletePage(totalPages);
    }
  }).save();
};

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = () => {
    setLoading(true);
    fetch('http://localhost/MinGen%20CSM/minGen-api/survey/get_survey_results.php')
      .then(res => res.json())
      .then(res => {
        if (res.status === 'success') setData(res.data);
        setLoading(false);
      });
  };

  const handlePrint = () => {   
    window.print(); 
  }

  // General User Mapper
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  
  const filteredData = data
  .filter(item => {
    // We convert everything to lowercase safely
    // If the field is null, it defaults to an empty string ""
    const name = (item.full_name || "").toLowerCase();
    const email = (item.email || "").toLowerCase();
    const office = (item.office_name || "").toLowerCase();
    const service = (item.service_name || "").toLowerCase();
    const search = searchTerm.toLowerCase();

    return (
      name.includes(search) ||
      email.includes(search) ||
      office.includes(search) ||
      service.includes(search)
    );
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      // Standard sorting logic
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
    });

  // Pagination slice state
  const itemsPerPage = 10;
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem); 
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const isSearching = searchTerm.length >= 2;

  const isNameSearch = filteredData.some(item =>
    item.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const userInsights = (isSearching && filteredData.length > 0) ? {
    title: isNameSearch ? filteredData[0]?.full_name : searchTerm.toUpperCase(),
    subtitle: isNameSearch ? "Master Profile" : "Division / Service Overview",
    
    totalVisits: filteredData.length,
    offices: [...new Set(filteredData.map(d => d.office_name))],
    services: [...new Set(filteredData.map(d => d.service_name))],
    avgRating: (filteredData.reduce((acc, curr) => acc + parseFloat(curr.avg_rating || 0), 0) / filteredData.length).toFixed(1),
    firstVisit: filteredData.length > 0 
      ? new Date(Math.min(...filteredData.map(d => new Date(d.created_at)))).toLocaleDateString()
      : "N/A"
  } : null;

  if (loading) return <div className="p-10 text-center text-slate-400 font-bold animate-pulse uppercase">Syncing Records...</div>;

  return (
    <div className="space-y-6">

      <style>{A4_PRINT_STYLE}</style>
      {/* FEED TABLE (Admin View) */}
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Survey Feed</h2>
          <p className="text-sm text-slate-500 font-medium">Click to view formal MGG-IMS-006.F01 document.</p>
        </div>
        <button onClick={fetchResults} className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded text-white font-bold text-[10px] uppercase tracking-widest transition shadow-lg">
          Refresh Feed ({data.length})
        </button>
      </div>

      
      {/* SEARCH & SORT CONTROLS */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full max-w-md group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text" 
              placeholder="Search Client Name (e.g. Faye)..." 
              className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
              value={searchTerm}
              onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}}
            />
            {isSearching && (
              <button 
                onClick={() => setSearchTerm("")}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            )}
          </div>

          <button 
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all flex items-center gap-2 shadow-sm"
          >
            {sortOrder === 'desc' ? '▼ Newest First' : '▲ Oldest First'}
          </button>
        </div>

        {/* SEARCH EMPTY STATE */}
      {searchTerm.length > 0 && filteredData.length === 0 && (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center animate-in fade-in zoom-in-95 duration-300 my-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-sm">
            <svg 
              className="w-10 h-10 text-slate-300" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="1.5" 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          
          <h3 className="text-slate-900 font-black text-xl uppercase tracking-tight">
            No Records Found
          </h3>
          
          <p className="text-slate-500 text-sm max-w-sm mx-auto mt-3 leading-relaxed">
            We couldn't find any results for <span className="font-bold text-indigo-600">"{searchTerm}"</span>. 
            Try checking the spelling or searching for a different office or service.
          </p>

          <button 
            onClick={() => setSearchTerm("")}
            className="mt-8 px-6 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm"
          >
            Clear Search
          </button>
        </div>
      )}
        

        {/* INSIGHT MAPPING TABLE (Top View) */}
        {userInsights && (
          <div className="animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center gap-2 mb-3 px-1">
              <div className="h-4 w-1 bg-indigo-500 rounded-full"></div>
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mapping Results for "{searchTerm}"</h2>
            </div>
            <div className="bg-indigo-900 rounded-xl shadow-xl overflow-hidden border border-indigo-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-indigo-950/50 text-[8px] font-bold text-indigo-300 uppercase tracking-[0.2em]">
                    <th className="px-6 py-3">Master Profile</th>
                    <th className="px-6 py-3">Department Reach</th>
                    <th className="px-6 py-3">Services History</th>
                    <th className="px-6 py-3 text-center">Lifetime Rating</th>
                  </tr>
                </thead>
                <tbody className="text-white border-t border-indigo-800/50">
                  <tr>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">
                          {userInsights.subtitle}
                        </p>
                        <h2 className="text-xl font-black uppercase">
                          {userInsights.title}
                        </h2>
                        <p className="text-[10px] text-indigo-400 mt-1">
                          {userInsights.totalVisits} Records matching your search
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {userInsights.offices.map((off, i) => (
                          <span key={i} className="bg-indigo-500/20 border border-indigo-400/30 px-2 py-0.5 rounded text-[9px] font-bold uppercase text-indigo-200">
                            {off}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-[10px] text-indigo-200/80 leading-relaxed italic max-w-md">
                        {userInsights.services.join(" • ")}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="inline-block px-4 py-1 bg-white text-indigo-900 rounded-lg font-black text-base shadow-lg">
                        {userInsights.avgRating}
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}


      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden print:hidden">

        {/* 1. THE SEARCH EMPTY STATE (Place this before the table) */}
          {searchTerm.length > 0 && filteredData.length === 0 && (
            <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center animate-in fade-in zoom-in-95 duration-300 my-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full mb-6 shadow-sm">
                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-slate-900 font-black text-xl uppercase tracking-tight">No Records Found</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto mt-3">
                We couldn't find anything matching <span className="font-bold text-indigo-600">"{searchTerm}"</span>.
              </p>
              <button onClick={() => setSearchTerm("")} className="mt-8 px-6 py-2 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-widest hover:text-indigo-600 transition-all shadow-sm">
                Clear Search
              </button>
            </div>
          )}

          {/* 2. THE TABLE (Only renders if there is data to show) */}
          {filteredData.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden mt-6 animate-in fade-in duration-500">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4 w-16">#</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Office/Service</th>
                    <th className="px-6 py-4 text-center">Rating</th>
                    <th className="px-6 py-4 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentItems.map((row, index) => {
                    const seqId = sortOrder === 'desc' 
                      ? filteredData.length - (indexOfFirstItem + index) 
                      : indexOfFirstItem + index + 1;

                    return (
                      <tr key={row.id} onClick={() => setSelectedSurvey(row)} className="hover:bg-indigo-50/50 cursor-pointer transition-colors group">
                        <td className="px-6 py-4 text-[10px] font-black text-slate-300">#{String(seqId).padStart(3, '0')}</td>
                        <td className="px-6 py-4">
                          <p className="text-xs font-bold text-slate-700 uppercase">{row.full_name}</p>
                        </td>
                        <td className="px-6 py-4 uppercase text-[10px]">
                          <p className="font-bold text-slate-600">{row.office_name}</p>
                          <p className="text-slate-400 italic truncate max-w-[180px]">{row.service_name}</p>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg font-black text-xs ${
                            parseFloat(row.avg_rating) >= 4 ? 'text-emerald-600 bg-emerald-50' : 'text-slate-800 bg-slate-100'
                          }`}>
                            {parseFloat(row.avg_rating || 0).toFixed(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-[10px] font-bold text-slate-400">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {/* YOUR PAGINATION COMPONENT GOES HERE */}
              <div className="flex items-center justify-between px-6 py-4 bg-white border-t border-slate-100">
                      {/* Info text */}
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, data.length)} of {data.length} Results
                      </p>

                      {/* Navigation Arrows */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className={`p-2 rounded-lg border transition-all ${
                            currentPage === 1 
                            ? 'opacity-30 cursor-not-allowed border-slate-200' 
                            : 'hover:bg-indigo-50 border-indigo-100 text-indigo-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>

                        <div className="flex items-center px-4 text-xs font-black text-slate-700 bg-slate-50 rounded-lg border border-slate-200">
                          {currentPage} / {totalPages}
                        </div>

                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className={`p-2 rounded-lg border transition-all ${
                            currentPage === totalPages 
                            ? 'opacity-30 cursor-not-allowed border-slate-200' 
                            : 'hover:bg-indigo-50 border-indigo-100 text-indigo-600'
                          }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
            </div>
          )}
        

      </div>

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