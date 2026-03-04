import type { AssistCandidate } from "@/src/services/chatAssist";

import {
  assistCandidateSelectionKey,
  buildTaskItemFromCandidate,
  buildTaskTitleFromCandidate,
  normalizeTaskPriority,
} from "../ask-ai-helpers";

function createTaskCandidate(overrides?: Partial<AssistCandidate>): AssistCandidate {
  return {
    id: "task_1",
    kind: "task",
    text: "Write summary",
    title: "Write summary",
    priority: "medium",
    ...overrides,
  };
}

describe("ask-ai helpers", () => {
  it("builds selection key from trimmed candidate id", () => {
    const key = assistCandidateSelectionKey(createTaskCandidate({ id: "  task_99  " }), 2);
    expect(key).toBe("task_99_2");
  });

  it("falls back to candidate prefix when id is empty", () => {
    const key = assistCandidateSelectionKey(createTaskCandidate({ id: "   " }), 4);
    expect(key).toBe("candidate_4");
  });

  it("normalizes priority to High for urgent/high/P0/P1", () => {
    expect(normalizeTaskPriority("urgent")).toBe("High");
    expect(normalizeTaskPriority("HIGH")).toBe("High");
    expect(normalizeTaskPriority("p0 blocker")).toBe("High");
    expect(normalizeTaskPriority("P1")).toBe("High");
  });

  it("normalizes priority to Low for low/P3/P4", () => {
    expect(normalizeTaskPriority("low")).toBe("Low");
    expect(normalizeTaskPriority("p3 backlog")).toBe("Low");
    expect(normalizeTaskPriority("P4")).toBe("Low");
  });

  it("returns Medium for empty or unknown priority", () => {
    expect(normalizeTaskPriority("")).toBe("Medium");
    expect(normalizeTaskPriority(undefined)).toBe("Medium");
    expect(normalizeTaskPriority("normal")).toBe("Medium");
  });

  it("uses explicit title when provided", () => {
    const title = buildTaskTitleFromCandidate(createTaskCandidate({ title: "  Follow up with design  " }), 0);
    expect(title).toBe("Follow up with design");
  });

  it("falls back to first non-empty text line and truncates to 120 chars", () => {
    const longLine = "A".repeat(150);
    const title = buildTaskTitleFromCandidate(
      createTaskCandidate({
        title: "",
        text: `  \n${longLine}\nSecond line`,
      }),
      1
    );
    expect(title).toBe("A".repeat(120));
  });

  it("falls back to indexed task label when title/text are empty", () => {
    const title = buildTaskTitleFromCandidate(createTaskCandidate({ title: "", text: "   " }), 5);
    expect(title).toBe("Task 6");
  });

  it("builds create-task payload with demo-compatible target fields", () => {
    const payload = buildTaskItemFromCandidate(
      createTaskCandidate({
        title: "",
        text: "Ship v1 release",
        priority: "p1",
      }),
      0,
      {
        assignee: "Alice",
        targetType: "group",
        targetId: "thread_1",
        sourceThreadId: "thread_1",
        sourceMessageId: "msg_1",
      }
    );

    expect(payload).toEqual({
      title: "Ship v1 release",
      description: "Ship v1 release",
      target_type: "group",
      target_id: "thread_1",
      targetType: "group",
      targetId: "thread_1",
      assignee: "Alice",
      priority: "High",
      status: "Pending",
      owner: "Alice",
      sourceThreadId: "thread_1",
      sourceMessageId: "msg_1",
    });
  });
});
