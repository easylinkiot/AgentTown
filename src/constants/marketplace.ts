import { MarketCategory } from "@/src/types";

export const MARKET_DATA: MarketCategory[] = [
  {
    id: "eng",
    title: "工程师类",
    subtitle: "AI 代理与本地模型库",
    items: [
      {
        id: "anthropic-skills",
        name: "anthropics/skills",
        description: "官方开源技能规范，支持 MCP 工具链。",
        fullDetail:
          "已集成 MCP 能力：文件系统操作、命令执行与屏幕交互工具。",
        keywords: ["MCP", "File Ops", "Bash", "GUI"],
        modules: [
          { name: "computer_use", type: "folder", desc: "Screen interaction module" },
          {
            name: "bash_tool.py",
            type: "file",
            desc: "Command line interface",
            size: "12KB",
            tags: ["Shell", "Automation"],
          },
          {
            name: "file_system.js",
            type: "file",
            desc: "Read/write operations",
            size: "8KB",
            tags: ["Node", "I/O"],
          },
        ],
      },
      {
        id: "langgraph-agents",
        name: "jenasuraj/Ai_agents",
        description: "基于 LangGraph 的专业 Agent 集合。",
        fullDetail: "已安装 LangGraph Agent 模板，可执行 GitHub 与市场调研任务。",
        keywords: ["LangGraph", "GitHub API", "Scraping"],
        modules: [
          { name: "workflows", type: "folder", desc: "Graph definitions" },
          {
            name: "github_agent.py",
            type: "file",
            desc: "Repo management logic",
            size: "24KB",
          },
          {
            name: "market_research.py",
            type: "file",
            desc: "Web scraper & summarizer",
            size: "18KB",
          },
        ],
      },
    ],
  },
  {
    id: "pm",
    title: "产品经理类",
    subtitle: "提示词模板与执行框架",
    items: [
      {
        id: "claude-skills",
        name: "alirezarezvani/claude-skills",
        description: "87+ CLI 工具：Sprint 计划、Jira 自动化、PRD 生成。",
        fullDetail: "已集成 PM 生产力套件：Sprint/Jira/PRD 自动化模板。",
        keywords: ["Jira", "Sprint", "PRD"],
        modules: [
          { name: "templates", type: "folder", desc: "Markdown templates" },
          { name: "jira_sync.sh", type: "file", desc: "Jira API integration", size: "6KB" },
          {
            name: "prd_generator.py",
            type: "file",
            desc: "Requirement generator",
            size: "15KB",
          },
        ],
      },
      {
        id: "pm-resources",
        name: "gigikenneth/pm-resources",
        description: "AI 策略框架、数据分析路径和课程清单。",
        fullDetail: "已接入 PM 知识库：策略框架、数据分析与认证路线。",
        keywords: ["Strategy", "Data", "Framework"],
        modules: [
          {
            name: "strategy_frameworks.pdf",
            type: "file",
            desc: "Strategic models",
            size: "2.4MB",
          },
          {
            name: "data_analytics_path.md",
            type: "file",
            desc: "Learning path",
            size: "5KB",
          },
        ],
      },
    ],
  },
  {
    id: "mgmt",
    title: "管理层类",
    subtitle: "资源中心与人机协作",
    items: [
      {
        id: "eng-manager",
        name: "ryanburgess/engineer-manager",
        description: "团队建设、冲突解决、技术领导力资料库。",
        fullDetail: "已安装工程管理知识模块，可用于团队协作建议。",
        keywords: ["Leadership", "Hiring", "Conflict"],
        modules: [
          {
            name: "one_on_one_questions.md",
            type: "file",
            desc: "Interview guide",
            size: "4KB",
          },
          {
            name: "career_ladder.xlsx",
            type: "file",
            desc: "Growth framework",
            size: "12KB",
          },
        ],
      },
      {
        id: "500-agents",
        name: "ashishpatel26/500-AI-Agents",
        description: "500 个行业 AI Agent 落地案例。",
        fullDetail: "已集成行业落地案例库，覆盖金融、医疗、电商等场景。",
        keywords: ["Use Cases", "Fintech", "Healthcare"],
        modules: [
          { name: "industry_cases", type: "folder", desc: "Case studies by sector" },
          {
            name: "mindmap_finance.png",
            type: "file",
            desc: "Fintech use cases",
            size: "3.5MB",
          },
        ],
      },
    ],
  },
  {
    id: "mkt",
    title: "市场与销售类",
    subtitle: "多模态工具与自动化营销",
    items: [
      {
        id: "antigravity",
        name: "sickn33/antigravity-skills",
        description: "230+ 自动化运营和营销技能。",
        fullDetail: "已安装营销工具包：社媒发布、市场调研和线索生成。",
        keywords: ["Marketing", "Social", "Lead Gen"],
        modules: [
          { name: "social_automation", type: "folder", desc: "Bot scripts" },
          {
            name: "twitter_poster.py",
            type: "file",
            desc: "Auto-tweet script",
            size: "14KB",
          },
          {
            name: "linkedin_scraper.js",
            type: "file",
            desc: "Lead generation",
            size: "22KB",
          },
        ],
      },
      {
        id: "synthesia",
        name: "Synthesia Official",
        description: "视频脚本、个性化邮件营销工具指南。",
        fullDetail: "已集成多模态营销助手：视频脚本、邮件个性化和素材建议。",
        keywords: ["Video", "Email", "Avatar"],
        modules: [
          { name: "video_scripts", type: "folder", desc: "Prompt templates" },
          {
            name: "email_personalizer.py",
            type: "file",
            desc: "Cold email logic",
            size: "11KB",
          },
          {
            name: "avatar_config.json",
            type: "file",
            desc: "Visual settings",
            size: "2KB",
          },
        ],
      },
    ],
  },
];
