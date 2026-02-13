import { ChatThread, ConversationMessage } from "@/src/types";

export const CHAT_DATA: ChatThread[] = [
  {
    id: "group_14",
    name: "powerhoo AIR 项目沟通群(14)",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671142.jpg?w=200",
    message: "子非鱼: 👌",
    time: "3:30 AM",
    highlight: true,
    unreadCount: 2,
    isGroup: true,
    memberCount: 14,
    supportsVideo: true,
  },
  {
    id: "2",
    name: "Platform Design",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg?w=200",
    message: "@Jason We should align on the prototype first",
    time: "8:17 AM",
    isGroup: true,
    memberCount: 6,
    supportsVideo: true,
  },
  {
    id: "3",
    name: "Subscription Account",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-business-man-with-glasses_23-2149436194.jpg?w=200",
    message: "User behavior report: Confirmed, 68% of users...",
    time: "8:13 AM",
    unreadCount: 8,
    isSystem: true,
    isGroup: true,
    memberCount: 9,
  },
  {
    id: "4",
    name: "Evan Huang",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671122.jpg?w=200",
    message: "[Voice Call]",
    time: "8:07 AM",
    isVoiceCall: true,
    phoneNumber: "+1 415-888-2389",
    supportsVideo: true,
  },
  {
    id: "5",
    name: "yy",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg?w=200",
    message: "The lighting zones messed up the baking...",
    time: "6:47 AM",
  },
  {
    id: "6",
    name: "Findhoo Mini Project",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671140.jpg?w=200",
    message: "yy: Let's sync up tomorrow morning before submission...",
    time: "6:35 AM",
    isGroup: true,
    memberCount: 8,
    supportsVideo: true,
  },
  {
    id: "7",
    name: "Chang Cheng",
    avatar:
      "https://img.freepik.com/free-psd/3d-rendering-avatar_23-2150833560.jpg?w=200",
    message: "Okay, sounds good.",
    time: "6:12 AM",
    phoneNumber: "+1 415-888-2256",
    supportsVideo: true,
  },
  {
    id: "8",
    name: "Team Alpha",
    avatar:
      "https://img.freepik.com/free-psd/3d-rendering-avatar_23-2150833536.jpg?w=200",
    message: "Meeting notes attached.",
    time: "Yesterday",
    isGroup: true,
    memberCount: 11,
    supportsVideo: true,
  },
  {
    id: "9",
    name: "Marketing Dept",
    avatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436180.jpg?w=200",
    message: "New campaign assets are ready for review.",
    time: "Yesterday",
    isGroup: true,
    memberCount: 10,
    supportsVideo: true,
  },
];

export const POWERHOO_MESSAGES: ConversationMessage[] = [
  {
    id: "1",
    senderName: "CathySELLS KITCHEN",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-sunglasses_23-2149436188.jpg?w=200",
    content: "这个问题可以先用这个 ui 的配色",
    type: "reply",
    replyContext: "李震铭: 开关状态看起来不是很明显",
    isMe: false,
    time: "Yesterday 10:40 PM",
  },
  {
    id: "2",
    senderName: "Evan Huang",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-illustration-human-avatar-profile_23-2150671122.jpg?w=200",
    content: "",
    type: "voice",
    voiceDuration: "4\"",
    isMe: false,
    time: "Yesterday 10:45 PM",
  },
  {
    id: "3",
    senderName: "Sven",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-illustration-business-man-with-glasses_23-2149436194.jpg?w=200",
    content: "👌，那我更新成这一版的 UI",
    type: "text",
    isMe: false,
  },
  {
    id: "4",
    senderName: "子非鱼",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg?w=200",
    content:
      "@Evan Huang @常城 周工邮寄订单先取消，目前看 Powerhoo100低电量 OTA 无法更新，明天再看看。",
    type: "text",
    isMe: false,
    time: "3:30 AM",
  },
  {
    id: "5",
    senderName: "常城",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-rendering-avatar_23-2150833560.jpg?w=200",
    content: "已经取消了",
    type: "text",
    isMe: false,
  },
  {
    id: "6",
    senderName: "子非鱼",
    senderAvatar:
      "https://img.freepik.com/free-psd/3d-illustration-person-with-glasses_23-2149436190.jpg?w=200",
    content: "👌",
    type: "text",
    isMe: false,
  },
];

export const DEFAULT_MYBOT_AVATAR =
  "https://img.freepik.com/premium-psd/3d-cartoon-character-avatar-isolated-3d-rendering_235528-554.jpg?w=200";
