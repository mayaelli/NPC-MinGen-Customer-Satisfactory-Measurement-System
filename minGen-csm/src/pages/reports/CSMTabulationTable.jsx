import React from 'react';

const CSMTabulationTable = ({ 
  services = [], 
  allPossibleServices = [],
  office = "ISTD",
  period = "OCTOBER TO DECEMBER 2025", 
  signatories = {}
}) => {

  const aggregatedServices = React.useMemo(() => {
  const groups = {};

    // 1. First, initialize the groups with EVERY possible service
    // This ensures that even services with 0 responses exist in our object
    if (allPossibleServices) {
      allPossibleServices.forEach(service => {
        const name = service.service_name?.toUpperCase().trim();
        const type = (service.service_type || "INTERNAL").toUpperCase().trim();
        
        groups[name] = { 
          service_name: name, 
          responses: 0, 
          transactions: 0, 
          type: type 
        };
      });
    }

    // 2. Now, loop through the actual submissions (the 'services' prop)
    // and increment the counts for the ones that actually had feedbacks
    services.forEach(submission => {
      const name = submission.service_name?.toUpperCase().trim();
      
      if (groups[name]) {
        groups[name].responses += 1; 
        groups[name].transactions += 1; 
      } else {
        // Safety: If a submission exists for a service not in our master list
        const type = (submission.service_type || "INTERNAL").toUpperCase().trim();
        groups[name] = { 
          service_name: name, 
          responses: 1, 
          transactions: 1, 
          type: type 
        };
      }
    });

    return Object.values(groups);
  }, [services, allPossibleServices]); // Include both in dependencies
  // 2. THE FIX: Do NOT filter out zeros for the main table mapping
  // This ensures the 0s show up in the rows just like your image
  const externalServices = aggregatedServices.filter(s => s.type === 'EXTERNAL');
  const internalServices = aggregatedServices.filter(s => s.type === 'INTERNAL');

  // 3. THE "NO CLIENTS" LOGIC
  // We still need this for the bottom box
  const noClientServices = aggregatedServices.filter(s => Number(s.transactions) === 0);

  // 4. THE MATH FIX
  // In the image, the total is 35. If you have 0s in the table, 
  // they don't affect the sum, so this math is safe:
  const totalResponses = aggregatedServices.reduce((sum, s) => sum + s.responses, 0);
  const totalTransactions = aggregatedServices.reduce((sum, s) => sum + s.transactions, 0);

  // Define responseRate here so it's available below
  const responseRate = totalTransactions > 0 
    ? ((totalResponses / totalTransactions) * 100).toFixed(0) 
    : 0;

  return (
    <div 
      id="printable-tabulation"
      className="p-6 w-[8.5in] min-h-[11in] text-black shadow-none border-none pb-25 mx-auto" 
      style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}
    >
      {/* 1. HEADER SECTION (Shared Design) */}
      <div className="text-center -mt-4 space-y-0 mb-1 flex flex-col items-center">
        <div className="mb-2">
          <img 
            src="/npc-new-logo.png" 
            alt="NPC Logo" 
            className="w-20 h-20 object-contain" 
          />
        </div>

        <div className="font-['Arial'] uppercase">
          <h2 className="text-[16px] font-bold leading-tight">National Power Corporation</h2>
          <h2 className="text-[16px] font-bold leading-tight">Mindanao Generation</h2>
          <h2 className="text-[14px] font-bold leading-tight">Integrated Management System</h2>
          
          <div className="pt-6">
            <h1 className="text-xl font-bold tracking-tight">CSM TABULATION</h1>
          </div>
          
          <div className="pt-4 text-sm font-bold">
            {office} - NPC Mindanao Generation
          </div>
        </div>
      </div>

      <div className="text-[13px] mb-2 mt-6">
        <p>The services surveyed are the following:</p>
      </div>

      {/* 2. CONTENT TABLE (Based on Image) */}
      <table className="w-full border-collapse border-1 border-black text-[12px] mb-6">
        <thead>
          <tr className="bg-gray-100 uppercase">
            <th className="border-1 border-black p-2 w-[60%] text-center">External Services</th>
            <th className="border-1 border-black p-2 text-center">Responses</th>
            <th className="border-1 border-black p-2 text-center">Total Transactions</th>
          </tr>
        </thead>
        <tbody>
          {/* External Mapping */}
          {externalServices.length > 0 ? externalServices.map((s, i) => (
            <tr key={`ext-${i}`} className="uppercase">
              <td className="border-1 border-black p-2">{s.service_name}</td>
              <td className="border-1 border-black p-2 text-center">{s.responses}</td>
              <td className="border-1 border-black p-2 text-center">{s.transactions}</td>
            </tr>
          )) : (
            <tr className="text-center">
              <td className="border-1 border-black p-2 italic text-gray-400">N/A</td>
              <td className="border-1 border-black p-2"></td>
              <td className="border-1 border-black p-2"></td>
            </tr>
          )}

          {/* Internal Services Header Row */}
          <tr className="bg-gray-100 uppercase font-bold text-center">
            <td className="border-1 border-black p-2">Internal Services</td>
            <td className="border-1 border-black p-2">Responses</td>
            <td className="border-1 border-black p-2">Total Transactions</td>
          </tr>
          {/* Internal Mapping */}
          {internalServices.length > 0 ? internalServices.map((s, i) => (
            <tr key={`int-${i}`} className="uppercase">
              <td className="border-1 border-black p-2">{s.service_name}</td>
              <td className="border-1 border-black p-2 text-center">{s.responses}</td>
              <td className="border-1 border-black p-2 text-center">{s.transactions}</td>
            </tr>
          )) : (
            <tr className="text-center italic text-gray-400">
              <td className="border-1 border-black p-2" colSpan="3">No Internal Services recorded</td>
            </tr>
          )}

          {/* Nothing Follows */}
          <tr>
            <td className="border-1 border-black text-center p-1 italic text-[11px] font-bold" colSpan="3">
              **Nothing follows**
            </td>
          </tr>
          
          <tr className="bg-gray-50 font-bold uppercase">
            <td className="border-1 border-black p-2 text-center">Total</td>
            <td className="border-1 border-black p-2 text-center">{totalResponses}</td>
            <td className="border-1 border-black p-2 text-center">{totalTransactions}</td>
          </tr>
        </tbody>
      </table>

      {/* 3. CONCLUSION SECTION */}
      <div className="text-[13px] space-y-3 mb-8">
        <p className="font-bold uppercase underline">Conclusion:</p>
        <p className="border-b border-black pb-1">
          In aggregate, <strong>{totalResponses}</strong> people were able to answer the survey, among a population of <strong>{totalTransactions}</strong>.
        </p>
        <p className="border-b border-black pb-1">
          This resulted in a <strong>{responseRate}%</strong> response rate for {period}
        </p>
      </div>

      {/* 4. NO CLIENTS BOX */}
      <div className="border-1 border-black text-[12px] mb-10 overflow-hidden">
        <div className="bg-gray-100 p-2 font-bold border-b border-black uppercase">
          The following services had no clients for the period {period}
        </div>
        <div className="p-3 min-h-[60px]">
          {noClientServices.length > 0 ? (
            <div className="grid grid-cols-1 gap-1">
              {noClientServices.map((s, i) => (
                <div key={i} className="uppercase flex gap-2 text-[11px]">
                  <span className="font-bold">{i + 1}.</span> 
                  <span>{s.service_name}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="italic text-gray-400 uppercase">None identified for this period.</div>
          )}
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

// Benchmarked Signatory Box
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

export default CSMTabulationTable;