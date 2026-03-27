import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';

const SurveyForm = ({ selectedOfficeId, selectedService, onBack, onSubmit }) => {
  const sigCanvas = useRef({});
  const [formData, setFormData] = useState({
    office_id: selectedOfficeId || '',
    service_id: selectedService?.id || '',
    full_name: '',
    designation: '',
    client_type: '',
    sex: '',
    age: '',
    region: '',
    email: '',
    phone: '',
    serviceAvailed: selectedService?.service_name || '',
    signature: null,
    suggestions: '',
    ratings: {}
  });

  const handleSubmit = async (e) => {
    e.preventDefault();

    const submissionData = {
      ...formData,
      cc1_val: formData.ratings['CC1'] || 0,
      cc2_val: formData.ratings['CC2'] || 0,
      cc3_val: formData.ratings['CC3'] || 0,
      // ... add SQD values here too ...
      ratings_json: JSON.stringify(formData.ratings)
    };

    onSubmit(submissionData);
  };

  useEffect(() => {
  if (selectedService) {
    setFormData(prev => ({
      ...prev,
      service_id: selectedService.id,
      serviceAvailed: selectedService.service_name
    }));
  }
}, [selectedService]); // This runs every time selectedService is updated

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
    { id: 'SQD2', text: 'The office followed the transaction’s requirements and steps based on the information provided.' },
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
    setFormData(prev => ({
      ...prev,
      ratings: { ...prev.ratings, [id]: val }
    }));
  };

  const validateAndSubmit = () => {
  // 1. Basic Validation
  if (!formData.full_name.trim() || !formData.client_type || !formData.sex || !formData.age) {
    alert("Please complete Section I (Name, Type, Sex, and Age).");
    return;
  }

  // 2. Question Completion Check (3 CCs + 9 SQDs = 12 total)
  const totalQuestions = 12; 
  if (Object.keys(formData.ratings).length < totalQuestions) {
    alert("Please answer all survey questions in Section II and III.");
    return;
  }

  // 3. Signature Check
  if (!formData.signature) {
    alert("Signature is required.");
    return;
  }

  // --- NEW: FLATTEN DATA FOR DATABASE ---
  const finalSubmission = {
    ...formData,
    // Extract CC Values
    cc1_val: formData.ratings['CC1'],
    cc2_val: formData.ratings['CC2'],
    cc3_val: formData.ratings['CC3'],
    
    // Extract SQD Values (SQD0 to SQD8)
    sqd0_val: formData.ratings['SQD0'],
    sqd1_val: formData.ratings['SQD1'],
    sqd2_val: formData.ratings['SQD2'],
    sqd3_val: formData.ratings['SQD3'],
    sqd4_val: formData.ratings['SQD4'],
    sqd5_val: formData.ratings['SQD5'],
    sqd6_val: formData.ratings['SQD6'],
    sqd7_val: formData.ratings['SQD7'],
    sqd8_val: formData.ratings['SQD8'],
    
    // Convert the whole object to string if needed for backup
    ratings_json: JSON.stringify(formData.ratings)
  };

  // Submit the flattened data
  onSubmit(finalSubmission);
};

  return (
    <div className="bg-white min-h-screen md:min-h-fit md:rounded-sm shadow-2xl overflow-hidden border-x border-b border-slate-200 animate-in fade-in duration-500">
      
      {/* HEADER: Sticky on mobile for easy navigation */}
      <div className="bg-[#002855] p-6 md:p-8 text-white sticky top-0 z-10 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <button onClick={onBack} className="text-[10px] bg-white/10 px-4 py-2 rounded-sm hover:bg-white/20 font-bold uppercase tracking-wider">
            ← Back
          </button>
          <img src="/npc-logo.jpg" alt="NPC" className="h-8 w-8 md:h-10 md:w-10 bg-white rounded-full p-1" />
        </div>
        <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight">Customer Satisfaction Measurement</h2>
        <p className="text-blue-200 text-[10px] md:text-xs mt-1 italic uppercase truncate">
          Service: {selectedService?.service_name || formData.serviceAvailed || "No Service Selected"}
        </p>
      </div>

      <div className="p-4 md:p-10 space-y-10">
        
        {/* I. CLIENT INFO: Grid-based for responsiveness */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">I. Client Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input 
              type="text" placeholder="Full Name *"
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg md:rounded-sm text-sm font-bold uppercase"
              onChange={(e) => setFormData({...formData, full_name: e.target.value})}
            />
            <div className="grid grid-cols-2 gap-2">
              <select 
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                onChange={(e) => setFormData({...formData, client_type: e.target.value})}
              >
                <option value="">Type *</option>
                <option value="Citizen">Citizen</option>
                <option value="Business">Business</option>
                <option value="Government">Government</option>
              </select>
              <input 
                type="number" placeholder="Age *"
                className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                onChange={(e) => setFormData({...formData, age: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Sex Selection - Takes up 1 column on desktop */}
              <div className="flex justify-around items-center h-full bg-slate-50 p-4 border border-slate-200 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Sex:</span>
                {['Male', 'Female'].map(s => (
                  <label key={s} className="flex items-center gap-2 text-xs font-bold cursor-pointer uppercase text-slate-700 hover:text-indigo-600 transition-colors">
                    <input 
                      type="radio" 
                      name="sex" 
                      className="w-5 h-5 accent-[#002855] cursor-pointer" 
                      onChange={() => setFormData({...formData, sex: s})} 
                    /> 
                    {s}
                  </label>
                ))}
              </div>
              {/* Designation/Position - Takes up 2 columns on desktop */}
              <div className="md:col-span-2">
                <input 
                  type="text" 
                  placeholder="Designation/Position" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  onChange={(e) => setFormData({...formData, designation: e.target.value})}
                />
              </div>

              
            </div>
            <div className="flex flex-col gap-1">
              
            <select 
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none"
              value={formData.region || ""}
              onChange={(e) => setFormData({...formData, region: e.target.value})}
              required
            >
              <option value="" disabled>Select Region of Residence</option>
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
          
            <input 
              type="email" 
              placeholder="Email Address" 
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              onChange={(e) => setFormData({...formData, email: e.target.value.toLowerCase()})}
              required
            />
            <input 
              type="tel" 
              placeholder="Telephone/Cellphone Number" 
              className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              pattern="[0-9]*"
            />
          </div>

        </section>

        {/* II. CITIZEN'S CHARTER: Stacked for mobile */}
        <section className="space-y-6">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">II. Citizen's Charter</h3>
          {[
            { id: 'CC1', q: 'Awareness of Citizen\'s Charter', opts: [
              {v:1, t:'I know what a CC is and I saw this office\'s CC.'},
              {v:2, t:'I know what a CC is but I did NOT see this office\'s CC.'},
              {v:3, t:'I learned of the CC only when I saw this office\'s CC.'},
              {v:4, t:'I do not know what a CC is and I did not see one.'}
            ]},
            { id: 'CC2', q: 'Visibility of Citizen\'s Charter', opts: [
              {v:1, t:'Easy to see'}, {v:2, t:'Somewhat easy to see'}, {v:3, t:'Difficult to see'}, {v:4, t:'Not visible'}, {v:5, t:'N/A'}
            ]},
            { id: 'CC3', q: 'Helpfulness of Citizen\'s Charter', opts: [
              {v:1, t:'Helped very much'}, {v:2, t:'Somewhat helped'}, {v:3, t:'Did not help'}, {v:4, t:'N/A'}
            ]}
          ].map(cc => (
            <div key={cc.id} className="space-y-3">
              <p className="text-xs font-bold text-slate-700 uppercase">{cc.id}. {cc.q}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {cc.opts.map(opt => (
                  <label key={opt.v} className={`flex items-center gap-3 p-4 rounded-lg border transition-all cursor-pointer text-[11px] ${formData.ratings[cc.id] === opt.v ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100'}`}>
                    <input type="radio" name={cc.id} className="w-5 h-5 accent-[#002855]" onChange={() => updateRating(cc.id, opt.v)} />
                    <span className="font-medium leading-tight">{opt.t}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* III. SQD: Card-based for mobile, Table for Desktop */}
        <section className="space-y-6">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">III. Service Quality</h3>
          
          {/* MOBILE VIEW (Visible on small screens) */}
          <div className="md:hidden space-y-4">
            {sqdQuestions.map(q => (
              <div key={q.id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <p className="text-xs font-bold text-slate-700">{q.id}. {q.text}</p>
                <div className="flex flex-wrap gap-2">
                  {ratingOptions.map(opt => (
                    <button 
                      key={opt.value}
                      type="button"
                      onClick={() => updateRating(q.id, opt.value)}
                      className={`px-3 py-2 rounded-full text-[9px] font-bold border transition-all ${formData.ratings[q.id] === opt.value ? 'bg-[#002855] text-white border-[#002855]' : 'bg-white text-slate-400 border-slate-200'}`}
                    >
                      {opt.value} - {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* DESKTOP VIEW (Visible on tablets and larger) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="p-4 text-[10px] font-bold text-slate-400 uppercase border">Dimension</th>
                  {ratingOptions.map(opt => (
                    <th key={opt.value} className="p-2 text-[8px] font-bold text-slate-400 uppercase text-center border w-16">{opt.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sqdQuestions.map(q => (
                  <tr key={q.id} className="hover:bg-blue-50/30">
                    <td className="p-4 text-xs font-bold text-slate-700 border">{q.id}. {q.text}</td>
                    {ratingOptions.map(opt => (
                      <td key={opt.value} className="p-2 border text-center">
                        <input type="radio" name={q.id} className="w-5 h-5 accent-[#002855] cursor-pointer" onChange={() => updateRating(q.id, opt.value)} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* IV. VALIDATION: Large signature pad for touchscreens */}
        <section className="space-y-4">
          <h3 className="text-xs font-black text-[#002855] uppercase tracking-widest border-l-4 border-[#002855] pl-3">IV. Validation</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Sign Here (Touch or Mouse) *</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 overflow-hidden relative">
                  <SignatureCanvas 
                    ref={sigCanvas}
                    penColor='#002855'
                    canvasProps={{className: "w-full h-48 cursor-crosshair"}}
                    onEnd={saveSignature}
                  />
                  <button type="button" onClick={clearSignature} className="absolute bottom-4 right-4 bg-red-50 text-red-500 px-3 py-1 text-[10px] font-bold uppercase rounded-full border border-red-100 shadow-sm">Clear</button>
                </div>
             </div>
             <textarea 
               className="w-full p-6 bg-slate-50 border border-slate-200 rounded-xl text-sm min-h-[192px] outline-none focus:ring-2 focus:ring-blue-500/20"
               placeholder="How can we improve? (Comments/Suggestions)"
               onChange={(e) => setFormData({...formData, suggestions: e.target.value})}
             />
          </div>
        </section>

        <button 
          type="button"
          onClick={validateAndSubmit}
          className="w-full py-6 bg-[#002855] text-white font-black text-sm uppercase tracking-[0.2em] rounded-xl md:rounded-sm shadow-2xl hover:bg-[#003a7a] transition-all transform active:scale-[0.98]"
        >
          Submit Final Feedback
        </button>
      </div>
    </div>
  );
};

export default SurveyForm;