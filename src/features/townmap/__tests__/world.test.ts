import {
  CHUNK_SIZE,
  chunkForWorldPoint,
  getRectAroundPoint,
  getChunk,
  getWorldContentInRect,
  getVisibleChunkRange,
  LOT_VIEW_LABELS,
  WORLD_CHUNKS_X,
  WORLD_CHUNKS_Y,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from "../world";

describe("world runtime", () => {
  it("returns deterministic chunk data and caches by key", () => {
    const first = getChunk(2, 3);
    const second = getChunk(2, 3);

    expect(second).toBe(first);
    expect(first.lots.length).toBeGreaterThan(0);
    expect(first.trees.length).toBeGreaterThan(0);

    const labels = first.lots.map((lot) => lot.label);
    expect(labels).toEqual(getChunk(2, 3).lots.map((lot) => lot.label));
    expect(first.lots.every((lot) => Boolean(LOT_VIEW_LABELS[lot.viewTag]))).toBe(true);
  });

  it("computes visible range with clamped world boundaries", () => {
    const nearStart = getVisibleChunkRange({
      scrollX: 0,
      scrollY: 0,
      viewportWidth: 900,
      viewportHeight: 700,
      scale: 0.5,
    });

    expect(nearStart.minChunkX).toBe(0);
    expect(nearStart.minChunkY).toBe(0);
    expect(nearStart.maxChunkX).toBe(2);
    expect(nearStart.maxChunkY).toBe(2);

    const nearEnd = getVisibleChunkRange({
      scrollX: WORLD_WIDTH - 200,
      scrollY: WORLD_HEIGHT - 200,
      viewportWidth: 1200,
      viewportHeight: 900,
      scale: 1.1,
      overscan: 2,
    });

    expect(nearEnd.maxChunkX).toBe(WORLD_CHUNKS_X - 1);
    expect(nearEnd.maxChunkY).toBe(WORLD_CHUNKS_Y - 1);
  });

  it("maps world coordinates to chunk coordinates", () => {
    expect(chunkForWorldPoint(CHUNK_SIZE * 3 + 12, CHUNK_SIZE * 4 + 88)).toEqual({
      chunkX: 3,
      chunkY: 4,
    });

    expect(chunkForWorldPoint(-20, -20)).toEqual({
      chunkX: 0,
      chunkY: 0,
    });
  });

  it("loads deterministic content from a world rect", () => {
    const rect = getRectAroundPoint(5200, 5600, 2400, 1800);
    const sceneA = getWorldContentInRect(rect, 120);
    const sceneB = getWorldContentInRect(rect, 120);

    expect(sceneA.rect).toEqual(sceneB.rect);
    expect(sceneA.lots.length).toBeGreaterThan(0);
    expect(sceneA.trees.length).toBeGreaterThan(0);
    expect(sceneA.lots[0]?.id).toBe(sceneB.lots[0]?.id);
  });
});
