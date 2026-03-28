import { useEffect, useMemo, useRef, useState } from "react";

const STOP_WORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "before",
  "being",
  "between",
  "could",
  "during",
  "every",
  "from",
  "have",
  "into",
  "just",
  "more",
  "most",
  "other",
  "over",
  "same",
  "some",
  "than",
  "that",
  "their",
  "there",
  "these",
  "they",
  "this",
  "those",
  "through",
  "very",
  "what",
  "when",
  "where",
  "which",
  "while",
  "with",
  "would",
  "your",
]);

const IDEA_GROUPS = {
  listen: ["listen", "listens", "listening", "hear", "hears", "hearing"],
  present: ["present", "presentation", "presenter", "presenting", "speaker", "speaking"],
  cue: ["cue", "prompt", "hint", "nudge", "reminder"],
  track: ["track", "tracking", "tracked", "follow", "following", "monitor", "monitors"],
  progress: ["progress", "orientation", "oriented", "flow", "structure"],
  anxiety: ["anxiety", "confidence", "confident", "stress", "nervous"],
  skip: ["skip", "skipped", "miss", "missed", "forgot", "forget", "forgotten"],
  recover: ["recover", "recovery", "continue", "resume"],
  realtime: ["realtime", "real", "live", "instant", "instantly"],
  slide: ["slide", "slides", "deck"],
  move: ["move", "advance", "next", "switch"],
  trust: ["trust", "trusted", "trusting", "believe", "believable", "belief", "confidence"],
  audience: ["audience", "follower", "followers", "people", "community"],
  consistency: ["consistency", "consistent", "regular", "regularly", "often", "frequently", "routine"],
  credibility: ["credibility", "credible", "believable", "trustworthy", "informed", "expert", "authority"],
  engagement: ["engagement", "engage", "interaction", "interact", "reply", "replies", "comment", "comments", "conversation", "click", "clicks"],
  niche: ["niche", "positioning", "position", "space", "topic", "area", "category", "lane"],
  strategy: ["strategy", "plan", "planned", "intentional", "roadmap", "approach"],
  analytics: ["analytics", "metrics", "data", "performance", "measure", "measurement", "numbers"],
  content: ["content", "posts", "posting", "publish", "publishing"],
  authority: ["authority", "expertise", "expert", "known", "recognised", "recognized"],
};

const DEMO_TRANSCRIPT = [
  "Many presenters lose their place and forget important parts of the talk.",
  "Cue listens live while the speaker is presenting and follows the talk in real time.",
  "The system keeps track of where they are in the structure so they stay oriented.",
  "A small hint appears only when an important point is missed.",
  "Once the required ideas are covered the slide can move automatically.",
  "That lowers anxiety, helps recovery, and makes the delivery smoother.",
];

const ALERT_DELAY_MS = 1200;
const ALERT_COOLDOWN_MS = 5000;
const AUTO_ADVANCE_DELAY_MS = 1800;
const MANUAL_WARNING_WINDOW_MS = 6000;
const DRIFT_HINT_DELAY_MS = 1200;
const CHUNK_SKIP_THRESHOLD = 0.48;
const SEMANTIC_COVER_THRESHOLD = 0.42;
const SEMANTIC_MISS_THRESHOLD = 0.45;
const FILLER_WINDOW_MS = 1600;
const END_THOUGHT_WINDOW_MS = 2200;
const JUDGE_MIN_TEXT_LENGTH = 18;
const ACTIVE_SPEECH_HOLD_MS = 900;
const SLIDE_INTRO_GRACE_MS = 3500;
const MIN_CONTEXT_IDEAS_BEFORE_CUE = 3;
const ICON_TO_TEXT_DELAY_MS = 650;
const AUTO_ADVANCE_PAUSE_MS = 1000;

const ICON_MAP = {
  trust: "🤝",
  audience: "👥",
  community: "👥",
  consistency: "🔁",
  regular: "🔁",
  credibility: "🎓",
  expert: "🎓",
  authority: "🏆",
  engagement: "💬",
  interaction: "💬",
  conversation: "💬",
  strategy: "🧠",
  plan: "🗂️",
  roadmap: "🗂️",
  analytics: "📊",
  metrics: "📊",
  data: "📊",
  performance: "📊",
  growth: "📈",
  increase: "📈",
  niche: "🎯",
  position: "🎯",
  content: "📝",
  posting: "📝",
  publish: "📝",
  warning: "⚠️",
  risk: "⚠️",
  disruption: "⚠️",
  inventory: "📦",
  stock: "📦",
  cost: "💰",
  price: "💰",
  supply: "🚚",
  logistics: "🚚",
  manufacturing: "🏭",
  production: "🏭",
  timing: "⏱️",
  schedule: "📅",
  progress: "🧭",
  track: "🛰️",
  visibility: "👁️",
  idea: "💡",
  innovation: "💡",
};

const ICON_GROUPS = [
  { icon: "🤝", terms: ["trust", "trusted", "believe", "belief", "credibility", "confidence"] },
  { icon: "👥", terms: ["audience", "community", "followers", "people", "team", "customer"] },
  { icon: "🔁", terms: ["consistency", "consistent", "regular", "regularly", "repeat", "routine", "often"] },
  { icon: "📊", terms: ["analytics", "metrics", "data", "numbers", "measurement", "performance", "measure"] },
  { icon: "💬", terms: ["engagement", "interaction", "comments", "conversation", "reply", "replies", "clicks"] },
  { icon: "📈", terms: ["growth", "increase", "up", "expand", "improve", "scale"] },
  { icon: "🗂️", terms: ["planning", "plan", "organize", "organization", "content strategy", "content planning"] },
  { icon: "🧠", terms: ["strategy", "thinking", "approach", "intentional", "positioning"] },
  { icon: "🎓", terms: ["credibility", "expertise", "expert", "trustworthy", "informed", "believable"] },
  { icon: "⚠️", terms: ["warning", "risk", "issue", "problem", "disruption", "volatility"] },
  { icon: "📦", terms: ["inventory", "stock", "holding", "quantity", "quantities"] },
  { icon: "💰", terms: ["cost", "costs", "price", "pricing", "holding costs", "reduce cost"] },
  { icon: "🚚", terms: ["supply", "supply chain", "logistics", "shipment", "delivery"] },
  { icon: "🏭", terms: ["manufacturing", "production", "factory", "material", "materials"] },
  { icon: "⏱️", terms: ["timing", "schedule", "time", "deadline", "reorder timing"] },
  { icon: "👁️", terms: ["visibility", "awareness", "seen", "discoverability"] },
  { icon: "📝", terms: ["content", "posting", "publish", "posts", "message"] },
  { icon: "🎯", terms: ["niche", "focus", "position", "positioning", "space", "topic"] },
];

const FILLER_PATTERN = /\b(um+|uh+|erm|like|so+|you know)\b/i;
const END_THOUGHT_PATTERN = /\b(next slide|moving on|to wrap up|in summary|overall|that's it|that is it|finally)\b/i;

const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function stemWord(word) {
  let next = word.toLowerCase();

  Object.entries(IDEA_GROUPS).forEach(([canonical, variants]) => {
    if (variants.includes(next)) {
      next = canonical;
    }
  });

  if (next.endsWith("ing") && next.length > 5) return next.slice(0, -3);
  if (next.endsWith("ed") && next.length > 4) return next.slice(0, -2);
  if (next.endsWith("es") && next.length > 4) return next.slice(0, -2);
  if (next.endsWith("s") && next.length > 4) return next.slice(0, -1);
  return next;
}

function unique(values) {
  return [...new Set(values)];
}

function tokenizeIdeas(text) {
  return unique(
    normalize(text)
      .split(" ")
      .map(stemWord)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  );
}

function buildCue(text) {
  const ideas = tokenizeIdeas(text).sort((left, right) => right.length - left.length);
  return ideas[0] || "hint";
}

function buildPresentation(text) {
  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const slides = [];
  const points = [];

  blocks.forEach((block, slideIndex) => {
    const lines = block
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const descriptor = splitSlideTitleAndBody(lines);
    const nonContent = isNonContentSlide(descriptor);
    const sourceLines = nonContent ? [] : descriptor.bodyLines.length ? descriptor.bodyLines : lines;
    const slidePoints = sourceLines
      .map((line, pointIndex) => {
        const point = {
          id: `${slideIndex}-${pointIndex}-${line}`,
          intendedText: line,
          keyIdeas: tokenizeIdeas(line),
          cue: buildCue(line),
          slideIndex,
          pointIndex,
        };

        points.push(point);
        return point;
      });

    slides.push({
      id: `slide-${slideIndex}`,
      slideIndex,
      title: descriptor.title || "",
      nonContent,
      points: slidePoints,
    });
  });

  return { slides, points };
}

function buildPresentationFromPages(pages) {
  const slides = [];
  const points = [];

  pages.forEach((page, slideIndex) => {
    const bodyLines = (page.bodyLines || []).filter(Boolean);
    const nonContent = isNonContentSlide(page);
    const sourceLines = nonContent ? [] : bodyLines;
    const slidePoints = sourceLines.map((line, pointIndex) => {
      const point = {
        id: `${slideIndex}-${pointIndex}-${line}`,
        intendedText: line,
        keyIdeas: tokenizeIdeas(line),
        cue: buildCue(line),
        slideIndex,
        pointIndex,
      };

      points.push(point);
      return point;
    });

    slides.push({
      id: `slide-${slideIndex}`,
      slideIndex,
      title: page.title || "",
      imageOnly: !slidePoints.length,
      nonContent,
      points: slidePoints,
    });
  });

  return { slides, points };
}

function extractPageLines(items) {
  const rows = [];

  items.forEach((item) => {
    const text = String(item.str || "").trim();
    if (!text) return;
    const y = Math.round(item.transform?.[5] || 0);
    const existingRow = rows.find((row) => Math.abs(row.y - y) <= 2);

    if (existingRow) {
      existingRow.parts.push(text);
    } else {
      rows.push({ y, parts: [text] });
    }
  });

  return rows
    .sort((left, right) => right.y - left.y)
    .map((row) => row.parts.join(" ").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function splitSlideTitleAndBody(lines) {
  const cleaned = lines.map((line) => line.trim()).filter(Boolean);
  if (!cleaned.length) {
    return { title: "", bodyLines: [], allLines: [] };
  }

  if (cleaned.length === 1) {
    return { title: cleaned[0], bodyLines: [], allLines: cleaned };
  }

  const [firstLine, ...rest] = cleaned;
  const looksLikeTitle =
    firstLine.length <= 80 &&
    firstLine.split(" ").length <= 8 &&
    !/[.:;]$/.test(firstLine);

  return looksLikeTitle
    ? { title: firstLine, bodyLines: rest, allLines: cleaned }
    : { title: "", bodyLines: cleaned, allLines: cleaned };
}

function isNonContentSlide({ title = "", bodyLines = [], allLines = [] }) {
  const normalizedTitle = normalize(title);
  const normalizedLines = allLines.map((line) => normalize(line)).filter(Boolean);
  const combinedText = normalizedLines.join(" ").trim();
  const totalWords = combinedText ? combinedText.split(" ").filter(Boolean).length : 0;
  const hasOnlyTitle = Boolean(title) && bodyLines.length === 0;
  const sparseLines = allLines.length <= 2;
  const sparseWords = totalWords <= 10;
  const transitionPatterns = [
    /^thank you$/,
    /^thanks$/,
    /^questions$/,
    /^q a$/,
    /^q&a$/,
    /^agenda$/,
    /^overview$/,
    /^introduction$/,
    /^intro$/,
    /^closing$/,
    /^conclusion$/,
    /^business plan$/,
    /^section \d+$/,
    /^chapter \d+$/,
    /^part \d+$/,
  ];
  const titleLooksLikeTransition =
    normalizedTitle &&
    transitionPatterns.some((pattern) => pattern.test(normalizedTitle));
  const singleHeadingOnly =
    sparseLines &&
    sparseWords &&
    (Boolean(title) || allLines.length === 1 || (allLines.length === 2 && bodyLines.length <= 1));

  return hasOnlyTitle || titleLooksLikeTransition || singleHeadingOnly;
}

function computeSemanticState(point, transcriptText) {
  const transcriptIdeas = tokenizeIdeas(transcriptText);
  const transcriptSet = new Set(transcriptIdeas);
  const pointSet = new Set(point.keyIdeas);
  const matchedIdeas = point.keyIdeas.filter((idea) => transcriptSet.has(idea));
  const ideaCoverage = point.keyIdeas.length ? matchedIdeas.length / point.keyIdeas.length : 0;
  const union = new Set([...pointSet, ...transcriptSet]);
  const jaccard = union.size ? matchedIdeas.length / union.size : 0;
  const normalizedPoint = normalize(point.intendedText);
  const normalizedTranscript = normalize(transcriptText);
  const phraseBonus = normalizedTranscript.includes(normalizedPoint) ? 0.35 : 0;
  const transcriptTokens = normalizedTranscript.split(" ").filter(Boolean);
  const consecutiveBonus = point.keyIdeas.some((idea) => transcriptTokens.includes(idea)) ? 0.08 : 0;
  const score = Math.min(1, ideaCoverage * 0.72 + jaccard * 0.2 + phraseBonus + consecutiveBonus);

  return { score, covered: score >= SEMANTIC_COVER_THRESHOLD };
}

function computeOrderedPointCoverage(point, transcriptText, preparedPoint) {
  const semantic = computeSemanticState(point, transcriptText);
  const preparedKeywords = preparedPoint?.keywords || [];
  const pointKeywordMatches = countKeywordMatches(point.keyIdeas, transcriptText);
  const preparedKeywordMatches = countKeywordMatches(preparedKeywords, transcriptText);
  const cueIdeas = tokenizeIdeas(preparedPoint?.cue || point.cue || "");
  const cueMatches = countKeywordMatches(cueIdeas, transcriptText);
  const shortPointBonus =
    point.keyIdeas.length <= 2 && (pointKeywordMatches > 0 || preparedKeywordMatches > 0) ? 0.08 : 0;
  const boostedScore = Math.min(
    1,
    semantic.score +
      pointKeywordMatches * 0.12 +
      preparedKeywordMatches * 0.1 +
      cueMatches * 0.08 +
      shortPointBonus
  );

  return {
    score: boostedScore,
    covered:
      boostedScore >= 0.52 ||
      semantic.score >= 0.48 ||
      pointKeywordMatches >= Math.min(2, Math.max(1, point.keyIdeas.length)) ||
      (preparedKeywordMatches >= 2 && semantic.score >= 0.32),
  };
}

function buildLocalPreparation(presentation) {
  return presentation.slides.reduce((accumulator, slide) => {
    accumulator[slide.id] = {
      summary: slide.imageOnly ? "" : slide.points.map((point) => point.intendedText).join(" "),
      points: slide.points.reduce((pointAccumulator, point) => {
        const keywords = point.keyIdeas.slice(0, 3);
        const localPreparedPoint = {
          cue: point.cue,
          keywords,
        };
        pointAccumulator[point.id] = {
          cue: point.cue,
          keywords,
          icon: chooseHintIcon(point, localPreparedPoint),
        };
        return pointAccumulator;
      }, {}),
    };
    return accumulator;
  }, {});
}

function countKeywordMatches(keywords, transcriptText) {
  if (!keywords?.length) return 0;
  const transcriptIdeas = new Set(tokenizeIdeas(transcriptText));
  return keywords.filter((keyword) => transcriptIdeas.has(stemWord(keyword))).length;
}

function isFillerMoment(text) {
  return FILLER_PATTERN.test(text);
}

function isEndThoughtMoment(text) {
  return END_THOUGHT_PATTERN.test(text);
}

function chooseHintIcon(point, preparedPoint) {
  const rawCandidates = [
    point?.intendedText || "",
    ...(preparedPoint?.keywords || []),
    ...(point?.keyIdeas || []),
    preparedPoint?.cue || "",
    point?.cue || "",
  ].filter(Boolean);

  const normalizedCandidates = rawCandidates
    .flatMap((value) => tokenizeIdeas(String(value || "")))
    .filter(Boolean);

  for (const candidate of normalizedCandidates) {
    if (ICON_MAP[candidate]) {
      return ICON_MAP[candidate];
    }
  }

  const fullText = normalize(rawCandidates.join(" "));
  for (const group of ICON_GROUPS) {
    if (group.terms.some((term) => fullText.includes(normalize(term)))) {
      return group.icon;
    }
  }

  if (point?.keyIdeas?.length) {
    const idea = point.keyIdeas[0];
    if (ICON_MAP[idea]) {
      return ICON_MAP[idea];
    }
  }

  return "📝";
}

const marketingSteps = [
  {
    eyebrow: "01",
    title: "Upload Your Slides",
    description:
      "Give Cue your slides: it’ll extract your key ideas, maps your flow, and prepares you to present with total clarity.",
  },
  {
    eyebrow: "02",
    title: "Start Your Presentation",
    description:
      "Start your presentation. Cue is listening as you speak and understands everything you say.",
  },
  {
    eyebrow: "03",
    title: "Get Guidance",
    description:
      "When things go wrong, Cue has your back. It catches missed points and keeps you on track before moving on.",
  },
];

const marketingFeatures = [
  "Subtle cueing that respects your rhythm",
  "Semantic understanding of natural phrasing",
  "Slide-aware tracking with ordered recovery",
  "Coach Mode feedback for rehearsal runs",
  "Confidence-building delivery support",
  "Quiet progress tracking without dashboard clutter",
];

const modeCards = [
  {
    label: "Live Presentation",
    title: "Real-time support that stays out of your way.",
    description:
      "Cue listens while you present, tracks what has been covered on the current slide, and only surfaces a cue when a missed idea actually matters.",
    points: [
      "Live microphone listening",
      "Pause-aware cue timing",
      "Slide-specific coverage tracking",
    ],
  },
  {
    label: "Coach Mode",
    title: "Rehearse with richer feedback before the room goes live.",
    description:
      "Practice the story, review skipped points, and tighten pacing. Coach Mode turns each rehearsal into a cleaner, calmer real presentation.",
    points: [
      "Missed-point review",
      "Delivery and pacing guidance",
      "Safer practice before the real talk",
    ],
  },
];

function SetupButton({ children, variant = "primary", ...props }) {
  const styles =
    variant === "secondary"
      ? "bg-white text-[#333333] ring-1 ring-[#ADCAE8]/40 hover:bg-[#F6F8F9]"
      : "bg-[#D95C5C] text-white shadow-[0_20px_50px_rgba(217,92,92,0.22)] hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(217,92,92,0.28)]";

  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition duration-300 ${styles} ${props.className || ""}`}
    >
      {children}
    </button>
  );
}

function SetupCard({ className = "", children }) {
  return (
    <div className={`rounded-[28px] border border-white/70 bg-white/82 shadow-[0_24px_80px_rgba(96,125,139,0.12)] backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export default function App() {
  const initialPresentation = useMemo(() => buildPresentation(""), []);

  const [phase, setPhase] = useState("setup");
  const [mode, setMode] = useState("demo");
  const [presentation, setPresentation] = useState(initialPresentation);
  const [preparedSlides, setPreparedSlides] = useState(buildLocalPreparation(initialPresentation));
  const [uploadedPresentation, setUploadedPresentation] = useState(null);
  const [uploadedPreparedSlides, setUploadedPreparedSlides] = useState(null);
  const [localCoveredPoints, setLocalCoveredPoints] = useState({});
  const [aiCoveredPoints, setAiCoveredPoints] = useState({});
  const [cuedPoints, setCuedPoints] = useState({});
  const [lastFinalTranscript, setLastFinalTranscript] = useState("");
  const [recentMatchDebug, setRecentMatchDebug] = useState([]);
  const [preparing, setPreparing] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [transcriptPanelPosition, setTranscriptPanelPosition] = useState({ x: 16, y: 16 });
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [checklistCompact, setChecklistCompact] = useState(true);
  const [presentationNow, setPresentationNow] = useState(Date.now());
  const [spokenCorpus, setSpokenCorpus] = useState("");
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [sessionState, setSessionState] = useState("idle");
  const [statusMessage, setStatusMessage] = useState(
    "Add slide points, separate slides with a blank line, upload a PDF if you want visual slide sync, then start."
  );
  const [hintBubble, setHintBubble] = useState({ visible: false, text: "", icon: "", tone: "idle" });
  const [cueState, setCueState] = useState({
    currentCue: "",
    cueType: "icon",
    cueVisible: false,
    cueTargetPoint: "",
    cueTriggeredAt: 0,
    cueResolved: false,
    cueDismissed: false,
    cueIcon: "",
    cueKeyword: "",
  });
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfName, setPdfName] = useState("No PDF uploaded");
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [uploadState, setUploadState] = useState("idle");
  const [uploadError, setUploadError] = useState("");
  const [uploadPromptVisible, setUploadPromptVisible] = useState(false);
  const [uploadHighlight, setUploadHighlight] = useState(false);
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const [manualWarning, setManualWarning] = useState({ direction: "", armedAt: 0 });

  const recognitionRef = useRef(null);
  const demoTimerRef = useRef(null);
  const hintTimerRef = useRef(null);
  const bubbleTimerRef = useRef(null);
  const demoChunkRef = useRef(0);
  const sessionStateRef = useRef("idle");
  const lastSpeechAtRef = useRef(Date.now());
  const lastSpeechActivityAtRef = useRef(Date.now());
  const lastFillerAtRef = useRef(0);
  const lastThoughtAtRef = useRef(0);
  const lastHintAtRef = useRef(0);
  const lastSlideChangeAtRef = useRef(Date.now());
  const slideStartedAtRef = useRef(Date.now());
  const lastAutoAdvanceKeyRef = useRef("");
  const lastChunkCueSignatureRef = useRef("");
  const lastJudgeSignatureRef = useRef("");
  const presentationRef = useRef(null);
  const transcriptDragRef = useRef(null);
  const transcriptScrollRef = useRef(null);
  const transcriptRef = useRef([]);
  const coverageRef = useRef({});
  const slidesRef = useRef([]);
  const activeSlideIndexRef = useRef(0);
  const preparedSlidesRef = useRef({});
  const uploadSectionRef = useRef(null);
  const uploadHighlightTimerRef = useRef(null);

  const slides = presentation.slides;
  const points = presentation.points;
  const semanticStates = useMemo(
    () =>
      points.reduce((accumulator, point) => {
        accumulator[point.id] = computeSemanticState(point, spokenCorpus);
        return accumulator;
      }, {}),
    [points, spokenCorpus]
  );

  const coverage = useMemo(
    () =>
      points.reduce((accumulator, point) => {
        accumulator[point.id] = Boolean(localCoveredPoints[point.id]) || Boolean(aiCoveredPoints[point.id]);
        return accumulator;
      }, {}),
    [aiCoveredPoints, localCoveredPoints, points]
  );

  const slideStates = useMemo(
    () =>
      slides.map((slide) => {
        const pendingPoints = slide.points.filter((point) => !coverage[point.id]);
        return {
          slideIndex: slide.slideIndex,
          imageOnly: Boolean(slide.imageOnly),
          nonContent: Boolean(slide.nonContent),
          pendingPoints,
          complete: !slide.nonContent && (slide.points.length === 0 || pendingPoints.length === 0),
          targetPoint: pendingPoints[0] || null,
        };
      }),
    [coverage, slides]
  );

  const activeSlide = slides[activeSlideIndex] || null;
  const activeSlideState = slideStates[activeSlideIndex] || null;
  const activePoint = activeSlideState?.targetPoint || null;
  const recentTranscriptText = transcript.slice(-5).join(" ");
  const activeSemanticState = activePoint ? semanticStates[activePoint.id] : null;
  const recentActiveSemanticState = activePoint ? computeSemanticState(activePoint, recentTranscriptText) : null;
  const laterCurrentSlidePoints = activeSlide && activePoint
    ? activeSlide.points.filter((point) => point.pointIndex > activePoint.pointIndex)
    : [];
  const nextSlide = slides[activeSlideIndex + 1] || null;
  const nextSlidePoint = nextSlide?.points?.[0] || null;
  const recentNextSlideSemanticState = nextSlidePoint ? computeSemanticState(nextSlidePoint, recentTranscriptText) : null;
  const currentPdfPage = pdfPageCount ? Math.min(activeSlideIndex + 1, pdfPageCount) : activeSlideIndex + 1;
  const coveredCount = useMemo(() => Object.values(coverage).filter(Boolean).length, [coverage]);
  const preparedSummary =
    activeSlide && !activeSlide.imageOnly && !activeSlide.nonContent ? preparedSlides[activeSlide.id]?.summary || "" : "";
  const transcriptIdeaCount = tokenizeIdeas(recentTranscriptText).length;
  const speakingNow = presentationNow - lastSpeechActivityAtRef.current < ACTIVE_SPEECH_HOLD_MS;
  const coveredPointLabels = activeSlide ? activeSlide.points.filter((point) => coverage[point.id]).map((point) => point.intendedText) : [];
  const missingPointLabels = activeSlideState ? activeSlideState.pendingPoints.map((point) => point.intendedText) : [];
  const nextCueCandidate = activePoint ? preparedSlides[activeSlide?.id]?.points?.[activePoint.id]?.cue || activePoint.cue : "";
  const checklistPoints = activeSlide
    ? activeSlide.nonContent
      ? []
      : activeSlide.points.map((point) => ({
        id: point.id,
        label: point.intendedText,
        status: coverage[point.id] ? "covered" : cuedPoints[point.id] ? "cued" : "pending",
      }))
    : [];
  const slideComplete = Boolean(activeSlideState?.complete);
  const autoAdvanceReady =
    slideComplete &&
    !speakingNow &&
    presentationNow - lastSpeechAtRef.current >= AUTO_ADVANCE_PAUSE_MS &&
    presentationNow - lastSlideChangeAtRef.current >= AUTO_ADVANCE_DELAY_MS;
  const compactCompletedCount = checklistPoints.filter((point) => point.status === "covered").length;
  const hasUploadedPresentation = Boolean(pdfUrl);
  const currentSlideLabel = activeSlide?.title ? `Slide ${activeSlideIndex + 1}: ${activeSlide.title}` : activeSlide ? `Slide ${activeSlideIndex + 1}` : "No slide";
  const bestRecentMatch = recentMatchDebug[0] || null;
  const earliestMissingPoint = activeSlideState?.pendingPoints?.[0] || null;
  const cuePreparedPoint = earliestMissingPoint && activeSlide ? preparedSlides[activeSlide.id]?.points?.[earliestMissingPoint.id] : null;
  const cueSourceIcon = earliestMissingPoint ? cuePreparedPoint?.icon || chooseHintIcon(earliestMissingPoint, cuePreparedPoint) : "";
  const cueSourceKeyword = earliestMissingPoint ? cuePreparedPoint?.cue || earliestMissingPoint.cue || "" : "";
  const pointCueDefinitions = activeSlide
    ? activeSlide.points.map((point) => {
        const preparedPoint = preparedSlides[activeSlide.id]?.points?.[point.id];
        return {
          id: point.id,
          label: point.intendedText,
          icon: preparedPoint?.icon || chooseHintIcon(point, preparedPoint),
          keyword: preparedPoint?.cue || point.cue || "",
        };
      })
    : [];
  const pauseDetected = presentationNow - lastSpeechAtRef.current >= ALERT_DELAY_MS;
  const fillerDetected = presentationNow - lastFillerAtRef.current <= FILLER_WINDOW_MS;
  const endThoughtDetected = presentationNow - lastThoughtAtRef.current <= END_THOUGHT_WINDOW_MS;
  const validCueMoment = !speakingNow && (pauseDetected || fillerDetected || endThoughtDetected);

  useEffect(() => {
    return () => {
      stopSession();
      window.clearTimeout(bubbleTimerRef.current);
      window.clearTimeout(uploadHighlightTimerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreenActive(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    if (phase !== "present") {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        attemptSlideMove("next");
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        attemptSlideMove("previous");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, activeSlideIndex, activeSlideState, slides.length, manualWarning]);

  useEffect(() => {
    if (phase !== "present") {
      return undefined;
    }

    const handlePointerMove = (event) => {
      if (!transcriptDragRef.current) {
        return;
      }

      const nextX = Math.max(8, event.clientX - transcriptDragRef.current.offsetX);
      const nextY = Math.max(8, event.clientY - transcriptDragRef.current.offsetY);
      setTranscriptPanelPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      transcriptDragRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "present") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setPresentationNow(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [phase]);

  useEffect(() => {
    if (!transcriptScrollRef.current) {
      return;
    }

    const element = transcriptScrollRef.current;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 40;
    if (nearBottom || transcriptExpanded === false) {
      element.scrollTop = element.scrollHeight;
    }
  }, [interimTranscript, transcript, transcriptExpanded]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    coverageRef.current = coverage;
  }, [coverage]);

  useEffect(() => {
    slidesRef.current = slides;
  }, [slides]);

  useEffect(() => {
    activeSlideIndexRef.current = activeSlideIndex;
  }, [activeSlideIndex]);

  useEffect(() => {
    preparedSlidesRef.current = preparedSlides;
  }, [preparedSlides]);

  useEffect(() => {
    if (
      phase !== "present" ||
      sessionState !== "active" ||
      !activeSlide ||
      !activeSlideState ||
      activeSlideState.imageOnly ||
      activeSlideState.nonContent ||
      !earliestMissingPoint
    ) {
      return;
    }

    const now = presentationNow;
    const cooledDown = now - lastHintAtRef.current >= ALERT_COOLDOWN_MS;
    const pastIntroGrace = now - slideStartedAtRef.current >= SLIDE_INTRO_GRACE_MS;
    const slideStableLongEnough = now - lastSlideChangeAtRef.current >= ALERT_DELAY_MS;
    const introStillInProgress = !pastIntroGrace && transcriptIdeaCount < MIN_CONTEXT_IDEAS_BEFORE_CUE;
    const hasActiveCue = cueState.cueVisible && !cueState.cueResolved && !cueState.cueDismissed;
    const sameCueTarget = cueState.cueTargetPoint === earliestMissingPoint.id;

    if (
      cooledDown &&
      validCueMoment &&
      !introStillInProgress &&
      slideStableLongEnough &&
      (!hasActiveCue || !sameCueTarget)
    ) {
      setCueState({
        currentCue: cueSourceIcon,
        cueType: "icon",
        cueVisible: true,
        cueTargetPoint: earliestMissingPoint.id,
        cueTriggeredAt: now,
        cueResolved: false,
        cueDismissed: false,
        cueIcon: cueSourceIcon,
        cueKeyword: cueSourceKeyword,
      });
      setCuedPoints((prev) => ({ ...prev, [earliestMissingPoint.id]: true }));
      lastHintAtRef.current = now;
    }
  }, [
    activeSlide,
    activeSlideState,
    cueSourceIcon,
    cueSourceKeyword,
    cueState,
    earliestMissingPoint,
    phase,
    presentationNow,
    sessionState,
    transcriptIdeaCount,
    validCueMoment,
  ]);

  useEffect(() => {
    if (
      phase !== "present" ||
      sessionState !== "active" ||
      !cueState.cueVisible ||
      cueState.cueType !== "icon" ||
      !cueState.cueTargetPoint
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const pointStillMissing = !coverage[cueState.cueTargetPoint];
      const stillPaused = Date.now() - lastSpeechActivityAtRef.current >= ACTIVE_SPEECH_HOLD_MS;

      if (!pointStillMissing || !stillPaused) {
        return;
      }

      setCueState((prev) => ({
        ...prev,
        currentCue: prev.cueKeyword || prev.currentCue,
        cueType: "text",
        cueVisible: true,
      }));
    }, ICON_TO_TEXT_DELAY_MS);

    return () => window.clearTimeout(timeoutId);
  }, [coverage, cueState, phase, sessionState]);

  useEffect(() => {
    if (
      phase !== "present" ||
      sessionState !== "active" ||
      !activeSlide ||
      activeSlide.imageOnly ||
      activeSlide.nonContent ||
      recentTranscriptText.trim().length < JUDGE_MIN_TEXT_LENGTH
    ) {
      return;
    }

    const missingPoints = activeSlide.points.filter((point) => !coverage[point.id]);
    if (!missingPoints.length) {
      return;
    }

    const signature = `${activeSlide.id}::${recentTranscriptText}::${missingPoints.map((point) => point.id).join(",")}`;
    if (lastJudgeSignatureRef.current === signature) {
      return;
    }

    lastJudgeSignatureRef.current = signature;
    let cancelled = false;

    const judgePoints = async () => {
      try {
        const slideSummary = preparedSlides[activeSlide.id]?.summary || "";

        const results = await Promise.all(
          missingPoints.map(async (point) => {
            const response = await fetch("/api/judge", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                point: point.intendedText,
                keyIdeas: point.keyIdeas,
                slideSummary,
                previousPoint: activeSlide.points[point.pointIndex - 1]?.intendedText || "",
                nextPoint: activeSlide.points[point.pointIndex + 1]?.intendedText || "",
                latestUtterance: lastFinalTranscript,
                recentTranscript: recentTranscriptText,
                fullTranscript: spokenCorpus,
              }),
            });

            const payload = await response.json();
            return {
              pointId: point.id,
              ok: response.ok,
              made: Boolean(payload.made),
              confidence: payload.confidence ?? 0,
            };
          })
        );

        if (cancelled) {
          return;
        }

        const newlyCovered = results
          .filter((result) => result.ok && result.made && result.confidence >= 0.45)
          .reduce((accumulator, result) => {
            accumulator[result.pointId] = true;
            return accumulator;
          }, {});

        if (Object.keys(newlyCovered).length) {
          setAiCoveredPoints((prev) => ({ ...prev, ...newlyCovered }));
        }
      } catch {
        lastJudgeSignatureRef.current = "";
      }
    };

    void judgePoints();

    return () => {
      cancelled = true;
    };
  }, [activeSlide, coverage, lastFinalTranscript, phase, preparedSlides, recentTranscriptText, sessionState, spokenCorpus]);

  useEffect(() => {
    if (!Object.keys(cuedPoints).length) {
      return;
    }

    const remainingCuedPoints = Object.keys(cuedPoints).reduce((accumulator, pointId) => {
      if (!coverage[pointId]) {
        accumulator[pointId] = true;
      }
      return accumulator;
    }, {});

    if (Object.keys(remainingCuedPoints).length !== Object.keys(cuedPoints).length) {
      setCuedPoints(remainingCuedPoints);
    }

    if (cueState.cueTargetPoint && coverage[cueState.cueTargetPoint]) {
      setCueState((prev) => ({
        ...prev,
        cueVisible: false,
        cueResolved: true,
        currentCue: "",
      }));
    }
  }, [coverage, cueState.cueTargetPoint, cuedPoints]);

  useEffect(() => {
    if (
      phase !== "present" ||
      sessionState !== "active" ||
      !activeSlideState ||
      activeSlideState.nonContent ||
      !activeSlideState.complete ||
      activeSlideIndex >= slides.length - 1
    ) {
      return;
    }

    const now = presentationNow;
    const notSpeaking = now - lastSpeechActivityAtRef.current >= ACTIVE_SPEECH_HOLD_MS;
    const pausedLongEnough = now - lastSpeechAtRef.current >= AUTO_ADVANCE_PAUSE_MS;
    const slideStableLongEnough = now - lastSlideChangeAtRef.current >= AUTO_ADVANCE_DELAY_MS;
    const autoAdvanceKey = `${activeSlideIndex}:${coveredCount}:${activeSlideState.complete}`;

    if (!notSpeaking || !pausedLongEnough || !slideStableLongEnough || lastAutoAdvanceKeyRef.current === autoAdvanceKey) {
      return;
    }

    lastAutoAdvanceKeyRef.current = autoAdvanceKey;
    const nextIndex = Math.min(activeSlideIndex + 1, slides.length - 1);
    setActiveSlideIndex(nextIndex);
    setLocalCoveredPoints({});
    setAiCoveredPoints({});
    setCuedPoints({});
    setCueState({
      currentCue: "",
      cueType: "icon",
      cueVisible: false,
      cueTargetPoint: "",
      cueTriggeredAt: 0,
      cueResolved: false,
      cueDismissed: false,
      cueIcon: "",
      cueKeyword: "",
    });
    setLastFinalTranscript("");
    setRecentMatchDebug([]);
    setTranscript([]);
    setSpokenCorpus("");
    transcriptRef.current = [];
    coverageRef.current = {};
    activeSlideIndexRef.current = nextIndex;
    setManualWarning({ direction: "", armedAt: 0 });
    showBubble({ text: "Next slide", tone: "success" });
    setStatusMessage("Cue moved to the next slide after the current one was covered.");
    lastSpeechActivityAtRef.current = now;
    lastFillerAtRef.current = 0;
    lastThoughtAtRef.current = 0;
    lastSlideChangeAtRef.current = now;
    slideStartedAtRef.current = now;
    lastHintAtRef.current = now;
    lastChunkCueSignatureRef.current = "";
    lastJudgeSignatureRef.current = "";
    setPresentationNow(now);
  }, [activeSlideIndex, activeSlideState, coveredCount, phase, presentationNow, sessionState, slides.length]);

  function showBubble({ text = "", icon = "", tone = "idle" }) {
    window.clearTimeout(bubbleTimerRef.current);
    setHintBubble({ visible: true, text, icon, tone });
    if (tone === "warning" || tone === "success") {
      bubbleTimerRef.current = window.setTimeout(() => {
        setHintBubble((prev) => ({ ...prev, visible: false }));
      }, tone === "warning" ? 3200 : 2400);
    }
  }

  function stopSession() {
    window.clearInterval(demoTimerRef.current);
    window.clearInterval(hintTimerRef.current);
    window.clearTimeout(bubbleTimerRef.current);
    demoTimerRef.current = null;
    hintTimerRef.current = null;

    if (recognitionRef.current) {
      recognitionRef.current.onresult = null;
      recognitionRef.current.onerror = null;
      recognitionRef.current.onend = null;
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    setSessionState("idle");
    sessionStateRef.current = "idle";
  }

  function resetRunState(nextPresentation, nextPreparedSlides) {
    setPresentation(nextPresentation);
    setPreparedSlides(nextPreparedSlides);
    setLocalCoveredPoints({});
    setAiCoveredPoints({});
    setCuedPoints({});
    setLastFinalTranscript("");
    setRecentMatchDebug([]);
    setTranscript([]);
    setInterimTranscript("");
    setSpokenCorpus("");
    setActiveSlideIndex(0);
    setManualWarning({ direction: "", armedAt: 0 });
    setHintBubble({ visible: false, text: "", icon: "", tone: "idle" });
    setCueState({
      currentCue: "",
      cueType: "icon",
      cueVisible: false,
      cueTargetPoint: "",
      cueTriggeredAt: 0,
      cueResolved: false,
      cueDismissed: false,
      cueIcon: "",
      cueKeyword: "",
    });
    transcriptRef.current = [];
    coverageRef.current = {};
    slidesRef.current = nextPresentation.slides;
    activeSlideIndexRef.current = 0;
    preparedSlidesRef.current = nextPreparedSlides;
    lastSpeechAtRef.current = Date.now();
    lastSpeechActivityAtRef.current = Date.now();
    lastFillerAtRef.current = 0;
    lastThoughtAtRef.current = 0;
    lastHintAtRef.current = 0;
    lastSlideChangeAtRef.current = Date.now();
    slideStartedAtRef.current = Date.now();
    lastAutoAdvanceKeyRef.current = "";
    lastChunkCueSignatureRef.current = "";
    lastJudgeSignatureRef.current = "";
  }

  function addTranscriptChunk(text) {
    const transcriptHistory = transcriptRef.current;
    const currentSlide = slidesRef.current[activeSlideIndexRef.current];
    const recentWindowText = [...transcriptHistory.slice(-2), text].join(" ").trim();
    const currentCoverage = coverageRef.current;
    const currentPreparedSlides = preparedSlidesRef.current;
    const newlyCoveredPoints = {};
    const matchDebug = [];

    if (currentSlide && !currentSlide.imageOnly && !currentSlide.nonContent) {
      currentSlide.points.forEach((point) => {
        if (currentCoverage[point.id]) {
          return;
        }

        const preparedPoint = currentPreparedSlides[currentSlide.id]?.points?.[point.id];
        const chunkCoverage = computeOrderedPointCoverage(point, text, preparedPoint);
        const windowCoverage = recentWindowText
          ? computeOrderedPointCoverage(point, recentWindowText, preparedPoint)
          : chunkCoverage;
        const effectiveScore = Math.max(chunkCoverage.score, windowCoverage.score);

        matchDebug.push({
          pointId: point.id,
          label: point.intendedText,
          chunkScore: Number(chunkCoverage.score.toFixed(2)),
          windowScore: Number(windowCoverage.score.toFixed(2)),
          score: Number(effectiveScore.toFixed(2)),
          covered: chunkCoverage.covered || windowCoverage.covered,
        });

        if (chunkCoverage.covered || windowCoverage.covered) {
          newlyCoveredPoints[point.id] = true;
        }
      });
    }

    setTranscript((prev) => [...prev, text]);
    setInterimTranscript("");
    setSpokenCorpus((prev) => `${prev} ${text}`.trim());
    setLastFinalTranscript(text);
    setRecentMatchDebug(matchDebug.sort((left, right) => right.score - left.score).slice(0, 4));
    if (Object.keys(newlyCoveredPoints).length) {
      setLocalCoveredPoints((prev) => ({ ...prev, ...newlyCoveredPoints }));
    }
    setManualWarning({ direction: "", armedAt: 0 });
    lastSpeechAtRef.current = Date.now();
    lastSpeechActivityAtRef.current = Date.now();
    if (isFillerMoment(text)) {
      lastFillerAtRef.current = Date.now();
    }
    if (isEndThoughtMoment(text)) {
      lastThoughtAtRef.current = Date.now();
    }
  }

  function highlightUploadSection() {
    setUploadPromptVisible(true);
    setUploadHighlight(true);
    window.clearTimeout(uploadHighlightTimerRef.current);
    uploadSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    uploadHighlightTimerRef.current = window.setTimeout(() => {
      setUploadHighlight(false);
    }, 2200);
  }

  function attemptStartSession() {
    if (hasUploadedPresentation) {
      setUploadPromptVisible(false);
      setUploadHighlight(false);
      void startSession();
      return;
    }

    setStatusMessage("Please upload your presentation first.");
    highlightUploadSection();
  }

  async function enterFullscreen() {
    const target = presentationRef.current || document.documentElement;
    if (!document.fullscreenElement && target?.requestFullscreen) {
      try {
        await target.requestFullscreen();
      } catch {
        setStatusMessage("Fullscreen was blocked. You can still present, or use the fullscreen button.");
      }
    }
  }

  async function exitFullscreen() {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  }

  async function prepareSlides(nextPresentation) {
    const fallback = buildLocalPreparation(nextPresentation);

    try {
      const response = await fetch("/api/prepare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slides: nextPresentation.slides.map((slide) => ({
            slideIndex: slide.slideIndex,
            points: slide.points.map((point) => point.intendedText),
          })),
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || "Slide preparation failed.");
      }

      return nextPresentation.slides.reduce((accumulator, slide) => {
        const preparedSlide = payload.slides?.find((item) => item.slideIndex === slide.slideIndex);
        accumulator[slide.id] = {
          summary: preparedSlide?.summary || fallback[slide.id].summary,
          points: slide.points.reduce((pointAccumulator, point) => {
            const preparedPoint = preparedSlide?.points?.find((item) => item.pointIndex === point.pointIndex);
            const cue = preparedPoint?.cue || fallback[slide.id].points[point.id].cue;
            const keywords = preparedPoint?.keywords || fallback[slide.id].points[point.id].keywords;
            const mergedPreparedPoint = { cue, keywords };
            pointAccumulator[point.id] = {
              cue,
              keywords,
              icon: chooseHintIcon(point, mergedPreparedPoint),
            };
            return pointAccumulator;
          }, {}),
        };
        return accumulator;
      }, {});
    } catch (error) {
      setStatusMessage(
        `AI slide prep was unavailable, so Cue fell back to local summaries. ${error.message || ""}`.trim()
      );
      return fallback;
    }
  }

  async function startSession() {
    const nextPresentation = uploadedPresentation || presentation;
    if (!nextPresentation.points.length) {
      setStatusMessage("Upload a PDF with readable slide text before starting.");
      return;
    }

    setPreparing(true);
    setStatusMessage("Reading slides and preparing hints before the presentation starts...");

    const nextPreparedSlides =
      uploadedPresentation === nextPresentation && uploadedPreparedSlides
        ? uploadedPreparedSlides
        : await prepareSlides(nextPresentation);

    setPreparing(false);
    resetRunState(nextPresentation, nextPreparedSlides);
    setPhase("present");
    setSessionState("active");
    sessionStateRef.current = "active";
    setStatusMessage(
      mode === "demo"
        ? "Demo speech is running. Cue will only pop up a tiny hint when a point seems missed."
        : "Listening live. Cue prepared the deck and will only pop up a tiny hint when needed."
    );

    if (mode === "demo") {
      startDemo();
    } else {
      startLiveRecognition();
    }

    window.setTimeout(() => {
      void enterFullscreen();
    }, 50);
  }

  function finishSession() {
    stopSession();
    setHintBubble({ visible: false, text: "", icon: "", tone: "idle" });
    setCueState((prev) => ({ ...prev, cueVisible: false, currentCue: "" }));
    setStatusMessage("Session stopped. You can adjust the deck and run again.");
  }

  async function goToSetup() {
    stopSession();
    setPhase("setup");
    setHintBubble({ visible: false, text: "", icon: "", tone: "idle" });
    setCueState((prev) => ({ ...prev, cueVisible: false, currentCue: "" }));
    setStatusMessage("Adjust slide points or PDF, then start again.");
    await exitFullscreen();
  }

  function startDemo() {
    demoChunkRef.current = 0;
    demoTimerRef.current = window.setInterval(() => {
      const nextChunk = DEMO_TRANSCRIPT[demoChunkRef.current];
      if (!nextChunk) {
        finishSession();
        return;
      }

      addTranscriptChunk(nextChunk);
      demoChunkRef.current += 1;
    }, 2800);
  }

  function startLiveRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSessionState("error");
      sessionStateRef.current = "error";
      setStatusMessage("Speech recognition is not supported here. Use Chrome or switch to Demo Speech.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) {
          finalText += `${event.results[index][0].transcript} `;
        } else {
          interimText += `${event.results[index][0].transcript} `;
        }
      }

      if (interimText.trim()) {
        setInterimTranscript(interimText.trim());
        lastSpeechActivityAtRef.current = Date.now();
      }

      if (finalText.trim()) {
        addTranscriptChunk(finalText.trim());
      }
    };

    recognition.onerror = () => {
      setSessionState("error");
      sessionStateRef.current = "error";
      setStatusMessage("Microphone access failed. Demo Speech is still available.");
    };

    recognition.onend = () => {
      if (sessionStateRef.current === "active") {
        recognition.start();
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
  }

  async function handlePdfUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please upload a PDF so the presentation stays visually identical.");
      setUploadState("error");
      return;
    }

    setUploadState("loading");
    setUploadError("");
    setUploadPromptVisible(false);
    setUploadHighlight(false);

    try {
      const pdfjsLib = await import("pdfjs-dist");
      const pdfWorker = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

      const fileBytes = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data: fileBytes }).promise;
      const objectUrl = URL.createObjectURL(file);
      const pageDescriptors = [];

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const textContent = await page.getTextContent();
        const lines = extractPageLines(textContent.items);
        pageDescriptors.push(splitSlideTitleAndBody(lines));
      }

      if (pdfUrl) URL.revokeObjectURL(pdfUrl);

      setPdfUrl(objectUrl);
      setPdfName(file.name);
      setPdfPageCount(pdf.numPages);
      setUploadState("success");
      setUploadPromptVisible(false);
      setUploadHighlight(false);
      if (pageDescriptors.length) {
        const nextPresentation = buildPresentationFromPages(pageDescriptors);
        setPreparing(true);
        setStatusMessage(`"${file.name}" uploaded. Preparing per-slide summaries now...`);
        const nextPreparedSlides = await prepareSlides(nextPresentation);
        setUploadedPresentation(nextPresentation);
        setUploadedPreparedSlides(nextPreparedSlides);
        setPresentation(nextPresentation);
        setPreparedSlides(nextPreparedSlides);
        setPreparing(false);
        setStatusMessage(`${file.name} uploaded and summarized. Cue will use each slide summary while listening.`);
      } else {
        setUploadedPresentation(null);
        setUploadedPreparedSlides(null);
        setStatusMessage(`${file.name} uploaded, but no readable slide text was found. Cue will use your typed points instead.`);
      }
    } catch (error) {
      setUploadError(error.message || "PDF upload failed.");
      setUploadState("error");
      setPreparing(false);
      setUploadPromptVisible(true);
    }
  }

  function applySlideChange(nextIndex, message) {
    setActiveSlideIndex(nextIndex);
    setLocalCoveredPoints({});
    setAiCoveredPoints({});
    setCuedPoints({});
    setCueState({
      currentCue: "",
      cueType: "icon",
      cueVisible: false,
      cueTargetPoint: "",
      cueTriggeredAt: 0,
      cueResolved: false,
      cueDismissed: false,
      cueIcon: "",
      cueKeyword: "",
    });
    setLastFinalTranscript("");
    setRecentMatchDebug([]);
    setTranscript([]);
    setSpokenCorpus("");
    transcriptRef.current = [];
    coverageRef.current = {};
    activeSlideIndexRef.current = nextIndex;
    setManualWarning({ direction: "", armedAt: 0 });
    showBubble({ text: message, tone: "warning" });
    setStatusMessage(message);
    lastSpeechActivityAtRef.current = Date.now();
    lastFillerAtRef.current = 0;
    lastThoughtAtRef.current = 0;
    lastHintAtRef.current = Date.now();
    lastSlideChangeAtRef.current = Date.now();
    slideStartedAtRef.current = Date.now();
    lastChunkCueSignatureRef.current = "";
    lastJudgeSignatureRef.current = "";
  }

  function attemptSlideMove(direction) {
    if (!slides.length) return;

    const nextIndex =
      direction === "next"
        ? Math.min(activeSlideIndex + 1, slides.length - 1)
        : Math.max(activeSlideIndex - 1, 0);

    if (nextIndex === activeSlideIndex) return;

    const now = Date.now();
    const needsWarning = Boolean(activeSlideState?.pendingPoints.length);
    const warningStillActive =
      manualWarning.direction === direction && now - manualWarning.armedAt <= MANUAL_WARNING_WINDOW_MS;

    if (needsWarning && !warningStillActive) {
    setManualWarning({ direction, armedAt: now });
    showBubble({ text: "Press again", tone: "warning" });
      setStatusMessage("There are still uncovered points on this slide. Press the same button again to override.");
      return;
    }

    applySlideChange(nextIndex, "Manual slide move applied.");
  }

  const bubbleClass =
    hintBubble.tone === "success"
        ? "bg-emerald-500 text-white"
        : hintBubble.tone === "warning"
          ? "bg-white text-black"
          : "bg-black/75 text-white";

  const startTranscriptDrag = (event) => {
    transcriptDragRef.current = {
      offsetX: event.clientX - transcriptPanelPosition.x,
      offsetY: event.clientY - transcriptPanelPosition.y,
    };
  };

  if (phase === "setup") {
    return (
      <div className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f7f9fa_32%,#eef3f5_100%)] text-[#333333]">
        <div className="pointer-events-none fixed inset-x-0 top-0 z-0 h-[36rem] bg-[radial-gradient(circle_at_top,rgba(217,92,92,0.12),transparent_34%),radial-gradient(circle_at_20%_12%,rgba(96,125,139,0.12),transparent_28%)]" />
        <div className="relative z-10">
          <header className="sticky top-0 z-30 border-b border-white/60 bg-white/68 backdrop-blur-xl">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#333333] text-sm font-semibold text-white shadow-[0_10px_30px_rgba(51,51,51,0.16)]">
                  C
                </div>
                <div>
                  <p className="font-semibold tracking-tight">Cue</p>
                  <p className="text-xs uppercase tracking-[0.28em] leading-5 text-[#1F1F1F]">
                    <span className="block">every point,</span>
                    <span className="block">on point.</span>
                  </p>
                </div>
              </div>

              <nav className="hidden items-center gap-8 text-sm text-[#1F1F1F] lg:flex">
                <a href="#how-it-works" className="border-b border-transparent transition hover:border-[#1F1F1F]/35 hover:text-[#1F1F1F]">How it works</a>
                <a href="#modes" className="border-b border-transparent transition hover:border-[#1F1F1F]/35 hover:text-[#1F1F1F]">Modes</a>
                <a href="#preview" className="border-b border-transparent transition hover:border-[#1F1F1F]/35 hover:text-[#1F1F1F]">Preview</a>
                <a href="#why-cue" className="border-b border-transparent transition hover:border-[#1F1F1F]/35 hover:text-[#1F1F1F]">Why Cue</a>
              </nav>

              <div className="flex items-center gap-3">
                <span className="hidden rounded-full bg-[#ADCAE8]/30 px-3 py-2 text-xs font-medium text-[#333333] sm:inline-flex">
                  {mode === "live" ? "Live Presentation" : "Coach Mode"}
                </span>
                <SetupButton onClick={attemptStartSession} disabled={preparing} className="px-5 py-2.5 text-xs sm:text-sm">
                  {preparing ? "Preparing..." : "Launch Cue"}
                </SetupButton>
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-7xl px-5 pb-20 pt-8 sm:px-8 lg:px-10 lg:pt-12">
            <section className="mx-auto flex max-w-4xl flex-col items-center text-center">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-3 rounded-full border border-[#ADCAE8]/60 bg-white/90 px-4 py-2 text-sm text-[#333333] shadow-[0_14px_40px_rgba(173,202,232,0.18)]">
                  <span className="h-2.5 w-2.5 rounded-full bg-[#D95C5C]" />
                  Live pitch presentation support
                </div>
                <h1 className="mx-auto mt-6 max-w-[14ch] font-['Fraunces',serif] text-5xl leading-[0.96] tracking-[-0.04em] text-[#333333] sm:text-6xl lg:text-7xl">
                  <span className="block">every point,</span>
                  <span className="block">on point.</span>
                </h1>
                <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#333333]/72 sm:text-xl">
                  Cue is the presentation co-pilot that listens quietly, tracks what you have covered, and nudges only when a missed idea would break your flow.
                </p>

                <div className="mt-8 flex flex-wrap justify-center gap-4">
                  <SetupButton onClick={attemptStartSession} disabled={preparing}>
                    {preparing ? "Preparing your deck..." : "Start presentation mode"}
                  </SetupButton>
                  <SetupButton variant="secondary" onClick={() => setMode((prev) => (prev === "live" ? "demo" : "live"))}>
                    {mode === "live" ? "Switch to Coach Mode" : "Switch to Live Presentation"}
                  </SetupButton>
                </div>

                <div className="mt-14 grid gap-4 sm:grid-cols-2">
                  <SetupCard className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Live Presentation</p>
                    <p className="mt-3 text-lg font-semibold">Quiet support while the room is watching.</p>
                    <p className="mt-2 text-sm leading-7 text-[#333333]/72">
                      Real-time listening, slide-aware tracking, and subtle cueing that waits for natural pauses.
                    </p>
                  </SetupCard>
                  <SetupCard className="p-5">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Coach Mode</p>
                    <p className="mt-3 text-lg font-semibold">Rehearse smarter before you go live.</p>
                    <p className="mt-2 text-sm leading-7 text-[#333333]/72">
                      Practice delivery, spot missed ideas, and refine pacing before the real presentation starts.
                    </p>
                  </SetupCard>
                </div>
              </div>
            </section>

            <section className="mt-14">
              <SetupCard className="overflow-hidden p-6 sm:p-8">
                <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Launch Setup</p>
                    <h2 className="mt-4 font-['Fraunces',serif] text-3xl leading-tight tracking-[-0.03em] sm:text-4xl">
                      Prepare Cue in a minute, then let it disappear into the background.
                    </h2>
                    <p className="mt-4 max-w-xl text-base leading-8 text-[#333333]/72">
                      Upload your PDF, choose how you want to use Cue, and start when the deck is ready. The experience is designed to feel polished before the presentation and invisible during it.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <button
                        onClick={() => setMode("live")}
                        className={`rounded-[24px] p-5 text-left transition duration-300 ${
                          mode === "live"
                            ? "bg-[#333333] text-white shadow-[0_18px_60px_rgba(51,51,51,0.18)]"
                            : "bg-[#F6F8F9] text-[#333333] ring-1 ring-[#ADCAE8]/50 hover:bg-white"
                        }`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D95C5C]">Mode One</p>
                        <p className="mt-3 text-xl font-semibold">Live Microphone</p>
                        <p className="mt-2 text-sm leading-6 opacity-80">Cue listens live and only nudges when needed.</p>
                      </button>
                      <button
                        onClick={() => setMode("demo")}
                        className={`rounded-[24px] p-5 text-left transition duration-300 ${
                          mode === "demo"
                            ? "bg-[#ADCAE8] text-[#333333] shadow-[0_18px_60px_rgba(173,202,232,0.28)]"
                            : "bg-[#F6F8F9] text-[#333333] ring-1 ring-[#ADCAE8]/50 hover:bg-white"
                        }`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.24em] text-[#D95C5C]">Mode Two</p>
                        <p className="mt-3 text-xl font-semibold">Coach Mode</p>
                        <p className="mt-2 text-sm leading-6 opacity-80">Practice the structure before the real talk.</p>
                      </button>
                    </div>

                    <div
                      ref={uploadSectionRef}
                      className={`rounded-[24px] bg-[#F6F8F9] p-5 transition duration-500 ${
                        uploadHighlight
                          ? "ring-2 ring-[#D95C5C] shadow-[0_0_0_10px_rgba(217,92,92,0.08)]"
                          : "ring-1 ring-[#ADCAE8]/50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <label className="text-sm font-semibold text-[#333333]">Upload your deck</label>
                        {uploadPromptVisible ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-[#D95C5C]/10 px-3 py-1.5 text-xs font-semibold text-[#D95C5C]">
                            <span className="text-sm leading-none">!</span>
                            Required
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-sm leading-6 text-[#333333]/72">
                        Cue reads each slide, identifies which ones are content slides, and prepares the live experience before you begin.
                      </p>
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        onChange={handlePdfUpload}
                        className="mt-4 block w-full rounded-[20px] border border-dashed border-[#ADCAE8]/70 bg-white px-4 py-5 text-sm text-[#333333]"
                      />
                      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                        <span className="rounded-full bg-white px-3 py-1.5 text-[#333333] ring-1 ring-[#ADCAE8]/55">
                          {uploadState === "loading"
                            ? "Reading PDF..."
                            : uploadState === "success"
                              ? `${pdfName} · ${pdfPageCount} pages`
                              : pdfName}
                        </span>
                        {uploadError ? <span className="text-[#D95C5C]">{uploadError}</span> : null}
                      </div>
                      {uploadPromptVisible ? (
                        <p className="mt-4 text-sm font-medium text-[#D95C5C]">
                          Please upload your presentation first.
                        </p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <SetupButton onClick={attemptStartSession} disabled={preparing}>
                        {preparing ? "Preparing..." : "Start with Cue"}
                      </SetupButton>
                      <div className="rounded-full bg-[#ADCAE8]/35 px-4 py-2 text-sm text-[#333333]">
                        {statusMessage}
                      </div>
                    </div>
                  </div>
                </div>
              </SetupCard>
            </section>

            <section id="how-it-works" className="mt-24">
              <div className="max-w-2xl">
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">How it works</p>
                <h2 className="mt-4 font-['Fraunces',serif] text-4xl tracking-[-0.03em] text-[#333333] sm:text-5xl">
                  A subtle cue right when you need it.
                </h2>
              </div>
              <div className="mt-10 grid gap-5 lg:grid-cols-3">
                {marketingSteps.map((step) => (
                  <SetupCard key={step.title} className="p-6 sm:p-7">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-[#D95C5C]">{step.eyebrow}</p>
                    <h3 className="mt-5 text-2xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-[#333333]/72">{step.description}</p>
                  </SetupCard>
                ))}
              </div>
            </section>

            <section id="modes" className="mt-24">
              <div className="grid gap-6 lg:grid-cols-2">
                {modeCards.map((card, index) => (
                  <div
                    key={card.title}
                    className={`overflow-hidden rounded-[34px] p-8 shadow-[0_24px_90px_rgba(96,125,139,0.12)] ${
                      index === 0
                        ? "bg-[linear-gradient(180deg,#ffffff_0%,#eef6fb_100%)] ring-1 ring-[#ADCAE8]/55"
                        : "bg-[linear-gradient(180deg,#ADCAE8_0%,#7F9CB8_100%)] text-[#333333]"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`rounded-full px-3 py-2 text-[11px] uppercase tracking-[0.24em] ${
                        index === 0 ? "bg-[#D95C5C]/10 text-[#D95C5C]" : "bg-white/45 text-[#333333]/75"
                      }`}>
                        {card.label}
                      </span>
                      <span className={`h-3 w-3 rounded-full ${index === 0 ? "bg-[#D95C5C]" : "bg-white/70"}`} />
                    </div>
                    <h3 className="mt-6 text-3xl font-semibold tracking-tight">{card.title}</h3>
                    <p className={`mt-4 text-base leading-8 ${index === 0 ? "text-[#333333]/72" : "text-[#333333]/78"}`}>
                      {card.description}
                    </p>
                    <div className="mt-8 space-y-3">
                      {card.points.map((point) => (
                        <div
                          key={point}
                          className={`rounded-[20px] px-4 py-3 text-sm ${
                            index === 0 ? "bg-white text-[#333333] ring-1 ring-[#ADCAE8]/50" : "bg-white/45 text-[#333333]"
                          }`}
                        >
                          {point}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-24 grid gap-12 lg:grid-cols-[0.78fr_1.22fr]">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Feature Highlights</p>
                <h2 className="mt-4 font-['Fraunces',serif] text-4xl tracking-[-0.03em] text-[#333333] sm:text-5xl">
                  Built to feel intelligent, minimal, and confidence-boosting.
                </h2>
                <p className="mt-5 text-base leading-8 text-[#333333]/72">
                  The design language is calm because the product is calm. Cue helps the presenter recover smoothly, not perform for the software.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {marketingFeatures.map((feature, index) => (
                  <SetupCard key={feature} className="p-5">
                    <div className="flex items-start gap-4">
                      <div className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-[#D95C5C]/10 text-[#D95C5C]">
                        {index % 3 === 0 ? "●" : index % 3 === 1 ? "◌" : "◍"}
                      </div>
                      <p className="text-base leading-7 text-[#333333]">{feature}</p>
                    </div>
                  </SetupCard>
                ))}
              </div>
            </section>

            <section id="preview" className="mt-24">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <SetupCard className="overflow-hidden p-6 sm:p-8">
                  <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Product Preview</p>
                  <div className="mt-6 rounded-[30px] bg-[#333333] p-5 text-white">
                    <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                      <div className="rounded-[24px] bg-[linear-gradient(180deg,#ADCAE8_0%,#7F9CB8_100%)] p-5">
                        <p className="text-[11px] uppercase tracking-[0.24em] text-white/55">Presentation View</p>
                        <div className="mt-4 rounded-[22px] border border-white/10 bg-white/10 p-4">
                          <div className="h-48 rounded-[18px] bg-[linear-gradient(135deg,rgba(255,255,255,0.14),rgba(255,255,255,0.02))]" />
                          <div className="mt-4 flex items-center justify-between rounded-[18px] bg-white px-4 py-3 text-[#333333]">
                            <span className="text-sm font-semibold">Cue dot</span>
                            <div className="flex items-center gap-2 rounded-full bg-[#B0BEC5]/24 px-3 py-1.5">
                              <span className="text-xl">🔁</span>
                              <span className="text-sm">consistency</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div className="rounded-[24px] bg-white p-4 text-[#333333] ring-1 ring-white/10">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[#1F1F1F]">Transcript</p>
                          <p className="mt-3 text-sm leading-7 text-[#333333]/72">
                            “We optimize reorder timing, reduce holding costs, and adapt when supply shifts.”
                          </p>
                        </div>
                        <div className="rounded-[24px] bg-white p-4 text-[#333333] ring-1 ring-white/10">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[#1F1F1F]">Checklist Tracking</p>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="rounded-[16px] bg-[#F6F8F9] px-3 py-3">✅ demand forecasting</div>
                            <div className="rounded-[16px] bg-[#F6F8F9] px-3 py-3">🔔 inventory optimization</div>
                            <div className="rounded-[16px] bg-[#F6F8F9] px-3 py-3">⭕ material substitution</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </SetupCard>

                <div className="space-y-6">
                  <SetupCard className="p-6">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Coach View</p>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight">See missed ideas before the room does.</h3>
                    <p className="mt-3 text-sm leading-7 text-[#333333]/72">
                      Coach Mode gives a fuller review of where the story drifted, where points were skipped, and how to tighten the next run.
                    </p>
                  </SetupCard>
                  <SetupCard className="overflow-hidden p-0">
                    <div className="bg-[linear-gradient(180deg,#ffffff_0%,#eef3f5_100%)] p-6">
                      <div className="rounded-[24px] bg-[#ADCAE8] p-5 text-[#333333]">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.24em] text-[#333333]/48">Coach Summary</p>
                          <span className="rounded-full bg-white/50 px-3 py-1.5 text-xs">Rehearsal Run</span>
                        </div>
                        <div className="mt-5 space-y-3">
                          <div className="rounded-[18px] bg-white/55 px-4 py-3 text-sm">Pacing: calm, but slide three lingered too long.</div>
                          <div className="rounded-[18px] bg-white/55 px-4 py-3 text-sm">Missed point: inventory optimization.</div>
                          <div className="rounded-[18px] bg-white/55 px-4 py-3 text-sm">Recovered well after the final prompt.</div>
                        </div>
                      </div>
                    </div>
                  </SetupCard>
                </div>
              </div>
            </section>

            <section id="why-cue" className="mt-24">
              <SetupCard className="overflow-hidden p-8 sm:p-10">
                <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#1F1F1F]">Why Cue</p>
                    <h2 className="mt-4 font-['Fraunces',serif] text-4xl tracking-[-0.03em] text-[#333333] sm:text-5xl">
                      Never lose your flow. Never lose the point.
                    </h2>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {[
                      "Never miss the point you meant to land.",
                      "Present with more confidence and less cognitive load.",
                      "Recover smoothly when a detail slips.",
                      "Rehearse smarter before the real moment arrives.",
                    ].map((value) => (
                      <div key={value} className="rounded-[22px] bg-[#F6F8F9] px-5 py-5 text-sm leading-7 text-[#333333] ring-1 ring-[#ADCAE8]/50">
                        {value}
                      </div>
                    ))}
                  </div>
                </div>
              </SetupCard>
            </section>

            <section className="mt-24 pb-8">
              <div className="overflow-hidden rounded-[36px] bg-[linear-gradient(135deg,#333333_0%,#ADCAE8_100%)] px-6 py-10 text-white shadow-[0_30px_100px_rgba(51,51,51,0.18)] sm:px-10 sm:py-12">
                <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-white/55">Ready to present</p>
                    <h2 className="mt-4 max-w-[14ch] font-['Fraunces',serif] text-4xl tracking-[-0.03em] sm:text-5xl">
                      A calmer presentation starts before the first sentence.
                    </h2>
                    <p className="mt-4 max-w-2xl text-base leading-8 text-white/76">
                      Start with your deck, choose how you want Cue to support you, and keep every point within reach.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <SetupButton onClick={attemptStartSession} disabled={preparing}>
                      {preparing ? "Preparing..." : "Launch Cue"}
                    </SetupButton>
                    <SetupButton variant="secondary" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
                      Back to top
                    </SetupButton>
                  </div>
                </div>
              </div>
            </section>

            <footer className="border-t border-[#ADCAE8]/50 py-8 text-sm text-[#333333]/72">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-10">
                  <div>
                    <span className="font-semibold text-[#333333]">Cue</span>
                    <span className="block">every point,</span>
                    <span className="block">on point.</span>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-[#333333]/64">
                    <a href="mailto:hala@cue.ae" className="transition hover:text-[#333333]">
                      hala@cue.ae
                    </a>
                    <a href="mailto:nada@cue.ae" className="transition hover:text-[#333333]">
                      nada@cue.ae
                    </a>
                    <a href="mailto:zainah@cue.ae" className="transition hover:text-[#333333]">
                      zainah@cue.ae
                    </a>
                    <a href="mailto:sara@cue.ae" className="transition hover:text-[#333333]">
                      sara@cue.ae
                    </a>
                  </div>
                </div>
                <div className="flex flex-wrap gap-5">
                  <span>Live Presentation</span>
                  <span>Coach Mode</span>
                  <span>Presentation intelligence, designed to stay quiet.</span>
                </div>
              </div>
            </footer>
          </main>
        </div>
      </div>
    );
  }

  return (
        <div ref={presentationRef} className="fixed inset-0 z-40 bg-[#111827]">
          {pdfUrl ? (
            <iframe
              key={`pdf-page-${currentPdfPage}`}
              title="Uploaded presentation"
              src={`${pdfUrl}#page=${currentPdfPage}&view=FitH`}
              className="h-full w-full bg-white"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-[#111827] px-8 text-center text-white/75">
              No PDF uploaded. Upload a PDF if you want the slide deck visible during presentation mode.
            </div>
          )}

          <div className="fixed bottom-4 left-4 z-50 flex max-w-[calc(100vw-2rem)] flex-wrap gap-3">
            <button
              onClick={() => attemptSlideMove("previous")}
              className="rounded-full bg-white/90 px-6 py-3 font-semibold text-ink shadow-lg"
            >
              ← Previous
            </button>
            <button
              onClick={() => attemptSlideMove("next")}
              className="rounded-full bg-gold px-6 py-3 font-semibold text-ink shadow-lg"
            >
              Next →
            </button>
            <button
              onClick={fullscreenActive ? exitFullscreen : enterFullscreen}
              className="rounded-full bg-white/90 px-6 py-3 font-semibold text-ink shadow-lg"
            >
              {fullscreenActive ? "Exit Full Screen" : "Full Screen"}
            </button>
            <button
              onClick={finishSession}
              className="rounded-full bg-coral px-6 py-3 font-semibold text-white shadow-lg"
            >
              Stop
            </button>
            <button
              onClick={goToSetup}
              className="rounded-full bg-ink px-6 py-3 font-semibold text-white shadow-lg"
            >
              Back to Setup
            </button>
          </div>

          <div className="fixed bottom-5 right-5 z-[70] flex max-w-[calc(100vw-2rem)] flex-col items-end gap-3">
            {hintBubble.visible ? (
              <div className={`rounded-2xl ${bubbleClass} px-4 py-3 text-sm font-semibold shadow-xl`}>
                <div className="flex items-center gap-2">
                  {hintBubble.icon ? <span className="text-2xl leading-none">{hintBubble.icon}</span> : null}
                  {hintBubble.text ? <span>{hintBubble.text}</span> : null}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col items-end gap-2">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/85 text-white shadow-2xl ring-1 ring-white/10">
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">
                  {cueState.cueVisible && cueState.cueType === "icon" && cueState.cueIcon
                    ? cueState.cueIcon
                    : cueState.cueVisible
                      ? "Cue"
                      : "C"}
                </span>
              </div>

              {cueState.cueVisible ? (
                <div className="min-w-[8rem] max-w-[16rem] rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-black shadow-2xl ring-1 ring-black/10">
                  <div className="flex items-center gap-2">
                    {cueState.cueIcon ? <span className="text-2xl leading-none">{cueState.cueIcon}</span> : null}
                    <span>{cueState.cueType === "icon" ? cueState.cueIcon || cueState.currentCue : cueState.cueKeyword || cueState.currentCue}</span>
                  </div>
                </div>
              ) : null}

            </div>
          </div>

          <div
            className="fixed z-50 w-[20rem] max-w-[calc(100vw-2rem)] space-y-3"
            style={{ left: `${transcriptPanelPosition.x}px`, top: `${transcriptPanelPosition.y}px` }}
          >
            <div className="rounded-2xl bg-black/45 px-4 py-3 text-sm text-white/90 shadow-lg backdrop-blur">
              <div
                onPointerDown={startTranscriptDrag}
                className="flex cursor-move items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-2 py-2"
              >
                <span className="font-semibold">Transcript</span>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-xs ${speakingNow ? "bg-emerald-500/80" : "bg-white/15"}`}>
                    {speakingNow ? "Speaking" : "Paused"}
                  </span>
                  <button
                    onClick={() => setTranscriptExpanded((prev) => !prev)}
                    className="rounded-full bg-white/10 px-2 py-1 text-xs"
                  >
                    {transcriptExpanded ? "Collapse" : "Expand"}
                  </button>
                </div>
              </div>
              <div
                ref={transcriptScrollRef}
                className={`mt-3 space-y-2 overflow-y-auto pr-1 ${transcriptExpanded ? "max-h-56" : "max-h-20"}`}
              >
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Live</p>
                  <p className="mt-1 min-h-[1.25rem] text-white/75">{interimTranscript || "..."}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-white/55">Final</p>
                  <div className="mt-1 space-y-1 text-white">
                    {(transcriptExpanded ? transcript : transcript.slice(-2)).map((line, index) => (
                      <p key={`${line}-${index}`}>{line}</p>
                    ))}
                    {!transcript.length ? <p>No final transcript yet.</p> : null}
                  </div>
                </div>
              </div>
            </div>

            {activeSlide?.nonContent ? (
              <div className="rounded-2xl bg-black/45 px-4 py-3 text-sm text-white/90 shadow-lg backdrop-blur">
                <p className="font-semibold">Passive Slide</p>
                <p className="mt-2 text-sm text-white/70">
                  This slide is being treated as a title or transition slide. Cue, checklist tracking, and auto-advance are off here.
                </p>
              </div>
            ) : checklistPoints.length ? (
              <div className="rounded-2xl bg-black/45 px-4 py-3 text-sm text-white/90 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">Checklist</p>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-[0.16em] text-white/55">
                      <span>Complete: {slideComplete ? "Yes" : "No"}</span>
                      <span>Speaking: {speakingNow ? "Yes" : "No"}</span>
                      <span>Ready: {autoAdvanceReady ? "Yes" : "No"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-white/60">
                      {activeSlide ? `Slide ${activeSlideIndex + 1}` : ""}
                    </span>
                    <button
                      onClick={() => setChecklistCompact((prev) => !prev)}
                      className="rounded-full bg-white/10 px-2 py-1 text-[11px] font-medium text-white/80"
                    >
                      {checklistCompact ? "Expand" : "Compact"}
                    </button>
                  </div>
                </div>
                <div className={`mt-3 ${checklistCompact ? "space-y-1.5" : "space-y-2"}`}>
                  {checklistPoints.map((point) => (
                    <div
                      key={point.id}
                      title={checklistCompact ? point.label : undefined}
                      className={`flex items-start gap-2 rounded-xl bg-white/5 ${
                        checklistCompact
                          ? "px-2.5 py-1.5"
                          : "px-3 py-2"
                      } ${point.status === "covered" ? "opacity-65" : "opacity-100"}`}
                    >
                      <span className={`${checklistCompact ? "text-sm" : "text-base"} leading-none`}>
                        {point.status === "covered" ? "✅" : point.status === "cued" ? "🔔" : "⭕"}
                      </span>
                      <span
                        className={`min-w-0 flex-1 text-white/90 ${
                          checklistCompact ? "truncate text-xs" : "text-sm"
                        }`}
                      >
                        {point.label}
                      </span>
                    </div>
                  ))}
                </div>
                {checklistCompact && compactCompletedCount ? (
                  <p className="mt-3 text-[11px] text-white/45">
                    {compactCompletedCount} completed item{compactCompletedCount === 1 ? "" : "s"} faded to keep the panel light.
                  </p>
                ) : null}
                <div className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-white/70">
                  <p className="font-semibold text-white/85">{currentSlideLabel}</p>
                  <p className="mt-1">Cue target: {nextCueCandidate || "None"}</p>
                  <p className="mt-1">Covered: {coveredPointLabels.length ? coveredPointLabels.join(" • ") : "None yet"}</p>
                  <p className="mt-1">Missing: {missingPointLabels.length ? missingPointLabels.join(" • ") : "None"}</p>
                  <p className="mt-1">Last final: {lastFinalTranscript || "No final transcript yet"}</p>
                  <p className="mt-1">
                    Best semantic match: {bestRecentMatch ? `${bestRecentMatch.label} (${bestRecentMatch.score})` : "Waiting for speech"}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
  );
}
