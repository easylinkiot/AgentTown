export const CHUNK_SIZE = 1000;
export const WORLD_CHUNKS_X = 10;
export const WORLD_CHUNKS_Y = 10;
export const WORLD_WIDTH = CHUNK_SIZE * WORLD_CHUNKS_X;
export const WORLD_HEIGHT = CHUNK_SIZE * WORLD_CHUNKS_Y;

export type LotViewTag =
  | "sea-view"
  | "river-view"
  | "mountain-view"
  | "park-view"
  | "city-view";

export const LOT_VIEW_LABELS: Record<LotViewTag, string> = {
  "sea-view": "海景房",
  "river-view": "河景房",
  "mountain-view": "山景房",
  "park-view": "园景房",
  "city-view": "城景房",
};

export type LotVisualType =
  | "red-cottage"
  | "blue-villa"
  | "dark-cabin"
  | "brown-manor"
  | "river-lodge"
  | "sea-villa"
  | "mountain-chalet"
  | "market-stall";

export interface NpcConfig {
  name: string;
  role: string;
  avatar: string;
  greeting: string;
  skills: string;
}

export interface LotData {
  id: string;
  x: number;
  y: number;
  label: string;
  viewTag: LotViewTag;
  visualType: LotVisualType;
  isMarket?: boolean;
  npc: NpcConfig;
}

export interface TreeData {
  x: number;
  y: number;
  scale: number;
}

export interface WorldChunk {
  key: string;
  chunkX: number;
  chunkY: number;
  lots: LotData[];
  trees: TreeData[];
}

export interface ChunkRange {
  minChunkX: number;
  maxChunkX: number;
  minChunkY: number;
  maxChunkY: number;
}

export interface WorldRect {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface WorldContentInRect {
  rect: WorldRect;
  chunks: WorldChunk[];
  lots: LotData[];
  trees: TreeData[];
}

export interface MountainPeak {
  x: number;
  y: number;
  radius: number;
  height: number;
}

export type RouteDef =
  | {
      id: string;
      type: "quadratic";
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      p2: { x: number; y: number };
      svgPath: string;
    }
  | {
      id: string;
      type: "line";
      p0: { x: number; y: number };
      p1: { x: number; y: number };
      svgPath: string;
    };

const ROLES = [
  "Engineer",
  "Designer",
  "Product Mgr",
  "Data Scientist",
  "Marketer",
  "Sales",
  "HR",
  "Support",
  "DevOps",
  "Architect",
  "Founder",
  "Investor",
  "Operator",
  "Analyst",
];

const NAMES = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Eta",
  "Theta",
  "Iota",
  "Kappa",
  "Lambda",
  "Mu",
  "Nu",
  "Xi",
  "Omicron",
  "Pi",
  "Rho",
  "Sigma",
  "Tau",
  "Upsilon",
  "Phi",
  "Chi",
  "Psi",
  "Omega",
];

const CITY_VISUALS: LotVisualType[] = [
  "red-cottage",
  "blue-villa",
  "dark-cabin",
  "brown-manor",
];

const HOUSE_TYPE_VISUALS: LotVisualType[] = [
  "red-cottage",
  "blue-villa",
  "dark-cabin",
  "brown-manor",
];

const RIVER_BASE_Y = WORLD_HEIGHT * 0.52;
const RIVER_WAVE_A = 430;
const RIVER_WAVE_B = 120;
export const RIVER_WIDTH = 260;

const COAST_BASE_Y = WORLD_HEIGHT * 0.17;
const COAST_WAVE_A = 280;
const COAST_WAVE_B = 90;

export const HOME_POSITION = {
  x: WORLD_WIDTH * 0.52,
  y: WORLD_HEIGHT * 0.58,
};

export const MOUNTAIN_PEAKS: MountainPeak[] = [
  { x: WORLD_WIDTH * 0.18, y: WORLD_HEIGHT * 0.72, radius: 760, height: 0.9 },
  { x: WORLD_WIDTH * 0.78, y: WORLD_HEIGHT * 0.55, radius: 840, height: 0.94 },
  { x: WORLD_WIDTH * 0.34, y: WORLD_HEIGHT * 0.86, radius: 620, height: 0.64 },
  { x: WORLD_WIDTH * 0.68, y: WORLD_HEIGHT * 0.83, radius: 680, height: 0.7 },
];

const chunkCache = new Map<string, WorldChunk>();

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let n = Math.imul(t ^ (t >>> 15), 1 | t);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromChunk(chunkX: number, chunkY: number) {
  const h1 = (chunkX + 1) * 73856093;
  const h2 = (chunkY + 11) * 19349663;
  return (h1 ^ h2) >>> 0;
}

function createBezierPath(startX: number, endX: number, yAt: (x: number) => number) {
  const c1x = startX + (endX - startX) * 0.33;
  const c2x = startX + (endX - startX) * 0.66;
  const startY = yAt(startX);
  const c1y = yAt(c1x) - 120;
  const c2y = yAt(c2x) + 80;
  const endY = yAt(endX);

  return {
    startX,
    startY,
    c1x,
    c1y,
    c2x,
    c2y,
    endX,
    endY,
  };
}

export function getChunkKey(chunkX: number, chunkY: number) {
  return `${chunkX}_${chunkY}`;
}

export function getRiverYAt(x: number) {
  return (
    RIVER_BASE_Y +
    Math.sin(x / 1400) * RIVER_WAVE_A +
    Math.sin(x / 4100) * RIVER_WAVE_B
  );
}

export function getCoastYAt(x: number) {
  return (
    COAST_BASE_Y +
    Math.sin((x + 200) / 1600) * COAST_WAVE_A +
    Math.sin((x + 1000) / 4300) * COAST_WAVE_B
  );
}

export function riverPathForSvg() {
  const path = createBezierPath(-220, WORLD_WIDTH + 220, getRiverYAt);
  return `M ${path.startX} ${path.startY}
    C ${path.c1x} ${path.c1y}
      ${path.c2x} ${path.c2y}
      ${path.endX} ${path.endY}`;
}

export function coastPathForSvg() {
  const path = createBezierPath(-260, WORLD_WIDTH + 260, getCoastYAt);
  return `M ${path.startX} ${path.startY}
    C ${path.c1x} ${path.c1y}
      ${path.c2x} ${path.c2y}
      ${path.endX} ${path.endY}`;
}

export function coastAreaPathForSvg() {
  const path = createBezierPath(-260, WORLD_WIDTH + 260, getCoastYAt);
  return `M ${path.startX} -300
    L ${path.endX} -300
    L ${path.endX} ${path.endY}
    C ${path.c2x} ${path.c2y}
      ${path.c1x} ${path.c1y}
      ${path.startX} ${path.startY}
    Z`;
}

export function mountainStrengthAt(x: number, y: number) {
  let total = 0;
  for (const peak of MOUNTAIN_PEAKS) {
    const dist = Math.hypot(x - peak.x, y - peak.y);
    const influence = Math.exp(-(dist * dist) / (2 * peak.radius * peak.radius));
    total += influence * peak.height;
  }

  return clamp(total, 0, 1.25);
}

function isSeaArea(x: number, y: number) {
  return y < getCoastYAt(x) - 28;
}

function distanceToRiver(x: number, y: number) {
  return Math.abs(y - getRiverYAt(x));
}

function distanceToCoastLine(x: number, y: number) {
  return y - getCoastYAt(x);
}

function isMountainCore(x: number, y: number) {
  return mountainStrengthAt(x, y) > 0.84;
}

function buildRoadRoutes(): RouteDef[] {
  const routes: RouteDef[] = [];

  const horizontalAnchors = [0.28, 0.44, 0.62, 0.79].map(
    (ratio) => WORLD_HEIGHT * ratio
  );

  horizontalAnchors.forEach((y, index) => {
    const bend = index % 2 === 0 ? 300 : -260;
    const p0 = { x: -240, y };
    const p1 = { x: WORLD_WIDTH * 0.5, y: y + bend };
    const p2 = { x: WORLD_WIDTH + 240, y: y + bend * 0.35 };

    routes.push({
      id: `h_${index}`,
      type: "quadratic",
      p0,
      p1,
      p2,
      svgPath: `M ${p0.x} ${p0.y} Q ${p1.x} ${p1.y} ${p2.x} ${p2.y}`,
    });
  });

  const verticalAnchors = [0.12, 0.27, 0.43, 0.58, 0.74, 0.89].map(
    (ratio) => WORLD_WIDTH * ratio
  );

  verticalAnchors.forEach((x, index) => {
    const p0 = { x, y: -240 };
    const p1 = { x, y: WORLD_HEIGHT + 240 };
    routes.push({
      id: `v_${index}`,
      type: "line",
      p0,
      p1,
      svgPath: `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y}`,
    });
  });

  return routes;
}

export const ROAD_ROUTES = buildRoadRoutes();

export function routePoint(route: RouteDef, t: number) {
  if (route.type === "quadratic") {
    const x =
      (1 - t) * (1 - t) * route.p0.x +
      2 * (1 - t) * t * route.p1.x +
      t * t * route.p2.x;
    const y =
      (1 - t) * (1 - t) * route.p0.y +
      2 * (1 - t) * t * route.p1.y +
      t * t * route.p2.y;
    const dx =
      2 * (1 - t) * (route.p1.x - route.p0.x) +
      2 * t * (route.p2.x - route.p1.x);
    const dy =
      2 * (1 - t) * (route.p1.y - route.p0.y) +
      2 * t * (route.p2.y - route.p1.y);

    return {
      x,
      y,
      angle: (Math.atan2(dy, dx) * 180) / Math.PI,
    };
  }

  const x = route.p0.x + (route.p1.x - route.p0.x) * t;
  const y = route.p0.y + (route.p1.y - route.p0.y) * t;
  const angle =
    (Math.atan2(route.p1.y - route.p0.y, route.p1.x - route.p0.x) * 180) /
    Math.PI;

  return {
    x,
    y,
    angle,
  };
}

function distancePointToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return Math.hypot(px - x1, py - y1);
  }

  const t = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.hypot(px - projX, py - projY);
}

function distanceToRoute(route: RouteDef, x: number, y: number) {
  if (route.type === "line") {
    return distancePointToSegment(x, y, route.p0.x, route.p0.y, route.p1.x, route.p1.y);
  }

  let minDistance = Number.POSITIVE_INFINITY;
  const samples = 24;
  let prev = routePoint(route, 0);

  for (let index = 1; index <= samples; index += 1) {
    const curr = routePoint(route, index / samples);
    const distance = distancePointToSegment(x, y, prev.x, prev.y, curr.x, curr.y);
    minDistance = Math.min(minDistance, distance);
    prev = curr;
  }

  return minDistance;
}

function distanceToNearestRoad(x: number, y: number) {
  let minDistance = Number.POSITIVE_INFINITY;
  for (const route of ROAD_ROUTES) {
    minDistance = Math.min(minDistance, distanceToRoute(route, x, y));
  }
  return minDistance;
}

function classifyLotViewTag(x: number, y: number): LotViewTag {
  const coastDistance = distanceToCoastLine(x, y);
  const riverDistance = distanceToRiver(x, y);
  const mountain = mountainStrengthAt(x, y);

  if (coastDistance > 24 && coastDistance < 250) {
    return "sea-view";
  }

  if (riverDistance < 260) {
    return "river-view";
  }

  if (mountain > 0.36) {
    return "mountain-view";
  }

  if (riverDistance > 320 && mountain < 0.18) {
    return "park-view";
  }

  return "city-view";
}

function visualTypeForView(viewTag: LotViewTag, rand: () => number): LotVisualType {
  if (viewTag === "sea-view") {
    return rand() > 0.4 ? "sea-villa" : "blue-villa";
  }

  if (viewTag === "river-view") {
    return rand() > 0.4 ? "river-lodge" : "blue-villa";
  }

  if (viewTag === "mountain-view") {
    return rand() > 0.5 ? "mountain-chalet" : "dark-cabin";
  }

  return CITY_VISUALS[Math.floor(rand() * CITY_VISUALS.length)];
}

function makeNpc(
  chunkX: number,
  chunkY: number,
  rand: () => number,
  lotOrdinal: number,
  isMarket: boolean,
  viewTag: LotViewTag
): NpcConfig {
  if (isMarket) {
    const marketName = `Market ${chunkX + 1}-${chunkY + 1}`;
    return {
      name: marketName,
      role: "Merchant",
      avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${marketName}&backgroundColor=ffdfbf`,
      greeting: `${marketName} online. Need supplies, tools, or dataset drops?`,
      skills: "Trading",
    };
  }

  const globalIndex = chunkY * WORLD_CHUNKS_X * 16 + chunkX * 16 + lotOrdinal;
  const prefix = NAMES[globalIndex % NAMES.length];
  const suffix = 10 + Math.floor(rand() * 90);
  const role = ROLES[Math.floor(rand() * ROLES.length)];
  const label = `${prefix}-${suffix}`;

  return {
    name: `${label} Bot`,
    role,
    avatar: `https://api.dicebear.com/7.x/avataaars/png?seed=${label}&backgroundColor=c0aede`,
    greeting: `Hi, I am ${label}, your ${role}. I currently manage ${LOT_VIEW_LABELS[viewTag]} projects.`,
    skills: role,
  };
}

function generateChunk(chunkX: number, chunkY: number): WorldChunk {
  const key = getChunkKey(chunkX, chunkY);
  const rand = mulberry32(seedFromChunk(chunkX, chunkY));
  const chunkMinX = chunkX * CHUNK_SIZE;
  const chunkMinY = chunkY * CHUNK_SIZE;

  const lots: LotData[] = [];
  const trees: TreeData[] = [];

  const marketTarget = rand() > 0.63 ? 1 : 0;
  const houseTarget = 5 + Math.floor(rand() * 6);
  const lotTarget = marketTarget + houseTarget;

  let lotAttempts = 0;
  while (lots.length < lotTarget && lotAttempts < 460) {
    lotAttempts += 1;

    const x = chunkMinX + 72 + rand() * (CHUNK_SIZE - 144);
    const y = chunkMinY + 72 + rand() * (CHUNK_SIZE - 144);

    const roadDistance = distanceToNearestRoad(x, y);
    const riverDistance = distanceToRiver(x, y);
    const coastDistance = distanceToCoastLine(x, y);
    const mountain = mountainStrengthAt(x, y);
    const homeDistance = Math.hypot(x - HOME_POSITION.x, y - HOME_POSITION.y);

    if (x < 40 || y < 40 || x > WORLD_WIDTH - 40 || y > WORLD_HEIGHT - 40) continue;
    if (isSeaArea(x, y)) continue;
    if (isMountainCore(x, y)) continue;
    if (coastDistance < 26) continue;
    if (riverDistance < RIVER_WIDTH * 0.52) continue;
    if (roadDistance < 85 || roadDistance > 285) continue;
    if (mountain > 1.05) continue;
    if (homeDistance < 240) continue;
    if (lots.some((lot) => Math.hypot(lot.x - x, lot.y - y) < 150)) continue;

    const isMarket = lots.length < marketTarget;
    const viewTag = isMarket ? "city-view" : classifyLotViewTag(x, y);
    const npc = makeNpc(chunkX, chunkY, rand, lots.length, isMarket, viewTag);

    lots.push({
      id: `${key}_lot_${lots.length}`,
      x,
      y,
      label: isMarket ? `Market ${chunkX + 1}-${chunkY + 1}` : npc.name.replace(" Bot", ""),
      viewTag,
      visualType: isMarket ? "market-stall" : visualTypeForView(viewTag, rand),
      isMarket,
      npc,
    });
  }

  const treeTarget = 20 + Math.floor(rand() * 16);
  let treeAttempts = 0;
  while (trees.length < treeTarget && treeAttempts < 980) {
    treeAttempts += 1;
    const x = chunkMinX + rand() * CHUNK_SIZE;
    const y = chunkMinY + rand() * CHUNK_SIZE;

    if (x < 30 || y < 30 || x > WORLD_WIDTH - 30 || y > WORLD_HEIGHT - 30) continue;
    if (isSeaArea(x, y)) continue;
    if (distanceToRiver(x, y) < RIVER_WIDTH * 0.68) continue;
    if (distanceToNearestRoad(x, y) < 70) continue;
    if (lots.some((lot) => Math.hypot(lot.x - x, lot.y - y) < 95)) continue;

    const mountain = mountainStrengthAt(x, y);
    trees.push({
      x,
      y,
      scale: (0.6 + rand() * 0.85) * (mountain > 0.34 ? 0.85 : 1),
    });
  }

  return {
    key,
    chunkX,
    chunkY,
    lots,
    trees,
  };
}

export function getChunk(chunkX: number, chunkY: number): WorldChunk {
  const safeChunkX = clamp(chunkX, 0, WORLD_CHUNKS_X - 1);
  const safeChunkY = clamp(chunkY, 0, WORLD_CHUNKS_Y - 1);
  const key = getChunkKey(safeChunkX, safeChunkY);
  const cached = chunkCache.get(key);
  if (cached) {
    return cached;
  }

  const chunk = generateChunk(safeChunkX, safeChunkY);
  chunkCache.set(key, chunk);
  return chunk;
}

export function getVisibleChunkRange(options: {
  scrollX: number;
  scrollY: number;
  viewportWidth: number;
  viewportHeight: number;
  scale: number;
  overscan?: number;
}): ChunkRange {
  const safeScale = Math.max(options.scale, 0.1);
  const overscan = options.overscan ?? 1;

  const left = options.scrollX / safeScale;
  const right = (options.scrollX + options.viewportWidth) / safeScale;
  const top = options.scrollY / safeScale;
  const bottom = (options.scrollY + options.viewportHeight) / safeScale;

  return {
    minChunkX: clamp(Math.floor(left / CHUNK_SIZE) - overscan, 0, WORLD_CHUNKS_X - 1),
    maxChunkX: clamp(Math.floor(right / CHUNK_SIZE) + overscan, 0, WORLD_CHUNKS_X - 1),
    minChunkY: clamp(Math.floor(top / CHUNK_SIZE) - overscan, 0, WORLD_CHUNKS_Y - 1),
    maxChunkY: clamp(Math.floor(bottom / CHUNK_SIZE) + overscan, 0, WORLD_CHUNKS_Y - 1),
  };
}

export function getChunksInRange(range: ChunkRange) {
  const chunks: WorldChunk[] = [];
  for (let chunkY = range.minChunkY; chunkY <= range.maxChunkY; chunkY += 1) {
    for (let chunkX = range.minChunkX; chunkX <= range.maxChunkX; chunkX += 1) {
      chunks.push(getChunk(chunkX, chunkY));
    }
  }
  return chunks;
}

export function chunkForWorldPoint(x: number, y: number) {
  return {
    chunkX: clamp(Math.floor(x / CHUNK_SIZE), 0, WORLD_CHUNKS_X - 1),
    chunkY: clamp(Math.floor(y / CHUNK_SIZE), 0, WORLD_CHUNKS_Y - 1),
  };
}

export function getRectAroundPoint(
  centerX: number,
  centerY: number,
  width: number,
  height: number
): WorldRect {
  const safeWidth = Math.max(120, width);
  const safeHeight = Math.max(120, height);

  let minX = centerX - safeWidth / 2;
  let maxX = centerX + safeWidth / 2;
  let minY = centerY - safeHeight / 2;
  let maxY = centerY + safeHeight / 2;

  if (minX < 0) {
    maxX += -minX;
    minX = 0;
  }

  if (minY < 0) {
    maxY += -minY;
    minY = 0;
  }

  if (maxX > WORLD_WIDTH) {
    minX -= maxX - WORLD_WIDTH;
    maxX = WORLD_WIDTH;
  }

  if (maxY > WORLD_HEIGHT) {
    minY -= maxY - WORLD_HEIGHT;
    maxY = WORLD_HEIGHT;
  }

  minX = clamp(minX, 0, WORLD_WIDTH);
  minY = clamp(minY, 0, WORLD_HEIGHT);
  maxX = clamp(maxX, 0, WORLD_WIDTH);
  maxY = clamp(maxY, 0, WORLD_HEIGHT);

  return {
    minX,
    maxX,
    minY,
    maxY,
  };
}

export function getWorldContentInRect(
  rect: WorldRect,
  padding = 0
): WorldContentInRect {
  const paddedRect = {
    minX: clamp(rect.minX - padding, 0, WORLD_WIDTH),
    maxX: clamp(rect.maxX + padding, 0, WORLD_WIDTH),
    minY: clamp(rect.minY - padding, 0, WORLD_HEIGHT),
    maxY: clamp(rect.maxY + padding, 0, WORLD_HEIGHT),
  };

  const range: ChunkRange = {
    minChunkX: clamp(Math.floor(paddedRect.minX / CHUNK_SIZE), 0, WORLD_CHUNKS_X - 1),
    maxChunkX: clamp(Math.floor(paddedRect.maxX / CHUNK_SIZE), 0, WORLD_CHUNKS_X - 1),
    minChunkY: clamp(Math.floor(paddedRect.minY / CHUNK_SIZE), 0, WORLD_CHUNKS_Y - 1),
    maxChunkY: clamp(Math.floor(paddedRect.maxY / CHUNK_SIZE), 0, WORLD_CHUNKS_Y - 1),
  };

  const chunks = getChunksInRange(range);
  const lots = chunks
    .flatMap((chunk) => chunk.lots)
    .filter(
      (lot) =>
        lot.x >= paddedRect.minX &&
        lot.x <= paddedRect.maxX &&
        lot.y >= paddedRect.minY &&
        lot.y <= paddedRect.maxY
    );

  const trees = chunks
    .flatMap((chunk) => chunk.trees)
    .filter(
      (tree) =>
        tree.x >= paddedRect.minX &&
        tree.x <= paddedRect.maxX &&
        tree.y >= paddedRect.minY &&
        tree.y <= paddedRect.maxY
    );

  return {
    rect: paddedRect,
    chunks,
    lots,
    trees,
  };
}

export function mapMyHouseTypeToVisual(houseType: number): LotVisualType {
  return HOUSE_TYPE_VISUALS[Math.abs(houseType) % HOUSE_TYPE_VISUALS.length];
}
