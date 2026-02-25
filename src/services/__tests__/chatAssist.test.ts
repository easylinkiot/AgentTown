import {
  mergeAssistCandidates,
  reduceAssistCandidatesFromEvent,
  type AssistCandidate,
} from "../chatAssist";

describe("chatAssist helpers", () => {
  it("replaces candidates when payload contains full assist_candidates arrays", () => {
    const prev: AssistCandidate[] = [
      { id: "old", kind: "reply", text: "Old one" },
    ];
    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        assist_candidates: {
          reply_candidates: [{ id: "r1", text: "Reply 1" }],
          task_candidates: [{ id: "t1", title: "Task 1", description: "Do it", priority: "high" }],
        },
      },
      prev
    );

    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ id: "r1", kind: "reply", text: "Reply 1" });
    expect(next[1]).toMatchObject({
      id: "t1",
      kind: "task",
      title: "Task 1",
      description: "Do it",
      text: "Task 1\nDo it",
    });
  });

  it("merges single candidate updates by id", () => {
    const prev: AssistCandidate[] = [
      { id: "r1", kind: "reply", text: "Initial" },
      { id: "r2", kind: "reply", text: "Keep" },
    ];

    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        reply_candidate: { id: "r1", text: "Updated" },
      },
      prev
    );

    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ id: "r1", text: "Updated" });
    expect(next[1]).toMatchObject({ id: "r2", text: "Keep" });
  });

  it("appends message_delta text into one streaming candidate", () => {
    const first = reduceAssistCandidatesFromEvent("message_delta", { delta: { text: "Hel" } }, []);
    const second = reduceAssistCandidatesFromEvent("message_delta", { delta: { text: "lo" } }, first);

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({
      kind: "text",
      text: "Hello",
    });
  });

  it("ignores non-text events even if payload contains delta.text", () => {
    const next = reduceAssistCandidatesFromEvent(
      "tool_execution_result",
      { delta: { text: "debug payload" } },
      []
    );
    expect(next).toEqual([]);
  });

  it("accepts unknown delta-like event names", () => {
    const next = reduceAssistCandidatesFromEvent(
      "response.delta_text",
      { delta: { text: "hello" } },
      []
    );
    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ kind: "text", text: "hello" });
  });

  it("sanitizes agenttown fallback prompt text for ask_anything", () => {
    const next = reduceAssistCandidatesFromEvent(
      "message_delta",
      {
        delta: {
          text:
            "[agenttown-fallback] Assist action: ask_anything\nUserQuestion: 也一样\nSelectedMessageContext: test",
        },
      },
      []
    );
    expect(next).toHaveLength(1);
    expect(next[0].text).toContain("回退输出");
    expect(next[0].text).not.toContain("SelectedMessageContext");
  });

  it("appends candidates without id and merges those with id", () => {
    const incoming: AssistCandidate[] = [
      { id: "r1", kind: "reply", text: "B" },
      { kind: "text", text: "C" },
    ];
    const next = mergeAssistCandidates(
      [{ id: "r1", kind: "reply", text: "A" }],
      incoming
    );

    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ id: "r1", text: "B" });
    expect(next[1]).toMatchObject({ kind: "text", text: "C" });
  });
});
