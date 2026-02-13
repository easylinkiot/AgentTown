import { createAgentTownSlug } from "../agenttown";

describe("createAgentTownSlug", () => {
  it("normalizes names into URL-safe slugs", () => {
    expect(createAgentTownSlug(" AgentTown Alpha 2026! ")).toBe(
      "agenttown-alpha-2026"
    );
  });
});
