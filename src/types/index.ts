export interface ChatThread {
  id: string;
  name: string;
  avatar: string;
  message: string;
  time: string;
  unreadCount?: number;
  isVoiceCall?: boolean;
  isSystem?: boolean;
  highlight?: boolean;
}

export type TaskPriority = "High" | "Medium" | "Low";
export type TaskStatus = "Pending" | "In Progress" | "Done";

export interface TaskItem {
  id?: string;
  title: string;
  assignee: string;
  priority: TaskPriority;
  status: TaskStatus;
}

export interface BotConfig {
  name: string;
  avatar: string;
  systemInstruction: string;
  documents: string[];
  installedSkillIds: string[];
  knowledgeKeywords: string[];
}

export type ConversationType = "text" | "voice" | "reply" | "summary";

export interface ConversationMessage {
  id: string;
  senderName?: string;
  senderAvatar: string;
  content: string;
  type: ConversationType;
  isMe: boolean;
  time?: string;
  voiceDuration?: string;
  replyContext?: string;
}

export interface AiContextState {
  mode: "idle" | "loading" | "reply" | "task" | "brainstorm" | "custom";
  data: unknown;
}

export interface MarketModule {
  name: string;
  type: "file" | "folder";
  desc: string;
  size?: string;
  tags?: string[];
}

export interface MarketItem {
  id: string;
  name: string;
  description: string;
  fullDetail: string;
  modules: MarketModule[];
  keywords?: string[];
}

export interface MarketCategory {
  id: string;
  title: string;
  subtitle: string;
  items: MarketItem[];
}
