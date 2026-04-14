import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SurveyForm = ({ selectedOfficeId, selectedOfficeName, selectedService, onBack, onSubmit }) => {
  const sigCanvas = useRef({});
  const [formData, setFormData] = useState({
    office_id: selectedOfficeId || '',
    service_id: '',
    full_name: '',
    designation: '',
    client_type: '',
    sex: '',
    age: '',
    region: '',
    email: '',
    phone: '',
    serviceAvailed: selectedService || '',
    signature: null,
    suggestions: '',
    ratings: {}
  });

  useEffect(() => {
    if (selectedService) {
      setFormData(prev => ({ ...prev, serviceAvailed: selectedService }));
    }
  }, [selectedService]);

  const saveSignature = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const signatureData = sigCanvas.current.getCanvas().toDataURL('image/png');
      setFormData(prev => ({ ...prev, signature: signatureData }));
    }
  };

  const clearSignature = () => {
    sigCanvas.current.clear();
    setFormData(prev => ({ ...prev, signature: null }));
  };

  const sqdQuestions = [
    { id: 'SQD0', text: 'I am satisfied with the service that I availed.' },
    { id: 'SQD1', text: 'I spent a reasonable amount of time for my transaction.' },
    { id: 'SQD2', text: "The office followed the transaction's requirements and steps based on the information provided." },
    { id: 'SQD3', text: 'The steps (including payment) I needed to do for my transaction were easy and simple.' },
    { id: 'SQD4', text: 'I easily found information about my transaction from the office or its website.' },
    { id: 'SQD5', text: 'I paid a reasonable amount of fees for my transaction.' },
    { id: 'SQD6', text: 'I feel the office was fair to everyone, or "walang palakasan" during my transaction.' },
    { id: 'SQD7', text: 'I was treated courteously by the staff, and (if asked for help) the staff was helpful.' },
    { id: 'SQD8', text: 'I got what I needed from the government office, or (if denied) denial of request was sufficiently explained to me.' },
  ];

  const ratingOptions = [
    { label: 'Strongly Disagree', value: 1 },
    { label: 'Disagree', value: 2 },
    { label: 'Neutral', value: 3 },
    { label: 'Agree', value: 4 },
    { label: 'Strongly Agree', value: 5 },
    { label: 'N/A', value: 0 },
  ];

  const updateRating = (id, val) => {
    setFormData(prev => ({ ...prev, ratings: { ...prev.ratings, [id]: val } }));
  };

  const validateAndSubmit = () => {
    if (!formData.full_name.trim() || !formData.client_type || !formData.sex || !formData.age) {
      alert("Please complete Section I (Name, Type, Sex, and Age).");
      return;
    }
    if (Object.keys(formData.ratings).length < 12) {
      alert("Please answer all survey questions in Section II and III.");
      return;
    }
    if (!formData.signature) {
      alert("Signature is required.");
      return;
    }

    const finalSubmission = {
      ...formData,
      cc1_val: formData.ratings['CC1'],
      cc2_val: formData.ratings['CC2'],
      cc3_val: formData.ratings['CC3'],
      sqd0_val: formData.ratings['SQD0'],
      sqd1_val: formData.ratings['SQD1'],
      sqd2_val: formData.ratings['SQD2'],
      sqd3_val: formData.ratings['SQD3'],
      sqd4_val: formData.ratings['SQD4'],
      sqd5_val: formData.ratings['SQD5'],
      sqd6_val: formData.ratings['SQD6'],
      sqd7_val: formData.ratings['SQD7'],
      sqd8_val: formData.ratings['SQD8'],
      ratings_json: JSON.stringify(formData.ratings)
    };

    const officeName = selectedOfficeName || 'the office';
    const serviceName = selectedService || formData.serviceAvailed || 'the selected service';
    alert(`Your feedback for "${serviceName}" has been successfully submitted to ${officeName}. Thank you for your time!`);
    onSubmit(finalSubmission);
  };

  const inputClass = "w-full p-3 bg-slate-50 border border-slate-200 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all";
  const labelClass = "block text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-1.5";

  return (
    <div className="bg-white min-h-screen md:min-h-fit md:rounded-sm shadow-2xl overflow-hidden border-x border-b border-slate-200 animate-in fade-in duration-500">

      {/* HEADER */}
      <div className="bg-[#002855] text-white sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center px-6 py-4">
          <button onClick={onBack} className="text-[10px] bg-white/10 px-4 py-2 rounded hover:bg-white/20 font-bold uppercase tracking-wider">
            ← Back
          </button>
          <img
            src="/npc-new-logo.png"
            alt="NPC"
            className="h-20 w-20 object-contain opacity-100 transition-all"
          />
        </div>
        <div className="px-6 pb-4">
          <h2 className="text-base md:text-lg font-bold uppercase tracking-tight">Customer Satisfaction Measurement</h2>
        </div>
        {/* Context Bar */}
        <div className="bg-[#001d3d] px-6 py-3 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-6 border-t border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">Office</span>
            <span className="text-[11px] font-semibold text-white">{selectedOfficeName || '—'}</span>
          </div>
          <span className="hidden sm:block text-white/20">|</span>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-blue-300 uppercase tracking-widest">Service</span>
            <span className="text-[11px] font-semibold text-white">{selectedService || formData.serviceAvailed || '—'}</span>
          </div>
        </div>
      </div>

      <div className="p-6 md:p-8 space-y-8">

        {/* I. CLIENT INFORMATION */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">
            I. Client Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">

            {/* Full Name — full width */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                placeholder="e.g. Juan Dela Cruz"
                className={inputClass}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              />
            </div>

            {/* Client Type */}
            <div>
              <label className={labelClass}>Client Type <span className="text-red-400">*</span></label>
              <select
                className={inputClass + " appearance-none cursor-pointer"}
                onChange={(e) => setFormData({ ...formData, client_type: e.target.value })}
              >
                <option value="">— Select —</option>
                <option value="Citizen">Citizen</option>
                <option value="Business">Business</option>
                <option value="Government">Government</option>
              </select>
            </div>

            {/* Age */}
            <div>
              <label className={labelClass}>Age <span className="text-red-400">*</span></label>
              <input
                type="number"
                placeholder="e.g. 30"
                min="1"
                max="120"
                className={inputClass}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
              />
            </div>

            {/* Sex */}
            <div>
              <label className={labelClass}>Sex <span className="text-red-400">*</span></label>
              <div className="flex items-center gap-8 bg-slate-50 border border-slate-200 rounded px-4 py-3">
                {['Male', 'Female'].map(s => (
                  <label key={s} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="sex"
                      className="w-4 h-4 accent-[#002855] cursor-pointer"
                      onChange={() => setFormData({ ...formData, sex: s })}
                    />
                    <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{s}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Designation */}
            <div>
              <label className={labelClass}>Designation / Position</label>
              <input
                type="text"
                placeholder="e.g. Engineer, Manager"
                className={inputClass}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            {/* Region — full width */}
            <div className="sm:col-span-2">
              <label className={labelClass}>Region of Residence</label>
              <select
                className={inputClass + " appearance-none cursor-pointer"}
                value={formData.region || ""}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
              >
                <option value="" disabled>— Select Region —</option>
                <option value="NCR">National Capital Region (NCR)</option>
                <option value="CAR">Cordillera Administrative Region (CAR)</option>
                <option value="Region I">Region I (Ilocos Region)</option>
                <option value="Region II">Region II (Cagayan Valley)</option>
                <option value="Region III">Region III (Central Luzon)</option>
                <option value="Region IV-A">Region IV-A (CALABARZON)</option>
                <option value="MIMAROPA">MIMAROPA Region</option>
                <option value="Region V">Region V (Bicol Region)</option>
                <option value="Region VI">Region VI (Western Visayas)</option>
                <option value="Region VII">Region VII (Central Visayas)</option>
                <option value="Region VIII">Region VIII (Eastern Visayas)</option>
                <option value="Region IX">Region IX (Zamboanga Peninsula)</option>
                <option value="Region X">Region X (Northern Mindanao)</option>
                <option value="Region XI">Region XI (Davao Region)</option>
                <option value="Region XII">Region XII (SOCCSKSARGEN)</option>
                <option value="Region XIII">Region XIII (Caraga)</option>
                <option value="BARMM">Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                placeholder="e.g. juan@email.com"
                className={inputClass}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
              />
            </div>

            {/* Phone */}
            <div>
              <label className={labelClass}>Telephone / Cellphone</label>
              <input
                type="tel"
                placeholder="e.g. 09XX XXX XXXX"
                className={inputClass}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                pattern="[0-9]*"
              />
            </div>

          </div>
        </section>

        {/* II. CITIZEN'S CHARTER */}
        <section className="space-y-5">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">
            II. Citizen's Charter
          </h3>

          {[
            {
              id: 'CC1', q: "Awareness of Citizen's Charter", opts: [
                { v: 1, t: "I know what a CC is and I saw this office's CC." },
                { v: 2, t: "I know what a CC is but I did NOT see this office's CC." },
                { v: 3, t: "I learned of the CC only when I saw this office's CC." },
                { v: 4, t: "I do not know what a CC is and I did not see one." }
              ]
            },
            {
              id: 'CC2', q: "Visibility of Citizen's Charter", opts: [
                { v: 1, t: 'Easy to see' }, { v: 2, t: 'Somewhat easy to see' },
                { v: 3, t: 'Difficult to see' }, { v: 4, t: 'Not visible' }, { v: 5, t: 'N/A' }
              ]
            },
            {
              id: 'CC3', q: "Helpfulness of Citizen's Charter", opts: [
                { v: 1, t: 'Helped very much' }, { v: 2, t: 'Somewhat helped' },
                { v: 3, t: 'Did not help' }, { v: 4, t: 'N/A' }
              ]
            }
          ].map(cc => (
            <div key={cc.id} className="space-y-2">
              <p className="text-xs font-bold text-slate-700 uppercase">{cc.id}. {cc.q}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cc.opts.map(opt => (
                  <label
                    key={opt.v}
                    className={`flex items-center gap-3 p-3 rounded border transition-all cursor-pointer text-[11px] ${formData.ratings[cc.id] === opt.v ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-200'}`}
                  >
                    <input
                      type="radio"
                      name={cc.id}
                      className="w-4 h-4 accent-[#002855] shrink-0"
                      onChange={() => updateRating(cc.id, opt.v)}
                    />
                    <span className="font-medium leading-snug">{opt.t}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* III. SERVICE QUALITY */}
        <section className="space-y-5">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">
            III. Service Quality
          </h3>

          {/* Mobile */}
          <div className="md:hidden space-y-3">
            {sqdQuestions.map(q => (
              <div key={q.id} className="p-3 bg-slate-50 border border-slate-200 rounded space-y-3">
                <p className="text-xs font-bold text-slate-700">{q.id}. {q.text}</p>
                <div className="flex flex-wrap gap-2">
                  {ratingOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateRating(q.id, opt.value)}
                      className={`px-3 py-1.5 rounded-full text-[9px] font-bold border transition-all ${formData.ratings[q.id] === opt.value ? 'bg-[#002855] text-white border-[#002855]' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      {opt.value} – {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-3 text-[10px] font-bold text-slate-400 uppercase border">Dimension</th>
                  {ratingOptions.map(opt => (
                    <th key={opt.value} className="p-2 text-[9px] font-bold text-slate-400 uppercase text-center border w-16">{opt.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sqdQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-blue-50/30">
                    <td className="p-3 text-xs font-bold text-slate-700 border">{q.id}. {q.text}</td>
                    {ratingOptions.map(opt => (
                      <td key={opt.value} className="p-2 border text-center">
                        <input
                          type="radio"
                          name={q.id}
                          className="w-4 h-4 accent-[#002855] cursor-pointer"
                          onChange={() => updateRating(q.id, opt.value)}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* IV. VALIDATION */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">
            IV. Validation
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sign Here (Touch or Mouse) *</label>
              <div className="border-2 border-dashed border-slate-200 rounded bg-slate-50 overflow-hidden relative">
                <SignatureCanvas
                  ref={sigCanvas}
                  penColor='#002855'
                  canvasProps={{ className: "w-full h-44 cursor-crosshair" }}
                  onEnd={saveSignature}
                />
                <button
                  type="button"
                  onClick={clearSignature}
                  className="absolute bottom-3 right-3 bg-red-50 text-red-500 px-3 py-1 text-[10px] font-bold uppercase rounded border border-red-100 shadow-sm"
                >
                  Clear
                </button>
              </div>
            </div>
            <textarea
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded text-sm min-h-[176px] outline-none focus:ring-2 focus:ring-blue-500/30 transition-all resize-none"
              placeholder="How can we improve? (Comments / Suggestions)"
              onChange={(e) => setFormData({ ...formData, suggestions: e.target.value })}
            />
          </div>
        </section>

        <button
          type="button"
          onClick={validateAndSubmit}
          className="w-full py-4 bg-[#002855] text-white font-black text-sm uppercase tracking-[0.2em] rounded shadow-lg hover:bg-[#003a7a] transition-all active:scale-[0.98]"
        >
          Submit Final Feedback
        </button>
      </div>
    </div>
  );
};

export default SurveyForm;
