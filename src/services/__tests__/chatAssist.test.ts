import { setAuthToken } from "@/src/lib/api";
import {
  listChatAssistSkills,
  mergeAssistCandidates,
  reduceAssistCandidatesFromEvent,
  runChatAssist,
  type AssistCandidate,
} from "../chatAssist";

describe("chatAssist helpers", () => {
  const originalBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_BASE_URL = "https://api.example.com";
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
    setAuthToken("access-token");
  });

  afterEach(() => {
    setAuthToken(null);
    fetchMock.mockReset();
    process.env.EXPO_PUBLIC_API_BASE_URL = originalBaseUrl;
  });

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

  it("parses translate/follow_up candidate arrays from assist payload", () => {
    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        assist_candidates: {
          translate_candidates: [{ id: "tr1", translated_text: "Hallo Welt" }],
          follow_up_candidates: [{ id: "fu1", title: "Follow up", description: "Ping supplier", priority: "high" }],
        },
      },
      []
    );

    expect(next).toHaveLength(2);
    expect(next[0]).toMatchObject({ id: "tr1", kind: "translate", text: "Hallo Welt" });
    expect(next[1]).toMatchObject({
      id: "fu1",
      kind: "follow_up",
      title: "Follow up",
      text: "Follow up\nPing supplier",
      priority: "high",
    });
  });

  it("parses nested payload/data wrapped assist candidates", () => {
    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        payload: {
          data: {
            assist_candidates: {
              translate_candidates: [{ id: "tr2", text: "Guten Tag", targetLanguage: "de" }],
            },
          },
        },
      },
      []
    );

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      id: "tr2",
      kind: "translate",
      text: "Guten Tag",
      targetLanguage: "de",
    });
  });

  it("parses candidate list objects with items array", () => {
    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        assist_candidates: {
          translate_candidates: {
            items: [{ id: "tr3", translated_text: "Hallo Welt", target_language: "de" }],
          },
        },
      },
      []
    );

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({
      id: "tr3",
      kind: "translate",
      text: "Hallo Welt",
      targetLanguage: "de",
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

  it("merges single translate candidate by id", () => {
    const prev: AssistCandidate[] = [{ id: "tr1", kind: "translate", text: "Hallo Welt" }];
    const next = reduceAssistCandidatesFromEvent(
      "assist_candidates",
      {
        translate_candidate: { id: "tr1", text: "Hello world" },
      },
      prev
    );

    expect(next).toHaveLength(1);
    expect(next[0]).toMatchObject({ id: "tr1", kind: "translate", text: "Hello world" });
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

  it("runs v2 assist for auto_reply and parses candidates", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skill_id: "professional-reply",
          candidates: {
            candidates: [
              { id: "r1", text: "Reply One" },
            ],
          },
        }),
    } as Response);

    const onCandidates = jest.fn();
    await runChatAssist(
      {
        action: "auto_reply",
        input: "please rewrite",
        selected_message_content: "raw content",
      },
      { onCandidates }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v2/chat/assist");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-token");
    const body = JSON.parse((init.body as string) || "{}");
    expect(body.skill_id).toBe("professional-reply");
    expect(body.messages).toEqual([{ role: "user", content: "please rewrite" }]);
    expect(onCandidates).toHaveBeenCalledWith([
      { id: "r1", kind: "reply", text: "Reply One" },
    ]);
  });

  it("uses selected item content when assist input is empty", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skill_id: "professional-reply",
          candidates: {
            candidates: [{ id: "r1", text: "Reply One" }],
          },
        }),
    } as Response);

    await runChatAssist({
      action: "auto_reply",
      selected_message_content: "selected item content",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((init.body as string) || "{}");
    expect(body.messages).toEqual([{ role: "user", content: "selected item content" }]);
  });

  it("uses assist input instead of selected item content when input exists", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skill_id: "professional-reply",
          candidates: {
            candidates: [{ id: "r1", text: "Reply One" }],
          },
        }),
    } as Response);

    await runChatAssist({
      action: "auto_reply",
      input: "typed request",
      selected_message_content: "selected item content",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((init.body as string) || "{}");
    expect(body.messages).toEqual([{ role: "user", content: "typed request" }]);
    expect(body.messages[0].content).not.toContain("selected item content");
  });

  it("prefers explicit context messages when provided", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skill_id: "action-needs",
          candidates: {
            tasks: [{ id: "t1", title: "Send report", description: "Before Friday", priority: "high" }],
          },
        }),
    } as Response);

    await runChatAssist({
      action: "add_task",
      input: "ignore me",
      selected_message_content: "ignore selected item",
      messages: [
        { role: "user", content: "message 1" },
        { role: "assistant", content: "message 2" },
      ],
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((init.body as string) || "{}");
    expect(body.messages).toEqual([
      { role: "user", content: "message 1" },
      { role: "assistant", content: "message 2" },
    ]);
  });

  it("runs v2 assist for add_task and parses task candidates", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skill_id: "action-needs",
          candidates: {
            tasks: [
              { id: "t1", title: "Send report", description: "Before Friday", priority: "high" },
            ],
          },
        }),
    } as Response);

    const onCandidates = jest.fn();
    await runChatAssist(
      {
        action: "add_task",
        input: "extract tasks",
      },
      { onCandidates }
    );

    expect(onCandidates).toHaveBeenCalledWith([
      {
        id: "t1",
        kind: "task",
        text: "Send report\nBefore Friday",
        title: "Send report",
        description: "Before Friday",
        priority: "high",
      },
    ]);
  });

  it("lists v2 assist skills and maps them into known actions", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skills: [
            { id: "professional-reply", name: "Reply Pro", user_input_required: true },
            { id: "action-needs", title: "Task Extractor", user_input_required: false },
            { id: "translate", label: "Translate", user_input_required: true },
            { id: "generate-idea", display_name: "Follow-up", user_input_required: false },
            { id: "unknown-skill", name: "Skip me" },
          ],
        }),
    } as Response);

    const list = await listChatAssistSkills();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.example.com/v2/chat/assist/skills");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer access-token");
    expect(list).toHaveLength(5);
    expect(list).toMatchObject([
      { id: "professional-reply", action: "auto_reply", name: "Reply Pro", userInputRequired: true },
      { id: "action-needs", action: "add_task", name: "Task Extractor", userInputRequired: false },
      { id: "translate", action: "translate", name: "Translate", userInputRequired: true },
      { id: "generate-idea", action: "follow_up", name: "Follow-up", userInputRequired: false },
      { id: "unknown-skill", action: null, name: "Skip me", userInputRequired: false },
    ]);
  });

  it("prefers explicit skill_id from UI-selected assist skill", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          candidates: {
            candidates: [{ id: "r1", text: "Reply One" }],
          },
        }),
    } as Response);

    await runChatAssist({
      action: "auto_reply",
      skill_id: "professional-reply-v2",
      input: "rewrite this",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse((init.body as string) || "{}");
    expect(body.skill_id).toBe("professional-reply-v2");
  });

  it("maps underscore skill ids from v2-api doc style", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          skills: [
            { id: "professional_reply", name: "Professional Reply", userInputRequired: true },
            { id: "action_needs", name: "Action Needs", userInputRequired: false },
            { id: "generate_idea", name: "Generate Idea", userInputRequired: false },
          ],
        }),
    } as Response);

    const list = await listChatAssistSkills();
    expect(list).toHaveLength(3);
    expect(list).toMatchObject([
      { id: "professional_reply", action: "auto_reply", name: "Professional Reply", userInputRequired: true },
      { id: "action_needs", action: "add_task", name: "Action Needs", userInputRequired: false },
      { id: "generate_idea", action: "follow_up", name: "Generate Idea", userInputRequired: false },
    ]);
  });
});
