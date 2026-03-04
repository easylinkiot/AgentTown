import type { AssistCandidate } from "@/src/services/chatAssist";
import type { CreateTaskInput } from "@/src/lib/api";
import type { TaskItem } from "@/src/types";

export function assistCandidateSelectionKey(candidate: AssistCandidate, index: number) {
  const id = (candidate.id || "").trim();
  return `${id || "candidate"}_${index}`;
}

export function normalizeTaskPriority(priority?: string): TaskItem["priority"] {
  const raw = (priority || "").trim().toLowerCase();
  if (!raw) return "Medium";
  if (raw.includes("high") || raw.includes("urgent") || raw.includes("p0") || raw.includes("p1")) return "High";
  if (raw.includes("low") || raw.includes("p3") || raw.includes("p4")) return "Low";
  return "Medium";
}

export function buildTaskTitleFromCandidate(candidate: AssistCandidate, index: number) {
  const title = (candidate.title || "").trim();
  if (title) return title;
  const firstLine = (candidate.text || "")
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  if (firstLine) return firstLine.slice(0, 120);
  return `Task ${index + 1}`;
}

export interface BuildTaskItemOptions {
  assignee: string;
  targetType?: string;
  targetId?: string;
  sourceThreadId?: string;
  sourceMessageId?: string;
}

export function buildTaskItemFromCandidate(
  candidate: AssistCandidate,
  index: number,
  options: BuildTaskItemOptions
): CreateTaskInput {
  const targetType = (options.targetType || "").trim() || "self";
  const targetId = (options.targetId || "").trim() || "root";
  const description = (candidate.text || "").trim();
  return {
    title: buildTaskTitleFromCandidate(candidate, index),
    description: description || undefined,
    target_type: targetType,
    target_id: targetId,
    targetType,
    targetId,
    assignee: options.assignee,
    priority: normalizeTaskPriority(candidate.priority),
    status: "Pending",
    owner: options.assignee,
    sourceThreadId: options.sourceThreadId,
    sourceMessageId: options.sourceMessageId,
  };
}
