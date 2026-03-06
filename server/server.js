import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import Groq from 'groq-sdk';
import { PDFParse } from 'pdf-parse';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import tesseract from 'tesseract.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const { recognize } = tesseract;
let ocrEnabled = process.env.ENABLE_OCR === 'true';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_ROOT = path.resolve(__dirname, '..');

const GROQ_API_KEY = String(process.env.GROQ_API_KEY || '').trim();
const groq = GROQ_API_KEY ? new Groq({ apiKey: GROQ_API_KEY }) : null;
const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

const corsOriginEnv = String(process.env.CORS_ORIGIN || '').trim();
const allowedOrigins = corsOriginEnv
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = !allowedOrigins.length || allowedOrigins.includes('*');

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

const upload = multer({
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const fileName = String(file?.originalname || '').toLowerCase();
    const isPdf = file?.mimetype === 'application/pdf' || fileName.endsWith('.pdf');
    if (isPdf) return callback(null, true);
    return callback(new Error('Only PDF uploads are allowed.'));
  },
});

app.use(
  cors({
    origin(origin, callback) {
      // Allow same-origin/non-browser requests (no Origin header).
      if (!origin) return callback(null, true);
      if (allowAllOrigins || allowedOrigins.includes(origin)) return callback(null, true);
      // Reject silently for non-allowed browser origins.
      return callback(null, false);
    },
    methods: ['GET', 'POST'],
  })
);

app.use('/server', (_req, res) => {
  return res.status(404).json({ error: 'Not found' });
});
app.use(express.static(FRONTEND_ROOT, { index: false, dotfiles: 'ignore' }));

app.get('/api/health', (_req, res) => {
  return res.json({
    status: 'ok',
    service: 'swasthsetu-api',
    timestamp: new Date().toISOString(),
  });
});

app.get(['/', '/index.html'], (_req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
});
app.get(['/dashboard', '/dashboard.html'], (_req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'dashboard.html'));
});
app.get(['/vault', '/vault.html'], (_req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'vault.html'));
});
app.get(['/about', '/about.html'], (_req, res) => {
  res.sendFile(path.join(FRONTEND_ROOT, 'about.html'));
});

const METRIC_CATEGORIES = new Set(['Blood', 'Liver', 'Kidney', 'Lipid', 'Thyroid', 'Vitamin', 'Other']);
const METRIC_STATUSES = new Set(['low', 'normal', 'borderline_high', 'high', 'deficient']);
const METADATA_LINE_PATTERN =
  /^(barcode no|patient name|age\/gender|refered by|ref\. lab|client code|client add\.|page \d+ of|-- \d+ of|test name|sample type|department|this test was performed|lab no|reg date|report date|sample coll|sample rec|remark|comments?:|kindly correlate|reference range|referrance range|nirogyam-c|lipid profile|complete blood count)/i;
const METHOD_LINE_PATTERN =
  /^(calculated|flowcytometry|flow cytometry|impedance|hexokinase|colorimetric|chod-pap enzymatic|homogeneous enz\.?colorimetric|cyanide free|modified westergren|hplc|electro chemi luminescent immuno assay|electro ?chemiluminescent immuno assay)$/i;

const cleanList = (items) =>
  Array.isArray(items)
    ? items.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

const normalizeWhitespace = (text) =>
  String(text || '')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const DERIVED_METRIC_PATTERNS = [
  /\bindex\b/i,
  /\bratio\b/i,
  /\bmentzer\b/i,
  /\brdwi\b/i,
  /\bgreen and king\b/i,
  /\bnlr\b/i,
  /\blmr\b/i,
  /\bplr\b/i,
  /\bcalculated\b/i,
  /\baverage glucose\b/i,
  /\bnon-hdl\b/i,
];

const isDerivedMetric = (name) => DERIVED_METRIC_PATTERNS.some((pattern) => pattern.test(String(name || '')));

const isFoodApplicable = (metric) => {
  const name = String(metric?.name || '').toLowerCase();
  if (!name) return false;
  if (isDerivedMetric(name)) return false;
  if (/^urine\b|pus cells|epithelial cells|casts|crystals|bacteria|leukocytes|nitrate|bilirubin|ketones|specific gravity|ph\b/.test(name)) {
    return false;
  }
  if (/count|ratio|index|esr|egfr|hba1c|average glucose/.test(name)) return false;
  if (/vitamin|b12|folate|vitamin d/.test(name)) return true;
  if (/calcium|phosphorus|sodium|potassium|chloride|magnesium|zinc|iron/.test(name)) return true;
  if (/cholesterol|triglyceride|hdl|ldl|vldl|lipid|glucose/.test(name)) return true;
  if (/haemoglobin|hemoglobin|rbc|mcv|mch|mchc|hct/.test(name)) return true;
  return false;
};

const inferCategory = (name) => {
  const key = String(name || '').toLowerCase();
  if (/bilirubin|sgot|sgpt|alt|ast|albumin|globulin|a\/g|alk\.?phos|gamma/.test(key)) return 'Liver';
  if (/urea|creatinine|uric|egfr|bun/.test(key)) return 'Kidney';
  if (/cholesterol|triglyceride|hdl|ldl|vldl|non-hdl|chol \/ hdl|lipid/.test(key)) return 'Lipid';
  if (/tsh|t3|t4|thyroid/.test(key)) return 'Thyroid';
  if (/vitamin|b12|folate|hydroxy/.test(key)) return 'Vitamin';
  if (
    /haemoglobin|hemoglobin|tlc|leucocyte|lymphocyte|neutrophil|eosinophil|monocyte|basophil|rbc|hct|mcv|mch|mchc|platelet|rdw|esr|mentzer|rdwi|green and king|nlr|lmr|plr/.test(
      key
    )
  ) {
    return 'Blood';
  }
  return 'Other';
};

const inferAbout = (name, category) => {
  const metricName = String(name || 'This marker').trim();
  if (isDerivedMetric(metricName)) {
    return `${metricName} is a derived clinical statistic calculated from primary lab measurements.`;
  }
  if (/urine/i.test(metricName)) {
    return `${metricName} reflects urinary chemistry or microscopy and helps screen kidney, hydration, metabolic, or infection-related changes.`;
  }
  if (/electrolyte|sodium|potassium|chloride|calcium|phosphorus/i.test(metricName)) {
    return `${metricName} reflects electrolyte and mineral balance important for nerve, muscle, and fluid regulation.`;
  }
  const byCategory = {
    Blood: `${metricName} is part of your blood profile and helps evaluate oxygen carrying capacity, immunity, or blood cell balance.`,
    Liver: `${metricName} is used to assess liver cell health, bile flow, and protein processing.`,
    Kidney: `${metricName} helps evaluate kidney filtration and waste clearance from blood.`,
    Lipid: `${metricName} is part of your lipid profile and helps estimate long-term cardiovascular risk.`,
    Thyroid: `${metricName} reflects thyroid hormone function and metabolic regulation.`,
    Vitamin: `${metricName} reflects micronutrient status important for metabolism, immunity, and tissue health.`,
    Other: `${metricName} is a clinical lab marker used to assess metabolic or organ-level health.`,
  };
  return byCategory[category] || byCategory.Other;
};

const inferWhyItMatters = (name, category, status) => {
  const metricName = String(name || 'This marker').trim();
  if (isDerivedMetric(metricName)) {
    return `${metricName} is used to interpret trends and risk context; maintain core blood and metabolic health to keep it stable.`;
  }
  if (/urine/i.test(metricName)) {
    return `Abnormal ${metricName} can indicate hydration imbalance, urinary tract inflammation, metabolic stress, or kidney-related changes.`;
  }
  if (/electrolyte|sodium|potassium|chloride|calcium|phosphorus/i.test(metricName)) {
    return `Imbalance in ${metricName} may affect hydration, cardiovascular rhythm, muscle function, and neurometabolic stability.`;
  }
  const statusText = String(status || 'abnormal').replace('_', ' ');
  return `${metricName} is ${statusText}. This can affect ${category.toLowerCase()}-related health and should be interpreted with clinical context.`;
};

const parseReferenceRangeStatus = (value, rangeText, metricName) => {
  if (!Number.isFinite(value)) return 'normal';
  const range = String(rangeText || '').trim();
  const name = String(metricName || '').toLowerCase();

  if (/deficiency\s*:\s*<\s*(\d+(?:\.\d+)?)/i.test(range)) {
    const m = range.match(/deficiency\s*:\s*<\s*(\d+(?:\.\d+)?)/i);
    const deficiencyCutoff = Number(m?.[1]);
    if (Number.isFinite(deficiencyCutoff) && value < deficiencyCutoff) return 'deficient';
  }

  const between = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (between) {
    const low = Number(between[1]);
    const high = Number(between[2]);
    if (value < low) return /vitamin d/.test(name) ? 'deficient' : 'low';
    if (value > high) {
      const span = Math.max(high - low, 0.0001);
      return value <= high + span * 0.15 ? 'borderline_high' : 'high';
    }
    return 'normal';
  }

  const lt = range.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) {
    const cutoff = Number(lt[1]);
    if (value > cutoff) return value <= cutoff * 1.15 ? 'borderline_high' : 'high';
    return 'normal';
  }

  const gt = range.match(/>\s*(\d+(?:\.\d+)?)/);
  if (gt) {
    const cutoff = Number(gt[1]);
    if (value < cutoff) return 'low';
    return 'normal';
  }

  if (/vitamin d/.test(name)) {
    if (value < 20) return 'deficient';
    if (value < 30) return 'low';
  }

  return 'normal';
};

const statusToProgress = (status, value, rangeText) => {
  const s = String(status || '').toLowerCase();
  if (s === 'normal') return 75;
  if (s === 'borderline_high') return 58;
  if (s === 'high') return 35;
  if (s === 'low') return 42;
  if (s === 'deficient') return 25;

  const range = String(rangeText || '');
  const between = range.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (between && Number.isFinite(value)) {
    const low = Number(between[1]);
    const high = Number(between[2]);
    if (high > low) return Math.min(100, Math.max(0, ((value - low) / (high - low)) * 100));
  }
  return 50;
};

const ensureMinimumList = (items, minimum, fallbackItems) => {
  const output = [...cleanList(items)];
  cleanList(fallbackItems).forEach((item) => {
    if (output.length < minimum && !output.includes(item)) output.push(item);
  });
  return output.slice(0, Math.max(minimum, output.length));
};

const fallbackForMetric = (metric) => {
  const metricName = String(metric?.name || 'this marker').trim();
  const key = metricName.toLowerCase();
  const foodApplicable = isFoodApplicable(metric);

  if (isDerivedMetric(metricName)) {
    return {
      fixes: [
        'Maintain balanced nutrition, sleep, hydration, and regular exercise.',
        'Track this trend with repeat testing instead of reacting to one isolated value.',
      ],
      foods: [],
    };
  }

  if (/vitamin d/.test(key)) {
    return {
      fixes: [
        'Get safe early-morning sunlight exposure 15-30 minutes most days.',
        'Discuss Vitamin D3 supplementation dose with your clinician.',
        'Maintain adequate calcium intake with balanced meals if advised clinically.',
      ],
      foods: ['Fatty fish (salmon, sardines, mackerel)', 'Egg yolks', 'Fortified milk or cereals'],
    };
  }

  if (/vitamin b12|cobalamin/.test(key)) {
    return {
      fixes: ['Maintain adequate Vitamin B12 intake in routine diet.', 'Review B12 supplements with your clinician if intake is low.'],
      foods: ['Fish and chicken', 'Eggs and dairy', 'Fortified cereals'],
    };
  }

  if (/haemoglobin|hemoglobin|rbc|hct|mcv|mch|mchc/.test(key)) {
    return {
      fixes: ['Support blood health with adequate iron, folate, and Vitamin B12 intake.', 'Pair iron-focused meals with Vitamin C intake to improve absorption.'],
      foods: ['Lean meats and legumes', 'Spinach and leafy greens', 'Citrus fruits'],
    };
  }

  if (/ldl|cholesterol|triglyceride|lipid/.test(key)) {
    return {
      fixes: ['Increase fiber intake and reduce ultra-processed fats.', 'Add regular aerobic exercise most days of the week.'],
      foods: ['Oats and barley', 'Nuts and seeds', 'Fatty fish or olive oil'],
    };
  }

  if (/glucose|hba1c/.test(key)) {
    return {
      fixes: ['Prefer low-glycemic, high-fiber meals and consistent meal timing.', 'Include daily physical activity after meals when possible.'],
      foods: ['Whole grains', 'Legumes', 'Non-starchy vegetables'],
    };
  }

  if (/creatinine|urea|egfr|bun|uric/.test(key)) {
    return {
      fixes: ['Maintain hydration and avoid unnecessary high-protein overloading.', 'Review kidney-safe diet choices with your clinician if needed.'],
      foods: [],
    };
  }

  if (/sgot|sgpt|ast|alt|bilirubin|albumin|globulin|alk/.test(key)) {
    return {
      fixes: ['Limit alcohol and highly processed food intake.', 'Maintain a balanced, liver-supportive diet with adequate protein.'],
      foods: ['Leafy vegetables', 'Whole grains', 'Lean proteins'],
    };
  }

  if (/sodium|potassium|chloride|calcium|phosphorus/.test(key)) {
    return {
      fixes: ['Keep hydration steady and avoid extreme intake swings.', 'Balance electrolytes through varied whole-food meals.'],
      foods: ['Fruits and vegetables', 'Dairy or fortified alternatives', 'Nuts and seeds'],
    };
  }

  return {
    fixes: [
      `Review diet and lifestyle steps that specifically improve ${metricName}.`,
      `Discuss targeted supplementation (for example vitamin or mineral intake) for ${metricName} with your clinician.`,
    ],
    foods: foodApplicable ? ['Balanced whole-food meals', 'Adequate protein and fiber intake', 'Micronutrient-rich fruits and vegetables'] : [],
  };
};

const normalizeMetrics = (metrics) => {
  return (Array.isArray(metrics) ? metrics : []).map((metric) => ({
    name: String(metric?.name || '').trim() || 'Unknown',
    value: Number.isFinite(Number(metric?.value)) ? Number(metric.value) : 0,
    unit: String(metric?.unit || '').trim(),
    status: METRIC_STATUSES.has(String(metric?.status || '').trim())
      ? String(metric.status).trim()
      : 'normal',
    progress: Number.isFinite(Number(metric?.progress))
      ? Math.min(Math.max(Number(metric.progress), 0), 100)
      : 0,
    category: METRIC_CATEGORIES.has(String(metric?.category || '').trim())
      ? String(metric.category).trim()
      : 'Other',
    about: String(metric?.about || '').trim() || 'Information unavailable',
    whyItMatters: String(metric?.whyItMatters || '').trim() || 'Information unavailable',
    naturalFix: cleanList(metric?.naturalFix),
    foodsWhereFound: cleanList(metric?.foodsWhereFound),
  }));
};

const mergeMetric = (a, b) => {
  const aHasValue = Number.isFinite(Number(a.value)) && Number(a.value) !== 0;
  const bHasValue = Number.isFinite(Number(b.value)) && Number(b.value) !== 0;
  const preferBValue =
    (!aHasValue && bHasValue) || (aHasValue && bHasValue && String(b.name).length >= String(a.name).length);

  const preferredUnit = (() => {
    if (preferBValue && b.unit) return b.unit;
    if (!preferBValue && a.unit) return a.unit;
    return b.unit || a.unit;
  })();

  return {
    name: String(a.name || '').length >= String(b.name || '').length ? a.name : b.name,
    value: preferBValue ? b.value : a.value,
    unit: preferredUnit,
    status: a.status === 'normal' && b.status !== 'normal' ? b.status : a.status,
    progress: Math.max(a.progress || 0, b.progress || 0),
    category: a.category !== 'Other' ? a.category : b.category,
    about: a.about !== 'Information unavailable' ? a.about : b.about,
    whyItMatters: a.whyItMatters !== 'Information unavailable' ? a.whyItMatters : b.whyItMatters,
    naturalFix: [...new Set([...cleanList(a.naturalFix), ...cleanList(b.naturalFix)])],
    foodsWhereFound: [...new Set([...cleanList(a.foodsWhereFound), ...cleanList(b.foodsWhereFound)])],
  };
};

const dedupeMetrics = (metrics) => {
  const byName = new Map();
  for (const metric of metrics) {
    const normalizedName = String(metric.name || '').trim().toLowerCase();
    const normalizedCategory = String(metric.category || 'Other').trim().toLowerCase() || 'other';
    const key = `${normalizedCategory}::${normalizedName}`;
    if (!key) continue;
    if (!byName.has(key)) {
      byName.set(key, metric);
    } else {
      byName.set(key, mergeMetric(byName.get(key), metric));
    }
  }
  return [...byName.values()];
};

const extractPdfText = async (buffer) => {
  const parser = new PDFParse({ data: buffer });
  try {
    const out = await parser.getText();
    return normalizeWhitespace(out?.text || '');
  } finally {
    await parser.destroy();
  }
};

const extractPatientName = (text) => {
  const source = String(text || '');
  const match = source.match(/Patient Name\s*:?[ \t]*([^\n\r]+)/i);
  if (!match) return '';

  let name = String(match[1] || '')
    .replace(/Reg Date.*$/i, '')
    .replace(/^Mr\.?\s*/i, '')
    .replace(/^Ms\.?\s*/i, '')
    .replace(/^Mrs\.?\s*/i, '')
    .replace(/^Miss\s*/i, '')
    .trim();

  if (!name) return '';
  name = name.replace(/\s+/g, ' ');
  return name;
};

const uploadRateWindowMs = Number(process.env.UPLOAD_RATE_WINDOW_MS || 60_000);
const uploadRateMax = Number(process.env.UPLOAD_RATE_MAX || 20);
const uploadRateState = new Map();

const checkUploadRateLimit = (req) => {
  const now = Date.now();
  const key = String(req.ip || req.socket?.remoteAddress || 'unknown');
  const state = uploadRateState.get(key);
  if (!state || now >= state.resetAt) {
    uploadRateState.set(key, { count: 1, resetAt: now + uploadRateWindowMs });
    return { allowed: true };
  }
  if (state.count >= uploadRateMax) {
    return { allowed: false, retryAfterMs: Math.max(0, state.resetAt - now) };
  }
  state.count += 1;
  return { allowed: true };
};

const runOcrForPage = async (page) => {
  const viewport = page.getViewport({ scale: 2 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext('2d');

  await page.render({ canvasContext: ctx, viewport }).promise;
  const pngBuffer = canvas.toBuffer('image/png');
  const result = await recognize(pngBuffer, 'eng');
  return String(result?.data?.text || '').trim();
};

const extractPageTextsWithOcr = async (buffer) => {
  const doc = await getDocument({
    data: new Uint8Array(buffer),
    // Node server path: run without worker to avoid pdfjs API/worker version mismatches.
    disableWorker: true,
  }).promise;
  const pages = [];
  const ocrPages = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
    const page = await doc.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => String(item?.str || '').trim())
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    let merged = pageText;

    // OCR only if native text looks weak (scan/image page).
    if (pageText.length < 80) {
      try {
        const ocrText = await runOcrForPage(page);
        if (ocrText.length > 30) {
          ocrPages.push(pageNumber);
          merged = `${pageText}\n${ocrText}`.trim();
        }
      } catch (ocrError) {
        console.error(`OCR failed for page ${pageNumber}:`, ocrError?.message || ocrError);
      }
    }

    pages.push({ pageNumber, text: merged });
  }

  return pages;
};

const chunkPageTexts = (pages, maxChars = 6500) => {
  const chunks = [];
  let current = '';
  let pageSpan = [];

  for (const page of pages) {
    const block = `\n[Page ${page.pageNumber}]\n${page.text || ''}\n`;
    if ((current + block).length > maxChars && current.trim()) {
      chunks.push({ text: current, pages: [...pageSpan] });
      current = block;
      pageSpan = [page.pageNumber];
    } else {
      current += block;
      pageSpan.push(page.pageNumber);
    }
  }

  if (current.trim()) chunks.push({ text: current, pages: [...pageSpan] });
  return chunks;
};

const chunkText = (text, maxChars = 7000) => {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const line of lines) {
    if ((current + '\n' + line).length > maxChars && current.trim()) {
      chunks.push(current.trim());
      current = line;
    } else {
      current = `${current}\n${line}`.trim();
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks;
};

const parseMetricsFromText = (text) => {
  const lines = normalizeWhitespace(text)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const metrics = [];
  let pendingName = '';
  const validUnitPattern =
    /^(%|ratio|index|mmol\/l|mg\/dl|mg\/dL|pg\/ml|pg\/mL|gm\/dl|g\/dl|fl|pg|iu\/l|iu\/L|ng\/ml|ng\/mL|th\/cumm|thou\/μl|thou\/uL|\/cumm|millions\/cmm|mm\/hr|mL\/min\/1\.73\s*m2|\/hpf|\/lpf)$/i;

  const inlineMetricPattern =
    /^([A-Za-z][A-Za-z0-9\s\-/.(),%&+']{1,80}?)\s+([<>]?\d+(?:\.\d+)?)\s+([A-Za-z%/0-9.µμ^()-]+)(?:\s+(.+))?$/;
  const valueUnitPattern = /^([<>]?\d+(?:\.\d+)?)\s+([A-Za-z%/0-9.µμ^()-]+)(?:\s+(.+))?$/;

  const cleanMetricName = (name) =>
    String(name || '')
      .replace(/\.+$/, '')
      .replace(/\s{2,}/g, ' ')
      .trim();

  const pushMetric = (name, valueRaw, unitRaw, rangeRaw) => {
    const metricName = cleanMetricName(name);
    const value = Number(String(valueRaw || '').replace(/[<>]/g, ''));
    const unit = String(unitRaw || '').trim();
    if (!metricName || !Number.isFinite(value) || !unit) return;
    if (!validUnitPattern.test(unit)) return;
    if (METADATA_LINE_PATTERN.test(metricName) || METHOD_LINE_PATTERN.test(metricName)) return;
    if (/^(ages?|adults?|desirable|borderline high|high|very high|normal|pre-diabetic|diabetic|insufficient|sufficient|deficiency)/i.test(metricName)) return;
    if (metricName.includes(':')) return;
    if (String(rangeRaw || '').length > 120) return;

    const category = inferCategory(metricName);
    const status = parseReferenceRangeStatus(value, rangeRaw, metricName);
    const progress = statusToProgress(status, value, rangeRaw);

    metrics.push({
      name: metricName,
      value,
      unit,
      status,
      progress,
      category,
      about: inferAbout(metricName, category),
      whyItMatters: inferWhyItMatters(metricName, category, status),
      naturalFix: [],
      foodsWhereFound: [],
    });
  };

  for (const line of lines) {
    if (METADATA_LINE_PATTERN.test(line)) {
      pendingName = '';
      continue;
    }

    const inlineMatch = line.match(inlineMetricPattern);
    if (inlineMatch) {
      const [, metricName, value, unit, range] = inlineMatch;
      pushMetric(metricName, value, unit, range);
      pendingName = '';
      continue;
    }

    const valueUnitMatch = line.match(valueUnitPattern);
    if (valueUnitMatch) {
      if (pendingName) {
        const [, value, unit, range] = valueUnitMatch;
        pushMetric(pendingName, value, unit, range);
      }
      pendingName = '';
      continue;
    }

    if (METHOD_LINE_PATTERN.test(line)) continue;
    if (/^[\d\s.,%-]+$/.test(line)) continue;
    if (line.length > 90) continue;
    if (line.includes(':')) continue;
    if (!/[A-Za-z]/.test(line)) continue;
    pendingName = line;
  }

  return dedupeMetrics(normalizeMetrics(metrics));
};

const extractMetricsFromChunk = async (chunk, chunkIndex) => {
  if (!groq) return [];
  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical laboratory report analyzer. Extract ALL lab parameters from this chunk. Return ONLY valid JSON. Do not infer values; use only explicit report numbers and units. Explanations must be metric-specific and not generic.',
        },
        {
          role: 'user',
          content: `
Extract metrics from ONLY this chunk of a medical report.

Return JSON in this structure:
{
  "metrics": [
    {
      "name": "",
      "value": 0,
      "unit": "",
      "status": "low | normal | borderline_high | high | deficient",
      "progress": 0,
      "category": "Blood | Liver | Kidney | Lipid | Thyroid | Vitamin | Other",
      "about": "",
      "whyItMatters": "",
      "naturalFix": [],
      "foodsWhereFound": []
    }
  ]
}

Rules:
- Do not skip any metric in this chunk.
- If a metric appears in a heading and result line, use the numeric result line.
- Never map urine units like /hpf or /lpf to blood metrics unless the metric itself is a urine parameter.
- If a metric has no visible numeric value, set value to 0 and unit to "".
- For "about" and "whyItMatters", write specific text for that exact metric name and category; never reuse identical generic lines across many metrics.
- For category "Other", still produce precise metric-specific explanation (not placeholder text).

Chunk ${chunkIndex + 1}:
${chunk}
`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    return normalizeMetrics(parsed?.metrics);
  } catch (error) {
    console.error(`Chunk extraction failed (${chunkIndex + 1}):`, error?.message || error);
    return [];
  }
};

const enrichMetricGuidance = async (metrics) => {
  const localGuided = metrics.map((metric) => {
    const metricFallback = fallbackForMetric(metric);
    return {
      ...metric,
      naturalFix: ensureMinimumList(metric.naturalFix, 2, metricFallback.fixes),
      foodsWhereFound: [],
    };
  });

  const abnormalSubset = localGuided.filter((metric) => metric.status !== 'normal').slice(0, 18);
  if (!abnormalSubset.length) return localGuided;
  if (!groq) return localGuided;

  let enrichmentByName = new Map();
  try {
    const enrichmentInput = abnormalSubset.map((metric) => ({
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      status: metric.status,
      category: metric.category,
      about: metric.about,
      whyItMatters: metric.whyItMatters,
    }));

    const enrichmentCompletion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical nutrition and preventive health assistant. Return ONLY valid JSON.',
        },
        {
          role: 'user',
          content: `
Generate metric-specific lifestyle and food guidance for each metric in the input.
Do not use identical generic lines for every metric.

Return JSON in this structure:
{
  "items": [
    {
      "name": "",
      "naturalFix": [],
      "foodsWhereFound": []
    }
  ]
}

Rules:
- "name" must match the input metric name exactly.
- Provide at least 2 "naturalFix" items per metric.
- Keep advice practical and specific to that biomarker.
- If nutrition is relevant, mention nutrient intake directly inside naturalFix (example: increase vitamin D intake, calcium intake, B12 intake).
- Include "foodsWhereFound" only when direct dietary sources are genuinely applicable to that metric.
- If foods are not meaningfully applicable (derived indexes, urine microscopy, calculated ratios), return an empty foodsWhereFound array.

Input metrics:
${JSON.stringify(enrichmentInput)}
`,
        },
      ],
    });

    const enrichmentParsed = JSON.parse(enrichmentCompletion.choices[0].message.content);
    const items = Array.isArray(enrichmentParsed?.items) ? enrichmentParsed.items : [];
    enrichmentByName = new Map(
      items.map((item) => [
        String(item?.name || '').trim().toLowerCase(),
        {
          naturalFix: cleanList(item?.naturalFix),
          foodsWhereFound: cleanList(item?.foodsWhereFound),
        },
      ])
    );
  } catch (enrichmentError) {
    console.error('Enrichment Error:', enrichmentError?.message || enrichmentError);
  }

  return localGuided.map((metric) => {
    const key = metric.name.trim().toLowerCase();
    const enriched = enrichmentByName.get(key);
    const metricFallback = fallbackForMetric(metric);
    const applicable = isFoodApplicable(metric);
    return {
      ...metric,
      naturalFix: ensureMinimumList(
        enriched?.naturalFix?.length ? enriched.naturalFix : metric.naturalFix,
        2,
        metricFallback.fixes
      ),
      foodsWhereFound: applicable
        ? ensureMinimumList(
            enriched?.foodsWhereFound?.length ? enriched.foodsWhereFound : metric.foodsWhereFound,
            3,
            metricFallback.foods
          )
        : [],
    };
  });
};

const generateSummary = async (metrics) => {
  if (!groq) {
    const abnormal = metrics.filter((m) => m.status !== 'normal');
    const foodSet = [];
    abnormal.forEach((metric) => {
      cleanList(metric.foodsWhereFound).forEach((food) => {
        if (!foodSet.includes(food)) foodSet.push(food);
      });
    });
    const actionSet = [];
    abnormal.forEach((metric) => {
      cleanList(metric.naturalFix).forEach((fix) => {
        if (!actionSet.includes(fix)) actionSet.push(fix);
      });
    });
    return {
      whatToEat: foodSet.slice(0, 8),
      whatToDo: actionSet.slice(0, 8),
      watchCarefully: abnormal
        .slice(0, 8)
        .map((m) => `${m.name}: ${m.value}${m.unit ? ` ${m.unit}` : ''} (${m.status.replace('_', ' ')})`),
      whatToAvoid: [
        'Excess sugar-sweetened beverages and ultra-processed snacks.',
        'Smoking or vaping and frequent alcohol intake.',
        'Sedentary routine with poor sleep consistency.',
      ],
    };
  }

  try {
    const prioritizedMetrics = metrics
      .filter((metric) => metric.status !== 'normal' || metric.category === 'Vitamin')
      .concat(metrics.filter((metric) => metric.status === 'normal').slice(0, 10))
      .slice(0, 30);

    const compactMetrics = prioritizedMetrics.map((metric) => ({
      name: metric.name,
      value: metric.value,
      unit: metric.unit,
      status: metric.status,
      category: metric.category,
      naturalFix: cleanList(metric.naturalFix),
      foodsWhereFound: cleanList(metric.foodsWhereFound),
    }));

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a clinical report summarizer and health-coach planner. Return only valid JSON.',
        },
        {
          role: 'user',
          content: `
Using these metrics, create actionable summary lists.
Focus more on abnormal (low/high/deficient/borderline_high) markers.
Use foodsWhereFound and naturalFix context from markers to produce specific content.

Return JSON:
{
  "summary": {
    "whatToEat": [],
    "whatToDo": [],
    "watchCarefully": [],
    "whatToAvoid": []
  }
}

Rules:
- whatToEat: only concrete food items or meal components (no numbers, no lab stat text).
- whatToDo: only physical actions / lifestyle initiatives (walking, sleep routine, hydration, exercise, sunlight, etc.).
- watchCarefully: only metrics/statistics to monitor, ideally mentioning metric names and values.
- whatToAvoid: only harmful foods/habits/triggers (junk food, smoking, excess sugar, sedentary routine, etc.), not metric names.
- Keep each list concise and non-duplicate.

Metrics:
${JSON.stringify(compactMetrics)}
`,
        },
      ],
    });

    const parsed = JSON.parse(completion.choices[0].message.content);
    const summary = parsed?.summary || {};
    return {
      whatToEat: Array.isArray(summary.whatToEat) ? summary.whatToEat : [],
      whatToDo: Array.isArray(summary.whatToDo) ? summary.whatToDo : [],
      watchCarefully: Array.isArray(summary.watchCarefully) ? summary.watchCarefully : [],
      whatToAvoid: Array.isArray(summary.whatToAvoid) ? summary.whatToAvoid : [],
    };
  } catch (error) {
    console.error('Summary generation failed:', error?.message || error);
    const abnormal = metrics.filter((m) => m.status !== 'normal');
    const foodSet = [];
    abnormal.forEach((metric) => {
      cleanList(metric.foodsWhereFound).forEach((food) => {
        if (!foodSet.includes(food)) foodSet.push(food);
      });
    });
    const actionSet = [];
    abnormal.forEach((metric) => {
      cleanList(metric.naturalFix).forEach((fix) => {
        if (!actionSet.includes(fix)) actionSet.push(fix);
      });
    });
    return {
      whatToEat: foodSet.slice(0, 8),
      whatToDo: actionSet.slice(0, 8),
      watchCarefully: abnormal
        .slice(0, 8)
        .map((m) => `${m.name}: ${m.value}${m.unit ? ` ${m.unit}` : ''} (${m.status.replace('_', ' ')})`),
      whatToAvoid: [
        'Excess sugar-sweetened beverages and ultra-processed snacks.',
        'Smoking or vaping and frequent alcohol intake.',
        'Sedentary routine with poor sleep consistency.',
      ],
    };
  }
};

const extractVitaminDFromText = (text) => {
  const source = normalizeWhitespace(text);
  const lower = source.toLowerCase();
  const anchor = lower.indexOf('vitamin d');
  if (anchor < 0) return null;

  const windowText = source.slice(anchor, Math.min(source.length, anchor + 1200));
  const lineCandidates = windowText
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => /ng\/?ml/i.test(line));

  for (const line of lineCandidates) {
    const valueMatch = line.match(/(\d+(?:\.\d+)?)\s*(ng\/?mL|ng\/?ml)/i);
    if (valueMatch) {
      return {
        value: Number(valueMatch[1]),
        unit: valueMatch[2],
      };
    }
  }

  const blockMatch = windowText.match(/(\d+(?:\.\d+)?)\s*(ng\/?mL|ng\/?ml)/i);
  if (!blockMatch) return null;
  return {
    value: Number(blockMatch[1]),
    unit: blockMatch[2],
  };
};

const injectVitaminDIfMissing = (metrics, combinedText) => {
  const existingVitaminD = metrics.find((metric) => /vitamin\s*d/i.test(metric.name));
  const isExistingValid =
    existingVitaminD &&
    /ng\/?ml/i.test(String(existingVitaminD.unit || '')) &&
    Number.isFinite(Number(existingVitaminD.value)) &&
    Number(existingVitaminD.value) > 0;
  if (isExistingValid) return metrics;

  const extracted = extractVitaminDFromText(combinedText);
  if (!extracted) return metrics;

  const value = Number(extracted.value);
  const unit = extracted.unit || 'ng/mL';
  const status = value < 20 ? 'deficient' : value < 30 ? 'low' : 'normal';

  return [
    ...metrics.filter((metric) => !/vitamin\s*d/i.test(metric.name)),
    {
      name: 'Vitamin D, 25 Hydroxy',
      value: Number.isFinite(value) ? value : 0,
      unit,
      status,
      progress: Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) : 0,
      category: 'Vitamin',
      about: 'Vitamin D supports bone strength, immune function, and muscle health.',
      whyItMatters: 'Low Vitamin D can contribute to fatigue, bone weakness, and poor calcium balance.',
      naturalFix: [
        'Get regular safe sunlight exposure.',
        'Discuss Vitamin D supplementation with your clinician.',
      ],
      foodsWhereFound: ['Fatty fish', 'Egg yolks', 'Fortified dairy products'],
    },
  ];
};

app.post('/api/analyze-report', upload.single('report'), async (req, res) => {
  const rate = checkUploadRateLimit(req);
  if (!rate.allowed) {
    const retryAfterSeconds = Math.max(1, Math.ceil((rate.retryAfterMs || uploadRateWindowMs) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({ error: 'Too many upload requests. Please retry shortly.' });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    const pdfText = await extractPdfText(req.file.buffer);
    const patientName = extractPatientName(pdfText);
    let ocrText = '';
    if (ocrEnabled) {
      try {
        const pages = await extractPageTextsWithOcr(req.file.buffer);
        ocrText = pages
          .map((page) => page.text)
          .filter((text) => text && text.length > 30)
          .join('\n');
      } catch (ocrOuterError) {
        console.error('OCR extraction skipped:', ocrOuterError?.message || ocrOuterError);
      }
    }
    const combinedText = normalizeWhitespace(`${pdfText}\n${ocrText}`);
    let allMetrics = parseMetricsFromText(combinedText);
    // If rule-based parsing produced too few results, use LLM chunk extraction as fallback.
    if (groq && allMetrics.length < 15) {
      const chunks = chunkText(combinedText, 7000);
      const llmMetrics = [];
      for (let i = 0; i < chunks.length; i += 1) {
        const metrics = await extractMetricsFromChunk(chunks[i], i);
        llmMetrics.push(...metrics);
      }
      allMetrics = dedupeMetrics([...allMetrics, ...llmMetrics]);
    }

    allMetrics = injectVitaminDIfMissing(allMetrics, combinedText);

    const enrichedMetrics = await enrichMetricGuidance(allMetrics);
    const summary = await generateSummary(enrichedMetrics);

    return res.json({ patientName, metrics: enrichedMetrics, summary });
  } catch (err) {
    console.error('Analyze Error:', err?.message || err);
    return res.status(500).json({ error: 'Failed to analyze report' });
  }
});

app.use((err, _req, res, next) => {
  if (!err) return next();

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: 'File too large. Maximum upload size is 25MB.' });
    }
    return res.status(400).json({ error: err.message || 'Invalid upload request.' });
  }

  if (String(err?.message || '').includes('Only PDF uploads are allowed')) {
    return res.status(400).json({ error: 'Only PDF files are accepted.' });
  }

  return res.status(500).json({ error: 'Unexpected server error.' });
});

app.listen(PORT, () => {
  const mode = isProduction ? 'production' : 'development';
  const groqState = GROQ_API_KEY ? 'configured' : 'not configured';
  console.log(`Server listening on port ${PORT} (${mode}, Groq ${groqState})`);
});
