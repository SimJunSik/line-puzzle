const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');
const timeLeftEl = document.getElementById('time-left');
const timeLimitEl = document.getElementById('time-limit');
const rankingListLocalEl = document.getElementById('ranking-list-local');
const rankingListGlobalEl = document.getElementById('ranking-list-global');
const resetBtn = document.getElementById('reset-btn');
const prevLevelBtn = document.getElementById('prev-level-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const levelSelectEl = document.getElementById('level-select');
const nicknameInputEl = document.getElementById('nickname-input');
const submitScoreBtn = document.getElementById('submit-score-btn');
const submitStatusEl = document.getElementById('submit-status');
const aiRunBtn = document.getElementById('ai-run-btn');
const aiStatusEl = document.getElementById('ai-status');
const tabButtons = Array.from(document.querySelectorAll('.tab-btn'));
const rankingPanels = {
  local: document.getElementById('ranking-local'),
  global: document.getElementById('ranking-global'),
};
const labelTimeLimitEl = document.getElementById('label-time-limit');
const labelTimeLeftEl = document.getElementById('label-time-left');
const labelStatusEl = document.getElementById('label-status');
const labelLevelSelectEl = document.getElementById('label-level-select');
const rankingTitleEl = document.getElementById('ranking-title');
const aiChallengeTitleEl = document.getElementById('ai-challenge-title');
const aiChallengeDescEl = document.getElementById('ai-challenge-desc');
const aiSpeedLabelEl = document.getElementById('ai-speed-label');
const aiSpeedButtons = Array.from(
  document.querySelectorAll('#ai-speed-buttons .ai-btn')
);
const aiBenchmarkEl = document.getElementById('ai-benchmark');
const playerBestEl = document.getElementById('player-best');
const aiResultEl = document.getElementById('ai-result');

const TIME_LIMIT = 15;
const START_RADIUS = 18;
const GOAL_RADIUS = 20;

const SUPABASE_URL = 'https://ezlufhsgcadelzfmkruy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV6bHVmaHNnY2FkZWx6Zm1rcnV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1NTgxNTgsImV4cCI6MjA4NTEzNDE1OH0.lIx6hwdOOA6M--TdFHjOlh-nxlpn4jO5N7On55aaYmk';

const LEVEL_COUNT = 8;
const MIN_SCORE_MS = 300;
const GLOBAL_LIMIT = 10;
const SUBMIT_COOLDOWN_MS = 5000;
const POINT_MARGIN = 60;

let levelIndex = 0;
let isDrawing = false;
let path = [];
let startTime = null;
let timeLeft = TIME_LIMIT;
let timerId = null;
let lastScoreMs = null;
let submitCooldownUntil = 0;
let levelState = null;
let lastImpactPoint = null;
let effectActive = false;
let lastEffectTime = 0;
const effects = {
  flash: null,
  particles: [],
};
let aiRunning = false;
let aiTimerId = null;
let aiPath = [];
let aiStepIndex = 0;
let aiAttemptIndex = 0;
const aiOptions = [
  { cellSize: 18, padding: 2 },
  { cellSize: 14, padding: 1 },
  { cellSize: 10, padding: 0 },
  { cellSize: 8, padding: 0 },
  { cellSize: 6, padding: 0 },
];
const AI_SPEEDS = {
  fast: 20,
  normal: 40,
  slow: 60,
};
const AI_FAST_STEP_MS = 20;
let aiStepIntervalMs = AI_SPEEDS.fast;
const aiBenchmarksMs = {};
const aiWinStateByLevel = {};
const AI_BENCHMARK_FALLBACK_MS = 99999;
const AI_PIXEL_PER_SEC = 220;
const locale = navigator.language?.toLowerCase() || 'en';
const isKorean = locale.startsWith('ko');
const i18n = {
  ko: {
    timeLimit: '제한 시간',
    timeLeft: '남은 시간',
    status: '상태',
    idle: '대기',
    playing: '진행 중',
    success: (time) => `성공 (${time}s)`,
    fail: (reason) => `실패 (${reason})`,
    timeOver: '시간 초과',
    wallHit: '벽 충돌',
    gateHit: '게이트 충돌',
    goalMiss: '도착 실패',
    levelSelect: '레벨 선택',
    rankingTitle: '랭킹 (최단 시간)',
    local: '로컬',
    global: '글로벌',
    empty: '기록이 없습니다.',
    submit: '기록 제출',
    submitReady: '기록 제출 가능',
    submitPending: '제출 중...',
    submitDone: '제출 완료!',
    submitFail: '제출에 실패했습니다.',
    submitInvalid: '기록이 유효하지 않습니다.',
    submitMissing: '제출할 기록이 없습니다.',
    submitUnconfigured: '글로벌 랭킹 미설정',
    submitRetry: (seconds) => `재시도까지 ${seconds}s`,
    nicknamePlaceholder: '닉네임 (선택)',
    reset: '다시 시작',
    prevLevel: '이전 레벨',
    nextLevel: '다음 레벨',
    aiPlay: 'AI 플레이',
    aiStop: 'AI 중지',
    aiThinking: 'AI 계산 중...',
    aiRunning: 'AI 실행 중...',
    aiNoPath: '경로를 찾지 못했습니다.',
    aiRetrying: '다시 계산 중...',
    aiChallengeTitle: 'AI 챌린지',
    aiChallengeDesc: 'AI 기록을 넘기면 승리! 각 레벨별 AI 기준 기록이 있습니다.',
    aiBenchmark: (time) => `AI 기록: ${time}`,
    playerBest: (time) => `내 최고 기록: ${time}`,
    aiResultIdle: '결과: 대기',
    aiResultWin: '결과: 승리',
    aiResultLose: '결과: 패배',
    aiSpeedLabel: 'AI 속도',
    aiFast: '빠름',
    aiNormal: '보통',
    aiSlow: '천천히',
  },
  en: {
    timeLimit: 'Time limit',
    timeLeft: 'Time left',
    status: 'Status',
    idle: 'Idle',
    playing: 'Playing',
    success: (time) => `Clear (${time}s)`,
    fail: (reason) => `Fail (${reason})`,
    timeOver: 'Time over',
    wallHit: 'Wall hit',
    gateHit: 'Gate hit',
    goalMiss: 'Missed goal',
    levelSelect: 'Level',
    rankingTitle: 'Ranking (Best Time)',
    local: 'Local',
    global: 'Global',
    empty: 'No records yet.',
    submit: 'Submit score',
    submitReady: 'Ready to submit',
    submitPending: 'Submitting...',
    submitDone: 'Submitted!',
    submitFail: 'Submit failed.',
    submitInvalid: 'Invalid score.',
    submitMissing: 'No score to submit.',
    submitUnconfigured: 'Global ranking not configured',
    submitRetry: (seconds) => `Retry in ${seconds}s`,
    nicknamePlaceholder: 'Nickname (optional)',
    reset: 'Restart',
    prevLevel: 'Prev',
    nextLevel: 'Next',
    aiPlay: 'AI Play',
    aiStop: 'Stop AI',
    aiThinking: 'AI is thinking...',
    aiRunning: 'AI is drawing...',
    aiNoPath: 'No safe path found.',
    aiRetrying: 'Retrying...',
    aiChallengeTitle: 'AI Challenge',
    aiChallengeDesc: 'Beat the AI time for each level.',
    aiBenchmark: (time) => `AI Time: ${time}`,
    playerBest: (time) => `Your Best: ${time}`,
    aiResultIdle: 'Result: Pending',
    aiResultWin: 'Result: Win',
    aiResultLose: 'Result: Lose',
    aiSpeedLabel: 'AI Speed',
    aiFast: 'Fast',
    aiNormal: 'Normal',
    aiSlow: 'Slow',
  },
};

function t(key, ...args) {
  const lang = isKorean ? i18n.ko : i18n.en;
  const value = lang[key];
  return typeof value === 'function' ? value(...args) : value;
}

function getLevelName(level) {
  return isKorean ? level.nameKo : level.nameEn;
}

function applyLocaleText() {
  labelTimeLimitEl.textContent = t('timeLimit');
  labelTimeLeftEl.textContent = t('timeLeft');
  labelStatusEl.textContent = t('status');
  labelLevelSelectEl.textContent = t('levelSelect');
  rankingTitleEl.textContent = t('rankingTitle');
  aiChallengeTitleEl.textContent = t('aiChallengeTitle');
  aiChallengeDescEl.textContent = t('aiChallengeDesc');
  aiSpeedLabelEl.textContent = t('aiSpeedLabel');
  const localTab = tabButtons.find((btn) => btn.dataset.tab === 'local');
  const globalTab = tabButtons.find((btn) => btn.dataset.tab === 'global');
  if (localTab) localTab.textContent = t('local');
  if (globalTab) globalTab.textContent = t('global');
  resetBtn.textContent = t('reset');
  prevLevelBtn.textContent = t('prevLevel');
  nextLevelBtn.textContent = t('nextLevel');
  submitScoreBtn.textContent = t('submit');
  nicknameInputEl.placeholder = t('nicknamePlaceholder');
  aiRunBtn.textContent = aiRunning ? t('aiStop') : t('aiPlay');
  aiSpeedButtons.forEach((btn) => {
    const key =
      btn.dataset.speed === 'fast'
        ? 'aiFast'
        : btn.dataset.speed === 'normal'
          ? 'aiNormal'
          : 'aiSlow';
    btn.textContent = t(key);
  });
}

let levels = [];

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function randomInRange(rng, min, max) {
  return min + rng() * (max - min);
}

function getDifficulty(levelId) {
  if (levelId <= 15) return { label: '쉬움', gap: 180, columns: 4 };
  if (levelId <= 35) return { label: '보통', gap: 140, columns: 5 };
  return { label: '어려움', gap: 110, columns: 6 };
}

function createLevelState(level) {
  if (!level.dynamic) {
    return { groupActive: {}, switchInside: new Set() };
  }
  const groupActive = { ...level.dynamic.groupActive };
  return {
    groupActive,
    switchInside: new Set(),
  };
}

function buildSpiralMaze(rng) {
  const obstacles = [];
  const thickness = 40;
  const margin = 80;
  const width = canvas.width;
  const height = canvas.height;
  const inset = 120 + Math.floor(rng() * 40);
  obstacles.push({
    x: width - margin - thickness,
    y: margin,
    w: thickness,
    h: height - margin * 2,
  });
  obstacles.push({
    x: margin,
    y: height - margin - thickness,
    w: width - margin * 2,
    h: thickness,
  });
  obstacles.push({
    x: margin,
    y: margin + thickness,
    w: thickness,
    h: height - margin * 2 - thickness,
  });
  obstacles.push({
    x: margin + thickness,
    y: margin,
    w: width - margin * 2 - thickness,
    h: thickness,
  });
  obstacles.push({
    x: width - inset - thickness,
    y: margin + inset,
    w: thickness,
    h: height - margin - inset * 2,
  });
  obstacles.push({
    x: margin + inset,
    y: margin + inset,
    w: width - margin - inset * 2 - thickness,
    h: thickness,
  });
  obstacles.push({
    x: width / 2 - 50,
    y: height / 2 - 50,
    w: 100,
    h: 100,
  });
  return obstacles;
}

function buildRingObstacles(rng, gapXOverride) {
  const obstacles = [];
  const ring = {
    x: 200,
    y: 110,
    w: canvas.width - 400,
    h: canvas.height - 220,
  };
  const thickness = 40;
  const gapWidth = 120;
  const gapX =
    gapXOverride ?? randomInRange(rng, ring.x + 60, ring.x + ring.w - 60);
  obstacles.push({
    x: ring.x,
    y: ring.y,
    w: Math.max(40, gapX - ring.x - gapWidth / 2),
    h: thickness,
  });
  obstacles.push({
    x: gapX + gapWidth / 2,
    y: ring.y,
    w: ring.x + ring.w - (gapX + gapWidth / 2),
    h: thickness,
  });
  obstacles.push({
    x: ring.x,
    y: ring.y + ring.h - thickness,
    w: Math.max(40, gapX - ring.x - gapWidth / 2),
    h: thickness,
  });
  obstacles.push({
    x: gapX + gapWidth / 2,
    y: ring.y + ring.h - thickness,
    w: ring.x + ring.w - (gapX + gapWidth / 2),
    h: thickness,
  });
  obstacles.push({
    x: ring.x,
    y: ring.y,
    w: thickness,
    h: ring.h,
  });
  obstacles.push({
    x: ring.x + ring.w - thickness,
    y: ring.y,
    w: thickness,
    h: ring.h,
  });
  obstacles.push({
    x: canvas.width / 2 - 70,
    y: canvas.height / 2 - 70,
    w: 140,
    h: 140,
  });
  return { obstacles, gapX };
}

function buildSwitchGates() {
  const obstacles = [];
  const dynamic = {
    gates: [],
    switches: [],
    groupActive: { A: true, B: false },
  };
  const laneTop = 120;
  const laneBottom = canvas.height - 120;
  obstacles.push({
    x: 140,
    y: canvas.height / 2 - 18,
    w: canvas.width - 280,
    h: 36,
  });
  dynamic.gates.push({
    group: 'A',
    rect: { x: 420, y: 60, w: 40, h: canvas.height / 2 - 90 },
  });
  dynamic.gates.push({
    group: 'B',
    rect: { x: 420, y: canvas.height / 2 + 30, w: 40, h: canvas.height / 2 - 90 },
  });
  dynamic.gates.push({
    group: 'A',
    rect: { x: 620, y: canvas.height / 2 + 30, w: 40, h: canvas.height / 2 - 90 },
  });
  dynamic.gates.push({
    group: 'B',
    rect: { x: 620, y: 60, w: 40, h: canvas.height / 2 - 90 },
  });
  dynamic.switches.push({
    id: 'switch-1',
    x: 220,
    y: laneTop,
    r: 16,
    groups: ['A', 'B'],
  });
  dynamic.switches.push({
    id: 'switch-2',
    x: 220,
    y: laneBottom,
    r: 16,
    groups: ['A', 'B'],
  });
  return { obstacles, dynamic, laneTop, laneBottom };
}

function buildVerticalGates({ rng, columns, gap, gapCenters }) {
  const obstacles = [];
  const left = 140;
  const right = canvas.width - 140;
  const spacing = (right - left) / (columns + 1);
  for (let c = 1; c <= columns; c += 1) {
    const x = left + spacing * c;
    const gapCenter =
      gapCenters?.[c - 1] ??
      randomInRange(rng, 80, canvas.height - 80);
    const gapStart = Math.max(40, gapCenter - gap / 2);
    const gapEnd = Math.min(canvas.height - 40, gapCenter + gap / 2);
    const barWidth = 42;
    obstacles.push({
      x: x - barWidth / 2,
      y: 0,
      w: barWidth,
      h: gapStart,
    });
    obstacles.push({
      x: x - barWidth / 2,
      y: gapEnd,
      w: barWidth,
      h: canvas.height - gapEnd,
    });
  }
  return obstacles;
}

function buildHorizontalGates({ rng, rows, gap, gapCenters }) {
  const obstacles = [];
  const top = 90;
  const bottom = canvas.height - 90;
  const spacing = (bottom - top) / (rows + 1);
  for (let r = 1; r <= rows; r += 1) {
    const y = top + spacing * r;
    const gapCenter =
      gapCenters?.[r - 1] ??
      randomInRange(rng, 100, canvas.width - 100);
    const gapStart = Math.max(60, gapCenter - gap / 2);
    const gapEnd = Math.min(canvas.width - 60, gapCenter + gap / 2);
    const barHeight = 38;
    obstacles.push({
      x: 0,
      y: y - barHeight / 2,
      w: gapStart,
      h: barHeight,
    });
    obstacles.push({
      x: gapEnd,
      y: y - barHeight / 2,
      w: canvas.width - gapEnd,
      h: barHeight,
    });
  }
  return obstacles;
}

function buildSlalom({ rng, columns, gap, gapCenters }) {
  const obstacles = buildVerticalGates({ rng, columns, gap, gapCenters });
  for (let i = 0; i < columns - 1; i += 1) {
    const x = 200 + i * 90;
    const fromTop = i % 2 === 0;
    obstacles.push({
      x,
      y: fromTop ? 0 : canvas.height / 2 + 40,
      w: 30,
      h: fromTop ? canvas.height / 2 - 40 : canvas.height / 2 - 40,
    });
  }
  return obstacles;
}

function buildCorridorLocks({ rng, rows, gap, gapCenters }) {
  const obstacles = buildHorizontalGates({ rng, rows, gap, gapCenters });
  const middleX = canvas.width / 2 - 20;
  const blockCount = 3;
  for (let i = 0; i < blockCount; i += 1) {
    const y = 120 + i * 110;
    obstacles.push({
      x: middleX,
      y,
      w: 40,
      h: 60,
    });
  }
  return obstacles;
}

function buildZigzagWalls({ rng, columns, gapCenters, gap, blockEvery = 1 }) {
  const obstacles = buildVerticalGates({
    rng,
    columns,
    gap,
    gapCenters,
  });
  for (let i = 0; i < columns; i += 1) {
    if (blockEvery > 1 && i % blockEvery !== 0) {
      continue;
    }
    const x = 170 + i * 90;
    obstacles.push({
      x,
      y: canvas.height / 2 - 20,
      w: 50,
      h: 40,
    });
  }
  return obstacles;
}

function buildPerimeterWalls() {
  const thickness = 24;
  return [
    { x: 0, y: 0, w: canvas.width, h: thickness },
    { x: 0, y: canvas.height - thickness, w: canvas.width, h: thickness },
    { x: 0, y: 0, w: thickness, h: canvas.height },
    { x: canvas.width - thickness, y: 0, w: thickness, h: canvas.height },
  ];
}

function generateLevels(count) {
  const generated = [];
  const perimeter = buildPerimeterWalls();

  const templates = [
    { id: 1, nameKo: '기본 통로', nameEn: 'Basic Corridor', type: 'basic' },
    { id: 2, nameKo: '물결 통로', nameEn: 'Wave Corridor', type: 'wave' },
    { id: 3, nameKo: '상하 관문', nameEn: 'Vertical Gates', type: 'vertical' },
    { id: 4, nameKo: '지그재그', nameEn: 'Zigzag', type: 'zig' },
    { id: 5, nameKo: '지그재그 하드', nameEn: 'Zigzag Hard', type: 'zig-hard' },
    { id: 6, nameKo: '상하 관문 하드', nameEn: 'Vertical Gates Hard', type: 'vertical-hard' },
  ];

  const vG = (rng, columns, gap, gapCenters) =>
    buildVerticalGates({ rng, columns, gap, gapCenters });
  const hG = (rng, rows, gap, gapCenters) =>
    buildHorizontalGates({ rng, rows, gap, gapCenters });
  const zig = (rng, columns, gapCenters, gap) =>
    buildZigzagWalls({ rng, columns, gapCenters, gap });

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const applyGap = (base, hardness, attempt, min, max) =>
    clamp(base - hardness * 12 + attempt * 6, min, max);
  const applyCount = (base, hardness, min, max) =>
    clamp(base + Math.floor(hardness / 2), min, max);

  const buildLevelByType = (template, rng, hardness, attempt) => {
    if (template.type === 'basic') {
      const gapCenters = [250, 250, 250];
      const columns = applyCount(3, hardness, 3, 6);
      const gap = applyGap(210, hardness, attempt, 130, 230);
      return {
        flow: '직선',
        start: { x: POINT_MARGIN, y: canvas.height / 2 },
        goal: { x: canvas.width - POINT_MARGIN, y: canvas.height / 2 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'wave') {
      const gapCenters = [140, 330, 150, 320];
      const columns = applyCount(4, hardness, 4, 6);
      const gap = applyGap(170, hardness, attempt, 120, 220);
      return {
        flow: '파도',
        start: { x: POINT_MARGIN, y: 140 },
        goal: { x: canvas.width - POINT_MARGIN, y: 320 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'vertical') {
      const gapCenters = [200, 560, 220];
      const rows = applyCount(3, hardness, 3, 5);
      const gap = applyGap(190, hardness, attempt, 120, 220);
      return {
        flow: '상하',
        start: { x: 200, y: POINT_MARGIN },
        goal: { x: 220, y: canvas.height - POINT_MARGIN },
        obstacles: hG(rng, rows, gap, gapCenters.slice(0, rows)),
      };
    }
    if (template.type === 'zig') {
      const gapCenters = [110, 380, 120, 370];
      const columns = applyCount(4, hardness, 4, 6);
      const gap = applyGap(140, hardness, attempt, 110, 180);
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 110 },
        goal: { x: canvas.width - POINT_MARGIN, y: 380 },
        obstacles: zig(rng, columns, gapCenters.slice(0, columns), gap),
      };
    }
    if (template.type === 'zig-hard') {
      const gapCenters = [100, 390, 110, 380, 120, 370];
      const columns = applyCount(6, hardness, 5, 6);
      const gap = applyGap(130, hardness, attempt, 100, 170);
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 100 },
        goal: { x: canvas.width - POINT_MARGIN, y: 390 },
        obstacles: zig(rng, columns, gapCenters.slice(0, columns), gap),
      };
    }
    const gapCenters = [180, 600, 200, 580, 220];
    const rows = applyCount(5, hardness, 4, 6);
    const gap = applyGap(160, hardness, attempt, 110, 200);
    return {
      flow: '상하',
      start: { x: 180, y: POINT_MARGIN },
      goal: { x: 240, y: canvas.height - POINT_MARGIN },
      obstacles: hG(rng, rows, gap, gapCenters.slice(0, rows)),
    };
  };

  const makeValidated = (template, prevBenchmarkMs) => {
    const maxAttempts = 18;
    const maxHardness = 6;
    let best = null;
    let bestMs = 0;
    const targetMs = prevBenchmarkMs
      ? Math.max(prevBenchmarkMs + 200, Math.round(prevBenchmarkMs * 1.05))
      : null;
    for (let hardness = 0; hardness <= maxHardness; hardness += 1) {
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const rng = seededRandom(
          template.id * 997 + attempt * 37 + hardness * 131
        );
        const built = buildLevelByType(template, rng, hardness, attempt);
        const level = {
          id: template.id,
          nameKo: template.nameKo,
          nameEn: template.nameEn,
          difficulty: getDifficulty(template.id).label,
          obstacles: built.obstacles.concat(perimeter),
          start: built.start,
          goal: built.goal,
          flow: built.flow,
          dynamic: null,
        };
        const timeMs = computeAiTimeMs(level);
        if (timeMs === AI_BENCHMARK_FALLBACK_MS) {
          continue;
        }
        const adjusted = adjustAiBenchmark(timeMs, level);
        if (adjusted > bestMs) {
          bestMs = adjusted;
          best = level;
        }
        if (!targetMs || adjusted >= targetMs) {
          return level;
        }
      }
    }
    return best;
  };

  let previousBenchmark = null;
  templates.slice(0, count).forEach((template) => {
    const level = makeValidated(template, previousBenchmark);
    if (level) {
      const timeMs = computeAiTimeMs(level);
      const adjusted = adjustAiBenchmark(timeMs, level);
      previousBenchmark = adjusted;
      generated.push(level);
    }
  });

  return generated;
}

async function loadLevels() {
  try {
    if (Array.isArray(window.__LEVELS__) && window.__LEVELS__.length > 0) {
      levels = window.__LEVELS__;
      return;
    }
    const response = await fetch('./levels.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('levels.json not found');
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('invalid levels.json');
    }
    levels = data;
  } catch (error) {
    console.warn('levels.json load failed, fallback to runtime generation');
    levels = generateLevels(LEVEL_COUNT);
  }
}

function isSupabaseConfigured() {
  return (
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('YOUR_PROJECT') &&
    !SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')
  );
}

function resetState() {
  isDrawing = false;
  path = [];
  startTime = null;
  timeLeft = TIME_LIMIT;
  timeLeftEl.textContent = TIME_LIMIT.toString();
  statusEl.textContent = t('idle');
  clearInterval(timerId);
  timerId = null;
  lastScoreMs = null;
  levelState = createLevelState(levels[levelIndex]);
  lastImpactPoint = null;
  effects.flash = null;
  effects.particles = [];
  effectActive = false;
  stopAI(true);
  aiStatusEl.textContent = '';
  submitScoreBtn.disabled = true;
  submitStatusEl.textContent = '';
  renderFrame();
}

function startTimer() {
  startTime = performance.now();
  statusEl.textContent = t('playing');
  timerId = setInterval(() => {
    const elapsed = (performance.now() - startTime) / 1000;
    timeLeft = Math.max(0, TIME_LIMIT - elapsed);
    timeLeftEl.textContent = timeLeft.toFixed(1);
    if (timeLeft <= 0) {
      finish(false, t('timeOver'));
    }
  }, 100);
}

function finish(success, reason) {
  clearInterval(timerId);
  timerId = null;
  isDrawing = false;
  const wasAi = aiRunning;
  stopAI(true);
  aiStatusEl.textContent = '';

  if (success) {
    const elapsedMs = performance.now() - startTime;
    const elapsedSec = (elapsedMs / 1000).toFixed(2);
    statusEl.textContent = t('success', elapsedSec);
    if (wasAi) {
      const level = levels[levelIndex];
      const adjusted = adjustAiBenchmark(elapsedMs, level);
      setAiBenchmark(level.id, adjusted);
      lastScoreMs = null;
      submitStatusEl.textContent = '';
      submitScoreBtn.disabled = true;
    } else {
      lastScoreMs = elapsedMs;
      saveLocalScore(parseFloat(elapsedSec));
      updateSubmitAvailability();
    }
    const level = levels[levelIndex];
    triggerFlash('#22c55e');
    triggerParticles(level.goal.x, level.goal.y, '#22c55e');
    playSound('success');
  } else {
    statusEl.textContent = t('fail', reason);
    const impact = lastImpactPoint || path[path.length - 1];
    if (impact) {
      triggerFlash('#ef4444');
      triggerParticles(impact.x, impact.y, '#ef4444');
    }
    playSound('fail');
  }

  renderFrame();
}

function saveLocalScore(time) {
  const key = `line-puzzle-ranking-${levels[levelIndex].id}`;
  const existing = JSON.parse(localStorage.getItem(key) || '[]');
  existing.push(time);
  existing.sort((a, b) => a - b);
  localStorage.setItem(key, JSON.stringify(existing.slice(0, 5)));
  renderLocalRanking();
}

function renderLocalRanking() {
  const key = `line-puzzle-ranking-${levels[levelIndex].id}`;
  const scores = JSON.parse(localStorage.getItem(key) || '[]');
  rankingListLocalEl.innerHTML = '';
  if (scores.length === 0) {
    const empty = document.createElement('li');
    empty.textContent = t('empty');
    rankingListLocalEl.appendChild(empty);
    updateAiChallenge(null);
    return;
  }
  scores.forEach((score, index) => {
    const item = document.createElement('li');
    item.textContent = `${score.toFixed(2)}s`;
    rankingListLocalEl.appendChild(item);
  });
  updateAiChallenge(scores[0]);
}

function formatTime(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

function getLocalBestScore(levelId) {
  const key = `line-puzzle-ranking-${levelId}`;
  const scores = JSON.parse(localStorage.getItem(key) || '[]');
  if (!scores.length) return null;
  return scores[0];
}

function getAiBenchmarkKey(levelId) {
  return `line-puzzle-ai-benchmark-${levelId}`;
}

function loadAiBenchmarks() {
  levels.forEach((level) => {
    const stored = localStorage.getItem(getAiBenchmarkKey(level.id));
    if (stored) {
      const value = Number(stored);
      if (!Number.isNaN(value)) {
        aiBenchmarksMs[level.id] = value;
      }
    }
  });
}

function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i += 1) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    length += Math.hypot(dx, dy);
  }
  return length;
}

function computeAiTimeMs(level) {
  let bestPath = null;
  for (let attempt = 0; attempt < aiOptions.length; attempt += 1) {
    const option = aiOptions[attempt];
    const pathPoints = findPath(level, option, level.obstacles);
    if (!pathPoints || pathPoints.length === 0) continue;
    const fullPath = [level.start, ...pathPoints, level.goal];
    if (!pathIsClearWithObstacles(fullPath, level.obstacles)) continue;
    if (!bestPath || fullPath.length < bestPath.length) {
      bestPath = fullPath;
    }
  }
  if (!bestPath) return AI_BENCHMARK_FALLBACK_MS;
  const steps = Math.max(1, bestPath.length - 1);
  return Math.max(MIN_SCORE_MS, Math.round(steps * AI_FAST_STEP_MS));
}

function recomputeAiBenchmarks() {
  levels.forEach((level) => {
    const computed = computeAiTimeMs(level);
    const adjusted = adjustAiBenchmark(computed, level);
    aiBenchmarksMs[level.id] = adjusted;
    localStorage.setItem(getAiBenchmarkKey(level.id), String(adjusted));
  });
  updateAiChallenge(getLocalBestScore(levels[levelIndex].id));
}

function adjustAiBenchmark(ms, level) {
  const layoutFactor = 1 + Math.min(0.5, level.obstacles.length / 80);
  return Math.round(ms * layoutFactor);
}

function setAiBenchmark(levelId, ms) {
  aiBenchmarksMs[levelId] = ms;
  localStorage.setItem(getAiBenchmarkKey(levelId), String(ms));
  updateAiChallenge(getLocalBestScore(levelId));
}

function setActiveButtons(buttons, activeValue, dataKey) {
  buttons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset[dataKey] === activeValue);
  });
}

function loadAiSettings() {
  const storedSpeed = localStorage.getItem('line-puzzle-ai-speed');
  if (storedSpeed && AI_SPEEDS[storedSpeed]) {
    aiStepIntervalMs = AI_SPEEDS[storedSpeed];
    setActiveButtons(aiSpeedButtons, storedSpeed, 'speed');
  } else {
    setActiveButtons(aiSpeedButtons, 'fast', 'speed');
  }
}

function updateAiChallenge(bestScoreSec) {
  const levelId = levels[levelIndex].id;
  const benchmarkMs = aiBenchmarksMs[levelId];
  if (!benchmarkMs) {
    aiBenchmarkEl.textContent = '--';
    aiResultEl.textContent = t('aiResultIdle');
    aiResultEl.classList.remove('win', 'lose');
    playerBestEl.textContent = '--';
    aiWinStateByLevel[levelId] = false;
    return;
  }
  aiBenchmarkEl.textContent = formatTime(benchmarkMs);
  if (!bestScoreSec) {
    playerBestEl.textContent = '--';
    aiResultEl.textContent = t('aiResultIdle');
    aiResultEl.classList.remove('win', 'lose');
    aiWinStateByLevel[levelId] = false;
    return;
  }
  const bestMs = bestScoreSec * 1000;
  playerBestEl.textContent = formatTime(bestMs);
  if (bestMs <= benchmarkMs) {
    aiResultEl.textContent = t('aiResultWin');
    aiResultEl.classList.add('win');
    aiResultEl.classList.remove('lose');
    if (!aiWinStateByLevel[levelId]) {
      const level = levels[levelIndex];
      triggerFlash('#facc15');
      triggerParticles(level.goal.x, level.goal.y, '#facc15');
      aiWinStateByLevel[levelId] = true;
    }
  } else {
    aiResultEl.textContent = t('aiResultLose');
    aiResultEl.classList.add('lose');
    aiResultEl.classList.remove('win');
    aiWinStateByLevel[levelId] = false;
  }
}

function normalizeNickname(value) {
  const trimmed = value.trim();
  if (!trimmed) return '플레이어';
  return trimmed.slice(0, 12);
}

function updateSubmitAvailability() {
  if (!isSupabaseConfigured()) {
    submitScoreBtn.disabled = true;
    submitStatusEl.textContent = t('submitUnconfigured');
    return;
  }
  if (!lastScoreMs) {
    submitScoreBtn.disabled = true;
    submitStatusEl.textContent = '';
    return;
  }
  const now = Date.now();
  if (now < submitCooldownUntil) {
    submitScoreBtn.disabled = true;
    const remaining = Math.ceil((submitCooldownUntil - now) / 1000);
    submitStatusEl.textContent = t('submitRetry', remaining);
    return;
  }
  submitScoreBtn.disabled = false;
  submitStatusEl.textContent = t('submitReady');
}

function formatMs(ms) {
  return `${(ms / 1000).toFixed(2)}s`;
}

async function fetchGlobalRanking() {
  rankingListGlobalEl.innerHTML = '';
  if (!isSupabaseConfigured()) {
    const item = document.createElement('li');
    item.textContent = t('submitUnconfigured');
    rankingListGlobalEl.appendChild(item);
    return;
  }
  const levelId = levels[levelIndex].id;
  const url = `${SUPABASE_URL}/rest/v1/level_scores?select=nickname,score_ms,created_at&level_id=eq.${levelId}&order=score_ms.asc&limit=${GLOBAL_LIMIT}`;
  try {
    const response = await fetch(url, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error('랭킹 조회 실패');
    }
    const data = await response.json();
    if (data.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = t('empty');
      rankingListGlobalEl.appendChild(empty);
      return;
    }
    data.forEach((entry, index) => {
    const item = document.createElement('li');
    item.textContent = `${entry.nickname} · ${formatMs(entry.score_ms)}`;
      rankingListGlobalEl.appendChild(item);
    });
  } catch (error) {
    const item = document.createElement('li');
    item.textContent = t('submitFail');
    rankingListGlobalEl.appendChild(item);
  }
}

async function submitGlobalScore() {
  if (!isSupabaseConfigured()) {
    submitStatusEl.textContent = t('submitUnconfigured');
    return;
  }
  if (!lastScoreMs) {
    submitStatusEl.textContent = t('submitMissing');
    return;
  }
  if (lastScoreMs < MIN_SCORE_MS || lastScoreMs > TIME_LIMIT * 1000) {
    submitStatusEl.textContent = t('submitInvalid');
    return;
  }
  const now = Date.now();
  if (now < submitCooldownUntil) {
    updateSubmitAvailability();
    return;
  }
  submitScoreBtn.disabled = true;
  submitStatusEl.textContent = t('submitPending');
  const payload = {
    level_id: levels[levelIndex].id,
    nickname: normalizeNickname(nicknameInputEl.value),
    score_ms: Math.round(lastScoreMs),
  };
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/level_scores`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('제출 실패');
    }
    submitCooldownUntil = Date.now() + SUBMIT_COOLDOWN_MS;
    submitStatusEl.textContent = t('submitDone');
    await fetchGlobalRanking();
  } catch (error) {
    submitStatusEl.textContent = t('submitFail');
  } finally {
    updateSubmitAvailability();
  }
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#141a24';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawObstacles();
  drawSwitches();
  drawStartGoal();
  drawPath();
  drawLevelLabel();
}

function renderFrame() {
  drawScene();
  drawEffects();
}

function drawEffects() {
  const now = performance.now();
  if (effects.flash) {
    const elapsed = now - effects.flash.start;
    const progress = Math.min(1, elapsed / effects.flash.duration);
    const alpha = 0.6 * (1 - progress);
    if (alpha > 0) {
      ctx.fillStyle = `${effects.flash.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    if (progress >= 1) {
      effects.flash = null;
    }
  }
  effects.particles.forEach((particle) => {
    ctx.beginPath();
    ctx.fillStyle = particle.color;
    ctx.arc(particle.x, particle.y, particle.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateEffects(now) {
  const delta = (now - lastEffectTime) / 1000;
  lastEffectTime = now;
  effects.particles.forEach((particle) => {
    particle.x += particle.vx * delta;
    particle.y += particle.vy * delta;
    particle.vy += 60 * delta;
    particle.life -= delta;
    particle.r = Math.max(0, particle.r - delta * 4);
  });
  effects.particles = effects.particles.filter((particle) => particle.life > 0);
  return effects.flash !== null || effects.particles.length > 0;
}

function startEffectLoop() {
  if (effectActive) return;
  effectActive = true;
  lastEffectTime = performance.now();
  const loop = (now) => {
    const active = updateEffects(now);
    renderFrame();
    if (active) {
      requestAnimationFrame(loop);
    } else {
      effectActive = false;
    }
  };
  requestAnimationFrame(loop);
}

function triggerFlash(color, duration = 240) {
  effects.flash = {
    color,
    duration,
    start: performance.now(),
  };
  startEffectLoop();
}

function triggerParticles(x, y, color) {
  for (let i = 0; i < 18; i += 1) {
    effects.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 280,
      vy: (Math.random() - 0.7) * 280,
      life: 0.6 + Math.random() * 0.4,
      r: 6 + Math.random() * 4,
      color,
    });
  }
  startEffectLoop();
}

let audioContext = null;

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

function playTone({ frequency, duration, type, gain }) {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gain;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);
  oscillator.start();
  gainNode.gain.exponentialRampToValueAtTime(
    0.0001,
    ctx.currentTime + duration
  );
  oscillator.stop(ctx.currentTime + duration);
}

function playSound(type) {
  try {
    if (type === 'success') {
      playTone({ frequency: 880, duration: 0.15, type: 'triangle', gain: 0.08 });
      playTone({ frequency: 1320, duration: 0.12, type: 'triangle', gain: 0.06 });
    } else {
      playTone({ frequency: 180, duration: 0.2, type: 'sawtooth', gain: 0.1 });
    }
  } catch (error) {
    // Audio blocked by browser policy; ignore.
  }
}

function drawObstacles() {
  ctx.fillStyle = '#2f3b55';
  getActiveObstacles().forEach((obs) => {
    ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
  });
}

function drawSwitches() {
  const level = levels[levelIndex];
  if (!level.dynamic || !level.dynamic.switches) return;
  level.dynamic.switches.forEach((sw) => {
    const active =
      sw.groups.some((group) => levelState.groupActive[group]) || false;
    ctx.beginPath();
    ctx.fillStyle = active ? '#facc15' : '#64748b';
    ctx.arc(sw.x, sw.y, sw.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawStartGoal() {
  const level = levels[levelIndex];
  const startPoint = level.start;
  const goalPoint = level.goal;
  ctx.beginPath();
  ctx.fillStyle = '#4ade80';
  ctx.arc(startPoint.x, startPoint.y, START_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0e14';
  ctx.font = 'bold 14px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('START', startPoint.x, startPoint.y + 5);

  ctx.beginPath();
  ctx.fillStyle = '#f97316';
  ctx.arc(goalPoint.x, goalPoint.y, GOAL_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0b0e14';
  ctx.fillText('GOAL', goalPoint.x, goalPoint.y + 5);
}

function drawPath() {
  if (path.length === 0) return;
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i += 1) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
}

function drawLevelLabel() {
  ctx.fillStyle = '#cbd5f5';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'left';
  const level = levels[levelIndex];
  ctx.fillText(getLevelName(level), 16, 24);
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * canvas.width,
    y: ((event.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function isInsideCircle(point, center, radius) {
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return dx * dx + dy * dy <= radius * radius;
}

function segmentIntersectsRect(p1, p2, rect) {
  if (
    p1.x >= rect.x &&
    p1.x <= rect.x + rect.w &&
    p1.y >= rect.y &&
    p1.y <= rect.y + rect.h
  ) {
    return true;
  }
  if (
    p2.x >= rect.x &&
    p2.x <= rect.x + rect.w &&
    p2.y >= rect.y &&
    p2.y <= rect.y + rect.h
  ) {
    return true;
  }
  const edges = [
    [
      { x: rect.x, y: rect.y },
      { x: rect.x + rect.w, y: rect.y },
    ],
    [
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ],
    [
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h },
    ],
    [
      { x: rect.x, y: rect.y + rect.h },
      { x: rect.x, y: rect.y },
    ],
  ];
  return edges.some((edge) => segmentsIntersect(p1, p2, edge[0], edge[1]));
}

function segmentsIntersect(a, b, c, d) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (det === 0) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function getActiveObstacles() {
  const level = levels[levelIndex];
  const active = [...level.obstacles];
  if (level.dynamic && level.dynamic.gates) {
    level.dynamic.gates.forEach((gate) => {
      if (levelState.groupActive[gate.group]) {
        active.push(gate.rect);
      }
    });
  }
  return active;
}

function handleSwitches(point) {
  const level = levels[levelIndex];
  if (!level.dynamic || !level.dynamic.switches) return false;
  let toggled = false;
  level.dynamic.switches.forEach((sw) => {
    const inside = isInsideCircle(point, { x: sw.x, y: sw.y }, sw.r);
    const wasInside = levelState.switchInside.has(sw.id);
    if (inside && !wasInside) {
      levelState.switchInside.add(sw.id);
      sw.groups.forEach((group) => {
        levelState.groupActive[group] = !levelState.groupActive[group];
      });
      toggled = true;
    } else if (!inside && wasInside) {
      levelState.switchInside.delete(sw.id);
    }
  });
  return toggled;
}

function isPointInsideRect(point, rect, padding = 0) {
  return (
    point.x >= rect.x + padding &&
    point.x <= rect.x + rect.w - padding &&
    point.y >= rect.y + padding &&
    point.y <= rect.y + rect.h - padding
  );
}

function buildGrid(level, cellSize = 24, padding = 6, obstaclesOverride = null) {
  const cols = Math.floor(canvas.width / cellSize);
  const rows = Math.floor(canvas.height / cellSize);
  const obstacles = obstaclesOverride || getActiveObstacles();
  const safe = new Array(rows).fill(null).map(() => new Array(cols).fill(true));
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const point = {
        x: c * cellSize + cellSize / 2,
        y: r * cellSize + cellSize / 2,
      };
      const blocked = obstacles.some((rect) =>
        isPointInsideRect(point, rect, padding)
      );
      safe[r][c] = !blocked;
    }
  }
  const startCell = toGrid(level.start, { cols, rows, cellSize });
  const goalCell = toGrid(level.goal, { cols, rows, cellSize });
  if (safe[startCell.row]?.[startCell.col] !== undefined) {
    safe[startCell.row][startCell.col] = true;
  }
  if (safe[goalCell.row]?.[goalCell.col] !== undefined) {
    safe[goalCell.row][goalCell.col] = true;
  }
  return { cols, rows, cellSize, safe };
}

function toGrid(point, grid) {
  const col = Math.max(0, Math.min(grid.cols - 1, Math.floor(point.x / grid.cellSize)));
  const row = Math.max(0, Math.min(grid.rows - 1, Math.floor(point.y / grid.cellSize)));
  return { row, col };
}

function toPoint(cell, grid) {
  return {
    x: cell.col * grid.cellSize + grid.cellSize / 2,
    y: cell.row * grid.cellSize + grid.cellSize / 2,
  };
}

function findNearestSafe(cell, grid) {
  const queue = [cell];
  const visited = new Set([`${cell.row},${cell.col}`]);
  const dirs = [
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (grid.safe[current.row]?.[current.col]) return current;
    dirs.forEach((dir) => {
      const nr = current.row + dir.dr;
      const nc = current.col + dir.dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < grid.rows &&
        nc >= 0 &&
        nc < grid.cols &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    });
  }
  return cell;
}

function isSegmentClear(p1, p2, obstacles) {
  for (const rect of obstacles) {
    if (segmentIntersectsRect(p1, p2, rect)) {
      return false;
    }
  }
  return true;
}

function findNearestVisibleCell(fromPoint, grid, obstacles) {
  const startCell = toGrid(fromPoint, grid);
  const queue = [startCell];
  const visited = new Set([`${startCell.row},${startCell.col}`]);
  const dirs = [
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (grid.safe[current.row]?.[current.col]) {
      const center = toPoint(current, grid);
      if (isSegmentClear(fromPoint, center, obstacles)) {
        return current;
      }
    }
    dirs.forEach((dir) => {
      const nr = current.row + dir.dr;
      const nc = current.col + dir.dc;
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < grid.rows &&
        nc >= 0 &&
        nc < grid.cols &&
        !visited.has(key)
      ) {
        visited.add(key);
        queue.push({ row: nr, col: nc });
      }
    });
  }
  return startCell;
}

function findPath(level, options, obstaclesOverride = null) {
  const grid = buildGrid(level, options.cellSize, options.padding, obstaclesOverride);
  const obstacles = obstaclesOverride || getActiveObstacles();
  const startCell = findNearestVisibleCell(level.start, grid, obstacles);
  const goalCell = findNearestVisibleCell(level.goal, grid, obstacles);
  const queue = [startCell];
  const visited = new Set([`${startCell.row},${startCell.col}`]);
  const parent = {};
  const dirs = [
    { dr: 1, dc: 0 },
    { dr: -1, dc: 0 },
    { dr: 0, dc: 1 },
    { dr: 0, dc: -1 },
  ];
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.row === goalCell.row && current.col === goalCell.col) {
      const pathCells = [];
      let key = `${current.row},${current.col}`;
      while (key) {
        const [r, c] = key.split(',').map(Number);
        pathCells.push({ row: r, col: c });
        key = parent[key];
      }
      pathCells.reverse();
      return pathCells.map((cell) => toPoint(cell, grid));
    }
    dirs.forEach((dir) => {
      const nr = current.row + dir.dr;
      const nc = current.col + dir.dc;
      const key = `${nr},${nc}`;
      const nextCell = { row: nr, col: nc };
      if (
        nr >= 0 &&
        nr < grid.rows &&
        nc >= 0 &&
        nc < grid.cols &&
        !visited.has(key) &&
        grid.safe[nr][nc]
      ) {
        const currentPoint = toPoint(current, grid);
        const nextPoint = toPoint(nextCell, grid);
        if (!isSegmentClear(currentPoint, nextPoint, obstacles)) {
          return;
        }
        visited.add(key);
        parent[key] = `${current.row},${current.col}`;
        queue.push(nextCell);
      }
    });
  }
  return null;
}

function pathIsClear(pathPoints) {
  if (!pathPoints || pathPoints.length < 2) return false;
  const obstacles = getActiveObstacles();
  for (let i = 1; i < pathPoints.length; i += 1) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];
    for (const rect of obstacles) {
      if (segmentIntersectsRect(p1, p2, rect)) {
        return false;
      }
    }
  }
  return true;
}

function pathIsClearWithObstacles(pathPoints, obstacles) {
  if (!pathPoints || pathPoints.length < 2) return false;
  for (let i = 1; i < pathPoints.length; i += 1) {
    const p1 = pathPoints[i - 1];
    const p2 = pathPoints[i];
    for (const rect of obstacles) {
      if (segmentIntersectsRect(p1, p2, rect)) {
        return false;
      }
    }
  }
  return true;
}

function stopAI(silent = false) {
  if (aiTimerId) {
    clearTimeout(aiTimerId);
    aiTimerId = null;
  }
  aiRunning = false;
  aiPath = [];
  aiStepIndex = 0;
  aiAttemptIndex = 0;
  if (!silent) {
    aiStatusEl.textContent = '';
  }
  aiRunBtn.textContent = t('aiPlay');
}

function buildAiPath(level) {
  for (let attempt = aiAttemptIndex; attempt < aiOptions.length; attempt += 1) {
    const option = aiOptions[attempt];
    const pathPoints = findPath(level, option);
    if (pathPoints && pathPoints.length > 0) {
      const fullPath = [level.start, ...pathPoints, level.goal];
      if (!pathIsClear(fullPath)) {
        continue;
      }
      aiAttemptIndex = attempt;
      return fullPath;
    }
  }
  return null;
}

function runAI() {
  if (aiRunning) {
    stopAI();
    return;
  }
  aiRunning = true;
  aiRunBtn.textContent = t('aiStop');
  aiStatusEl.textContent = t('aiThinking');
  lastScoreMs = null;
  submitScoreBtn.disabled = true;
  submitStatusEl.textContent = '';
  const level = levels[levelIndex];
  recomputeAiBenchmarks();
  aiAttemptIndex = 0;
  const foundPath = buildAiPath(level);
  if (!foundPath) {
    aiStatusEl.textContent = t('aiNoPath');
    stopAI(true);
    return;
  }
  aiPath = foundPath;
  aiStepIndex = 0;
  aiStatusEl.textContent = t('aiRunning');
  isDrawing = true;
  path = [aiPath[0]];
  if (!timerId) {
    startTimer();
  }
  const step = () => {
    if (!aiRunning) return;
    aiStepIndex += 1;
    if (aiStepIndex >= aiPath.length) {
      finish(true);
      return;
    }
    const nextPoint = aiPath[aiStepIndex];
    path.push(nextPoint);
    if (hitObstacle()) {
      lastImpactPoint = nextPoint;
      aiAttemptIndex += 1;
      if (aiAttemptIndex >= aiOptions.length) {
        finish(false, t('wallHit'));
        return;
      }
      aiStatusEl.textContent = t('aiRetrying');
      const retryPath = buildAiPath(level);
      if (!retryPath) {
        finish(false, t('aiNoPath'));
        return;
      }
      path = [retryPath[0]];
      aiPath = retryPath;
      aiStepIndex = 0;
      renderFrame();
      aiTimerId = setTimeout(step, aiStepIntervalMs);
      return;
    }
    renderFrame();
    aiTimerId = setTimeout(step, aiStepIntervalMs);
  };
  aiTimerId = setTimeout(step, aiStepIntervalMs);
}

function hitObstacle() {
  const activeObstacles = getActiveObstacles();
  for (let i = 1; i < path.length; i += 1) {
    const p1 = path[i - 1];
    const p2 = path[i];
    if (
      p2.x < 0 ||
      p2.x > canvas.width ||
      p2.y < 0 ||
      p2.y > canvas.height
    ) {
      return true;
    }
    for (const rect of activeObstacles) {
      if (segmentIntersectsRect(p1, p2, rect)) {
        return true;
      }
    }
  }
  return false;
}

function onPointerDown(event) {
  if (aiRunning) {
    stopAI();
  }
  const point = getCanvasPoint(event);
  const level = levels[levelIndex];
  if (!isInsideCircle(point, level.start, START_RADIUS + 8)) {
    return;
  }
  isDrawing = true;
  path = [point];
  if (!timerId) {
    startTimer();
  }
  renderFrame();
}

function onPointerMove(event) {
  if (!isDrawing) return;
  const point = getCanvasPoint(event);
  path.push(point);
  const toggled = handleSwitches(point);
  if (hitObstacle()) {
    lastImpactPoint = point;
    finish(false, t('wallHit'));
    return;
  }
  if (toggled && hitObstacle()) {
    lastImpactPoint = point;
    finish(false, t('gateHit'));
    return;
  }
  renderFrame();
}

function onPointerUp(event) {
  if (!isDrawing) return;
  const point = getCanvasPoint(event);
  path.push(point);
  if (hitObstacle()) {
    lastImpactPoint = point;
    finish(false, t('wallHit'));
    return;
  }
  const level = levels[levelIndex];
  if (isInsideCircle(point, level.goal, GOAL_RADIUS + 6)) {
    finish(true);
  } else {
    finish(false, t('goalMiss'));
  }
}

function setLevel(index) {
  const total = levels.length;
  levelIndex = ((index % total) + total) % total;
  levelSelectEl.value = levels[levelIndex].id.toString();
  resetState();
  aiStatusEl.textContent = '';
  renderLocalRanking();
  fetchGlobalRanking();
  updateSubmitAvailability();
}

function changeLevel(delta) {
  setLevel(levelIndex + delta);
}

function populateLevelSelect() {
  levelSelectEl.innerHTML = '';
  levels.forEach((level, index) => {
    const option = document.createElement('option');
    option.value = level.id.toString();
    option.textContent = getLevelName(level);
    option.dataset.index = index.toString();
    levelSelectEl.appendChild(option);
  });
  levelSelectEl.value = levels[levelIndex].id.toString();
}

function handleTabClick(event) {
  const target = event.currentTarget;
  const tab = target.dataset.tab;
  tabButtons.forEach((btn) => btn.classList.remove('active'));
  target.classList.add('active');
  Object.keys(rankingPanels).forEach((key) => {
    rankingPanels[key].classList.toggle('active', key === tab);
  });
  if (tab === 'global') {
    fetchGlobalRanking();
  }
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointerleave', onPointerUp);
resetBtn.addEventListener('click', resetState);
prevLevelBtn.addEventListener('click', () => changeLevel(-1));
nextLevelBtn.addEventListener('click', () => changeLevel(1));
levelSelectEl.addEventListener('change', (event) => {
  const selectedId = Number(event.target.value);
  const nextIndex = levels.findIndex((level) => level.id === selectedId);
  if (nextIndex >= 0) {
    setLevel(nextIndex);
  }
});
tabButtons.forEach((button) => {
  button.addEventListener('click', handleTabClick);
});
submitScoreBtn.addEventListener('click', submitGlobalScore);
nicknameInputEl.addEventListener('input', updateSubmitAvailability);
aiRunBtn.addEventListener('click', runAI);
aiSpeedButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const speed = button.dataset.speed;
    if (!AI_SPEEDS[speed]) return;
    aiStepIntervalMs = AI_SPEEDS[speed];
    localStorage.setItem('line-puzzle-ai-speed', speed);
    setActiveButtons(aiSpeedButtons, speed, 'speed');
    recomputeAiBenchmarks();
  });
});

timeLimitEl.textContent = TIME_LIMIT.toString();
async function initApp() {
  applyLocaleText();
  await loadLevels();
  loadAiBenchmarks();
  recomputeAiBenchmarks();
  loadAiSettings();
  populateLevelSelect();
  setLevel(0);
  updateSubmitAvailability();
}

initApp();
