import React, { useMemo } from 'react';

const SQDEvaluationTable = ({ reportData = [], office = "ISTD", signatories = {}, period = "JANUARY TO MARCH 2026" }) => {
  
  // 1. Separate the logic for SQD0 and SQD1-8
  const sqd0Dim = { id: 'sqd0', label: 'SQD0' };
  
  const mainDimensions = [
    { id: 'sqd1', label: 'Responsiveness' },
    { id: 'sqd2', label: 'Reliability' },
    { id: 'sqd3', label: 'Access and Facilities' },
    { id: 'sqd4', label: 'Communication' },
    { id: 'sqd5', label: 'Costs' },
    { id: 'sqd6', label: 'Integrity' },
    { id: 'sqd7', label: 'Assurance' },
    { id: 'sqd8', label: 'Outcome' },
  ];

  // Helper to count specific ratings (1-5) per row
  const getCount = (dimId, rating) => {
  return reportData.filter(d => {
    // Look for 'sqd0_val', 'sqd1_val', etc.
    const key = `${dimId.toLowerCase()}_val`; 
    return Number(d[key] || d[dimId.toUpperCase()]) === Number(rating);
  }).length;
};

  // Calculate Overall Score (Average rating out of 5, displayed as %)
  const getOverallScore = (dimId) => {
  const key = `${dimId.toLowerCase()}_val`;
  const valid = reportData.filter(d => {
    const val = d[key] || d[dimId.toUpperCase()];
    return val && Number(val) !== 0;
  });
  
  if (valid.length === 0) return "0.00";
  
  const sum = valid.reduce((acc, curr) => {
    const val = curr[key] || curr[dimId.toUpperCase()];
    return acc + Number(val);
  }, 0);
  
  return ((sum / valid.length/ 5) * 100).toFixed(2);
};

  // Logic for the text range (Min and Max scores of SQD1-8)
  const allScores = mainDimensions.map(d => parseFloat(getOverallScore(d.id)));
  const minScore = Math.min(...allScores).toFixed(2);
  const maxScore = Math.max(...allScores).toFixed(2);

  // Helper to determine the rating word (Outstanding vs Very Satisfactory)
  const getRatingWord = (score) => {
    const s = parseFloat(score);
    if (s >= 95.0) return "Outstanding";
    if (s >= 90.0) return "Very Satisfactory";
    if (s >= 80.0) return "Satisfactory";
    if (s >= 60.0) return "Fair";
    return "Poor";
};

  return (
    <div 
      id="printable-report"
      className="p-6 w-[8.5in] min-h-[11in] text-black shadow-none border-none pb-25" 
      style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}
    >
      {/* 1. HEADER SECTION */}
      <div className="text-center -mt-4 space-y-0 mb-1 flex flex-col items-center">
        <div className="mb-2">
          {/* Correctly referencing the public folder logo */}
          <img 
            src="/npc-new-logo.png" 
            alt="NPC Logo" 
            className="w-20 h-20 object-contain" 
          />
        </div>

        <div className="font-['Arial']">
        <h2 className="text-[16px] font-bold leading-tight">National Power Corporation</h2>
        <h2 className="text-[16px] font-bold leading-tight">Mindanao Generation</h2>
        <h2 className="text-[16px] font-bold leading-tight">Integrated Management System</h2>
        
        <div className="pt-6">
          <h1 className="text-xl uppercase font-bold tracking-tight">CSM EVALUATION SHEET</h1>
          <p className="text-sm">FOR THE PERIOD: {period}</p>
        </div>
        
        <div className="pt-4 uppercase text-sm">
          {office} - NPC Mindanao Generation
        </div>
      </div>
      </div>

      {/* 2. SQD0 SECTION */}
      <div className="text-[13px] mb-2 mt-4">
        <p>For SQD0, most respondents found the overall experience as "<strong>{getRatingWord(getOverallScore('sqd0'))}</strong>".</p>
      </div>

      <table className="w-full border-collapse border-1 border-black text-[13px] mb-8">
        <thead>
          <tr className="bg-gray-100">
            <th className="border-1 border-black p-1 w-[25%] text-center">Service Quality Dimensions</th>
            <th className="border-1 border-black p-1 text-center">Strongly Agree</th>
            <th className="border-1 border-black p-1 text-center">Agree</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Neither Agree nor Disagree</th>
            <th className="border-1 border-black p-1 text-center">Disagree</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Strongly Disagree</th>
            <th className="border-1 border-black p-1 text-center">N/A</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Total Responses</th>
            <th className="border-1 border-black p-1 text-center">Overall</th>
          </tr>
        </thead>
        <tbody>
                <tr className="text-center">
                  {/* Label Column */}
                  <td className="border-1 border-black p-1 text-left">{sqd0Dim.label}</td>
                  
                  {/* Individual Counts */}
                  <td className="border-1 border-black p-1">{getCount('sqd0', 5)}</td>
                  <td className="border-1 border-black p-1">{getCount('sqd0', 4)}</td>
                  <td className="border-1 border-black p-1">{getCount('sqd0', 3)}</td>
                  <td className="border-1 border-black p-1">{getCount('sqd0', 2)}</td>
                  <td className="border-1 border-black p-1">{getCount('sqd0', 1)}</td>
                  <td className="border-1 border-black p-1">{getCount('sqd0', 0)}</td>
                  
                  {/* FIXED Total Responses Logic */}
                  <td className="border-1 border-black p-1">
                    {reportData.filter(d => (d.sqd0_val !== undefined || d.SQD0 !== undefined)).length}
                  </td>
                  
                  {/* Overall Score */}
                  <td className="border-1 border-black p-1">
                    {getOverallScore('sqd0')}%
                  </td>
                </tr>
        </tbody>
      </table>

      {/* 3. SQD 1-8 SECTION */}
      <div className="text-[13px] mb-2">
        <p>
          Most respondents found the the 8 service quality dimensions <strong>{getRatingWord(maxScore)}</strong>, 
          recording a score range of <strong>{minScore}%-{maxScore}%</strong>.
        </p>
      </div>

      <table className="w-full border-collapse border-1 border-black text-[13px]">
        <thead>
          <tr className="bg-gray-100">
            <th className="border-1 border-black p-1 w-[25%] text-center">Service Quality Dimensions</th>
            <th className="border-1 border-black p-1 text-center">Strongly Agree</th>
            <th className="border-1 border-black p-1 text-center">Agree</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Neither Agree nor Disagree</th>
            <th className="border-1 border-black p-1 text-center">Disagree</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Strongly Disagree</th>
            <th className="border-1 border-black p-1 text-center">N/A</th>
            <th className="border-1 border-black p-1 text-center leading-tight">Total Responses</th>
            <th className="border-1 border-black p-1 text-center">Overall</th>
          </tr>
        </thead>
        <tbody>
          {mainDimensions.map((dim) => {
            const valKey = `${dim.id.toLowerCase()}_val`;
            const rawKey = dim.id.toUpperCase();
            const rowTotal = reportData.filter(d => 
              d[valKey] !== undefined || d[rawKey] !== undefined
            ).length;

            const score = getOverallScore(dim.id);

            return (
              <tr key={dim.id} className="text-center">
                <td className="border-1 border-black p-1 font-medium text-left">{dim.label}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 5)}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 4)}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 3)}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 2)}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 1)}</td>
                <td className="border-1 border-black p-1">{getCount(dim.id, 0)}</td>
                <td className="border-1 border-black p-1">{rowTotal}</td>
                <td className="border-1 border-black p-1">{score}%</td>
              </tr>
            );
          })}
          {/* OVERALL SUMMARY ROW */}
          <tr className="bg-gray-50 text-center">
            <td className="border-1 border-black p-1 text-left uppercase text-[13px]">Overall</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 5), 0)}</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 4), 0)}</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 3), 0)}</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 2), 0)}</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 1), 0)}</td>
            <td className="border-1 border-black p-1">{mainDimensions.reduce((acc, d) => acc + getCount(d.id, 0), 0)}</td>
            <td className="border-1 border-black p-1">{reportData.length * 8}</td>
            <td className="border-1 border-black p-1 text-[13px]">
              {(allScores.reduce((acc, s) => acc + s, 0) / 8).toFixed(2)}%
            </td>
          </tr>
        </tbody>
      </table>

      {/* 4. SIGNATORIES SECTION */}
      <div className="mt-12 space-y-8">
        <SignatoryBox label="Prepared by:" name={signatories.preparedName} title={signatories.preparedTitle} />
        <SignatoryBox label="Reviewed by:" name={signatories.reviewedName} title={signatories.reviewedTitle} />
        <SignatoryBox label="Approved by:" name={signatories.approvedName} title={signatories.approvedTitle} />
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-10 text-[10px] font-mono flex justify-between uppercase">
        <span>MGG-IMS-008.F04 Rev. No. 0</span>
      </div>
    </div>
  );
};

const SignatoryBox = ({ label, name, title }) => (
  <div className="w-full flex items-end gap-8 mb-6">
    {/* Left Side: Label, Name, and Title */}
    <div className="flex-1">
      <p className="mb-6  text-left text-sm">{label}</p>
      <div className="flex flex-col items-center">
        <div className="w-full border-b border-black mb-1">
          <p className=" uppercase text-center text-[13px] px-2 text-sm">
            {name || "Enter Name"}
          </p>
        </div>
        <p className="text-[11px] text-center italic">{title || "Enter Title"}</p>
      </div>
    </div>

    {/* Right Side: Date Line */}
    <div className="w-32 flex flex-col items-center">
      <div className="w-full border-b border-black mb-1 h-[44px]"></div> {/* Matches height of name box */}
      <p className="text-[10px] text-center">Date</p>
    </div>
  </div>
);

export default SQDEvaluationTable;