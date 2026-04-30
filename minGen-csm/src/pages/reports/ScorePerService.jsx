import React, { useMemo } from 'react';

const SQD_KEYS = ['SQD0', 'SQD1', 'SQD2', 'SQD3', 'SQD4', 'SQD5', 'SQD6', 'SQD7', 'SQD8'];

// Formula: (Strongly Agree [5] + Agree [4]) / (Total - N/A [0 or null]) * 100
const computeScore = (submissions) => {
  let agreeCount = 0;
  let validCount = 0;

  submissions.forEach(sub => {
    SQD_KEYS.forEach(key => {
      const raw = sub[key] ?? sub[key.toLowerCase()] ?? sub[key.toLowerCase() + '_val'];
      const rating = parseInt(raw);
      if (!raw || isNaN(rating) || rating === 0) return; // N/A or missing
      validCount++;
      if (rating >= 4) agreeCount++; // Agree (4) or Strongly Agree (5)
    });
  });

  if (validCount === 0) return null;
  return (agreeCount / validCount) * 100;
};

const getRatingLabel = (pct) => {
  if (pct === null) return '—';
  if (pct >= 95) return 'Outstanding';
  if (pct >= 90) return 'Very Satisfactory';
  if (pct >= 80) return 'Satisfactory';
  if (pct >= 60) return 'Fair';
  return 'Poor';
};

const fmt = (pct) => pct === null ? '0.00%' : pct.toFixed(2) + '%';

const ScorePerService = ({
  services = [],
  allPossibleServices = [],
  office = "ISTD",
  user = {},
  period = "January to March 2025",
  signatories = {}
}) => {

  // Filter to selected office
  const filtered = useMemo(() => {
    if (office === 'All' || office === 'NPC Mindanao Generation') return services;
    return services.filter(s =>
      s.office_name?.toUpperCase() === office?.toUpperCase() ||
      String(s.office_id) === String(user?.office_id)
    );
  }, [services, office, user]);

  // Group submissions by service name, carry service_type
  const grouped = useMemo(() => {
    const map = {};

    // Seed with all possible services (0 responses by default)
    allPossibleServices.forEach(s => {
      const name = s.service_name?.toUpperCase().trim();
      if (!name) return;
      const type = (s.service_type || 'INTERNAL').toUpperCase().trim();
      if (!map[name]) map[name] = { service_name: name, type, submissions: [] };
    });

    // Fill in actual submissions
    filtered.forEach(sub => {
      const name = sub.service_name?.toUpperCase().trim() || 'UNKNOWN';
      const type = (sub.service_type || 'INTERNAL').toUpperCase().trim();
      if (!map[name]) map[name] = { service_name: name, type, submissions: [] };
      map[name].submissions.push(sub);
    });

    return Object.values(map);
  }, [filtered, allPossibleServices]);

  // Compute score per service
  const scored = useMemo(() => grouped.map(g => ({
    ...g,
    respondents: g.submissions.length,
    score: computeScore(g.submissions),
  })), [grouped]);

  const external = scored.filter(s => s.type === 'EXTERNAL');
  const internal = scored.filter(s => s.type === 'INTERNAL');

  // Overall: pool all submissions together
  const overallScore = useMemo(() => computeScore(filtered), [filtered]);

  // Group total: average of service scores (weighted by respondent count)
  const groupScore = (group) => {
    const total = group.reduce((sum, s) => sum + s.respondents, 0);
    if (total === 0) return null;
    let agreeCount = 0, validCount = 0;
    group.forEach(g => {
      g.submissions.forEach(sub => {
        SQD_KEYS.forEach(key => {
          const raw = sub[key] ?? sub[key.toLowerCase()] ?? sub[key.toLowerCase() + '_val'];
          const rating = parseInt(raw);
          if (!raw || isNaN(rating) || rating === 0) return;
          validCount++;
          if (rating >= 4) agreeCount++;
        });
      });
    });
    return validCount > 0 ? (agreeCount / validCount) * 100 : null;
  };

  const externalTotal = groupScore(external);
  const internalTotal = groupScore(internal);

  return (
    <div
      id="printable-tabulation"
      className="p-12 w-[8.5in] min-h-[11in] text-black mx-auto bg-white"
      style={{ fontFamily: 'Arial, sans-serif' }}
    >
      {/* HEADER */}
      <div className="text-center flex flex-col items-center mb-6">
        <img src="/npc-new-logo.png" alt="NPC Logo" className="w-16 h-16 object-contain mb-2" />
        <h2 className="text-[14px] font-bold uppercase leading-tight">National Power Corporation</h2>
        <h2 className="text-[14px] font-bold uppercase leading-tight">Mindanao Generation</h2>
        <h2 className="text-[12px] font-bold uppercase leading-tight">Integrated Management System</h2>
        <h1 className="text-[16px] font-bold mt-6 underline">CSM SCORE PER SERVICE TABULATION SHEET</h1>
        <p className="text-[13px] mt-1">For the period: {period}</p>
        <p className="text-[13px] font-bold mt-2 uppercase">{office}, NPC Mindanao Generation</p>
      </div>

      {/* FORMULA NOTE */}
      <p className="text-[11px] italic mb-4 text-gray-600">
        Overall Score = (No. of 'Strongly Agree' + 'Agree' answers) ÷ (Total Respondents − N/A answers) × 100
      </p>

      {/* MAIN TABLE */}
      <table className="w-full border-collapse border border-black text-[12px]">
        <thead>
          <tr>
            <th className="border border-black p-2 w-[45%] text-center font-bold">Service</th>
            <th className="border border-black p-2 text-center font-bold">Respondents</th>
            <th className="border border-black p-2 text-center font-bold">Overall Score</th>
            <th className="border border-black p-2 text-center font-bold">Rating</th>
          </tr>
        </thead>
        <tbody>

          {/* EXTERNAL */}
          <tr className="bg-gray-100">
            <td className="border border-black p-2 font-bold uppercase text-center" colSpan="4">External Services</td>
          </tr>
          {external.length > 0 ? external.map((s, i) => (
            <tr key={`ext-${i}`}>
              <td className="border border-black p-2">{s.service_name}</td>
              <td className="border border-black p-2 text-center">{s.respondents}</td>
              <td className="border border-black p-2 text-center font-bold">{fmt(s.score)}</td>
              <td className="border border-black p-2 text-center">{getRatingLabel(s.score)}</td>
            </tr>
          )) : (
            <tr>
              <td className="border border-black p-2 text-center italic text-gray-400" colSpan="4">N/A</td>
            </tr>
          )}
          <tr className="font-bold bg-gray-50">
            <td className="border border-black p-2 text-right italic" colSpan="2">External Total</td>
            <td className="border border-black p-2 text-center">{fmt(externalTotal)}</td>
            <td className="border border-black p-2 text-center">{getRatingLabel(externalTotal)}</td>
          </tr>

          {/* INTERNAL */}
          <tr className="bg-gray-100">
            <td className="border border-black p-2 font-bold uppercase text-center" colSpan="4">Internal Services</td>
          </tr>
          {internal.length > 0 ? internal.map((s, i) => (
            <tr key={`int-${i}`}>
              <td className="border border-black p-2">{s.service_name}</td>
              <td className="border border-black p-2 text-center">{s.respondents}</td>
              <td className="border border-black p-2 text-center font-bold">{fmt(s.score)}</td>
              <td className="border border-black p-2 text-center">{getRatingLabel(s.score)}</td>
            </tr>
          )) : (
            <tr>
              <td className="border border-black p-2 text-center italic text-gray-400" colSpan="4">None Identified</td>
            </tr>
          )}
          <tr className="font-bold bg-gray-50">
            <td className="border border-black p-2 text-right italic" colSpan="2">Internal Total</td>
            <td className="border border-black p-2 text-center">{fmt(internalTotal)}</td>
            <td className="border border-black p-2 text-center">{getRatingLabel(internalTotal)}</td>
          </tr>

          {/* NOTHING FOLLOWS */}
          <tr>
            <td className="border border-black p-2 text-center italic font-bold text-[11px]" colSpan="4">**Nothing follows**</td>
          </tr>

          {/* OVERALL */}
          <tr className="font-bold text-[13px]">
            <td className="border border-black p-2 text-center uppercase" colSpan="2">Overall Total</td>
            <td className="border border-black p-2 text-center">{fmt(overallScore)}</td>
            <td className="border border-black p-2 text-center">{getRatingLabel(overallScore)}</td>
          </tr>
        </tbody>
      </table>

      {/* CONCLUSION */}
      <div className="mt-8 text-[13px]">
        <p className="font-bold uppercase mb-3">Conclusion:</p>
        <div className="space-y-3">
          <p className="border-b border-black pb-1">
            Based on the data tabulated above, the office achieved an overall score of <strong>{fmt(overallScore)}</strong>.
          </p>
          <p className="border-b border-black pb-1">
            Adhering to the CSM rating scale, this performance is classified as <strong>{getRatingLabel(overallScore)}</strong>.
          </p>
          <div className="border-b border-black h-6"></div>
        </div>
      </div>

      {/* SIGNATORY */}
      <div className="mt-10 w-[50%]">
        <p className="mb-10 text-[13px] italic">{signatories.additionalLabel || 'Tabulated by'}:</p>
        <div className="text-center">
          <p className="uppercase font-bold text-[15px] border-b border-black min-h-[22px]">{signatories.additionalName}</p>
          <p className="text-[11px] uppercase mt-1">{signatories.additionalTitle}</p>
        </div>
      </div>

      {/* FOOTER */}
      <div className="mt-auto pt-10 text-[10px] font-mono flex justify-between uppercase text-gray-500">
        <span>MGG-IMS-006.F05 Rev. No. 0</span>
      </div>
    </div>
  );
};

export default ScorePerService;
