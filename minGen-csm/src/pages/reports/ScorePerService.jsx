import React from 'react';

const ScorePerService = ({ 
  services = [], 
  office = "ISTD - OPD", 
  user = {},
  period = "January to March 2025", 
  signatories = {} 
}) => {

  // 1. Rating Logic Formula
  const getRatingLabel = (percentage) => {
    const p = parseFloat(percentage);
    if (p >= 95) return "5 (Outstanding)"; 
    if (p >= 90) return "4 (Very Satisfactory)";
    if (p >= 80) return "3 (Satisfactory)";
    if (p >= 60) return "2 (Fair)";
    return "1 (Poor)";
  };

  /** * MODIFIED FETCHING LOGIC:
   * 1. Check if we are in 'Global' view or Super Admin - if so, don't filter by office.
   * 2. Otherwise, match by office_id or office_name (flexible matching).
   */
  const officeSpecificServices = services.filter(s => {
    // If no user/office is provided, show all (fallback)
    if (!user?.office_id && office === "Mindanao Generation") return true;
    
    // Match by ID (preferred) or Name
    return String(s.office_id) === String(user?.office_id) || 
           s.office_name?.toLowerCase().includes(office.toLowerCase());
  });

  const internalServices = services.filter(s => {
    // Check 'type', 'service_type', or 'category' for the word 'internal'
    const type = (s.type || s.service_type || s.category || "").toLowerCase();
    return type === 'internal';
  });

  const externalServices = services.filter(s => {
    const type = (s.type || s.service_type || s.category || "").toLowerCase();
    return type === 'external';
  });
  // 3. Calculation for Overall Total
  const validServices = officeSpecificServices.filter(s => Number(s.transactions) > 0);
  const avgPercentage = validServices.length > 0 
    ? (validServices.reduce((sum, s) => sum + ((s.responses / s.transactions) * 100), 0) / validServices.length).toFixed(2)
    : 0;

  return (
    <div 
      id="printable-tabulation"
      className="p-12 w-[8.5in] min-h-[11in] text-black mx-auto bg-white" 
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* HEADER SECTION */}
      <div className="text-center flex flex-col items-center mb-8">
        <img src="/npc-docs-logo.png" alt="NPC Logo" className="w-16 h-16 object-contain mb-2" />
        <h2 className="text-[14px] font-bold uppercase leading-tight">National Power Corporation</h2>
        <h2 className="text-[14px] font-bold uppercase leading-tight">Mindanao Generation</h2>
        <h2 className="text-[12px] font-bold uppercase leading-tight">Integrated Management System</h2>
        
        <h1 className="text-[16px] font-bold mt-6 underline">CSM SCORE PER SERVICE TABULATION SHEET</h1>
        <p className="text-[13px] mt-1">For the period: {period}</p>
        <p className="text-[13px] font-bold mt-4 uppercase">{office}, NPC Mindanao Generation</p>
      </div>

      {/* MAIN TABLE */}
      <table className="w-full border-collapse border-[1.5px] border-black text-[12px]">
        <thead>
          <tr className="bg-white">
            <th className="border border-black p-2 w-[75%] text-center font-bold text-[14px]">External Services</th>
            <th className="border border-black p-2 text-center font-bold text-[14px]">Overall Rating</th>
          </tr>
        </thead>
        <tbody>
          {/* EXTERNAL SERVICES */}
          {externalServices.length > 0 ? externalServices.map((s, i) => (
            <tr key={`ext-${i}`}>
              <td className="border border-black p-2 text-left">{s.service_name}</td>
              <td className="border border-black p-2 text-center font-bold">
                {s.transactions > 0 ? ((s.responses / s.transactions) * 100).toFixed(2) : "0.00"}%
              </td>
            </tr>
          )) : (
            <tr>
              <td className="border border-black p-2 text-center py-4 italic text-gray-400" colSpan="1">N/A</td>
              <td className="border border-black p-2"></td>
            </tr>
          )}
          
          <tr className="bg-white font-bold">
            <td className="border border-black p-2 text-left">External Service Total</td>
            <td className="border border-black p-2"></td>
          </tr>

          {/* INTERNAL SERVICES */}
          <tr className="bg-white">
            <th className="border border-black p-2 text-center font-bold text-[14px]">Internal Services</th>
            <th className="border border-black p-2 text-center font-bold text-[14px]">Responses</th>
          </tr>
          
          {internalServices.length > 0 ? internalServices.map((s, i) => (
            <tr key={`int-${i}`}>
              <td className="border border-black p-2 text-left">{s.service_name}</td>
              <td className="border border-black p-2 text-center font-bold">
                {s.transactions > 0 ? ((s.responses / s.transactions) * 100).toFixed(2) : "0.00"}%
              </td>
            </tr>
          )) : (
            <tr>
              <td className="border border-black p-2 text-center py-4 italic text-gray-400" colSpan="1">None Identified</td>
              <td className="border border-black p-2"></td>
            </tr>
          )}

          {/* FILLER / NOTHING FOLLOWS */}
          <tr>
            <td className="border border-black text-center p-2 italic font-bold" colSpan="2">
              **Nothing follows**
            </td>
          </tr>

          <tr className="bg-white font-bold">
            <td className="border border-black p-2 text-left italic">Internal Service Total</td>
            <td className="border border-black p-2 text-center"></td>
          </tr>

          {/* OVERALL TOTAL */}
          <tr className="bg-white font-bold text-[14px]">
            <td className="border border-black p-2 text-center uppercase tracking-widest">Overall Total</td>
            <td className="border border-black p-2 text-center">{avgPercentage}%</td>
          </tr>
        </tbody>
      </table>

      {/* CONCLUSION SECTION */}
      <div className="mt-8 text-[13px]">
        <p className="font-bold uppercase mb-2">Conclusion:</p>
        <div className="space-y-4">
          <p className="border-b border-black w-full pb-1 italic">
            Based on the data tabulated above, the office achieved an average rating of <strong>{avgPercentage}%</strong>.
          </p>
          <p className="border-b border-black w-full pb-1 italic">
            Adhering to the CSS rating scale, this performance is classified as <strong>{getRatingLabel(avgPercentage)}</strong>.
          </p>
          <div className="border-b border-black w-full h-6"></div>
        </div>
      </div>

      <div className="mt-10">
        <div className="w-[50%] flex flex-col">
          <p className="mb-10 text-left text-[13px] italic">
            {signatories.additionalLabel || "Tabulated by"}:
          </p>
          <div className="flex flex-col text-center">
            <p className="uppercase font-bold text-[15px] border-b border-black min-h-[22px]">
              {signatories.additionalName}
            </p>
            <p className="text-[11px] uppercase mt-1">
              {signatories.additionalTitle}
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-10 text-[10px] font-mono flex justify-between uppercase text-gray-500">
        <span>MGG-IMS-006.F02 Rev. No. 0</span>
      </div>
    </div>
  );
};

const SignatoryBox = ({ label, name, title }) => (
  <div className="w-[60%] flex flex-col">
    <p className="mb-10 text-left text-[13px] italic">{label}</p>
    <div className="flex flex-col items-center">
      <div className="w-full border-b border-black mb-1">
        <p className="uppercase text-center font-bold text-[14px]">
          {name || "Enter Name"}
        </p>
      </div>
      <p className="text-[11px] text-center uppercase">{title || "Enter Title"}</p>
    </div>
  </div>
);

export default ScorePerService;