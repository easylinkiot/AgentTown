import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { buildMiniAppViewModel } from "@/src/features/miniapps/model";
import { MiniApp } from "@/src/types";

type CreatorExample = {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  prompt: string;
};

const EXAMPLES: CreatorExample[] = [
  {
    title: "阅读早报",
    description: "每天早上 8 点，采集 Reddit、TechCrunch 等过去 24 小时 AI 热点新闻，生成摘要卡片。",
    icon: "newspaper-outline",
    color: "#60a5fa",
    prompt: "生成一个阅读早报 Mini App：每天早上 8 点，采集 Reddit、TechCrunch 和机器之心过去 24 小时内与 AI Agent 本地部署相关的 5 条精华新闻，生成摘要卡片。",
  },
  {
    title: "Chat 决策摘要",
    description: "自动汇总群聊中过去 2 小时的技术讨论，提取出达成的共识和待分配的任务。",
    icon: "chatbox-ellipses-outline",
    color: "#4ade80",
    prompt: "生成一个聊天摘要 Mini App，自动汇总群聊中过去 2 小时的技术讨论，提取出达成的共识和待分配的任务。",
  },
  {
    title: "收件箱“脱水”",
    description: "扫描过去 24 小时未读邮件，生成“谁发了什么”、“需要我做什么”的结构化总结。",
    icon: "mail-outline",
    color: "#a78bfa",
    prompt: "生成一个收件箱“脱水”日报 Mini App：每天下午 5 点，扫描过去 24 小时的所有未读邮件，生成一张包含“谁发了什么”、“需要我做什么”、“截止日期”的结构化总结卡片。",
  },
  {
    title: "未回复随访",
    description: "标记已发送但对方超过 3 天未回复的重要邮件，生成“是否再次跟进”按钮。",
    icon: "time-outline",
    color: "#fb923c",
    prompt: "生成一个“追单” Mini App，自动标记那些我已发送但对方超过 3 天未回复的重要商务邮件，生成一个“是否需要再次跟进”的交互按钮。",
  },
  {
    title: "每日单词打卡",
    description: "每日随机生成一个高阶词，美式发音，同义词反义词，点击翻面。",
    icon: "book-outline",
    color: "#f472b6",
    prompt: "生成一个英语背单词 Mini App，每日随机生成一个高阶词，美式发音，同义词反义词，点击翻面。",
  },
  {
    title: "项目倒计时",
    description: "将日历中的 Milestone 提取出来，以“距离交付还有 X 天”呈现，标记延期风险。",
    icon: "calendar-outline",
    color: "#f87171",
    prompt: "生成一个看板 Mini App，将所有日历中的 Project Milestone 提取出来，以“距离交付还有 X 天”的紧迫感视觉化呈现，并标记出延期风险。",
  },
  {
    title: "车辆守卫",
    description: "检测到非授权移动时，弹出实时坐标、周边画面，提供“远程报警”快捷键。",
    icon: "shield-outline",
    color: "#ef4444",
    prompt: "生成一个单车安防 Mini App，当 Biceek 智能锁检测到非授权移动时，立即在卡片中弹出实时坐标、周边摄像头画面，并提供“远程报警”快捷键。",
  },
  {
    title: "智能家居",
    description: "一句话自动调整灯光色温、窗帘及空调温度。",
    icon: "home-outline",
    color: "#facc15",
    prompt: "生成一个家居控制 Mini App，只需通过一句话描述场景（如“我要在二楼工作两小时”），自动调整 HomeKit 系统的灯光色温、窗帘开合及空调温度。",
  },
  {
    title: "降价猎手",
    description: "监控 Vuori、Lululemon 等品牌 24 小时内全网最低价，自动尝试领券。",
    icon: "pricetag-outline",
    color: "#34d399",
    prompt: "针对您常买的 Vuori、On 跑鞋、乐高套装，在 24 小时内监控全网历史最低价，并在检测到折扣时自动尝试领取隐藏优惠券。",
  },
  {
    title: "餐饮预定",
    description: "监控海底捞或全聚德未来一周空位，一旦有人退订即刻生成“是否预定”卡片。",
    icon: "restaurant-outline",
    color: "#fb7185",
    prompt: "生成一个订座助手 Mini App，监控海底捞或全聚德的未来一周空位，一旦有人退订即刻生成“是否预定”卡片并支持一键支付定金。",
  },
  {
    title: "健身进度",
    description: "同步骑行或游泳数据，将消耗卡路里换算成“本周可额外摄入的餐食量”。",
    icon: "pulse-outline",
    color: "#22d3ee",
    prompt: "生成一个健康 Mini App，同步骑行或游泳的数据，将消耗的卡路里自动换算成“本周可额外摄入的餐食量”并生成动态图表。",
  },
  {
    title: "STEM 教育",
    description: "针对错题自动生成互动式图形化讲解卡片，点击可翻面查看解题逻辑。",
    icon: "calculator-outline",
    color: "#818cf8",
    prompt: "生成一个小学数学辅助 Mini App，针对 Imagine Learning 中的错题，自动生成互动式的图形化讲解卡片，点击可翻面查看解题逻辑。",
  },
  {
    title: "展会向导",
    description: "根据兴趣标签，实时推送当前场馆内正在进行的 Top 3 热门演讲。",
    icon: "location-outline",
    color: "#38bdf8",
    prompt: "生成一个 CES 或行业展会 Mini App，根据您的兴趣标签，实时推送当前场馆内正在进行的 Top 3 热门演讲，并生成一键导航至展位的路线图。",
  },
  {
    title: "社交日历",
    description: "识别邮件中的聚会邀请，生成“社交优先级”打分和着装建议。",
    icon: "calendar-clear-outline",
    color: "#ec4899",
    prompt: "生成一个社交 Mini App，自动从邮件中识别社区的私人聚会或慈善晚宴邀请，结合您的日程生成“社交优先级”打分和着装建议卡片。",
  },
  {
    title: "有声书生成",
    description: "输入孩子当天的奇思妙想，自动生成一段以孩子为主角的 Pixar 风格有声故事。",
    icon: "headset-outline",
    color: "#f59e0b",
    prompt: "生成一个睡前故事 Mini App，输入孩子当天的奇思妙想，自动生成一段以孩子为主角的 5 分钟 Pixar 风格有声故事，背景音乐由 AI 自动生成。",
  },
  {
    title: "AR 维修指南",
    description: "当硬件故障时，摄像头识别零件，屏幕叠加 AR 箭头指引拆解更换。",
    icon: "construct-outline",
    color: "#94a3b8",
    prompt: "生成一个硬件维修 Mini App，当 Biceek 硬件出现故障码，通过摄像头识别零件，在屏幕上叠加 AR 箭头指引您如何拆解和更换部件。",
  },
  {
    title: "任务象限仪",
    description: "按“紧急/重要”排布任务，根据能量水平建议“现在适合处理哪件”。",
    icon: "grid-outline",
    color: "#3b82f6",
    prompt: "生成一个待办 Mini App，将我所有的任务按“紧急/重要”自动排布，并根据我当前的能量水平建议“现在最适合处理哪件琐事”。",
  },
  {
    title: "跨平台同步",
    description: "将 Google Tasks、Telegram 收藏和笔记待办汇总到一张卡片。",
    icon: "refresh-outline",
    color: "#6b7280",
    prompt: "生成一个同步 Mini App，将 Google Tasks、Telegram 收藏夹和我的笔记软件中的待办事项汇总到一张卡片上，消除信息孤岛。",
  },
  {
    title: "今日复盘",
    description: "晚上 9 点对比早晨计划与实际完成情况，生成“明日改进建议”。",
    icon: "checkmark-circle-outline",
    color: "#22c55e",
    prompt: "晚上 9 点，将我早晨生成的“今日计划”与实际完成情况进行对比，生成一份带有人工智能建议的“明天如何更高效”改进卡片。",
  },
  {
    title: "附件归档",
    description: "自动识别合同、发票和设计图，分类保存到 Drive 并生成清单。",
    icon: "document-text-outline",
    color: "#14b8a6",
    prompt: "生成一个文档 Mini App，自动识别邮件中的合同、发票和设计图，将其分类保存到 Google Drive 的对应项目文件夹，并生成已归档的清单。",
  },
  {
    title: "智能家居控制",
    description: "一键控制家中灯光、空调和安防系统，显示实时能耗。",
    icon: "flash-outline",
    color: "#facc15",
    prompt: "生成一个智能家居控制 Mini App，包含灯光开关、空调温度调节、安防系统状态切换，并以图表形式显示今日能耗。",
  },
  {
    title: "Car Caring Game",
    description: "一个简单的汽车养护小游戏，可以给汽车洗车、加油、修理。",
    icon: "car-sport-outline",
    color: "#3b82f6",
    prompt: "生成一个 Car Caring Game Mini App，包含洗车、加油、修理等互动功能，并显示汽车的状态（清洁度、油量、健康度）。",
  },
];

type Props = {
  visible: boolean;
  generating?: boolean;
  installing?: boolean;
  error?: string | null;
  initialPrompt?: string;
  previewApp?: MiniApp | null;
  showExamples?: boolean;
  onClose: () => void;
  onGenerate: (query: string) => void;
  onAddPreview: (app: MiniApp) => void;
  onDiscardPreview: (app: MiniApp) => void;
};

function heroForType(type: string) {
  switch (type) {
    case "news_feed":
      return "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=600&auto=format&fit=crop";
    case "flashcard":
      return "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?q=80&w=600&auto=format&fit=crop";
    case "price_tracker":
      return "https://images.unsplash.com/photo-1556742049-0cfed4f7a07d?q=80&w=600&auto=format&fit=crop";
    default:
      return "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop";
  }
}

function looksLikeImage(value: string) {
  return value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:image/");
}

function PreviewCard({ app }: { app: MiniApp }) {
  const vm = useMemo(() => buildMiniAppViewModel(app), [app]);
  const typeLabel = (vm.uiType || app.type || app.category || "mini_app").replace(/_/g, " ").toUpperCase();

  return (
    <View style={styles.previewCard}>
      <View style={styles.previewHeroWrap}>
        <Image source={{ uri: vm.heroImage || heroForType(vm.uiType) }} style={styles.previewHero} resizeMode="cover" />
        <View style={styles.previewHeroOverlay} />
        <View style={styles.previewHeroContent}>
          <View style={styles.previewHeroTagRow}>
            <View style={[styles.previewHeroIcon, { backgroundColor: vm.color || "#111827" }]}>
              <Ionicons name={(vm.icon as keyof typeof Ionicons.glyphMap) || "sparkles-outline"} size={12} color="#ffffff" />
            </View>
            <Text style={styles.previewHeroType}>{typeLabel}</Text>
          </View>
          <Text style={styles.previewHeroTitle}>{app.name}</Text>
        </View>
      </View>

      <View style={styles.previewBody}>
        {vm.uiType === "news_feed" ? (
          <View style={styles.previewList}>
            {vm.newsItems.slice(0, 3).map((item, index) => (
              <View key={item.id || `${item.title}_${index}`} style={styles.previewNewsItem}>
                <Text style={styles.previewNewsIndex}>{`0${index + 1}`}</Text>
                <View style={styles.previewNewsCopy}>
                  <Text style={styles.previewNewsTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.previewNewsMeta}>
                    <Text style={styles.previewNewsSource}>{item.source || "News"}</Text>
                    <Text style={styles.previewNewsSummary} numberOfLines={1}>
                      {item.summary}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {vm.uiType === "flashcard" ? (
          <View style={styles.previewFlashcard}>
            <View style={styles.previewFlashcardStripe} />
            <Text style={styles.previewFlashcardLabel}>Word of the Day</Text>
            <Text style={styles.previewFlashcardWord}>{vm.flashcard.word}</Text>
            <Text style={styles.previewFlashcardPronunciation}>{vm.flashcard.pronunciation}</Text>
            <Text style={styles.previewFlashcardDefinition}>{vm.flashcard.definition}</Text>
          </View>
        ) : null}

        {vm.uiType === "price_tracker" ? (
          <View style={styles.previewList}>
            {vm.priceItems.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.previewPriceItem}>
                <View style={styles.previewPriceCopy}>
                  <Text style={styles.previewPriceProduct}>{item.product}</Text>
                  <Text style={styles.previewPriceRetailer}>{item.retailer}</Text>
                </View>
                <View style={styles.previewPriceRight}>
                  <Text style={styles.previewPriceValue}>{`¥${item.price}`}</Text>
                  <Text style={styles.previewPriceSave}>{`Save ${item.discountPct}%`}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {vm.uiType === "dashboard" ? (
          <View style={styles.previewMetricGrid}>
            {vm.dashboardPanels.slice(0, 3).map((panel) => (
              <View key={panel.id} style={styles.previewMetricCard}>
                <Text style={styles.previewMetricLabel}>{panel.label}</Text>
                <Text style={styles.previewMetricValue}>{panel.value}</Text>
                <Text style={styles.previewMetricDelta}>{panel.delta}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {vm.uiType === "task_list" ? (
          <View style={styles.previewList}>
            {vm.taskItems.slice(0, 3).map((item) => (
              <View key={item.id} style={styles.previewTaskItem}>
                <View
                  style={[
                    styles.previewTaskDot,
                    item.priority === "High" ? styles.previewTaskDotHigh : styles.previewTaskDotDefault,
                  ]}
                />
                <View style={styles.previewTaskCopy}>
                  <Text style={styles.previewTaskTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.previewTaskMeta}>{`${item.assignee || "Unassigned"} · ${item.status}`}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {vm.uiType === "generative_app" ? (
          <View style={styles.previewWidgetGrid}>
            {vm.widgets.slice(0, 4).map((widget, index) => (
              <View
                key={`${widget.label}_${index}`}
                style={[styles.previewWidgetCard, widget.type === "chart" || widget.type === "list" ? styles.previewWidgetWide : null]}
              >
                <Text style={styles.previewWidgetLabel}>{widget.label}</Text>
                <Text style={styles.previewWidgetValue} numberOfLines={2}>
                  {String(widget.value ?? widget.subValue ?? widget.type)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}

        {vm.uiType === "fashion_designer" ? (
          <View style={styles.previewFashionWrap}>
            <View style={styles.previewFashionGrid}>
              {vm.fashionDesigner.renders.slice(0, 2).map((render, index) => (
                <View key={`${render.label}_${index}`} style={styles.previewFashionCard}>
                  {looksLikeImage(render.image) ? (
                    <Image source={{ uri: render.image }} style={styles.previewFashionImage} resizeMode="cover" />
                  ) : (
                    <View style={styles.previewFashionPlaceholder}>
                      <Ionicons name="image-outline" size={20} color="#94a3b8" />
                    </View>
                  )}
                  <Text style={styles.previewFashionLabel}>{render.label}</Text>
                </View>
              ))}
            </View>
            <View style={styles.previewPlanCard}>
              <Text style={styles.previewPlanTitle}>生产方案</Text>
              <Text style={styles.previewPlanText} numberOfLines={4}>
                {vm.fashionDesigner.steps.slice(0, 3).join(" · ") || app.summary}
              </Text>
            </View>
          </View>
        ) : null}

        {vm.uiType === "car_caring" ? (
          <View style={styles.previewCarWrap}>
            <Text style={styles.previewCarTitle}>{vm.carCaring.carName}</Text>
            {[
              { label: "Clean", value: vm.carCaring.stats.cleanliness },
              { label: "Fuel", value: vm.carCaring.stats.fuel },
              { label: "Health", value: vm.carCaring.stats.health },
            ].map((item) => (
              <View key={item.label} style={styles.previewCarStatRow}>
                <Text style={styles.previewCarStatLabel}>{item.label}</Text>
                <View style={styles.previewCarTrack}>
                  <View style={[styles.previewCarFill, { width: `${Math.max(0, Math.min(100, item.value))}%` }]} />
                </View>
              </View>
            ))}
            <Text style={styles.previewCarMessage}>{vm.carCaring.message}</Text>
          </View>
        ) : null}

        {["news_feed", "flashcard", "price_tracker", "dashboard", "task_list", "generative_app", "fashion_designer", "car_caring"].includes(vm.uiType) ? null : (
          <Text style={styles.previewFallback}>{app.summary || vm.description}</Text>
        )}
      </View>
    </View>
  );
}

export function MiniAppCreatorModal({
  visible,
  generating,
  installing,
  error,
  initialPrompt,
  previewApp,
  showExamples = true,
  onClose,
  onGenerate,
  onAddPreview,
  onDiscardPreview,
}: Props) {
  const [query, setQuery] = useState("");
  const loading = Boolean(generating || installing);

  useEffect(() => {
    if (!visible) {
      setQuery("");
      return;
    }
    if (!previewApp && initialPrompt?.trim()) {
      setQuery(initialPrompt.trim());
    }
  }, [initialPrompt, previewApp, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.shell}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={styles.titleWrap}>
              <View style={styles.titleIconWrap}>
                <Ionicons name="sparkles-outline" size={16} color="#111827" />
              </View>
              <Text style={styles.title}>生成此 Mini App 的提示词</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color="#6b7280" />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            <View style={styles.promptBox}>
              <View style={styles.aiBadge}>
                <Ionicons name="sparkles-outline" size={12} color="#60a5fa" />
                <Text style={styles.aiBadgeText}>AI GENERATOR</Text>
              </View>

              <TextInput
                value={query}
                onChangeText={setQuery}
                multiline
                placeholder="描述你想创建的应用功能..."
                placeholderTextColor="rgba(107,114,128,0.88)"
                style={styles.input}
                autoComplete="off"
                textContentType="oneTimeCode"
                importantForAutofill="no"
              />

              <Pressable
                style={[styles.generateFab, (!query.trim() || loading) && styles.generateFabDisabled]}
                onPress={() => onGenerate(query.trim())}
                disabled={!query.trim() || loading}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#111827" />
                ) : (
                  <Ionicons name="arrow-up" size={18} color="#111827" />
                )}
              </Pressable>
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {previewApp ? (
              <>
                <View style={styles.readyRow}>
                  <View style={styles.readyLeft}>
                    <Ionicons name="checkmark-circle-outline" size={16} color="#22c55e" />
                    <Text style={styles.readyText}>READY TO INSTALL</Text>
                  </View>
                  <Pressable style={styles.readyGhost} onPress={() => onDiscardPreview(previewApp)} disabled={loading}>
                    <Text style={styles.readyGhostText}>Discard</Text>
                  </Pressable>
                  <Pressable style={styles.readyCta} onPress={() => onAddPreview(previewApp)} disabled={loading}>
                    {installing ? <ActivityIndicator size="small" color="#111827" /> : <Ionicons name="download-outline" size={14} color="#111827" />}
                    <Text style={styles.readyCtaText}>Add App</Text>
                  </Pressable>
                </View>

                <PreviewCard app={previewApp} />
              </>
            ) : null}

            {!previewApp && showExamples ? (
              <>
                <Text style={styles.examplesHeading}>TRY THESE EXAMPLES</Text>
                <View style={styles.examplesGrid}>
                  {EXAMPLES.map((item) => (
                    <Pressable key={item.title} style={styles.exampleCard} onPress={() => setQuery(item.prompt)}>
                      <View style={[styles.exampleIconWrap, { backgroundColor: `${item.color}18` }]}>
                        <Ionicons name={item.icon} size={18} color={item.color} />
                      </View>
                      <Text style={styles.exampleTitle}>{item.title}</Text>
                      <Text style={styles.exampleDesc} numberOfLines={3}>
                        {item.description}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.48)",
  },
  sheet: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "88%",
    alignSelf: "center",
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.94)",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  titleIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: "#dbeafe",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
  },
  content: {
    padding: 16,
    gap: 14,
  },
  promptBox: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "rgba(255,255,255,0.72)",
    padding: 14,
    minHeight: 158,
    position: "relative",
  },
  aiBadge: {
    position: "absolute",
    top: 12,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 1,
  },
  aiBadgeText: {
    color: "#60a5fa",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  input: {
    minHeight: 128,
    color: "#111827",
    textAlignVertical: "top",
    fontSize: 14,
    lineHeight: 20,
    paddingTop: 30,
    paddingRight: 52,
  },
  generateFab: {
    position: "absolute",
    right: 14,
    bottom: 14,
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
    justifyContent: "center",
  },
  generateFabDisabled: {
    opacity: 0.55,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 12,
    fontWeight: "600",
  },
  readyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  readyLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  readyText: {
    color: "#4b5563",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  readyGhost: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.76)",
  },
  readyGhostText: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "800",
  },
  readyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  readyCtaText: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  previewCard: {
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  previewHeroWrap: {
    height: 164,
    backgroundColor: "#e5e7eb",
  },
  previewHero: {
    width: "100%",
    height: "100%",
  },
  previewHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.20)",
  },
  previewHeroContent: {
    position: "absolute",
    left: 18,
    right: 18,
    bottom: 16,
    gap: 8,
  },
  previewHeroTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewHeroIcon: {
    width: 26,
    height: 26,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  previewHeroType: {
    color: "#111827",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  previewHeroTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "900",
  },
  previewBody: {
    padding: 16,
    gap: 10,
    backgroundColor: "#f9fafb",
  },
  previewList: {
    gap: 10,
  },
  previewNewsItem: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  previewNewsIndex: {
    color: "#374151",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  previewNewsCopy: {
    flex: 1,
    gap: 6,
  },
  previewNewsTitle: {
    color: "#1f2937",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  previewNewsMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewNewsSource: {
    color: "#2563eb",
    fontSize: 9,
    fontWeight: "800",
    backgroundColor: "#eff6ff",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  previewNewsSummary: {
    flex: 1,
    color: "#6b7280",
    fontSize: 9,
  },
  previewFlashcard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 18,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
  },
  previewFlashcardStripe: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: "#d946ef",
  },
  previewFlashcardLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  previewFlashcardWord: {
    color: "#111827",
    fontSize: 34,
    fontWeight: "900",
  },
  previewFlashcardPronunciation: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
  },
  previewFlashcardDefinition: {
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
  },
  previewPriceItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  previewPriceCopy: {
    flex: 1,
    gap: 2,
  },
  previewPriceProduct: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "800",
  },
  previewPriceRetailer: {
    color: "#6b7280",
    fontSize: 9,
  },
  previewPriceRight: {
    alignItems: "flex-end",
    gap: 2,
  },
  previewPriceValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  previewPriceSave: {
    color: "#16a34a",
    fontSize: 9,
    fontWeight: "800",
  },
  previewMetricGrid: {
    flexDirection: "row",
    gap: 10,
  },
  previewMetricCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 4,
  },
  previewMetricLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
  },
  previewMetricValue: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "900",
  },
  previewMetricDelta: {
    color: "#16a34a",
    fontSize: 10,
    fontWeight: "800",
  },
  previewTaskItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
  },
  previewTaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  previewTaskDotHigh: {
    backgroundColor: "#ef4444",
  },
  previewTaskDotDefault: {
    backgroundColor: "#3b82f6",
  },
  previewTaskCopy: {
    flex: 1,
    gap: 2,
  },
  previewTaskTitle: {
    color: "#111827",
    fontSize: 11,
    fontWeight: "700",
  },
  previewTaskMeta: {
    color: "#6b7280",
    fontSize: 9,
  },
  previewWidgetGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewWidgetCard: {
    width: "48%",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 6,
  },
  previewWidgetWide: {
    width: "100%",
  },
  previewWidgetLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
  },
  previewWidgetValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  previewFashionWrap: {
    gap: 12,
  },
  previewFashionGrid: {
    flexDirection: "row",
    gap: 10,
  },
  previewFashionCard: {
    flex: 1,
    gap: 6,
  },
  previewFashionImage: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: "#e5e7eb",
  },
  previewFashionPlaceholder: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  previewFashionLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
  previewPlanCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 6,
  },
  previewPlanTitle: {
    color: "#111827",
    fontSize: 12,
    fontWeight: "900",
  },
  previewPlanText: {
    color: "#4b5563",
    fontSize: 11,
    lineHeight: 16,
  },
  previewCarWrap: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10,
  },
  previewCarTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  previewCarStatRow: {
    gap: 6,
  },
  previewCarStatLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "800",
  },
  previewCarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
    overflow: "hidden",
  },
  previewCarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#3b82f6",
  },
  previewCarMessage: {
    color: "#4b5563",
    fontSize: 11,
    lineHeight: 16,
  },
  previewFallback: {
    color: "#4b5563",
    fontSize: 12,
    lineHeight: 18,
  },
  examplesHeading: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  examplesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 6,
  },
  exampleCard: {
    width: "48%",
    minHeight: 144,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "rgba(255,255,255,0.84)",
    padding: 14,
    gap: 10,
    justifyContent: "space-between",
  },
  exampleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  exampleTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "900",
  },
  exampleDesc: {
    color: "#6b7280",
    fontSize: 10,
    lineHeight: 15,
  },
});
