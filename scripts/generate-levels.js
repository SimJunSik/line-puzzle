const fs = require('fs');
const path = require('path');

const WIDTH = 800;
const HEIGHT = 500;
const POINT_MARGIN = 60;
const LEVEL_COUNT = 8;
const AI_BENCHMARK_FALLBACK_MS = 99999;
const MIN_SCORE_MS = 300;
const AI_FAST_STEP_MS = 20;
const aiOptions = [
  { cellSize: 18, padding: 2 },
  { cellSize: 14, padding: 1 },
  { cellSize: 10, padding: 0 },
  { cellSize: 8, padding: 0 },
  { cellSize: 6, padding: 0 },
];

function seededRandom(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function applyGap(base, hardness, attempt, min, max) {
  return clamp(base - hardness * 12 + attempt * 6, min, max);
}

function applyCount(base, hardness, min, max) {
  return clamp(base + Math.floor(hardness / 2), min, max);
}

function buildVerticalGates({ rng, columns, gap, gapCenters }) {
  const obstacles = [];
  const left = 140;
  const right = WIDTH - 140;
  const spacing = (right - left) / (columns + 1);
  for (let c = 1; c <= columns; c += 1) {
    const x = left + spacing * c;
    const gapCenter =
      gapCenters?.[c - 1] ?? 80 + rng() * (HEIGHT - 160);
    const gapStart = Math.max(40, gapCenter - gap / 2);
    const gapEnd = Math.min(HEIGHT - 40, gapCenter + gap / 2);
    const barWidth = 42;
    obstacles.push({ x: x - barWidth / 2, y: 0, w: barWidth, h: gapStart });
    obstacles.push({
      x: x - barWidth / 2,
      y: gapEnd,
      w: barWidth,
      h: HEIGHT - gapEnd,
    });
  }
  return obstacles;
}

function buildHorizontalGates({ rng, rows, gap, gapCenters }) {
  const obstacles = [];
  const top = 90;
  const bottom = HEIGHT - 90;
  const spacing = (bottom - top) / (rows + 1);
  for (let r = 1; r <= rows; r += 1) {
    const y = top + spacing * r;
    const gapCenter =
      gapCenters?.[r - 1] ?? 100 + rng() * (WIDTH - 200);
    const gapStart = Math.max(60, gapCenter - gap / 2);
    const gapEnd = Math.min(WIDTH - 60, gapCenter + gap / 2);
    const barHeight = 38;
    obstacles.push({ x: 0, y: y - barHeight / 2, w: gapStart, h: barHeight });
    obstacles.push({
      x: gapEnd,
      y: y - barHeight / 2,
      w: WIDTH - gapEnd,
      h: barHeight,
    });
  }
  return obstacles;
}

function buildZigzagWalls({ rng, columns, gapCenters, gap, blockEvery = 1 }) {
  const obstacles = buildVerticalGates({ rng, columns, gap, gapCenters });
  for (let i = 0; i < columns; i += 1) {
    if (blockEvery > 1 && i % blockEvery !== 0) {
      continue;
    }
    const x = 170 + i * 90;
    obstacles.push({
      x,
      y: HEIGHT / 2 - 20,
      w: 50,
      h: 40,
    });
  }
  return obstacles;
}

function buildPerimeterWalls() {
  const thickness = 24;
  return [
    { x: 0, y: 0, w: WIDTH, h: thickness },
    { x: 0, y: HEIGHT - thickness, w: WIDTH, h: thickness },
    { x: 0, y: 0, w: thickness, h: HEIGHT },
    { x: WIDTH - thickness, y: 0, w: thickness, h: HEIGHT },
  ];
}

function isPointInsideRect(point, rect, padding = 0) {
  return (
    point.x >= rect.x + padding &&
    point.x <= rect.x + rect.w - padding &&
    point.y >= rect.y + padding &&
    point.y <= rect.y + rect.h - padding
  );
}

function segmentsIntersect(a, b, c, d) {
  const det = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (det === 0) return false;
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / det;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / det;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
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
    [{ x: rect.x, y: rect.y }, { x: rect.x + rect.w, y: rect.y }],
    [
      { x: rect.x + rect.w, y: rect.y },
      { x: rect.x + rect.w, y: rect.y + rect.h },
    ],
    [
      { x: rect.x + rect.w, y: rect.y + rect.h },
      { x: rect.x, y: rect.y + rect.h },
    ],
    [{ x: rect.x, y: rect.y + rect.h }, { x: rect.x, y: rect.y }],
  ];
  return edges.some((edge) => segmentsIntersect(p1, p2, edge[0], edge[1]));
}

function isSegmentClear(p1, p2, obstacles) {
  for (const rect of obstacles) {
    if (segmentIntersectsRect(p1, p2, rect)) {
      return false;
    }
  }
  return true;
}

function buildGrid(level, cellSize, padding, obstacles) {
  const cols = Math.floor(WIDTH / cellSize);
  const rows = Math.floor(HEIGHT / cellSize);
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
  const col = Math.max(
    0,
    Math.min(grid.cols - 1, Math.floor(point.x / grid.cellSize))
  );
  const row = Math.max(
    0,
    Math.min(grid.rows - 1, Math.floor(point.y / grid.cellSize))
  );
  return { row, col };
}

function toPoint(cell, grid) {
  return {
    x: cell.col * grid.cellSize + grid.cellSize / 2,
    y: cell.row * grid.cellSize + grid.cellSize / 2,
  };
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

function findPath(level, options, obstacles) {
  const grid = buildGrid(level, options.cellSize, options.padding, obstacles);
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

function adjustAiBenchmark(ms, level) {
  const layoutFactor = 1 + Math.min(0.5, level.obstacles.length / 80);
  return Math.round(ms * layoutFactor);
}

function generateLevels(count) {
  const generated = [];
  const perimeter = buildPerimeterWalls();

  const templates = [
    { id: 1, nameKo: '기본 통로', nameEn: 'Basic Corridor', type: 'basic' },
    { id: 2, nameKo: '물결 통로', nameEn: 'Wave Corridor', type: 'wave' },
    { id: 3, nameKo: '상하 관문', nameEn: 'Vertical Gates', type: 'vertical' },
    {
      id: 4,
      nameKo: '지그재그',
      nameEn: 'Zigzag',
      type: 'zig-hard',
      baseHardness: 4,
      minIncreaseMultiplier: 1.2,
      minIncreaseMs: 500,
    },
    {
      id: 5,
      nameKo: '지그재그 하드',
      nameEn: 'Zigzag Hard',
      type: 'zig',
    },
    {
      id: 6,
      nameKo: '상하 관문 하드',
      nameEn: 'Vertical Gates Hard',
      type: 'vertical-hard',
      baseHardness: 2,
      minIncreaseMultiplier: 1.1,
      minIncreaseMs: 300,
    },
    {
      id: 7,
      nameKo: '물결 하드',
      nameEn: 'Wave Hard',
      type: 'wave-hard',
      baseHardness: 2,
    },
    {
      id: 8,
      nameKo: '상하 관문 익스트림',
      nameEn: 'Vertical Extreme',
      type: 'vertical-hard-2',
      baseHardness: 3,
    },
  ];

  const vG = (rng, columns, gap, gapCenters) =>
    buildVerticalGates({ rng, columns, gap, gapCenters });
  const hG = (rng, rows, gap, gapCenters) =>
    buildHorizontalGates({ rng, rows, gap, gapCenters });
  const zig = (rng, columns, gapCenters, gap, blockEvery) =>
    buildZigzagWalls({ rng, columns, gapCenters, gap, blockEvery });

  const buildSafeFallback = (template) => {
    const rng = seededRandom(template.id * 999);
    if (template.type.includes('zig')) {
      const gapCenters = [110, 380, 120, 370];
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 110 },
        goal: { x: WIDTH - POINT_MARGIN, y: 380 },
        obstacles: zig(rng, 4, gapCenters, 200, 2),
      };
    }
    if (template.type.includes('vertical')) {
      const gapCenters = [200, 560, 220];
      return {
        flow: '상하',
        start: { x: 200, y: POINT_MARGIN },
        goal: { x: 220, y: HEIGHT - POINT_MARGIN },
        obstacles: hG(rng, 3, 220, gapCenters),
      };
    }
    if (template.type.includes('wave')) {
      const gapCenters = [140, 330, 150, 320];
      return {
        flow: '파도',
        start: { x: POINT_MARGIN, y: 140 },
        goal: { x: WIDTH - POINT_MARGIN, y: 320 },
        obstacles: vG(rng, 3, 220, gapCenters),
      };
    }
    const gapCenters = [250, 250, 250];
    return {
      flow: '직선',
      start: { x: POINT_MARGIN, y: HEIGHT / 2 },
      goal: { x: WIDTH - POINT_MARGIN, y: HEIGHT / 2 },
      obstacles: vG(rng, 3, 230, gapCenters),
    };
  };

  const buildLevelByType = (template, rng, hardness, attempt) => {
    const extraHard = template.baseHardness ?? 0;
    const effectiveHardness = hardness + extraHard;
    if (template.type === 'basic') {
      const gapCenters = [250, 250, 250];
      const columns = applyCount(3, effectiveHardness, 3, 6);
      const gap = applyGap(210, effectiveHardness, attempt, 130, 230);
      return {
        flow: '직선',
        start: { x: POINT_MARGIN, y: HEIGHT / 2 },
        goal: { x: WIDTH - POINT_MARGIN, y: HEIGHT / 2 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'wave') {
      const gapCenters = [140, 330, 150, 320];
      const columns = applyCount(4, effectiveHardness, 4, 6);
      const gap = applyGap(170, effectiveHardness, attempt, 120, 220);
      return {
        flow: '파도',
        start: { x: POINT_MARGIN, y: 140 },
        goal: { x: WIDTH - POINT_MARGIN, y: 320 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'wave-hard') {
      const gapCenters = [130, 340, 140, 330, 150, 320];
      const columns = applyCount(5, effectiveHardness, 5, 6);
      const gap = applyGap(150, effectiveHardness, attempt, 110, 200);
      return {
        flow: '파도',
        start: { x: POINT_MARGIN, y: 130 },
        goal: { x: WIDTH - POINT_MARGIN, y: 330 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'vertical') {
      const gapCenters = [200, 560, 220];
      const rows = applyCount(3, effectiveHardness, 3, 5);
      const gap = applyGap(190, effectiveHardness, attempt, 120, 220);
      return {
        flow: '상하',
        start: { x: 200, y: POINT_MARGIN },
        goal: { x: 220, y: HEIGHT - POINT_MARGIN },
        obstacles: hG(rng, rows, gap, gapCenters.slice(0, rows)),
      };
    }
    if (template.type === 'zig') {
      const gapCenters = [110, 380, 120, 370];
      const columns = applyCount(4, effectiveHardness, 4, 6);
      const gap = applyGap(140, effectiveHardness, attempt, 110, 180);
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 110 },
        goal: { x: WIDTH - POINT_MARGIN, y: 380 },
        obstacles: zig(rng, columns, gapCenters.slice(0, columns), gap, 1),
      };
    }
    if (template.type === 'zig-hard') {
      const gapCenters = [120, 360, 130, 350, 140, 340];
      const columns = applyCount(6, effectiveHardness, 5, 6);
      const gap = applyGap(125, effectiveHardness, attempt, 90, 165);
      const obstacles = zig(
        rng,
        columns,
        gapCenters.slice(0, columns),
        gap,
        1
      );
      for (let i = 0; i < columns; i += 2) {
        obstacles.push({
          x: 190 + i * 90,
          y: HEIGHT / 2 + 60,
          w: 50,
          h: 36,
        });
      }
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 120 },
        goal: { x: WIDTH - POINT_MARGIN, y: 360 },
        obstacles,
      };
    }
    if (template.type === 'vertical-hard-2') {
      const gapCenters = [170, 610, 190, 590, 210, 570];
      const rows = applyCount(5, effectiveHardness, 4, 6);
      const gap = applyGap(150, effectiveHardness, attempt, 105, 190);
      return {
        flow: '상하',
        start: { x: 170, y: POINT_MARGIN },
        goal: { x: 230, y: HEIGHT - POINT_MARGIN },
        obstacles: hG(rng, rows, gap, gapCenters.slice(0, rows)),
      };
    }
    if (template.type === 'basic-hard') {
      const gapCenters = [250, 250, 250, 250, 250];
      const columns = applyCount(6, effectiveHardness, 5, 6);
      const gap = applyGap(150, effectiveHardness, attempt, 100, 180);
      return {
        flow: '직선',
        start: { x: POINT_MARGIN, y: HEIGHT / 2 },
        goal: { x: WIDTH - POINT_MARGIN, y: HEIGHT / 2 },
        obstacles: vG(rng, columns, gap, gapCenters.slice(0, columns)),
      };
    }
    if (template.type === 'zig-hard-2') {
      const gapCenters = [100, 390, 110, 380, 120, 370];
      const columns = applyCount(5, effectiveHardness, 4, 6);
      const gap = applyGap(150, effectiveHardness, attempt, 130, 190);
      return {
        flow: '지그재그',
        start: { x: POINT_MARGIN, y: 95 },
        goal: { x: WIDTH - POINT_MARGIN, y: 395 },
        obstacles: zig(rng, columns, gapCenters.slice(0, columns), gap, 2),
      };
    }
    const gapCenters = [180, 600, 200, 580, 220];
    const rows = applyCount(5, effectiveHardness, 4, 6);
    const gap = applyGap(160, effectiveHardness, attempt, 110, 200);
    return {
      flow: '상하',
      start: { x: 180, y: POINT_MARGIN },
      goal: { x: 240, y: HEIGHT - POINT_MARGIN },
      obstacles: hG(rng, rows, gap, gapCenters.slice(0, rows)),
    };
  };

  const makeValidated = (template, prevBenchmarkMs) => {
    const maxAttempts = 50;
    const maxHardness = 10;
    let best = null;
    let bestMs = 0;
    const minMultiplier = template.minIncreaseMultiplier ?? 1.05;
    const minIncreaseMs = template.minIncreaseMs ?? 200;
    const targetMs = prevBenchmarkMs
      ? Math.max(prevBenchmarkMs + minIncreaseMs, Math.round(prevBenchmarkMs * minMultiplier))
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
          difficulty: 'N/A',
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
    let level = makeValidated(template, previousBenchmark);
    if (!level) {
      const built = buildSafeFallback(template);
      const fallback = {
        id: template.id,
        nameKo: template.nameKo,
        nameEn: template.nameEn,
        difficulty: 'N/A',
        obstacles: built.obstacles.concat(perimeter),
        start: built.start,
        goal: built.goal,
        flow: built.flow,
        dynamic: null,
      };
      if (computeAiTimeMs(fallback) !== AI_BENCHMARK_FALLBACK_MS) {
        level = fallback;
      }
    }
    if (!level) {
      throw new Error(`No solvable level for ${template.id}`);
    }
    const timeMs = computeAiTimeMs(level);
    const adjusted = adjustAiBenchmark(timeMs, level);
    previousBenchmark = adjusted;
    generated.push(level);
  });

  return generated;
}

const levels = generateLevels(LEVEL_COUNT);
const outputPath = path.join(__dirname, '..', 'levels.json');
const outputJsPath = path.join(__dirname, '..', 'levels-data.js');
const json = JSON.stringify(levels, null, 2);
fs.writeFileSync(outputPath, json, 'utf-8');
fs.writeFileSync(
  outputJsPath,
  `window.__LEVELS__ = ${json};\n`,
  'utf-8'
);
console.log(`Generated ${levels.length} levels -> ${outputPath}`);
console.log(`Generated levels-data.js -> ${outputJsPath}`);
