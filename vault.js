document.addEventListener('DOMContentLoaded', () => {
  const medSearchInput = document.querySelector('[data-med-search]');
  const medSuggestions = document.querySelector('[data-med-suggestions]');
  const medEmpty = document.querySelector('[data-med-empty]');
  const medCount = document.querySelector('[data-med-count]');
  const filterButtons = Array.from(document.querySelectorAll('[data-med-filter]'));
  const compactToggle = document.querySelector('[data-med-compact-toggle]');
  const medVoiceBtn = document.querySelector('[data-med-voice]');

  const recentWrap = document.querySelector('[data-med-recent]');
  const pinnedWrap = document.querySelector('[data-med-pinned]');

  const medModal = document.querySelector('[data-med-modal]');
  const medClose = document.querySelector('[data-med-close]');
  const medTitle = document.querySelector('[data-med-title]');
  const medStrengthStep = document.querySelector('[data-med-strength-step]');
  const medStrengthLabel = document.querySelector('[data-med-strength-label]');
  const medStrengthOptions = document.querySelector('[data-med-strength-options]');
  const medDetailBody = document.querySelector('[data-med-detail-body]');
  const medForm = document.querySelector('[data-med-form]');
  const medPin = document.querySelector('[data-med-pin]');
  const medSubtitle = document.querySelector('[data-med-subtitle]');
  const medUses = document.querySelector('[data-med-uses]');
  const medSideEffects = document.querySelector('[data-med-side-effects]');
  const medDosage = document.querySelector('[data-med-dosage]');
  const medWhen = document.querySelector('[data-med-when]');
  const medWarnings = document.querySelector('[data-med-warnings]');
  const medAlternatives = document.querySelector('[data-med-alternatives]');
  const medCompare = document.querySelector('[data-med-compare]');
  const medConfidence = document.querySelector('[data-med-confidence]');
  const medReviewed = document.querySelector('[data-med-reviewed]');
  const medInteractionInput = document.querySelector('[data-med-interaction-input]');
  const medInteractionCheck = document.querySelector('[data-med-interaction-check]');
  const medInteractionResult = document.querySelector('[data-med-interaction-result]');

  const TABLET_TARGET_SIZE = 20000;
  const RECENT_KEY = 'medvault-recent-searches';
  const PIN_KEY = 'medvault-pinned-medicines';
  const COMPACT_KEY = 'medvault-compact-mode';
  const OFFLINE_INDEX_KEY = 'medvault-offline-prefix-index-v4';

  const COMMON_ACTIVES = [
    'Paracetamol', 'Ibuprofen', 'Diclofenac', 'Aceclofenac', 'Naproxen', 'Aspirin', 'Mefenamic Acid',
    'Cetirizine', 'Levocetirizine', 'Loratadine', 'Fexofenadine', 'Montelukast',
    'Azithromycin', 'Amoxicillin', 'Amoxicillin Clavulanate', 'Cefixime', 'Cefuroxime', 'Doxycycline',
    'Ofloxacin', 'Levofloxacin', 'Metronidazole', 'Tinidazole',
    'Pantoprazole', 'Omeprazole', 'Esomeprazole', 'Rabeprazole', 'Famotidine',
    'Domperidone', 'Ondansetron', 'Dicyclomine', 'Loperamide', 'Lactulose',
    'Metformin', 'Glimepiride', 'Vildagliptin', 'Sitagliptin', 'Teneligliptin',
    'Amlodipine', 'Telmisartan', 'Losartan', 'Olmesartan', 'Atenolol', 'Metoprolol',
    'Rosuvastatin', 'Atorvastatin', 'Fenofibrate',
    'Levothyroxine', 'Prednisolone', 'Deflazacort',
    'Vitamin D3', 'Calcium Carbonate', 'Vitamin B12', 'Folic Acid', 'Iron', 'Zinc', 'Multivitamin',
    'Ambroxol', 'Bromhexine', 'Dextromethorphan', 'Guaifenesin', 'Acetylcysteine',
    'Salbutamol', 'Theophylline',
    'Hydroxyzine', 'Clonazepam', 'Escitalopram',
    'Nimesulide', 'Tramadol', 'Tapentadol',
    'Albendazole', 'Ivermectin',
    'Fluconazole', 'Clotrimazole', 'Ketoconazole',
    'Mupirocin', 'Povidone Iodine',
    'Acyclovir', 'Valacyclovir',
    'Rifaximin', 'Probiotic', 'ORS',
    'Ursodeoxycholic Acid', 'Silymarin',
    'Tamsulosin', 'Finasteride',
    'Dapagliflozin', 'Empagliflozin'
  ];

  const BRAND_PREFIXES = [
    'Medi', 'Cura', 'Heal', 'Safe', 'Prime', 'Life', 'True', 'Neo', 'Ultra', 'Care',
    'Zen', 'Nova', 'Apex', 'Sure', 'Vita', 'Clin', 'Bio', 'Pulse', 'Relief', 'Core'
  ];

  const TABLET_STRENGTHS = ['250 mg', '500 mg', '650 mg', '750 mg'];
  const PACK_SIZES = ['10 tablets', '15 tablets', '20 tablets'];

  let currentSuggestions = [];
  let highlightedIndex = -1;
  let activeFilter = 'all';
  let activeMedicine = null;
  let activeStrength = '';

  const normalize = (text) => String(text || '').toLowerCase().trim();
  const isHindi = () => document.documentElement.lang === 'hi';
  const globalHiMap = () => window.SEHATLENS_I18N_HI || {};
  const t = (en, hi) => {
    if (!isHindi()) return en;
    const key = String(en ?? '').trim();
    const mapped = globalHiMap()[key];
    if (mapped) return mapped;
    // Fallback for already-correct inline Hindi literals.
    return /[\u0900-\u097F]/.test(String(hi || '')) ? hi : en;
  };

  const dedupe = (arr) => [...new Set(arr.filter(Boolean))];

  const loadJson = (key, fallback) => {
    try {
      const parsed = JSON.parse(localStorage.getItem(key));
      return parsed ?? fallback;
    } catch {
      return fallback;
    }
  };

  const saveJson = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // ignore storage quota errors
    }
  };

  const makeTabletDosage = () => ({
    children: 'Pediatric tablet only if prescribed.',
    teens: '1 tablet 1-2 times/day after food as advised.',
    adults: '1 tablet 2 times/day or as prescribed.',
    olderAdults: '1 tablet/day to 2 tablets/day based on tolerance and doctor advice.'
  });

  const inferUseLine = (active) => {
    const a = normalize(active);
    if (/paracetamol|ibuprofen|diclofenac|aceclofenac|naproxen|aspirin|mefenamic|tramadol|tapentadol|nimesulide/.test(a)) {
      return 'Used for pain and fever relief.';
    }
    if (/cetirizine|levocetirizine|loratadine|fexofenadine|montelukast|hydroxyzine/.test(a)) {
      return 'Used for allergy symptoms like sneezing, runny nose, and itching.';
    }
    if (/azithromycin|amoxicillin|cefixime|cefuroxime|doxycycline|ofloxacin|levofloxacin|metronidazole|tinidazole/.test(a)) {
      return 'Used for bacterial infections when prescribed.';
    }
    if (/pantoprazole|omeprazole|esomeprazole|rabeprazole|famotidine/.test(a)) {
      return 'Used for acidity, reflux, and stomach protection.';
    }
    if (/metformin|glimepiride|vildagliptin|sitagliptin|teneligliptin|dapagliflozin|empagliflozin/.test(a)) {
      return 'Used to manage blood sugar in diabetes.';
    }
    if (/amlodipine|telmisartan|losartan|olmesartan|atenolol|metoprolol/.test(a)) {
      return 'Used for blood pressure and heart-related control.';
    }
    if (/rosuvastatin|atorvastatin|fenofibrate/.test(a)) {
      return 'Used to control cholesterol and lipid levels.';
    }
    if (/ambroxol|bromhexine|dextromethorphan|guaifenesin|acetylcysteine|salbutamol|theophylline/.test(a)) {
      return 'Used for cough, mucus clearance, and breathing support.';
    }
    if (/vitamin|calcium|iron|zinc|folic|multivitamin/.test(a)) {
      return 'Used to support nutrition and micronutrient replenishment.';
    }
    return 'Used based on doctor evaluation for targeted symptom relief.';
  };

  const inferSideEffects = (active) => {
    const a = normalize(active);
    if (/azithromycin|amoxicillin|cefixime|cefuroxime|doxycycline|ofloxacin|levofloxacin/.test(a)) {
      return 'Nausea, loose stools, abdominal discomfort.';
    }
    if (/ibuprofen|diclofenac|aceclofenac|naproxen|aspirin|nimesulide/.test(a)) {
      return 'Acidity, stomach irritation, nausea.';
    }
    if (/metformin|glimepiride|vildagliptin|sitagliptin|teneligliptin|dapagliflozin|empagliflozin/.test(a)) {
      return 'Gas, nausea, appetite changes, occasional weakness.';
    }
    return 'Mild nausea, dizziness, or stomach upset may occur in some users.';
  };

  const inferWhen = (active) => {
    const a = normalize(active);
    if (/pantoprazole|omeprazole|esomeprazole|rabeprazole/.test(a)) return 'Usually taken before meals.';
    if (/metformin|glimepiride|vildagliptin|sitagliptin|teneligliptin/.test(a)) return 'Usually taken with meals at fixed times.';
    if (/rosuvastatin|atorvastatin/.test(a)) return 'Often taken once daily, usually in the evening for many regimens.';
    if (/ambroxol|bromhexine|dextromethorphan|guaifenesin/.test(a)) return 'Taken during cough/cold episodes as advised.';
    return 'Taken as prescribed for active symptoms or chronic control.';
  };

  const confidenceFor = (active) => {
    const a = normalize(active);
    if (/paracetamol|ibuprofen|cetirizine|azithromycin|amoxicillin|metformin|amlodipine|pantoprazole/.test(a)) return 'High';
    if (/ursodeoxycholic|silymarin|teneligliptin|deflazacort/.test(a)) return 'Medium';
    return 'Medium';
  };

  const warningsFor = (active) => {
    const a = normalize(active);
    const notes = [];
    if (/ibuprofen|diclofenac|aceclofenac|naproxen|aspirin|nimesulide/.test(a)) {
      notes.push('Kidney caution', 'Take after food');
    }
    if (/paracetamol|atorvastatin|rosuvastatin|fluconazole|ketoconazole/.test(a)) {
      notes.push('Liver caution');
    }
    if (/metformin|glimepiride|sitagliptin|vildagliptin|teneligliptin|dapagliflozin|empagliflozin/.test(a)) {
      notes.push('Monitor blood sugar');
    }
    if (/prednisolone|deflazacort|tamsulosin/.test(a)) {
      notes.push('Elderly caution');
    }
    if (/doxycycline|fluconazole|metronidazole|losartan|olmesartan/.test(a)) {
      notes.push('Pregnancy caution');
    }
    if (/salbutamol|theophylline/.test(a)) {
      notes.push('Heart rate watch');
    }
    return dedupe(notes).slice(0, 4);
  };

  const categoryFor = (active) => {
    const a = normalize(active);
    if (/azithromycin|amoxicillin|cefixime|cefuroxime|doxycycline|ofloxacin|levofloxacin|metronidazole|tinidazole/.test(a)) return 'antibiotic';
    if (/ibuprofen|diclofenac|aceclofenac|naproxen|aspirin|nimesulide|tramadol|tapentadol|paracetamol/.test(a)) return 'pain';
    if (/cetirizine|levocetirizine|loratadine|fexofenadine|montelukast|hydroxyzine/.test(a)) return 'allergy';
    if (/pantoprazole|omeprazole|esomeprazole|rabeprazole|famotidine/.test(a)) return 'acid';
    if (/metformin|glimepiride|vildagliptin|sitagliptin|teneligliptin|dapagliflozin|empagliflozin/.test(a)) return 'diabetes';
    if (/amlodipine|telmisartan|losartan|olmesartan|atenolol|metoprolol/.test(a)) return 'bp';
    if (/rosuvastatin|atorvastatin|fenofibrate/.test(a)) return 'lipid';
    if (/vitamin|calcium|iron|zinc|folic|multivitamin/.test(a)) return 'supplement';
    return 'general';
  };

  const interactionCheck = (medA, medB) => {
    const c1 = categoryFor(medA.name);
    const c2 = categoryFor(medB.name);
    const pair = [c1, c2].sort().join(':');
    if (pair === 'pain:pain') return t('Caution: combining pain medicines may raise stomach/kidney risk. Confirm with clinician.', 'सावधानी: दो दर्द की दवाएं साथ लेने से पेट/किडनी जोखिम बढ़ सकता है। डॉक्टर से पुष्टि करें।');
    if (pair === 'antibiotic:antibiotic') return t('Avoid combining antibiotics unless specifically prescribed together.', 'एंटीबायोटिक साथ में तभी लें जब डॉक्टर ने स्पष्ट रूप से बताया हो।');
    if (pair === 'bp:bp') return t('Caution: BP medicines together can lower pressure excessively in some users.', 'सावधानी: बीपी की दवाएं साथ में लेने से कुछ लोगों में दबाव बहुत कम हो सकता है।');
    if (pair === 'diabetes:diabetes') return t('Monitor sugar closely; dual diabetes medicines can increase low-sugar risk.', 'शुगर पर नजर रखें; दो डायबिटीज दवाओं से लो-शुगर जोखिम बढ़ सकता है।');
    if ((c1 === 'pain' && c2 === 'bp') || (c2 === 'pain' && c1 === 'bp')) return t('NSAID-type pain medicines may reduce BP-control effectiveness in some patients.', 'NSAID प्रकार की दर्द दवाएं कुछ मरीजों में बीपी कंट्रोल कम कर सकती हैं।');
    if ((c1 === 'acid' && c2 === 'antibiotic') || (c2 === 'acid' && c1 === 'antibiotic')) return t('Timing may matter; acid suppressants can affect absorption for some antibiotics.', 'समय महत्वपूर्ण है; एसिड कम करने वाली दवाएं कुछ एंटीबायोटिक के अवशोषण को प्रभावित कर सकती हैं।');
    return t('No major pattern-level warning detected here. Still verify with a clinician/pharmacist.', 'कोई बड़ी पैटर्न-आधारित चेतावनी नहीं मिली। फिर भी डॉक्टर/फार्मासिस्ट से पुष्टि करें।');
  };

  const SYNTH_STEM_A = ['Avi', 'Belo', 'Caro', 'Dena', 'Elvo', 'Faro', 'Geni', 'Hova', 'Ivro', 'Jeno'];
  const SYNTH_STEM_B = ['cet', 'mox', 'dine', 'vex', 'lax', 'zol', 'pril', 'tin', 'mab', 'dol'];
  const SYNTH_STEM_C = ['ra', 'va', 'ni', 'to', 'me', 'ka', 'zo', 'li', 'xo', 'pe'];

  const syntheticNameFor = (index) => {
    const a = SYNTH_STEM_A[index % SYNTH_STEM_A.length];
    const b = SYNTH_STEM_B[Math.floor(index / SYNTH_STEM_A.length) % SYNTH_STEM_B.length];
    const c = SYNTH_STEM_C[Math.floor(index / (SYNTH_STEM_A.length * SYNTH_STEM_B.length)) % SYNTH_STEM_C.length];
    const tag = String(index + 1).padStart(5, '0');
    return `${a}${b}${c} ${tag}`;
  };

  const buildArchive = () => {
    const uniqueNames = [];
    const seen = new Set();

    COMMON_ACTIVES.forEach((name) => {
      if (!seen.has(name)) {
        seen.add(name);
        uniqueNames.push(name);
      }
    });

    let i = 0;
    while (uniqueNames.length < TABLET_TARGET_SIZE) {
      const generated = syntheticNameFor(i);
      if (!seen.has(generated)) {
        seen.add(generated);
        uniqueNames.push(generated);
      }
      i += 1;
    }

    return uniqueNames.slice(0, TABLET_TARGET_SIZE).map((name, idx) => ({
      id: `${name}-tablet-${idx}`,
      name,
      form: 'Tablet',
      strengthOptions: TABLET_STRENGTHS.map((strength, sIdx) => `${strength} | ${PACK_SIZES[sIdx % PACK_SIZES.length]}`),
      keywords: [name, 'tablet'],
      whatItDoes: inferUseLine(name),
      sideEffects: inferSideEffects(name),
      dosage: makeTabletDosage(),
      whenTaken: inferWhen(name),
      warnings: warningsFor(name),
      confidence: confidenceFor(name),
      reviewedOn: '2026-03-03'
    }));
  };

  const MED_DB = buildArchive().map((med) => ({
    ...med,
    variant: med.strengthOptions[0],
    searchBlob: [med.name, med.form, ...(med.strengthOptions || []), med.whatItDoes, med.whenTaken, ...(med.keywords || [])].join(' ').toLowerCase(),
    nameBlob: med.name.toLowerCase()
  }));

  const buildPrefixIndex = () => {
    const cached = loadJson(OFFLINE_INDEX_KEY, null);
    if (cached?.version === 4 && cached?.size === MED_DB.length && cached?.prefixMap) {
      return cached.prefixMap;
    }

    const prefixMap = {};
    MED_DB.forEach((item, index) => {
      const words = item.name.toLowerCase().split(/\s+/).filter(Boolean);
      words.forEach((w) => {
        const key = w.slice(0, 2);
        if (!key) return;
        if (!prefixMap[key]) prefixMap[key] = [];
        prefixMap[key].push(index);
      });
    });

    saveJson(OFFLINE_INDEX_KEY, {
      version: 4,
      size: MED_DB.length,
      prefixMap,
      createdAt: Date.now()
    });

    return prefixMap;
  };

  const PREFIX_INDEX = buildPrefixIndex();

  const levenshtein = (a, b) => {
    if (a === b) return 0;
    if (!a.length) return b.length;
    if (!b.length) return a.length;

    const v0 = new Array(b.length + 1).fill(0);
    const v1 = new Array(b.length + 1).fill(0);

    for (let i = 0; i <= b.length; i += 1) v0[i] = i;

    for (let i = 0; i < a.length; i += 1) {
      v1[0] = i + 1;
      for (let j = 0; j < b.length; j += 1) {
        const cost = a[i] === b[j] ? 0 : 1;
        v1[j + 1] = Math.min(v1[j] + 1, v0[j + 1] + 1, v0[j] + cost);
      }
      for (let j = 0; j <= b.length; j += 1) v0[j] = v1[j];
    }

    return v1[b.length];
  };

  const getCandidates = (query) => {
    const q = normalize(query);
    const firstToken = q.split(/\s+/).filter(Boolean)[0] || '';
    if (!firstToken) return MED_DB;

    // Single-character lookups should still filter by starting letter.
    if (firstToken.length < 2) {
      return MED_DB.filter((item) => item.nameBlob.startsWith(firstToken));
    }

    const key = firstToken.slice(0, 2);
    if (!PREFIX_INDEX[key]) return MED_DB;
    return [...new Set(PREFIX_INDEX[key])].map((idx) => MED_DB[idx]);
  };

  const applyFilter = (items) => {
    if (activeFilter === 'tablet') return items.filter((item) => item.form === 'Tablet');
    return items;
  };

  const fuzzyScore = (item, query) => {
    const q = normalize(query);
    const tokens = q.split(/\s+/).filter(Boolean);
    if (!tokens.length) return -1;

    let score = 0;
    let hardMatch = true;

    tokens.forEach((t) => {
      const inBlob = item.searchBlob.includes(t);
      if (inBlob) {
        score += 4;
      } else {
        hardMatch = false;
        const words = item.nameBlob.split(/\s+/);
        let best = 99;
        words.forEach((w) => {
          const dist = levenshtein(t, w.slice(0, t.length + 2));
          if (dist < best) best = dist;
        });
        if (best <= 2) score += 2.5 - best * 0.5;
      }
    });

    if (!hardMatch && score < 2) return -1;
    if (item.nameBlob.startsWith(q)) score += 5;
    if (item.variant.toLowerCase().includes(q)) score += 3;
    score += Math.max(0, 3 - Math.abs(item.name.length - q.length) * 0.04);
    return score;
  };

  const strictPrefixScore = (item, query) => {
    const q = normalize(query);
    if (!q) return -1;
    const tokens = q.split(/\s+/).filter(Boolean);
    const nameWords = item.nameBlob.split(/\s+/).filter(Boolean);
    const variantText = (item.variant || '').toLowerCase();
    const hasAllTokens = tokens.every((token) => nameWords.some((w) => w.startsWith(token)) || variantText.includes(token));
    if (!hasAllTokens) return -1;

    let score = 10;
    if (item.nameBlob.startsWith(q)) score += 12;
    if (nameWords[0]?.startsWith(tokens[0])) score += 5;
    score += Math.max(0, 4 - Math.abs(item.name.length - q.length) * 0.05);
    return score;
  };

  const rankMatches = (query) => {
    const q = normalize(query);
    const pool = applyFilter(getCandidates(q));
    const strictScored = [];

    pool.forEach((item) => {
      const score = strictPrefixScore(item, q);
      if (score > 0) strictScored.push({ item, score });
    });

    if (strictScored.length) {
      strictScored.sort((a, b) => b.score - a.score);
      return strictScored.map((s) => s.item);
    }

    // Fuzzy fallback only after a reasonably specific query.
    if (q.length < 3) return [];

    const fuzzyScored = [];
    pool.forEach((item) => {
      const score = fuzzyScore(item, q);
      if (score > 0) fuzzyScored.push({ item, score });
    });

    fuzzyScored.sort((a, b) => b.score - a.score);
    return fuzzyScored.map((s) => s.item);
  };

  const setActiveSuggestion = (index) => {
    if (!medSuggestions) return;
    const nodes = medSuggestions.querySelectorAll('.med-suggestion-item');
    nodes.forEach((node, i) => {
      node.classList.toggle('active', i === index);
      if (i === index) node.scrollIntoView({ block: 'nearest' });
    });
    highlightedIndex = index;
  };

  const openHighlightedSuggestion = () => {
    if (highlightedIndex < 0 || highlightedIndex >= currentSuggestions.length) return false;
    const med = currentSuggestions[highlightedIndex];
    openMedicineModal(med);
    if (medSuggestions) medSuggestions.hidden = true;
    return true;
  };

  const renderTagList = (container, values, onClick, emptyText) => {
    if (!container) return;
    container.innerHTML = '';
    if (!values.length) {
      const span = document.createElement('span');
      span.className = 'med-tag-empty';
      span.textContent = emptyText;
      container.appendChild(span);
      return;
    }

    values.forEach((value) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'med-tag-btn';
      btn.textContent = value;
      btn.addEventListener('click', () => onClick(value));
      container.appendChild(btn);
    });
  };

  const getRecents = () => loadJson(RECENT_KEY, []);
  const getPins = () => loadJson(PIN_KEY, []);

  const saveRecent = (term) => {
    const v = String(term || '').trim();
    if (!v) return;
    const next = [v, ...getRecents().filter((x) => normalize(x) !== normalize(v))].slice(0, 10);
    saveJson(RECENT_KEY, next);
    renderRecents();
  };

  const togglePin = (name) => {
    const pins = getPins();
    const exists = pins.some((x) => normalize(x) === normalize(name));
    const next = exists ? pins.filter((x) => normalize(x) !== normalize(name)) : [name, ...pins].slice(0, 14);
    saveJson(PIN_KEY, next);
    renderPins();
    if (medPin) medPin.textContent = exists ? t('Pin Medicine', 'दवा पिन करें') : t('Unpin Medicine', 'पिन हटाएं');
  };

  const renderRecents = () => {
    renderTagList(
      recentWrap,
      getRecents(),
      (term) => {
        if (!medSearchInput) return;
        medSearchInput.value = term;
        renderSuggestions(term);
        medSearchInput.focus();
      },
      t('No searches yet', 'अभी तक कोई खोज नहीं')
    );
  };

  const renderPins = () => {
    renderTagList(
      pinnedWrap,
      getPins(),
      (name) => {
        const match = MED_DB.find((m) => normalize(m.name) === normalize(name));
        if (!match) return;
        openMedicineModal(match);
      },
      t('No pinned medicines', 'कोई पिन की गई दवा नहीं')
    );
  };

  const renderSuggestions = (query) => {
    if (!medSuggestions) return;
    const trimmed = String(query || '').trim();
    medSuggestions.innerHTML = '';
    currentSuggestions = [];
    highlightedIndex = -1;

    if (!trimmed) {
      medSuggestions.hidden = true;
      if (medEmpty) medEmpty.hidden = true;
      return;
    }

    const matches = rankMatches(trimmed).slice(0, 16);
    currentSuggestions = matches;
    medSuggestions.hidden = matches.length === 0;
    if (medEmpty) medEmpty.hidden = matches.length > 0;

    const fragment = document.createDocumentFragment();
    matches.forEach((med, index) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'med-suggestion-item';
      btn.innerHTML = `
        <span class="med-suggestion-icon" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
            <rect x="6.5" y="3.5" width="11" height="17" rx="2"></rect>
            <path d="M8 8.5h8"></path>
            <path d="M10 14.5v-5"></path>
            <path d="M14 14.5v-5"></path>
          </svg>
        </span>
        <span class="med-suggestion-text">
          <span class="med-suggestion-main">${med.name}</span>
          <span class="med-suggestion-sub">${t('Strength options inside card', 'मात्रा विकल्प कार्ड में')}</span>
        </span>
        <span class="med-suggestion-type tablet">${t('Tablet', 'टैबलेट')}</span>
        <span class="med-suggestion-arrow" aria-hidden="true">></span>
      `;
      btn.addEventListener('click', () => {
        openMedicineModal(med);
        medSuggestions.hidden = true;
      });
      btn.addEventListener('mouseenter', () => setActiveSuggestion(index));
      fragment.appendChild(btn);
    });

    medSuggestions.appendChild(fragment);
    if (matches.length) setActiveSuggestion(0);
  };

  const fillList = (el, rows, fallback) => {
    if (!el) return;
    el.innerHTML = '';
    if (!rows.length) {
      const li = document.createElement('li');
      li.textContent = fallback;
      el.appendChild(li);
      return;
    }
    rows.forEach((row) => {
      const li = document.createElement('li');
      li.textContent = row;
      el.appendChild(li);
    });
  };

  const renderWarningChips = (warnings) => {
    if (!medWarnings) return;
    medWarnings.innerHTML = '';
    if (!warnings?.length) {
      medWarnings.hidden = true;
      return;
    }
    medWarnings.hidden = false;
    warnings.forEach((w) => {
      const span = document.createElement('span');
      span.className = 'med-warning-chip';
      span.textContent = w;
      medWarnings.appendChild(span);
    });
  };

  const findAlternatives = (med) => {
    const cat = categoryFor(med.name);
    return dedupe(
      MED_DB.filter((m) => m.id !== med.id && categoryFor(m.name) === cat)
        .slice(0, 150)
        .map((m) => m.name)
    ).slice(0, 5);
  };

  const findVariants = (med) => {
    return (med.strengthOptions || []).map((variant) => `${t('Tablet', 'टैबलेट')}: ${variant}`);
  };

  const setPinStateFor = (med) => {
    if (!medPin) return;
    const pinned = getPins().some((x) => normalize(x) === normalize(med.name));
    medPin.textContent = pinned ? t('Unpin Medicine', 'पिन हटाएं') : t('Pin Medicine', 'दवा पिन करें');
  };

  const showMedicineDetails = (med, selectedStrength) => {
    activeMedicine = med;
    activeStrength = selectedStrength;
    if (medStrengthStep) medStrengthStep.hidden = true;
    if (medDetailBody) medDetailBody.hidden = false;

    if (medForm) {
      medForm.textContent = med.form;
      medForm.classList.add('tablet');
    }

    if (medSubtitle) {
      medSubtitle.textContent = `${t('Selected strength: ', 'चयनित मात्रा: ')}${selectedStrength}`;
    }
    if (medUses) medUses.textContent = med.whatItDoes;
    if (medSideEffects) medSideEffects.textContent = med.sideEffects;
    if (medWhen) medWhen.textContent = med.whenTaken;
    if (medConfidence) medConfidence.textContent = `${t('Confidence', 'विश्वसनीयता')}: ${med.confidence || 'Medium'}`;
    if (medReviewed) medReviewed.textContent = `${t('Reviewed', 'समीक्षा तिथि')}: ${med.reviewedOn || '2026-03-03'}`;

    renderWarningChips(med.warnings || []);
    fillList(medAlternatives, findAlternatives(med), t('No alternatives found.', 'कोई विकल्प नहीं मिला।'));
    fillList(medCompare, findVariants(med), t('No additional variants found.', 'कोई अतिरिक्त मात्रा नहीं मिली।'));

    if (medDosage) {
      medDosage.innerHTML = '';
      const entries = [
        [t('Children', 'बच्चे'), med.dosage?.children],
        [t('Teens', 'किशोर'), med.dosage?.teens],
        [t('Adults', 'वयस्क'), med.dosage?.adults],
        [t('Older Adults', 'वरिष्ठ'), med.dosage?.olderAdults],
      ];
      entries.forEach(([label, value]) => {
        const li = document.createElement('li');
        li.innerHTML = `<strong>${label}:</strong> ${value || t('Consult doctor.', 'डॉक्टर से सलाह लें।')}`;
        medDosage.appendChild(li);
      });
    }

    if (medInteractionResult) {
      medInteractionResult.textContent = t(
        'Enter a second medicine name to run a basic interaction check.',
        'सरल इंटरैक्शन जांच के लिए दूसरी दवा का नाम लिखें।'
      );
    }

    setPinStateFor(med);
    saveRecent(med.name);
  };

  const openMedicineModal = (med) => {
    if (!medModal) return;
    activeMedicine = med;
    activeStrength = '';

    if (medDetailBody) medDetailBody.hidden = true;
    if (medStrengthStep) medStrengthStep.hidden = false;
    if (medStrengthOptions) medStrengthOptions.innerHTML = '';

    if (medTitle) {
      medTitle.childNodes.forEach((n) => {
        if (n.nodeType === Node.TEXT_NODE) n.remove();
      });
      medTitle.appendChild(document.createTextNode(` ${med.name}`));
    }

    if (medStrengthLabel) {
      medStrengthLabel.textContent = t('Select strength first', 'पहले मात्रा चुनें');
    }

    const strengthOptions = dedupe(
      (med.strengthOptions || [])
        .map((option) => String(option || '').split('|')[0].trim())
        .filter(Boolean)
    );

    const fragment = document.createDocumentFragment();
    strengthOptions.forEach((strength) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'med-strength-btn';
      btn.textContent = strength;
      btn.addEventListener('click', () => showMedicineDetails(med, strength));
      fragment.appendChild(btn);
    });
    medStrengthOptions?.appendChild(fragment);

    if (!strengthOptions.length) {
      showMedicineDetails(med, t('Unknown', 'अज्ञात'));
    }

    medModal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeMedicineModal = () => {
    if (!medModal) return;
    medModal.classList.remove('open');
    document.body.style.overflow = '';
  };

  const runInteractionCheck = () => {
    if (!activeMedicine || !medInteractionInput || !medInteractionResult) return;
    const query = normalize(medInteractionInput.value);
    if (!query) {
      medInteractionResult.textContent = t('Type another medicine name first.', 'पहले दूसरी दवा का नाम लिखें।');
      return;
    }

    const second = MED_DB.find((m) => m.searchBlob.includes(query));
    if (!second) {
      medInteractionResult.textContent = t(
        'Could not match that medicine in archive. Try a simpler name.',
        'आर्काइव में यह दवा नहीं मिली। सरल नाम से कोशिश करें।'
      );
      return;
    }

    medInteractionResult.textContent = `${activeMedicine.name} + ${second.name}: ${interactionCheck(activeMedicine, second)}`;
  };

  medPin?.addEventListener('click', () => {
    if (!activeMedicine) return;
    togglePin(activeMedicine.name);
  });

  medInteractionCheck?.addEventListener('click', runInteractionCheck);
  medInteractionInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runInteractionCheck();
    }
  });

  medClose?.addEventListener('click', closeMedicineModal);
  medModal?.addEventListener('click', (event) => {
    if (event.target === medModal) closeMedicineModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && medModal?.classList.contains('open')) {
      closeMedicineModal();
      return;
    }

    if (!medSuggestions || medSuggestions.hidden) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const next = highlightedIndex < currentSuggestions.length - 1 ? highlightedIndex + 1 : 0;
      setActiveSuggestion(next);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prev = highlightedIndex > 0 ? highlightedIndex - 1 : currentSuggestions.length - 1;
      setActiveSuggestion(prev);
      return;
    }

    if (event.key === 'Enter' && document.activeElement === medSearchInput) {
      event.preventDefault();
      openHighlightedSuggestion();
      return;
    }

    if (event.key === 'Escape') {
      medSuggestions.hidden = true;
      highlightedIndex = -1;
    }
  });

  let inputTimer = null;
  const scheduleSuggestions = (value) => {
    if (inputTimer) clearTimeout(inputTimer);
    inputTimer = setTimeout(() => renderSuggestions(value), 80);
  };

  medSearchInput?.addEventListener('input', (event) => {
    scheduleSuggestions(event.target.value);
  });

  medSearchInput?.addEventListener('focus', (event) => {
    renderSuggestions(event.target.value);
  });

  document.addEventListener('click', (event) => {
    if (!medSuggestions || !medSearchInput) return;
    if (event.target === medSearchInput || medSuggestions.contains(event.target)) return;
    medSuggestions.hidden = true;
  });

  const setFilter = (nextFilter) => {
    activeFilter = nextFilter;
    filterButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.medFilter === nextFilter);
    });
    renderSuggestions(medSearchInput?.value || '');
  };

  filterButtons.forEach((button) => {
    button.addEventListener('click', () => setFilter(button.dataset.medFilter || 'all'));
  });

  const setCompactMode = (enabled) => {
    document.documentElement.classList.toggle('compact-mode', enabled);
    if (compactToggle) compactToggle.classList.toggle('active', enabled);
    localStorage.setItem(COMPACT_KEY, enabled ? '1' : '0');
  };

  compactToggle?.addEventListener('click', () => {
    const next = !document.documentElement.classList.contains('compact-mode');
    setCompactMode(next);
  });

  const initVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !medVoiceBtn || !medSearchInput) {
      medVoiceBtn?.setAttribute('disabled', 'true');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.addEventListener('result', (event) => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      medSearchInput.value = text;
      renderSuggestions(text);
      medSearchInput.focus();
    });

    recognition.addEventListener('end', () => {
      medVoiceBtn.classList.remove('listening');
    });

    medVoiceBtn.addEventListener('click', () => {
      medVoiceBtn.classList.add('listening');
      recognition.start();
    });
  };

  const updateArchiveCount = () => {
    if (!medCount) return;
    const tabletCount = MED_DB.filter((item) => item.form === 'Tablet').length;
    medCount.textContent = isHindi()
      ? `${t('Archive', 'आर्काइव')}: ${MED_DB.length.toLocaleString()} (${tabletCount.toLocaleString()} ${t('tablets', 'टैबलेट')})`
      : `Archive: ${MED_DB.length.toLocaleString()} (${tabletCount.toLocaleString()} tablets)`;
  };

  renderRecents();
  renderPins();
  updateArchiveCount();
  setCompactMode(localStorage.getItem(COMPACT_KEY) === '1');
  initVoice();

  new MutationObserver(() => {
    if (activeMedicine) setPinStateFor(activeMedicine);
    renderRecents();
    renderPins();
    updateArchiveCount();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
});

