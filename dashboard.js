document.addEventListener('DOMContentLoaded', () => {
  const categoryContainer = document.querySelector('[data-category-sections]');
  const noDataSection = document.querySelector('[data-no-analysis]');
  const greetingTitle = document.querySelector('[data-greeting-title]');
  const flaggedSection = document.querySelector('[data-flagged-section]');
  const flaggedGrid = document.querySelector('[data-flagged-grid]');
  const flaggedCount = document.querySelector('[data-flagged-count]');
  const summarySection = document.querySelector('[data-summary-section]');

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

  const summaryEat = document.querySelector('[data-summary-eat]');
  const summaryAttention = document.querySelector('[data-summary-attention]');
  const summaryDoThis = document.querySelector('[data-summary-dothis]');
  const summaryAvoid = document.querySelector('[data-summary-avoid]');
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

  const renderList = (target, items, fallback = true) => {
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
      li.className = 'modal-list-item';
      li.style.setProperty('--item-index', String(index));
      li.textContent = item;
      fragment.appendChild(li);
    });
    target.appendChild(fragment);
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

    renderList(modalFixes, metric?.naturalFix);

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

  const summary = data?.summary || {};
  const listFromSummary = (field) => safeArray(summary?.[field]).map((item) => String(item || '').trim()).filter(Boolean);

  const foodsFromMetrics = (() => {
    const result = [];
    metrics.forEach((metric) => {
      safeArray(metric?.foodsWhereFound).forEach((food) => {
        const text = String(food || '').trim();
        if (text && !result.includes(text)) result.push(text);
      });
    });
    return result;
  })();

  const watchFromMetrics = flaggedMetrics
    .slice(0, 10)
    .map((metric) => `${metric.name}: ${metric.value}${metric.unit ? ` ${metric.unit}` : ''} (${statusLabel(metric.status)})`);
  const fixesFromFlagged = dedupe(
    flaggedMetrics
      .slice(0, 12)
      .flatMap((metric) => safeArray(metric?.naturalFix))
      .map((item) => String(item || '').trim())
      .filter(Boolean)
  );

  const eatRaw = listFromSummary('whatToEat')
    .concat(listFromSummary('doThis'))
    .concat(foodsFromMetrics);
  const doRaw = listFromSummary('whatToDo').concat(listFromSummary('doThis'));
  const watchRaw = listFromSummary('watchCarefully')
    .concat(listFromSummary('attention'))
    .concat(watchFromMetrics);
  const avoidRaw = listFromSummary('whatToAvoid').concat(listFromSummary('avoid'));

  const eatList = dedupe(eatRaw.filter(isFoodLine)).slice(0, 8);
  const doListBase = dedupe(doRaw.filter(isPhysicalActionLine));
  const doListFromFixes = fixesFromFlagged.filter(isPhysicalActionLine);
  const doFallback = [
    'Walk 30 minutes daily at moderate pace.',
    'Do strength training 2-3 times per week.',
    'Keep a consistent 7-8 hour sleep routine.',
    'Do light post-meal movement for 10-15 minutes.',
  ];
  const doList = dedupe([...doListBase, ...doListFromFixes, ...doFallback]).slice(0, 8);
  const watchList = dedupe(watchRaw.filter(isStatMonitorLine)).slice(0, 8);
  const avoidFallback = [
    'Avoid ultra-processed junk food and sugary drinks.',
    'Limit deep-fried foods and trans-fat-heavy snacks.',
    'Avoid smoking/vaping and frequent alcohol use.',
    'Avoid a sedentary routine and late-night overeating.',
  ];
  const avoidList = dedupe([...avoidRaw.filter(isAvoidLine), ...avoidFallback]).slice(0, 8);

  if (summarySection) {
    summarySection.hidden = !(eatList.length || doList.length || watchList.length || avoidList.length);
  }
  renderList(summaryEat, eatList, false);
  renderList(summaryDoThis, doList, false);
  renderList(summaryAttention, watchList, false);
  renderList(summaryAvoid, avoidList, false);

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
