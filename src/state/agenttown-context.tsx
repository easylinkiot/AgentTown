import React, { createContext, useContext, useMemo, useState } from "react";

import { DEFAULT_MYBOT_AVATAR } from "@/src/constants/chat";
import { BotConfig, TaskItem } from "@/src/types";

interface AgentTownContextValue {
  botConfig: BotConfig;
  tasks: TaskItem[];
  myHouseType: number;
  updateBotConfig: (next: BotConfig) => void;
  addTask: (task: TaskItem) => void;
  updateHouseType: (next: number) => void;
}

const defaultBotConfig: BotConfig = {
  name: "MyBot",
  avatar: DEFAULT_MYBOT_AVATAR,
  systemInstruction:
    "You are a helpful and friendly digital assistant living in AgentTown.",
  documents: [],
  installedSkillIds: [],
  knowledgeKeywords: [],
};

const defaultTasks: TaskItem[] = [
  {
    id: "seed-task",
    title: "Review UI Prototype",
    assignee: "Jason",
    priority: "High",
    status: "Pending",
  },
];

const AgentTownContext = createContext<AgentTownContextValue | null>(null);

export function AgentTownProvider({ children }: { children: React.ReactNode }) {
  const [botConfig, setBotConfig] = useState<BotConfig>(defaultBotConfig);
  const [tasks, setTasks] = useState<TaskItem[]>(defaultTasks);
  const [myHouseType, setMyHouseType] = useState<number>(3);

  const value = useMemo<AgentTownContextValue>(() => {
    return {
      botConfig,
      tasks,
      myHouseType,
      updateBotConfig: setBotConfig,
      addTask: (task) => {
        setTasks((prev) => [{ ...task, id: task.id ?? String(Date.now()) }, ...prev]);
      },
      updateHouseType: setMyHouseType,
    };
  }, [botConfig, myHouseType, tasks]);

  return (
    <AgentTownContext.Provider value={value}>{children}</AgentTownContext.Provider>
  );
}

export function useAgentTown(): AgentTownContextValue {
  const value = useContext(AgentTownContext);
  if (!value) {
    throw new Error("useAgentTown must be used inside AgentTownProvider");
  }
  return value;
}
