document.addEventListener('DOMContentLoaded', () => {
  const categoryContainer = document.querySelector('[data-category-sections]');
  const noDataSection = document.querySelector('[data-no-analysis]');
  const greetingTitle = document.querySelector('[data-greeting-title]');
  const flaggedSection = document.querySelector('[data-flagged-section]');
  const flaggedGrid = document.querySelector('[data-flagged-grid]');
  const flaggedCount = document.querySelector('[data-flagged-count]');
  const playbookSection = document.querySelector('[data-playbook-section]');

  const modal = document.querySelector('[data-metric-modal]');
  const modalClose = document.querySelector('[data-metric-modal-close]');
  const modalName = document.querySelector('[data-modal-name]');
  const modalValue = document.querySelector('[data-modal-value]');
  const modalStatus = document.querySelector('[data-modal-status]');
  const modalInsight = document.querySelector('[data-modal-insight]');
  const modalFixes = document.querySelector('[data-modal-fixes]');
  const modalFoods = document.querySelector('[data-modal-foods]');
  const modalFoodsSection = document.querySelector('[data-modal-foods-section]');
  const resetDataButton = document.querySelector('[data-reset-data]');
  const modalPanel = document.querySelector('.metric-modal-content');

  const playbookLaunch = document.querySelector('[data-playbook-launch]');
  const playbookEat = document.querySelector('[data-playbook-eat]');
  const playbookWatch = document.querySelector('[data-playbook-watch]');
  const playbookDo = document.querySelector('[data-playbook-do]');
  const playbookAvoid = document.querySelector('[data-playbook-avoid]');
  const playbookDerived = document.querySelector('[data-playbook-derived]');
  const playbookSummary = document.querySelector('[data-playbook-summary]');
  const compareTrigger = document.querySelector('[data-compare-trigger]');
  const compareSection = document.querySelector('[data-compare-section]');
  const compareOrder = document.querySelector('[data-compare-order]');
  const compareNote = document.querySelector('[data-compare-note]');
  const compareSummary = document.querySelector('[data-compare-summary]');
  const compareGrid = document.querySelector('[data-compare-grid]');
  const compareModal = document.querySelector('[data-compare-modal]');
  const compareClose = document.querySelector('[data-compare-close]');
  const compareChoices = Array.from(document.querySelectorAll('[data-compare-choice]'));
  const compareInput = document.querySelector('[data-compare-input]');
  const compareStatus = document.querySelector('[data-compare-status]');

  let activeCard = null;
  let isClosingModal = false;
  let compareRole = null;
  let currentAnalysis = null;

  const categories = ['Blood', 'Liver', 'Kidney', 'Lipid', 'Thyroid', 'Vitamin', 'Other'];
  const fallbackText = 'Information unavailable';
  const t = (en, hi) => (document.documentElement.lang === 'hi' ? hi : en);
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

  const safeArray = (value) => (Array.isArray(value) ? value : []);
  const dedupe = (items) => items.filter((item, idx) => items.indexOf(item) === idx);

  const textOrFallback = (value) => {
    const text = String(value ?? '').trim();
    return text || fallbackText;
  };
  const placeholderPattern = /^(information unavailable|unavailable|not available|n\/a|na|none|null|unknown|not provided|not specified|-|--)$/i;
  const sanitizeAdviceList = (items) =>
    safeArray(items)
      .map((item) => String(item ?? '').replace(/\s+/g, ' ').trim())
      .filter((item) => item && !placeholderPattern.test(item));

  const buildNaturalFixFallback = (metric) => {
    const key = normalizeMetricKey(metric?.name);
    if (/vitamin d|vitamin b12|folate|iron|ferritin|calcium/.test(key)) {
      return [
        'Prioritize nutrient-dense foods and follow a clinician-guided supplement plan.',
        'Get regular morning sunlight exposure and recheck levels in follow-up labs.',
      ];
    }
    if (/glucose|hba1c|sugar|insulin/.test(key)) {
      return [
        'Use steady meal timing with lower refined sugar intake.',
        'Do 20-30 minutes of daily walking and track glucose trends regularly.',
      ];
    }
    if (/ldl|hdl|triglyceride|cholesterol|lipid/.test(key)) {
      return [
        'Increase fiber-rich meals and reduce deep-fried or trans-fat-heavy foods.',
        'Add regular cardio activity most days of the week and monitor lipid trends.',
      ];
    }
    if (/liver|sgot|sgpt|bilirubin/.test(key)) {
      return [
        'Avoid alcohol and unnecessary self-medication that can strain the liver.',
        'Choose balanced meals with hydration and repeat tests if advised.',
      ];
    }
    if (/creatinine|urea|kidney|egfr/.test(key)) {
      return [
        'Maintain hydration across the day unless fluid restriction is prescribed.',
        'Review painkiller use and blood pressure control with your clinician.',
      ];
    }
    return [
      'Maintain a consistent sleep, hydration, and daily movement routine.',
      'Repeat this marker on schedule and discuss trend changes with your clinician.',
    ];
  };

  const escapeHtml = (value) =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  const normalizePatientName = (value) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' ');
  };

  const statusLabel = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    const map = {
      low: 'Low',
      normal: 'Normal',
      borderline_high: 'Borderline High',
      high: 'High',
      deficient: 'Deficient',
    };
    return map[normalized] || fallbackText;
  };

  const statusClass = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'normal') return 'status-normal';
    if (normalized === 'borderline_high') return 'status-borderline-high';
    if (normalized === 'high') return 'status-high';
    if (normalized === 'low') return 'status-low';
    if (normalized === 'deficient') return 'status-deficient';
    return 'status-unknown';
  };

  const statusBarColor = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'normal') return '#16a34a';
    if (normalized === 'borderline_high') return '#f97316';
    if (normalized === 'high') return '#ef4444';
    if (normalized === 'low') return '#2563eb';
    if (normalized === 'deficient') return '#7f1d1d';
    return 'var(--accent-teal)';
  };

  const normalizeProgress = (progress) => {
    const value = Number(progress);
    if (!Number.isFinite(value)) return 0;
    return Math.min(Math.max(value, 0), 100);
  };

  const normalizeCategory = (category) => {
    const text = String(category || '').trim().toLowerCase();
    const map = {
      blood: 'Blood',
      liver: 'Liver',
      kidney: 'Kidney',
      lipid: 'Lipid',
      thyroid: 'Thyroid',
      vitamin: 'Vitamin',
      other: 'Other',
    };
    return map[text] || 'Other';
  };

  const normalizeMetricKey = (name) =>
    String(name || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');

  const severityRank = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'normal') return 0;
    if (normalized === 'borderline_high') return 1;
    if (normalized === 'low') return 2;
    if (normalized === 'high') return 2;
    if (normalized === 'deficient') return 3;
    return 1;
  };

  const numericValue = (value) => {
    if (value === null || value === undefined) return NaN;
    const n = Number.parseFloat(String(value).replace(/,/g, '').trim());
    return Number.isFinite(n) ? n : NaN;
  };

  const renderList = (target, items, fallback = true, animated = true) => {
    if (!target) return;
    const list = safeArray(items).map((item) => String(item ?? '').trim()).filter(Boolean);
    target.innerHTML = '';
    if (!list.length) {
      if (!fallback) return;
      const li = document.createElement('li');
      li.textContent = fallbackText;
      target.appendChild(li);
      return;
    }

    const fragment = document.createDocumentFragment();
    list.forEach((item, index) => {
      const li = document.createElement('li');
      if (animated) {
        li.className = 'modal-list-item';
        li.style.setProperty('--item-index', String(index));
      }
      li.textContent = item;
      fragment.appendChild(li);
    });
    target.appendChild(fragment);
  };

  const syncPlaybookSection = (open) => {
    if (!playbookSection || !playbookLaunch) return;
    const shouldOpen = Boolean(open);
    playbookSection.hidden = !shouldOpen;
    playbookSection.classList.toggle('is-open', shouldOpen);
    if (shouldOpen) playbookSection.classList.add('revealed');
    playbookLaunch.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    playbookLaunch.textContent = shouldOpen ? t('Hide Stay-Healthy Playbook', 'स्टे-हेल्दी प्लेबुक छुपाएं') : t('Open Stay-Healthy Playbook', 'स्टे-हेल्दी प्लेबुक खोलें');
  };

  const metricValueText = (metric) => {
    const value = metric?.value;
    const unit = String(metric?.unit ?? '').trim();
    if (value === undefined || value === null || value === '') return fallbackText;
    return unit ? `${value} ${unit}` : String(value);
  };

  const isFoodLine = (line) =>
    /(fish|egg|milk|curd|yogurt|paneer|cheese|oats|barley|nuts|seeds|spinach|leafy|fruit|vegetable|legume|beans|lentil|whole grain|olive oil|salmon|sardine|mackerel|chicken|protein|diet|meal|food|intake|fortified|cereal)/i.test(
      line
    ) && !/(walk|exercise|sleep|monitor|check|minutes|steps|ratio|index|count|mg\/dl|pg\/ml|ng\/ml|%)/i.test(line);

  const isPhysicalActionLine = (line) =>
    /(walk|exercise|workout|strength|cardio|yoga|run|jog|stretch|sleep|hydration|hydrate|sunlight|routine|activity|physical|movement|steps|minutes|training)/i.test(
      line
    ) && !/(salmon|egg|milk|oats|vegetable|fruit|nuts|seeds|food|diet)/i.test(line);

  const isStatMonitorLine = (line) =>
    /(mg\/dl|pg\/ml|ng\/ml|%|ratio|index|count|rbc|hba1c|ldl|hdl|triglyceride|vitamin|bilirubin|creatinine|urea|sgot|sgpt|cholesterol|monitor|recheck|track)/i.test(
      line
    );

  const isAvoidLine = (line) =>
    /(avoid|limit|cut down|junk|processed|fried|sugary|smoking|alcohol|sedentary|late-night|high-salt|trans fat|excess salt|excess sugar|refined carbs|ultra-processed)/i.test(
      line
    ) && !isStatMonitorLine(line);

  const derivePlaybookFromMetrics = (flaggedMetrics) => {
    const eat = [];
    const doThis = [];
    const watch = [];
    const avoid = [];

    const addMappedAdvice = (metric, status, bucket) => {
      const key = normalizeMetricKey(metric?.name);
      const category = normalizeCategory(metric?.category);

      if (bucket === 'eat') {
        if (/vitamin d/.test(key)) eat.push('Fatty fish, egg yolk, and fortified dairy with morning sunlight exposure.');
        if (/vitamin b12/.test(key)) eat.push('Add B12-rich foods like eggs, fish, dairy, and fortified cereals.');
        if (/hemoglobin|rbc|iron|ferritin/.test(key)) eat.push('Prioritize iron + folate foods: leafy greens, lentils, beans, dates, and citrus.');
        if (/hdl/.test(key)) eat.push('Increase nuts, seeds, olive oil, and omega-3 rich foods.');
        if (/albumin|protein/.test(key)) eat.push('Include adequate protein from pulses, dairy, eggs, fish, or lean meats.');
        if (/kidney|creatinine|urea/.test(key)) eat.push('Use balanced low-salt meals and hydration-focused foods.');
        if (/thyroid|tsh|t3|t4/.test(key)) eat.push('Keep iodine + selenium balanced with eggs, dairy, nuts, and seafood.');
        if (category === 'Lipid' && status !== 'normal') eat.push('Favor high-fiber meals: oats, legumes, vegetables, and whole grains.');
      }

      if (bucket === 'avoid') {
        if (/glucose|hba1c|sugar/.test(key)) avoid.push('Limit sugary drinks, desserts, and refined carbs.');
        if (/ldl|triglyceride|cholesterol|lipid/.test(key)) avoid.push('Avoid deep-fried, trans-fat, and ultra-processed foods.');
        if (/sgot|sgpt|bilirubin|liver/.test(key)) avoid.push('Avoid alcohol and unnecessary self-medication.');
        if (/creatinine|urea|kidney/.test(key)) avoid.push('Avoid high-salt packaged foods and painkiller overuse.');
        if (/uric acid/.test(key)) avoid.push('Reduce organ meats, red meat excess, and beer/alcohol.');
        if (/bp|pressure/.test(key)) avoid.push('Avoid excess sodium and packaged salty snacks.');
      }

      if (bucket === 'do') {
        if (/glucose|hba1c|sugar/.test(key)) doThis.push('Do 10-15 minutes of post-meal walking after major meals.');
        if (/ldl|triglyceride|cholesterol|lipid/.test(key)) doThis.push('Do at least 150 min/week cardio + 2 days strength training.');
        if (/vitamin d/.test(key)) doThis.push('Get consistent morning sunlight 15-20 minutes most days.');
        if (/hemoglobin|rbc|iron|ferritin/.test(key)) doThis.push('Track fatigue and recheck CBC/iron profile as advised.');
        if (/liver/.test(key)) doThis.push('Keep hydration steady and repeat liver profile on schedule.');
        if (/kidney|creatinine|urea/.test(key)) doThis.push('Maintain hydration and monitor BP regularly.');
      }
    };

    flaggedMetrics.forEach((metric) => {
      const status = String(metric?.status || '').toLowerCase();
      const valueText = metricValueText(metric);
      watch.push(`${textOrFallback(metric?.name)}: ${valueText} (${statusLabel(status)})`);

      const fixes = sanitizeAdviceList(metric?.naturalFix);
      fixes.forEach((line) => {
        if (isFoodLine(line)) eat.push(line);
        if (isPhysicalActionLine(line)) doThis.push(line);
        if (isAvoidLine(line)) avoid.push(line);
      });

      const foods = safeArray(metric?.foodsWhereFound).map((f) => String(f || '').trim()).filter(Boolean);
      foods.forEach((food) => eat.push(food));

      if (status === 'low' || status === 'deficient') {
        addMappedAdvice(metric, status, 'eat');
        addMappedAdvice(metric, status, 'do');
      }
      if (status === 'high' || status === 'borderline_high') {
        addMappedAdvice(metric, status, 'avoid');
        addMappedAdvice(metric, status, 'do');
      }
    });

    const fallbackEat = ['Leafy greens, legumes, and high-fiber whole foods matched to low markers.'];
    const fallbackDo = ['Daily walking, sleep consistency, and repeat tracking of non-normal markers.'];
    const fallbackWatch = ['Track all flagged markers in follow-up reports.'];
    const fallbackAvoid = ['Limit ultra-processed foods, excess sugar, and frequent alcohol/smoking patterns.'];

    return {
      eat: dedupe(eat).slice(0, 10).concat(dedupe(eat).length ? [] : fallbackEat),
      doThis: dedupe(doThis).slice(0, 10).concat(dedupe(doThis).length ? [] : fallbackDo),
      watch: dedupe(watch).slice(0, 10).concat(dedupe(watch).length ? [] : fallbackWatch),
      avoid: dedupe(avoid).slice(0, 10).concat(dedupe(avoid).length ? [] : fallbackAvoid),
      counts: {
        high: flaggedMetrics.filter((m) => String(m?.status).toLowerCase() === 'high').length,
        low: flaggedMetrics.filter((m) => String(m?.status).toLowerCase() === 'low').length,
        deficient: flaggedMetrics.filter((m) => String(m?.status).toLowerCase() === 'deficient').length,
        borderline: flaggedMetrics.filter((m) => String(m?.status).toLowerCase() === 'borderline_high').length,
      },
    };
  };

  const openModal = (metric) => {
    if (!modal) return;

    if (modalName) modalName.textContent = textOrFallback(metric?.name);
    if (modalValue) modalValue.textContent = metricValueText(metric);
    if (modalStatus) modalStatus.textContent = statusLabel(metric?.status);

    const aboutText = String(metric?.about ?? '').trim();
    const whyText = String(metric?.whyItMatters ?? '').trim();
    const combinedInsight = aboutText && whyText
      ? (aboutText.toLowerCase() === whyText.toLowerCase() ? aboutText : `${aboutText} ${whyText}`)
      : (aboutText || whyText || fallbackText);
    if (modalInsight) modalInsight.textContent = combinedInsight;

    const cleanedFixes = sanitizeAdviceList(metric?.naturalFix);
    renderList(modalFixes, cleanedFixes.length ? cleanedFixes : buildNaturalFixFallback(metric));

    const foods = safeArray(metric?.foodsWhereFound).map((item) => String(item ?? '').trim()).filter(Boolean);
    if (modalFoodsSection) modalFoodsSection.hidden = foods.length === 0;
    if (foods.length) {
      renderList(modalFoods, foods, false);
    } else if (modalFoods) {
      modalFoods.innerHTML = '';
    }

    modal.classList.remove('closing');
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
    isClosingModal = false;
  };

  const animateModalFromCard = (cardEl) => {
    if (!modalPanel || !cardEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    requestAnimationFrame(() => {
      const cardRect = cardEl.getBoundingClientRect();
      const panelRect = modalPanel.getBoundingClientRect();
      if (!cardRect.width || !cardRect.height || !panelRect.width || !panelRect.height) return;

      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;
      const panelCenterX = panelRect.left + panelRect.width / 2;
      const panelCenterY = panelRect.top + panelRect.height / 2;

      const deltaX = cardCenterX - panelCenterX;
      const deltaY = cardCenterY - panelCenterY;
      const scaleX = Math.max(0.2, Math.min(1, cardRect.width / panelRect.width));
      const scaleY = Math.max(0.2, Math.min(1, cardRect.height / panelRect.height));

      modalPanel.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`, opacity: 0.35, filter: 'blur(2px)' },
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, filter: 'blur(0)' },
        ],
        { duration: 420, easing: 'cubic-bezier(0.2, 0.9, 0.2, 1)', fill: 'both' }
      );
    });
  };

  const animateModalToCard = (cardEl) =>
    new Promise((resolve) => {
      if (!modalPanel || !cardEl || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        resolve();
        return;
      }

      const cardRect = cardEl.getBoundingClientRect();
      const panelRect = modalPanel.getBoundingClientRect();
      if (!cardRect.width || !cardRect.height || !panelRect.width || !panelRect.height) {
        resolve();
        return;
      }

      const cardCenterX = cardRect.left + cardRect.width / 2;
      const cardCenterY = cardRect.top + cardRect.height / 2;
      const panelCenterX = panelRect.left + panelRect.width / 2;
      const panelCenterY = panelRect.top + panelRect.height / 2;

      const deltaX = cardCenterX - panelCenterX;
      const deltaY = cardCenterY - panelCenterY;
      const scaleX = Math.max(0.2, Math.min(1, cardRect.width / panelRect.width));
      const scaleY = Math.max(0.2, Math.min(1, cardRect.height / panelRect.height));

      const animation = modalPanel.animate(
        [
          { transform: 'translate(0, 0) scale(1, 1)', opacity: 1, filter: 'blur(0)' },
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`, opacity: 0.25, filter: 'blur(2px)' },
        ],
        { duration: 340, easing: 'cubic-bezier(0.4, 0.0, 0.2, 1)', fill: 'both' }
      );
      animation.onfinish = () => resolve();
      animation.oncancel = () => resolve();
    });

  const closeModal = async () => {
    if (!modal?.classList.contains('open') || isClosingModal) return;
    isClosingModal = true;
    modal.classList.add('closing');
    await animateModalToCard(activeCard);
    modal.classList.remove('open', 'closing');
    document.body.style.overflow = '';
    activeCard = null;
    isClosingModal = false;
  };

  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (event) => {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && modal?.classList.contains('open')) closeModal();
  });

  const openCompareModal = () => {
    compareRole = null;
    if (compareStatus) compareStatus.textContent = t('Select one option to continue.', 'जारी रखने के लिए एक विकल्प चुनें।');
    compareModal?.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeCompareModal = () => {
    compareModal?.classList.remove('open');
    if (!modal?.classList.contains('open')) {
      document.body.style.overflow = '';
    }
  };

  const uploadCompareReport = async (file) => {
    const formData = new FormData();
    formData.append('report', file);
    const response = await fetch(ANALYZE_ENDPOINT, {
      method: 'POST',
      body: formData,
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload?.error || 'Upload failed');
    }
    return payload;
  };

  const renderCompareCards = (olderAnalysis, newerAnalysis, olderLabel, newerLabel) => {
    if (!compareSection || !compareSummary || !compareGrid || !compareOrder || !compareNote) return;

    const olderMetrics = safeArray(olderAnalysis?.metrics);
    const newerMetrics = safeArray(newerAnalysis?.metrics);
    const olderMap = new Map(olderMetrics.map((metric) => [normalizeMetricKey(metric?.name), metric]));
    const newerMap = new Map(newerMetrics.map((metric) => [normalizeMetricKey(metric?.name), metric]));

    const commonKeys = Array.from(olderMap.keys()).filter((key) => newerMap.has(key));
    const rows = commonKeys.map((key) => {
      const oldMetric = olderMap.get(key);
      const newMetric = newerMap.get(key);
      const oldSeverity = severityRank(oldMetric?.status);
      const newSeverity = severityRank(newMetric?.status);
      const oldNum = numericValue(oldMetric?.value);
      const newNum = numericValue(newMetric?.value);
      const unit = String(newMetric?.unit || oldMetric?.unit || '').trim();
      const hasNumeric = Number.isFinite(oldNum) && Number.isFinite(newNum);
      const delta = hasNumeric ? newNum - oldNum : NaN;

      let trend = 'unchanged';
      if (newSeverity < oldSeverity) trend = 'improved';
      if (newSeverity > oldSeverity) trend = 'worsened';

      return {
        name: textOrFallback(newMetric?.name || oldMetric?.name),
        oldText: metricValueText(oldMetric),
        newText: metricValueText(newMetric),
        delta,
        hasNumeric,
        unit,
        trend,
        oldStatus: statusLabel(oldMetric?.status),
        newStatus: statusLabel(newMetric?.status),
        score: trend === 'worsened' ? 3 : trend === 'improved' ? 2 : 1,
      };
    });

    rows.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const da = Number.isFinite(a.delta) ? Math.abs(a.delta) : 0;
      const db = Number.isFinite(b.delta) ? Math.abs(b.delta) : 0;
      return db - da;
    });

    const topRows = rows.slice(0, 24);
    const worsened = topRows.filter((row) => row.trend === 'worsened').length;
    const improved = topRows.filter((row) => row.trend === 'improved').length;
    const unchanged = topRows.filter((row) => row.trend === 'unchanged').length;

    compareSummary.innerHTML = `
      <article class="summary-panel"><h4>${t('Worsened', 'बिगड़ा')}</h4><ul><li>${worsened} ${t('markers', 'मार्कर')}</li></ul></article>
      <article class="summary-panel"><h4>${t('Improved', 'सुधरा')}</h4><ul><li>${improved} ${t('markers', 'मार्कर')}</li></ul></article>
      <article class="summary-panel"><h4>${t('Stable', 'स्थिर')}</h4><ul><li>${unchanged} ${t('markers', 'मार्कर')}</li></ul></article>
    `;

    compareGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    topRows.forEach((row) => {
      const card = document.createElement('article');
      card.className = `card metric-card ${row.trend === 'worsened' ? 'status-high' : row.trend === 'improved' ? 'status-normal' : 'status-unknown'}`;
      const deltaText = row.hasNumeric
        ? `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(2)}${row.unit ? ` ${row.unit}` : ''}`
        : t('No numeric delta', 'संख्यात्मक अंतर उपलब्ध नहीं');
      const trendLabel = row.trend === 'worsened'
        ? t('Worsened', 'बिगड़ा')
        : row.trend === 'improved'
          ? t('Improved', 'सुधरा')
          : t('Stable', 'स्थिर');

      card.innerHTML = `
        <div class="metric-top">
          <span class="metric-dot" aria-hidden="true">•</span>
          <span class="status-pill ${row.trend === 'worsened' ? 'status-high' : row.trend === 'improved' ? 'status-normal' : 'status-unknown'}">${trendLabel}</span>
        </div>
        <p>${escapeHtml(row.name)}</p>
        <span class="metric-value">${escapeHtml(olderLabel)}: ${escapeHtml(row.oldText)}</span>
        <span class="metric-value">${escapeHtml(newerLabel)}: ${escapeHtml(row.newText)}</span>
        <div class="profile-meta">${escapeHtml(t('Change', 'परिवर्तन'))}: ${escapeHtml(deltaText)}</div>
        <div class="profile-meta">${escapeHtml(t('Status', 'स्थिति'))}: ${escapeHtml(row.oldStatus)} → ${escapeHtml(row.newStatus)}</div>
      `;
      fragment.appendChild(card);
    });

    compareGrid.appendChild(fragment);
    compareOrder.textContent = `${olderLabel} → ${newerLabel}`;
    compareNote.textContent = t('Comparison is based on matched marker names across both reports.', 'तुलना दोनों रिपोर्ट के समान मार्कर नामों के आधार पर की गई है।');
    compareSection.hidden = false;
  };

  compareTrigger?.addEventListener('click', () => {
    if (!currentAnalysis) {
      window.alert(t('Please upload and analyze a current report first.', 'कृपया पहले वर्तमान रिपोर्ट अपलोड और विश्लेषित करें।'));
      return;
    }
    openCompareModal();
  });

  compareClose?.addEventListener('click', closeCompareModal);
  compareModal?.addEventListener('click', (event) => {
    if (event.target === compareModal) closeCompareModal();
  });

  compareChoices.forEach((button) => {
    button.addEventListener('click', () => {
      compareRole = button.dataset.compareChoice === 'old' ? 'old' : 'new';
      if (compareStatus) {
        compareStatus.textContent = compareRole === 'old'
          ? t('Select an older report PDF.', 'पुरानी रिपोर्ट की PDF चुनें।')
          : t('Select a newer report PDF.', 'नई रिपोर्ट की PDF चुनें।');
      }
      compareInput?.click();
    });
  });

  compareInput?.addEventListener('change', async (event) => {
    const files = event.target.files;
    if (!files || !files.length || !compareRole || !currentAnalysis) return;
    const file = files[0];
    if (file.type !== 'application/pdf') {
      if (compareStatus) compareStatus.textContent = t('Please select a PDF file.', 'कृपया PDF फ़ाइल चुनें।');
      return;
    }

    if (compareStatus) compareStatus.textContent = t('Uploading and analyzing report...', 'रिपोर्ट अपलोड और विश्लेषण हो रहा है...');
    try {
      const uploaded = await uploadCompareReport(file);
      const currentLabel = t('Current', 'वर्तमान');
      const uploadedLabel = compareRole === 'old' ? t('Old', 'पुरानी') : t('New', 'नई');

      if (compareRole === 'old') {
        renderCompareCards(uploaded, currentAnalysis, uploadedLabel, currentLabel);
      } else {
        renderCompareCards(currentAnalysis, uploaded, currentLabel, uploadedLabel);
      }

      if (compareStatus) compareStatus.textContent = t('Comparison generated successfully.', 'तुलना सफलतापूर्वक तैयार हो गई।');
      closeCompareModal();
    } catch (error) {
      if (compareStatus) compareStatus.textContent = `${t('Comparison failed', 'तुलना विफल')}: ${error?.message || t('Try again.', 'फिर से प्रयास करें।')}`;
    } finally {
      event.target.value = '';
    }
  });

  resetDataButton?.addEventListener('click', () => {
    const confirmed = window.confirm('Are you sure you want to clear all uploaded reports and analysis data?');
    if (!confirmed) return;

    localStorage.removeItem('analysis');
    localStorage.removeItem('analysisHistory');
    const reportKeys = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (/report|analysis/i.test(key)) reportKeys.push(key);
    }
    reportKeys.forEach((key) => localStorage.removeItem(key));
    window.location.reload();
  });

  const raw = localStorage.getItem('analysis');
  if (!raw) {
    noDataSection?.removeAttribute('hidden');
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
    currentAnalysis = data;
  } catch (_error) {
    noDataSection?.removeAttribute('hidden');
    return;
  }

  const metrics = safeArray(data?.metrics);
  if (!metrics.length) {
    noDataSection?.removeAttribute('hidden');
    return;
  }
  if (noDataSection) noDataSection.hidden = true;

  const patientName = normalizePatientName(data?.patientName);
  if (greetingTitle) {
    greetingTitle.textContent = patientName ? `Good morning, ${patientName}` : 'Good morning';
  }

  const flaggedMetrics = metrics
    .filter((metric) => String(metric?.status || '').trim().toLowerCase() !== 'normal')
    .sort((a, b) => normalizeProgress(b?.progress) - normalizeProgress(a?.progress));

  if (flaggedSection && flaggedGrid && flaggedCount) {
    flaggedGrid.innerHTML = '';
    flaggedSection.hidden = flaggedMetrics.length === 0;
    flaggedCount.textContent = `${flaggedMetrics.length} marker${flaggedMetrics.length === 1 ? '' : 's'}`;

    const flaggedFragment = document.createDocumentFragment();
    flaggedMetrics.forEach((metric) => {
      const sClass = statusClass(metric?.status);
      const sLabel = statusLabel(metric?.status);
      const progress = normalizeProgress(metric?.progress);

      const card = document.createElement('article');
      card.className = `card metric-card flagged-card ${sClass}`;
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="metric-top">
          <span class="metric-dot" aria-hidden="true">•</span>
          <span class="status-pill ${sClass}">${escapeHtml(sLabel)}</span>
        </div>
        <p>${escapeHtml(textOrFallback(metric?.name))}</p>
        <span class="metric-value">${escapeHtml(metricValueText(metric))}</span>
        <div class="mini-bar"><span style="width:${progress}%; background:${statusBarColor(metric?.status)}"></span></div>
      `;
      card.addEventListener('click', () => {
        activeCard = card;
        openModal(metric);
        animateModalFromCard(card);
      });
      flaggedFragment.appendChild(card);
    });
    flaggedGrid.appendChild(flaggedFragment);
  }

  const playbook = derivePlaybookFromMetrics(flaggedMetrics);
  renderList(playbookEat, playbook.eat, false, false);
  renderList(playbookDo, playbook.doThis, false, false);
  renderList(playbookWatch, playbook.watch, false, false);
  renderList(playbookAvoid, playbook.avoid, false, false);

  if (playbookDerived) {
    const totalFlagged = flaggedMetrics.length;
    playbookDerived.textContent = `Derived from ${totalFlagged} markers`;
  }
  if (playbookSummary) {
    playbookSummary.textContent =
      `Built from ${playbook.counts.high} high, ${playbook.counts.low} low, ${playbook.counts.deficient} deficient, and ${playbook.counts.borderline} borderline-high markers.`;
  }

  const playbookAvailable = flaggedMetrics.length > 0;
  if (playbookSection) {
    playbookSection.hidden = true;
    playbookSection.classList.remove('is-open');
  }
    if (playbookLaunch && flaggedSection) {
      playbookLaunch.hidden = !playbookAvailable;
      playbookLaunch.setAttribute('aria-expanded', 'false');
      playbookLaunch.textContent = t('Open Stay-Healthy Playbook', 'स्टे-हेल्दी प्लेबुक खोलें');
      if (!playbookLaunch.dataset.bound) {
        playbookLaunch.addEventListener('click', () => {
          const opening = Boolean(playbookSection?.hidden);
          syncPlaybookSection(opening);
        });
        playbookLaunch.dataset.bound = 'true';
      }
    }

  const grouped = new Map(categories.map((category) => [category, []]));
  metrics.forEach((metric) => {
    const category = normalizeCategory(metric?.category);
    grouped.get(category).push(metric);
  });

  if (categoryContainer) {
    categoryContainer.innerHTML = '';
    const sectionsFragment = document.createDocumentFragment();

    categories.forEach((category, categoryIndex) => {
      const categoryMetrics = grouped.get(category);
      if (!categoryMetrics.length) return;

      const section = document.createElement('section');
      const openByDefault = categoryIndex === 0;
      section.className = `category-section revealed${openByDefault ? ' open' : ''}`;

      const heading = document.createElement('button');
      heading.type = 'button';
      heading.className = 'category-title category-toggle';
      heading.innerHTML = `
        <span>${category}</span>
        <span class="category-count">${categoryMetrics.length}</span>
        <span class="category-chevron" aria-hidden="true">v</span>
      `;

      const grid = document.createElement('div');
      grid.className = 'dashboard-grid category-grid';
      if (!openByDefault) grid.hidden = true;

      const cardsFragment = document.createDocumentFragment();
      categoryMetrics.forEach((metric) => {
        const sClass = statusClass(metric?.status);
        const sLabel = statusLabel(metric?.status);
        const progress = normalizeProgress(metric?.progress);

        const card = document.createElement('article');
        card.className = `card metric-card ${sClass}`;
        card.style.cursor = 'pointer';

        const top = document.createElement('div');
        top.className = 'metric-top';

        const icon = document.createElement('span');
        icon.className = 'metric-dot';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '•';

        const pill = document.createElement('span');
        pill.className = `status-pill ${sClass}`;
        pill.textContent = sLabel;

        const title = document.createElement('p');
        title.textContent = textOrFallback(metric?.name);

        const valueEl = document.createElement('span');
        valueEl.className = 'metric-value';
        valueEl.textContent = metricValueText(metric);

        const barWrap = document.createElement('div');
        barWrap.className = 'mini-bar';
        const bar = document.createElement('span');
        bar.style.width = `${progress}%`;
        bar.style.background = statusBarColor(metric?.status);

        barWrap.appendChild(bar);
        top.appendChild(icon);
        top.appendChild(pill);
        card.appendChild(top);
        card.appendChild(title);
        card.appendChild(valueEl);
        card.appendChild(barWrap);

        card.addEventListener('click', () => {
          activeCard = card;
          openModal(metric);
          animateModalFromCard(card);
        });

        cardsFragment.appendChild(card);
      });

      grid.appendChild(cardsFragment);
      section.appendChild(heading);
      section.appendChild(grid);
      sectionsFragment.appendChild(section);

      heading.addEventListener('click', () => {
        const isOpen = section.classList.contains('open');
        section.classList.toggle('open', !isOpen);
        grid.hidden = isOpen;
      });
    });

    categoryContainer.appendChild(sectionsFragment);
  }

});
