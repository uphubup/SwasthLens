document.addEventListener('DOMContentLoaded', () => {
  const htmlEl = document.documentElement;
  const body = document.body;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  requestAnimationFrame(() => body.classList.add('page-loaded'));

  /* Theme handling */
  const THEME_KEY = 'medilens-theme';
  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme) {
    htmlEl.classList.toggle('dark', savedTheme === 'dark');
  }

  const toggles = document.querySelectorAll('[data-theme-toggle]');
  const isDark = () => htmlEl.classList.contains('dark');

  const syncToggleState = () => {
    toggles.forEach((toggle) => {
      toggle.classList.toggle('dark-active', isDark());
    });
  };

  syncToggleState();

  const handleThemeToggle = () => {
    const nextDarkState = !isDark();
    htmlEl.classList.toggle('dark', nextDarkState);
    localStorage.setItem(THEME_KEY, nextDarkState ? 'dark' : 'light');
    syncToggleState();
  };

  toggles.forEach((toggle) => {
    toggle.addEventListener('click', handleThemeToggle);
  });

  /* Language handling */
  const LANG_KEY = 'sehatlens-language';
  const langToggles = document.querySelectorAll('[data-lang-toggle]');
  const translationMap = Object.freeze({
    'Sehat Lens': 'सेहत लेंस',
    'Home': 'होम',
    'Dashboard': 'डैशबोर्ड',
    'Med Vault': 'मेड वॉल्ट',
    'About': 'हमारे बारे में',
    'Precision insight for every patient': 'हर मरीज के लिए सटीक समझ',
    'Decode Your Medical Reports in Seconds': 'अपने मेडिकल रिपोर्ट्स को सेकंडों में समझें',
    'Clinical-grade AI that transforms complex lab results into clear, compassionate insights - designed for everyone, especially those who deserve answers.':
      'क्लिनिकल-ग्रेड एआई जो जटिल लैब रिपोर्ट्स को स्पष्ट और सरल समझ में बदलता है।',
    'Upload Medical File': 'मेडिकल फ़ाइल अपलोड करें',
    'HIPAA-Safe': 'HIPAA सुरक्षित',
    'Clinical AI': 'क्लिनिकल एआई',
    'Human-readable': 'आसान भाषा में',
    'Scroll': 'स्क्रॉल',
    'Trusted by clinics & caregivers': 'क्लीनिक और देखभालकर्ताओं का भरोसा',
    'Translating lab jargon into actions': 'लैब शब्दों को काम की सलाह में बदलना',
    'Upload PDFs from any lab': 'किसी भी लैब की PDF अपलोड करें',
    'Benchmark against 47+ biomarkers': '47+ बायोमार्कर्स से तुलना करें',
    'Share compassionate summaries': 'सरल और उपयोगी सारांश साझा करें',
    '"Sehat Lens gave my family clarity in minutes."': '"सेहत लेंस ने मेरे परिवार को मिनटों में स्पष्टता दी।"',
    'Reports Analyzed': 'विश्लेषित रिपोर्ट्स',
    'Clinical Accuracy': 'क्लिनिकल सटीकता',
    'Biomarkers Benchmarked': 'बायोमार्कर तुलना',
    'Avg. Time to Clarity': 'स्पष्टता का औसत समय',
    'How Sehat Lens Works': 'सेहत लेंस कैसे काम करता है',
    'A guided flow that turns dense medical data into plain English clarity.': 'एक सरल प्रक्रिया जो जटिल मेडिकल डेटा को आसान समझ में बदलती है।',
    'Upload Securely': 'सुरक्षित अपलोड',
    'AI Interprets': 'एआई विश्लेषण करता है',
    'See the Story': 'पूरी कहानी समझें',
    'At 72, I finally understand my labs without waiting for appointments.': '72 की उम्र में अब मैं अपनी लैब रिपोर्ट बिना इंतजार समझ पाती हूँ।',
    'Sehat Lens helped me explain results to my grandchildren in plain words.': 'सेहत लेंस ने मुझे परिणाम आसान शब्दों में समझाने में मदद की।',
    'It feels like having a gentle clinician walking me through every value.': 'ऐसा लगता है जैसे कोई विशेषज्ञ हर वैल्यू समझा रहा हो।',
    'Inside Sehat Lens': 'सेहत लेंस के बारे में',
    'Health intelligence that speaks human.': 'हेल्थ इंटेलिजेंस जो इंसानी भाषा में समझाए।',
    'What We Optimize For': 'हम किस पर ध्यान देते हैं',
    'How It Works': 'यह कैसे काम करता है',
    'FAQs': 'अक्सर पूछे जाने वाले सवाल',
    'No. It is an educational support layer that helps you understand and discuss your reports better.':
      'नहीं। यह एक जानकारी-आधारित सहायता है जो आपकी रिपोर्ट बेहतर समझने में मदद करती है।',
    'Yes. Use Reset Data on Dashboard to remove locally stored analysis and history.':
      'हाँ। डैशबोर्ड में Reset Data का उपयोग कर स्थानीय डेटा हटाया जा सकता है।',
    'Sehat Lens is informational only and does not replace professional medical diagnosis or treatment.':
      'सेहत लेंस केवल जानकारी देता है, यह डॉक्टर की सलाह का विकल्प नहीं है।',
    'The Analysis Sanctuary': 'विश्लेषण केंद्र',
    'Reset Data': 'डेटा रीसेट करें',
    'Add Report To Compare': 'तुलना के लिए रिपोर्ट जोड़ें',
    'Report Comparison': 'रिपोर्ट तुलना',
    'Current vs Uploaded': 'वर्तमान बनाम अपलोड',
    'Upload an old or new report to compare trends.': 'ट्रेंड तुलना के लिए पुरानी या नई रिपोर्ट अपलोड करें।',
    'Close comparison options': 'तुलना विकल्प बंद करें',
    'Choose where the uploaded report should appear in timeline.': 'अपलोड रिपोर्ट टाइमलाइन में कहाँ दिखेगी, यह चुनें।',
    'Upload Old Report': 'पुरानी रिपोर्ट अपलोड करें',
    'Upload New Report': 'नई रिपोर्ट अपलोड करें',
    'Select one option to continue.': 'जारी रखने के लिए एक विकल्प चुनें।',
    "Your report has been analyzed. Here's what we found.": 'आपकी रिपोर्ट का विश्लेषण हो गया है। यह मुख्य निष्कर्ष हैं।',
    'Priority Flags': 'प्राथमिक अलर्ट',
    'Most important out-of-range markers first.': 'सीमा से बाहर के सबसे महत्वपूर्ण मार्कर पहले।',
    'Stay-Healthy Playbook': 'स्वस्थ रहने की योजना',
    'What To Eat': 'क्या खाएं',
    'What To Do': 'क्या करें',
    'Watch Carefully': 'ध्यान से देखें',
    'What To Avoid': 'किससे बचें',
    'Complete Metric Details': 'पूर्ण मेट्रिक विवरण',
    'Grouped View': 'समूहित दृश्य',
    'Scroll for category-wise deep dive.': 'श्रेणीवार विवरण देखने के लिए स्क्रॉल करें।',
    'Med Vault Lookup': 'मेड वॉल्ट खोज',
    'Search from a 20,000-item archive of unique tablet medicines.': '20,000 विशिष्ट टैबलेट दवाओं के आर्काइव में खोजें।',
    'All': 'सभी',
    'Tablets': 'टैबलेट',
    'Compact Mode': 'कॉम्पैक्ट मोड',
    'Recent Searches': 'हाल की खोजें',
    'Pinned Medicines': 'पिन की गई दवाएं',
    'No searches yet': 'अभी तक कोई खोज नहीं',
    'No pinned medicines': 'कोई पिन की गई दवा नहीं',
    'Strength options inside card': 'मात्रा विकल्प कार्ड में',
    'Pin Medicine': 'दवा पिन करें',
    'Unpin Medicine': 'पिन हटाएं',
    'Available strengths:': 'उपलब्ध मात्रा:',
    'Tablet': 'टैबलेट',
    'Archive': 'आर्काइव',
    'tablets': 'टैबलेट',
    'Archive: 0': 'आर्काइव: 0',
    'Select strength first': 'पहले मात्रा चुनें',
    'Selected strength:': 'चयनित मात्रा:',
    'No matching medicines found. Try another name or strength.': 'कोई दवा नहीं मिली। दूसरा नाम या स्ट्रेंथ आजमाएं।',
    'Close medicine details': 'दवा विवरण बंद करें',
    'Close': 'बंद करें',
    'Medicine': 'दवा',
    'Confidence': 'विश्वसनीयता',
    'Reviewed': 'समीक्षा तिथि',
    'Confidence: High': 'विश्वसनीयता: उच्च',
    'Reviewed: 2026-03-03': 'समीक्षा तिथि: 2026-03-03',
    'What it does:': 'यह क्या करती है:',
    'Common side effects:': 'सामान्य दुष्प्रभाव:',
    'Dosage by age group': 'आयु के अनुसार मात्रा',
    'When people take it:': 'लोग इसे कब लेते हैं:',
    'Generic alternatives': 'जेनेरिक विकल्प',
    'Compare variants': 'मात्रा तुलना',
    'Quick interaction check': 'त्वरित इंटरैक्शन जांच',
    'Type another medicine to check with this one': 'इसके साथ जांचने के लिए दूसरी दवा लिखें',
    'Check': 'जांचें',
    'Enter a second medicine name to run a basic interaction check.': 'सरल इंटरैक्शन जांच के लिए दूसरी दवा का नाम लिखें।',
    'Type another medicine name first.': 'पहले दूसरी दवा का नाम लिखें।',
    'Could not match that medicine in archive. Try a simpler name.': 'आर्काइव में यह दवा नहीं मिली। सरल नाम से कोशिश करें।',
    'Caution: combining pain medicines may raise stomach/kidney risk. Confirm with clinician.':
      'सावधानी: दो दर्द की दवाएं साथ लेने से पेट/किडनी जोखिम बढ़ सकता है। डॉक्टर से पुष्टि करें।',
    'Avoid combining antibiotics unless specifically prescribed together.':
      'एंटीबायोटिक साथ में तभी लें जब डॉक्टर ने स्पष्ट रूप से बताया हो।',
    'Caution: BP medicines together can lower pressure excessively in some users.':
      'सावधानी: बीपी की दवाएं साथ में लेने से कुछ लोगों में दबाव बहुत कम हो सकता है।',
    'Monitor sugar closely; dual diabetes medicines can increase low-sugar risk.':
      'शुगर पर नजर रखें; दो डायबिटीज दवाओं से लो-शुगर जोखिम बढ़ सकता है।',
    'NSAID-type pain medicines may reduce BP-control effectiveness in some patients.':
      'NSAID प्रकार की दर्द दवाएं कुछ मरीजों में बीपी कंट्रोल कम कर सकती हैं।',
    'Timing may matter; acid suppressants can affect absorption for some antibiotics.':
      'समय महत्वपूर्ण है; एसिड कम करने वाली दवाएं कुछ एंटीबायोटिक के अवशोषण को प्रभावित कर सकती हैं।',
    'No major pattern-level warning detected here. Still verify with a clinician/pharmacist.':
      'कोई बड़ी पैटर्न-आधारित चेतावनी नहीं मिली। फिर भी डॉक्टर/फार्मासिस्ट से पुष्टि करें।',
    'Connect': 'संपर्क',
    'We can be contacted anytime for support and feedback.': 'सहायता और सुझाव के लिए आप हमसे कभी भी संपर्क कर सकते हैं।',
    'Explore': 'एक्सप्लोर',
    'AI-powered health report guidance for every family.': 'हर परिवार के लिए AI आधारित हेल्थ रिपोर्ट मार्गदर्शन।',
    'Choose File': 'फ़ाइल चुनें',
    'No file selected': 'कोई फ़ाइल चुनी नहीं गई',
    'Waiting for file...': 'फ़ाइल का इंतजार है...',
    'Cancel': 'रद्द करें',
    'Upload Your Medical PDF': 'अपनी मेडिकल PDF अपलोड करें',
    'Toggle color theme': 'रंग थीम बदलें',
    'Toggle navigation': 'नेविगेशन खोलें/बंद करें',
    'Switch language': 'भाषा बदलें',
  });
  window.SEHATLENS_I18N_HI = translationMap;

  const textNodeOriginals = new WeakMap();
  const attrOriginals = new WeakMap();
  let currentLanguage = localStorage.getItem(LANG_KEY) || 'en';

  const translateString = (text, lang) => {
    const raw = String(text ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    if (lang === 'en') return raw;
    if (translationMap[trimmed]) {
      return raw.replace(trimmed, translationMap[trimmed]);
    }
    return raw;
  };

  const setNodeText = (node, value) => {
    if (node.nodeValue !== value) {
      node.nodeValue = value;
    }
  };

  const applyLanguageToDom = (lang) => {
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const parentTag = node.parentElement?.tagName;
      if (parentTag && !['SCRIPT', 'STYLE'].includes(parentTag)) {
        if (!textNodeOriginals.has(node)) {
          textNodeOriginals.set(node, node.nodeValue);
        }
        const base = textNodeOriginals.get(node) || node.nodeValue;
        setNodeText(node, translateString(base, lang));
      }
      node = walker.nextNode();
    }

    document.querySelectorAll('[placeholder], [aria-label], [title]').forEach((el) => {
      if (!attrOriginals.has(el)) {
        attrOriginals.set(el, {
          placeholder: el.getAttribute('placeholder'),
          ariaLabel: el.getAttribute('aria-label'),
          title: el.getAttribute('title'),
        });
      }
      const original = attrOriginals.get(el);
      if (original.placeholder !== null) {
        el.setAttribute('placeholder', translateString(original.placeholder, lang));
      }
      if (original.ariaLabel !== null) {
        el.setAttribute('aria-label', translateString(original.ariaLabel, lang));
      }
      if (original.title !== null) {
        el.setAttribute('title', translateString(original.title, lang));
      }
    });

    langToggles.forEach((toggle) => {
      toggle.classList.toggle('lang-hi', lang === 'hi');
      toggle.setAttribute('aria-pressed', lang === 'hi' ? 'true' : 'false');
    });
  };

  const setLanguage = (lang) => {
    currentLanguage = lang === 'hi' ? 'hi' : 'en';
    localStorage.setItem(LANG_KEY, currentLanguage);
    htmlEl.setAttribute('lang', currentLanguage === 'hi' ? 'hi' : 'en');
    applyLanguageToDom(currentLanguage);
  };

  langToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      setLanguage(currentLanguage === 'en' ? 'hi' : 'en');
    });
  });

  setLanguage(currentLanguage);

  const langObserver = new MutationObserver(() => {
    if (currentLanguage === 'hi') {
      applyLanguageToDom('hi');
    }
  });
  langObserver.observe(body, { subtree: true, childList: true, characterData: true });

  /* Word-by-word reveal */
  document.querySelectorAll('[data-word-reveal]').forEach((el) => {
    const original = el.textContent.trim();
    if (!original) return;
    if (prefersReducedMotion || original.length > 120) return;
    const words = original.split(' ');
    el.innerHTML = words
      .map((word, index) => `<span style="animation-delay:${index * 0.08}s">${word}</span>`)
      .join(' ');
  });

  /* Intersection reveals */
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal').forEach((el) => el.classList.add('revealed'));
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.dataset.delay || '0';
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add('revealed');
            revealObserver.unobserve(el);
          }
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));
  }

  /* Counter animations */
  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.target || '0');
    const duration = parseInt(el.dataset.duration || '1500', 10);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    let startTime;

    const step = (now) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutQuart(progress);
      const value = target * eased;
      el.textContent = `${formatter.format(progress === 1 ? target : value)}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  };

  const counterObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (!el.dataset.counted) {
            el.dataset.counted = 'true';
            animateCounter(el);
          }
          counterObserver.unobserve(el);
        }
      });
    },
    { threshold: 0.6 }
  );

  document.querySelectorAll('.counter').forEach((el) => counterObserver.observe(el));

  /* Accordion */
  document.querySelectorAll('.accordion').forEach((accordion) => {
    const header = accordion.querySelector('.accordion-header');
    header?.addEventListener('click', () => {
      const isOpen = accordion.classList.contains('open');
      if (!accordion.dataset.group) {
        accordion.classList.toggle('open');
        return;
      }
      document
        .querySelectorAll(`.accordion[data-group="${accordion.dataset.group}"]`)
        .forEach((item) => {
          if (item === accordion) {
            item.classList.toggle('open', !isOpen);
          } else {
            item.classList.remove('open');
          }
        });
    });
  });

  /* EKG animation */
  document.querySelectorAll('[data-animate-ekg] path').forEach((path) => {
    if (prefersReducedMotion) return;
    const length = path.getTotalLength();
    path.style.setProperty('--path-length', length);
    path.style.strokeDasharray = length;
    path.style.strokeDashoffset = length;
    path.classList.add('ekg-path');
  });

  /* Greeting date */
  const dateTarget = document.querySelector('[data-current-date]');
  if (dateTarget) {
    const date = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
    dateTarget.textContent = date;
  }

  /* Metric numbers auto animate on load */
  document.querySelectorAll('[data-value]').forEach((el) => {
    if (prefersReducedMotion) return;
    if (el.classList.contains('counter')) return;
    const target = parseFloat(el.dataset.value || '0');
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const duration = parseInt(el.dataset.duration || '1600', 10);
    let startTime;

    const step = (now) => {
      if (!startTime) startTime = now;
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = easeOutQuart(progress);
      const value = target * eased;
      const display = progress === 1 ? target : value;
      el.textContent = `${display.toFixed(decimals)}${suffix}`;
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  });

  /* Mini bar fill */
  document.querySelectorAll('.mini-bar span').forEach((bar) => {
    const pct = parseFloat(bar.dataset.progress || '0');
    requestAnimationFrame(() => {
      bar.style.width = `${Math.min(Math.max(pct, 0), 1) * 100}%`;
    });
  });

  /* Upload modal */
  const uploadModal = document.querySelector('[data-upload-modal]');
  const uploadClose = document.querySelector('[data-upload-close]');
  const fileInput = document.querySelector('[data-upload-input]');
  const progressFill = document.querySelector('.progress-fill');
  const progressLabel = document.querySelector('[data-progress-label]');

  const openUploadModal = () => uploadModal?.classList.add('open');
  const closeUploadModal = () => {
    uploadModal?.classList.remove('open');
    if (progressFill) progressFill.style.width = '0%';
  };

  document.querySelectorAll('[data-upload-trigger]').forEach((btn) => {
    btn.addEventListener('click', () => {
      openUploadModal();
      fileInput?.focus();
    });
  });

  uploadClose?.addEventListener('click', closeUploadModal);
  uploadModal?.addEventListener('click', (event) => {
    if (event.target === uploadModal) closeUploadModal();
  });

  const resolveApiBase = () => {
    const override = window.SEHATLENS_API_BASE;
    if (typeof override === 'string' && override.trim()) {
      return override.trim().replace(/\/+$/, '');
    }
    const metaBase = document.querySelector('meta[name="sehatlens-api-base"]')?.getAttribute('content');
    if (typeof metaBase === 'string' && metaBase.trim()) {
      return metaBase.trim().replace(/\/+$/, '');
    }
    if (window.location.protocol === 'file:') return '';
    return window.location.origin;
  };
  const ANALYZE_ENDPOINT = `${resolveApiBase()}/api/analyze-report`;

  const uploadReport = async (file) => {
    const formData = new FormData();
    formData.append('report', file);

    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error || 'Upload failed');
    }

    return data;
  };

  const saveAnalysisHistory = (analysis, fileName) => {
    const historyKey = 'analysisHistory';
    const previous = JSON.parse(localStorage.getItem(historyKey) || '[]');
    const attention = Array.isArray(analysis?.summary?.watchCarefully) ? analysis.summary.watchCarefully : [];
    const ldlMetric = Array.isArray(analysis?.metrics)
      ? analysis.metrics.find((metric) => String(metric?.name || '').toLowerCase().includes('ldl'))
      : null;

    const entry = {
      timestamp: new Date().toISOString(),
      fileName,
      metricsCount: Array.isArray(analysis?.metrics) ? analysis.metrics.length : 0,
      keyFinding: attention.length ? attention.slice(0, 2).join('; ') : 'No major alerts',
      status: attention.length ? 'Review' : 'Clear',
      ldl: ldlMetric?.value ?? null,
    };

    localStorage.setItem(historyKey, JSON.stringify([entry, ...previous].slice(0, 25)));
  };

  fileInput?.addEventListener('change', (event) => {
    const run = async () => {
      const files = event.target.files;
      if (!files || !files.length || !progressFill) return;
      const file = files[0];

      const fileNameTarget = document.querySelector('[data-upload-filename]');
      if (fileNameTarget) fileNameTarget.textContent = file.name;

      if (file.type !== 'application/pdf') {
        if (progressLabel) progressLabel.textContent = 'Please select a PDF file.';
        return;
      }

      progressFill.style.width = '0%';
      if (progressLabel) progressLabel.textContent = 'Uploading report...';
      requestAnimationFrame(() => {
        progressFill.style.width = '35%';
      });

      try {
        const data = await uploadReport(file);
        localStorage.setItem('analysis', JSON.stringify(data));
        saveAnalysisHistory(data, file.name);

        progressFill.style.width = '100%';
        if (progressLabel) progressLabel.textContent = 'Analysis ready. Redirecting...';

        // Redirect only after response is saved.
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 350);
      } catch (error) {
        progressFill.style.width = '0%';
        if (progressLabel) {
          progressLabel.textContent = `Upload failed: ${error?.message || 'Please try again.'}`;
        }
      }
    };

    run();
  });

  /* Navbar hide on scroll */
  const navbar = document.querySelector('.navbar');
  let lastScrollY = window.scrollY;
  let navTicking = false;
  window.addEventListener(
    'scroll',
    () => {
      if (navTicking) return;
      navTicking = true;
      requestAnimationFrame(() => {
        const current = window.scrollY;
        if (navbar) {
          if (current > lastScrollY && current > 120) {
            navbar.classList.add('nav-hidden');
          } else {
            navbar.classList.remove('nav-hidden');
          }
        }
        lastScrollY = current;
        navTicking = false;
      });
    },
    { passive: true }
  );

  /* Mobile nav */
  const navToggle = document.querySelector('[data-nav-toggle]');
  const mobileOverlay = document.querySelector('[data-mobile-overlay]');
  const mobileMenu = document.querySelector('[data-mobile-menu]');

  const closeMobileNav = () => {
    navToggle?.classList.remove('open');
    mobileOverlay?.classList.remove('active');
    mobileMenu?.classList.remove('active');
  };

  navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('open');
    const isOpen = navToggle.classList.contains('open');
    mobileOverlay?.classList.toggle('active', isOpen);
    mobileMenu?.classList.toggle('active', isOpen);
  });

  mobileOverlay?.addEventListener('click', closeMobileNav);
  mobileMenu?.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });

  /* Settings toggles */
  document.querySelectorAll('[data-toggle]').forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const current = toggle.getAttribute('data-state') === 'on';
      toggle.setAttribute('data-state', current ? 'off' : 'on');
      toggle.classList.toggle('toggle-on', !current);
    });
  });
});

