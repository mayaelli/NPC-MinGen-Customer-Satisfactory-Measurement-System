import React, { useMemo } from 'react';

const CCEvaluationTable = ({ reportData = [], office = "ISTD", signatories = {}, period = "JANUARY TO MARCH 2026" }) => {

  // Helper to tally counts based on your CC1, CC2, CC3 data
  const count = (code, val) => {
    return reportData.filter(d => {
      const key = `${code.toLowerCase()}_val`;
      return Number(d[key] || d[code]) === Number(val);
    }).length;
  };

  const total = reportData.length;
  const getPct = (num) => (total > 0 ? ((num / total) * 100).toFixed(0) : 0);

  return (
    <div
      id="printable-report"
      className="p-6 w-[8.5in] min-h-[11in] text-black shadow-none border-none pb-25"
      style={{ backgroundColor: '#ffffff', color: '#000000', fontFamily: 'Arial, sans-serif' }}
    >
      {/* 1. HEADER LOGO & TEXT */}
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

      {/* 2. THE MAIN TABLE */}
      <div className="pt-0 pb-2 font-['Arial'] text-left text-sm">
        <p>Part A. Count of CC results</p>
      </div>
      <table className="w-full font-['Arial'] border-collapse border-2 border-black text-sm">
        <thead>
          <tr className="bg-slate-50">
            <th className="border-2 border-black p-2 text-center w-[70%]">Citizen's Charter Answers</th>
            <th className="border-2 border-black p-2 text-center">Responses</th>
            <th className="border-2 border-black p-2 text-center">Percentage</th>
          </tr>
        </thead>
        <tbody>
          {/* CC1 Section */}
          <tr className=""><td colSpan="3" className="border-2 border-black p-1 pl-2">CC1. Which of the following best describes your awareness of a CC?</td></tr>
          {[
            { v: 1, t: "1. I know what a CC is and I saw this office's CC." },
            { v: 2, t: "2. I know what a CC is but I did NOT see this office's CC." },
            { v: 3, t: "3. I learned of the CC only when I saw this office's CC." },
            { v: 4, t: "4. I do not know what a CC is and I did not see one in this office." },
          ].map(opt => (
            <tr key={opt.v}>
              <td className="border-1 border-black p-1 pl-4">{opt.t}</td>
              <td className="border-1 border-black p-1 text-center">{count('CC1', opt.v)}</td>
              <td className="border-1 border-black p-1 text-center">{getPct(count('CC1', opt.v))}%</td>
            </tr>
          ))}

          {/* CC2 Section */}
          <tr className=""><td colSpan="3" className="border-2 border-black p-1 pl-2 bg-slate-50">CC2. If aware of CC (answered 1-3 in CC1), would you say that the CC of this office was ...?</td></tr>
          {[
            { v: 1, t: "1. Easy to see" }, { v: 2, t: "2. Somewhat easy to see" },
            { v: 3, t: "3. Difficult to see" }, { v: 4, t: "4. Not visible at all" },
          ].map(opt => (
            <tr key={opt.v}>
              <td className="border-1 border-black p-1 pl-4">{opt.t}</td>
              <td className="border-1 border-black p-1 text-center">{count('CC2', opt.v)}</td>
              <td className="border-1 border-black p-1 text-center">{getPct(count('CC2', opt.v))}%</td>
            </tr>
          ))}

          {/* CC3 Section */}
          <tr className=""><td colSpan="3" className="border-2 border-black p-1 pl-2 bg-slate-50">CC3. If aware of CC, how much did the CC help you in your transaction?</td></tr>
          {[
            { v: 1, t: "1. Helped very much" }, { v: 2, t: "2. Somewhat helped" }, { v: 3, t: "3. Did not help" },
          ].map(opt => (
            <tr key={opt.v}>
              <td className="border-1 border-black p-1 pl-4">{opt.t}</td>
              <td className="border-1 border-black p-1 text-center">{count('CC3', opt.v)}</td>
              <td className="border-1 border-black p-1 text-center">{getPct(count('CC3', opt.v))}%</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* 3. CONCLUSION SECTION */}
      <div className="mt-3 font-['Arial'] text-black">
        <h4 className="font-bold uppercase mb-1 text-[13px]">CONCLUSION:</h4>

        <div className="text-[13px]"> {/* Top border for the first row */}

          {/* Row 1: Awareness */}
          <div className="border-b border-black py-1 px-1">
            <p>
              <strong>{getPct(count('CC1', 1) + count('CC1', 2) + count('CC1', 3))}%</strong> know the existence of a Citizen's Charter (CC),
              <strong> {getPct(count('CC1', 4))}%</strong> were still unaware of the CC.
            </p>
          </div>

          {/* Row 2: Breakdown (Nested Logic) */}
          <div className="border-b border-black py-1 px-1">
            <p>
              {(() => {
                const awareCount = count('CC1', 1) + count('CC1', 2) + count('CC1', 3);
                const sawCount = count('CC1', 1) + count('CC1', 3);
                const sawPct = awareCount > 0 ? ((sawCount / awareCount) * 100).toFixed(0) : 0;

                return `Among those who knew the CC, ${sawPct}% were able to see this office's CC.`;
              })()}
            </p>
          </div>

          {/* Row 3: Usage */}
          <div className="border-b border-black py-1 px-1">
            <p>
              However, only <strong>{getPct(count('CC3', 1))}%</strong> of clients were able to use it as a guide for their services.
            </p>
          </div>

        </div>
      </div>

      {/* 4. SIGNATORIES SECTION */}
      <div className="mt-2 text-[13px] font-['Arial'] max-w-[100%] mx-auto space-y-8">
        <SignatoryBox
          label="Prepared by:"
          name={signatories.preparedName}
          title={signatories.preparedTitle}
        />

        <SignatoryBox
          label="Reviewed by:"
          name={signatories.reviewedName}
          title={signatories.reviewedTitle}
        />

        <SignatoryBox
          label="Approved by:"
          name={signatories.approvedName}
          title={signatories.approvedTitle}
        />
      </div>

      {/* FOOTER CODE */}
      <div className="mt-auto pt-2 font-['Arial'] text-[10px] font-mono flex justify-between">
        <span>MGG-IMS-006.F03 Rev. No. 0</span>
      </div>
    </div>
  );
};

{/* Updated SignatoryBox Component */ }
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

export default CCEvaluationTable;