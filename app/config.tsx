import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AVATAR_PRESETS } from "@/src/constants/avatars";
import { MARKET_DATA } from "@/src/constants/marketplace";
import { generateGeminiJson } from "@/src/lib/gemini";
import { useAgentTown } from "@/src/state/agenttown-context";
import { useAuth } from "@/src/state/auth-context";
import { BotConfig, MarketItem } from "@/src/types";

interface SkillForm {
  name: string;
  description: string;
  trigger: string;
  logic: string;
  requiredParams: string;
  optionalParams: string;
  constraints: string;
  example: string;
}

const emptySkillForm: SkillForm = {
  name: "",
  description: "",
  trigger: "",
  logic: "",
  requiredParams: "",
  optionalParams: "",
  constraints: "",
  example: "",
};

export default function ConfigScreen() {
  const router = useRouter();
  const { botConfig, updateBotConfig, uiTheme, updateUiTheme } = useAgentTown();
  const { user, signOut } = useAuth();

  const [name, setName] = useState(botConfig.name);
  const [avatar, setAvatar] = useState(botConfig.avatar);
  const [instruction, setInstruction] = useState(botConfig.systemInstruction);
  const [documents, setDocuments] = useState<string[]>(botConfig.documents || []);
  const [knowledgeKeywords, setKnowledgeKeywords] = useState<string[]>(
    botConfig.knowledgeKeywords || []
  );
  const [installedSkillIds, setInstalledSkillIds] = useState<Set<string>>(
    new Set(botConfig.installedSkillIds || [])
  );
  const [skillForm, setSkillForm] = useState<SkillForm>(emptySkillForm);
  const [isUploading, setIsUploading] = useState(false);
  const [installingSkillId, setInstallingSkillId] = useState<string | null>(null);
  const [viewingSkill, setViewingSkill] = useState<MarketItem | null>(null);

  const installedSkills = useMemo(() => {
    const allSkills = MARKET_DATA.flatMap((category) => category.items);
    return allSkills.filter((item) => installedSkillIds.has(item.id));
  }, [installedSkillIds]);

  const randomizeAvatar = () => {
    const next = AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
    setAvatar(next);
  };

  const save = () => {
    const next: BotConfig = {
      name,
      avatar,
      systemInstruction: instruction,
      documents,
      installedSkillIds: Array.from(installedSkillIds),
      knowledgeKeywords,
    };
    updateBotConfig(next);
    router.back();
  };

  const handleSignOut = async () => {
    await signOut();
    router.replace("/sign-in");
  };

  const uploadKnowledge = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
        type: ["text/plain", "application/json", "text/markdown", "text/csv"],
      });

      if (result.canceled) return;
      const asset = result.assets[0];

      setIsUploading(true);
      const text = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      const fallback = {
        knowledgeSummary: `Processed ${asset.name}`,
        keywords: ["Knowledge", "Document"],
      };

      const extracted = await generateGeminiJson<{ knowledgeSummary: string; keywords: string[] }>(
        `Analyze this uploaded knowledge document and return JSON object with keys knowledgeSummary and keywords (3-5 short tags).\nDocument name: ${asset.name}\n\nContent:\n${text.slice(
          0,
          12000
        )}`,
        fallback
      );

      const summary = extracted.knowledgeSummary || fallback.knowledgeSummary;
      const tags = Array.isArray(extracted.keywords) ? extracted.keywords : fallback.keywords;

      setInstruction((prev) => `${prev}\n\n### Learned Knowledge [${asset.name}]\n${summary}`);
      setDocuments((prev) => [...prev, asset.name]);
      setKnowledgeKeywords((prev) => Array.from(new Set([...prev, ...tags])));
    } catch {
      Alert.alert("Upload failed", "Unable to process this document.");
    } finally {
      setIsUploading(false);
    }
  };

  const appendCustomSkill = () => {
    const block = `\n\n### Defined Skill: ${skillForm.name || "Untitled_Skill"}
- Description: ${skillForm.description}
- Trigger: ${skillForm.trigger}
- Core Logic: ${skillForm.logic}
- Parameters: required(${skillForm.requiredParams}) optional(${skillForm.optionalParams})
- Constraints: ${skillForm.constraints}
- Example: ${skillForm.example}`;

    setInstruction((prev) => `${prev}${block}`);
    setSkillForm(emptySkillForm);
  };

  const installSkill = async (item: MarketItem) => {
    setInstallingSkillId(item.id);
    setTimeout(() => {
      setInstalledSkillIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });
      setInstruction((prev) => `${prev}\n\n### Installed Module: ${item.name}\n${item.fullDetail}`);
      setInstallingSkillId(null);
    }, 900);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Bot 配置</Text>
        <Pressable style={styles.saveBtn} onPress={save}>
          <Ionicons name="save" size={16} color="white" />
          <Text style={styles.saveBtnText}>Apply</Text>
        </Pressable>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.accountText}>
            {`Signed in as ${user?.displayName || "Unknown"}`}
          </Text>
          <Text style={styles.accountSubtext}>
            {`Provider: ${user?.provider || "unknown"}${user?.email ? ` · ${user.email}` : ""}${
              user?.phone ? ` · ${user.phone}` : ""
            }`}
          </Text>
          <Pressable style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={16} color="#b91c1c" />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Theme</Text>
          <Text style={styles.accountSubtext}>
            Choose between original style and new dark-glass Mini App style.
          </Text>
          <View style={styles.themeRow}>
            <Pressable
              style={[styles.themeBtn, uiTheme === "classic" && styles.themeBtnActive]}
              onPress={() => updateUiTheme("classic")}
            >
              <Ionicons
                name="sunny-outline"
                size={16}
                color={uiTheme === "classic" ? "white" : "#334155"}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  uiTheme === "classic" && styles.themeBtnTextActive,
                ]}
              >
                Classic
              </Text>
            </Pressable>
            <Pressable
              style={[styles.themeBtn, uiTheme === "neo" && styles.themeBtnActiveNeo]}
              onPress={() => updateUiTheme("neo")}
            >
              <Ionicons
                name="moon-outline"
                size={16}
                color={uiTheme === "neo" ? "white" : "#334155"}
              />
              <Text
                style={[
                  styles.themeBtnText,
                  uiTheme === "neo" && styles.themeBtnTextActive,
                ]}
              >
                Neo Glass
              </Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Bot Identity</Text>
          <View style={styles.identityRow}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <View style={styles.identityInputWrap}>
              <TextInput style={styles.nameInput} value={name} onChangeText={setName} />
              <TextInput
                style={styles.avatarInput}
                value={avatar}
                onChangeText={setAvatar}
                placeholder="Avatar URL"
              />
            </View>
          </View>
          <Pressable style={styles.secondaryBtn} onPress={randomizeAvatar}>
            <Ionicons name="shuffle" size={14} color="#1f2937" />
            <Text style={styles.secondaryBtnText}>Random Avatar</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Knowledge Upload</Text>
          <Pressable style={styles.secondaryBtn} onPress={uploadKnowledge} disabled={isUploading}>
            {isUploading ? (
              <ActivityIndicator size="small" color="#2563eb" />
            ) : (
              <Ionicons name="cloud-upload" size={16} color="#2563eb" />
            )}
            <Text style={[styles.secondaryBtnText, { color: "#1d4ed8" }]}>Upload Document</Text>
          </Pressable>

          {documents.length > 0 ? (
            <View style={styles.badgeWrap}>
              {documents.map((doc) => (
                <View key={doc} style={styles.badge}>
                  <Text style={styles.badgeText}>{doc}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {knowledgeKeywords.length > 0 ? (
            <View style={styles.badgeWrap}>
              {knowledgeKeywords.map((keyword) => (
                <View key={keyword} style={[styles.badge, styles.keywordBadge]}>
                  <Text style={styles.keywordBadgeText}>{keyword}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skill Builder</Text>
          <TextInput
            style={styles.field}
            placeholder="Skill name"
            value={skillForm.name}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, name: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Description"
            value={skillForm.description}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, description: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Trigger"
            value={skillForm.trigger}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, trigger: value }))}
          />
          <TextInput
            style={[styles.field, styles.fieldTall]}
            multiline
            placeholder="Core logic"
            value={skillForm.logic}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, logic: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Required params"
            value={skillForm.requiredParams}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, requiredParams: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Optional params"
            value={skillForm.optionalParams}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, optionalParams: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Constraints"
            value={skillForm.constraints}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, constraints: value }))}
          />
          <TextInput
            style={styles.field}
            placeholder="Example"
            value={skillForm.example}
            onChangeText={(value) => setSkillForm((prev) => ({ ...prev, example: value }))}
          />
          <Pressable style={styles.secondaryBtn} onPress={appendCustomSkill}>
            <Ionicons name="add-circle" size={16} color="#111827" />
            <Text style={styles.secondaryBtnText}>Append Skill to Brain</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Skill Marketplace</Text>
          {MARKET_DATA.map((category) => (
            <View style={styles.marketCategory} key={category.id}>
              <Text style={styles.marketCategoryTitle}>{category.title}</Text>
              <Text style={styles.marketCategorySubtitle}>{category.subtitle}</Text>

              <View style={styles.marketItemsWrap}>
                {category.items.map((item) => {
                  const installed = installedSkillIds.has(item.id);
                  const installing = installingSkillId === item.id;
                  return (
                    <View style={styles.marketItemCard} key={item.id}>
                      <View style={styles.marketItemHeader}>
                        <Text style={styles.marketItemTitle}>{item.name}</Text>
                        {installed ? (
                          <Text style={styles.installedTag}>Installed</Text>
                        ) : (
                          <Pressable
                            style={styles.installBtn}
                            onPress={() => installSkill(item)}
                            disabled={installing}
                          >
                            <Text style={styles.installBtnText}>
                              {installing ? "Installing..." : "Get"}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                      <Text style={styles.marketItemDesc}>{item.description}</Text>
                      <Pressable onPress={() => setViewingSkill(item)}>
                        <Text style={styles.inspectLink}>Inspect modules</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {viewingSkill ? (
          <View style={styles.card}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.cardTitle}>Skill Inspector · {viewingSkill.name}</Text>
              <Pressable onPress={() => setViewingSkill(null)}>
                <Ionicons name="close" size={20} color="#6b7280" />
              </Pressable>
            </View>
            <Text style={styles.marketItemDesc}>{viewingSkill.description}</Text>
            <View style={styles.badgeWrap}>
              {(viewingSkill.keywords || []).map((k) => (
                <View key={k} style={[styles.badge, styles.keywordBadge]}>
                  <Text style={styles.keywordBadgeText}>{k}</Text>
                </View>
              ))}
            </View>
            <View style={styles.moduleWrap}>
              {viewingSkill.modules.map((module) => (
                <View style={styles.moduleRow} key={`${viewingSkill.id}-${module.name}`}>
                  <Ionicons
                    name={module.type === "folder" ? "folder" : "document-text"}
                    size={14}
                    color={module.type === "folder" ? "#2563eb" : "#6b7280"}
                  />
                  <View style={styles.moduleBody}>
                    <Text style={styles.moduleName}>{module.name}</Text>
                    <Text style={styles.moduleDesc}>{module.desc}</Text>
                  </View>
                  {module.size ? <Text style={styles.moduleSize}>{module.size}</Text> : null}
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>MyBot Brain (Editable)</Text>
          <TextInput
            style={styles.brainEditor}
            multiline
            value={instruction}
            onChangeText={setInstruction}
            placeholder="System instructions"
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Installed Skills</Text>
          {installedSkills.length === 0 ? (
            <Text style={styles.emptyText}>No skills installed yet.</Text>
          ) : (
            installedSkills.map((skill) => (
              <View key={skill.id} style={styles.skillInstalledCard}>
                <Text style={styles.marketItemTitle}>{skill.name}</Text>
                <Text style={styles.marketItemDesc}>{skill.description}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f4f6",
  },
  accountText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "700",
  },
  accountSubtext: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 18,
  },
  signOutBtn: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fecaca",
    backgroundColor: "#fef2f2",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b91c1c",
  },
  themeRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  themeBtnActive: {
    backgroundColor: "#16a34a",
    borderColor: "#16a34a",
  },
  themeBtnActiveNeo: {
    backgroundColor: "#1e293b",
    borderColor: "#1e293b",
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  themeBtnTextActive: {
    color: "white",
  },
  header: {
    height: 56,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#111827",
    paddingHorizontal: 12,
    height: 36,
    borderRadius: 10,
  },
  saveBtnText: {
    color: "white",
    fontSize: 12,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 12,
    gap: 10,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    gap: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  identityRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  avatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#e5e7eb",
    borderWidth: 3,
    borderColor: "#fff",
  },
  identityInputWrap: {
    flex: 1,
    gap: 8,
  },
  nameInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    height: 40,
    paddingHorizontal: 10,
    fontSize: 15,
    fontWeight: "700",
  },
  avatarInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    height: 38,
    paddingHorizontal: 10,
    fontSize: 12,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d1d5db",
    minHeight: 38,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 12,
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  badgeWrap: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 10,
    color: "#374151",
  },
  keywordBadge: {
    backgroundColor: "#e0e7ff",
  },
  keywordBadgeText: {
    fontSize: 10,
    color: "#3730a3",
    fontWeight: "700",
  },
  field: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    minHeight: 38,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    textAlignVertical: "top",
  },
  fieldTall: {
    minHeight: 80,
  },
  marketCategory: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 10,
    gap: 8,
    backgroundColor: "#f9fafb",
  },
  marketCategoryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  marketCategorySubtitle: {
    fontSize: 11,
    color: "#6b7280",
  },
  marketItemsWrap: {
    gap: 8,
  },
  marketItemCard: {
    backgroundColor: "white",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 8,
    gap: 6,
  },
  marketItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 6,
  },
  marketItemTitle: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  marketItemDesc: {
    fontSize: 11,
    color: "#4b5563",
    lineHeight: 16,
  },
  installBtn: {
    borderRadius: 999,
    backgroundColor: "#111827",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  installBtnText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
  },
  installedTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803d",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  inspectLink: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563eb",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  moduleWrap: {
    gap: 6,
  },
  moduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9fafb",
  },
  moduleBody: {
    flex: 1,
    gap: 2,
  },
  moduleName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  moduleDesc: {
    fontSize: 10,
    color: "#6b7280",
  },
  moduleSize: {
    fontSize: 10,
    color: "#6b7280",
  },
  brainEditor: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 10,
    fontSize: 12,
    textAlignVertical: "top",
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Courier", android: "monospace", default: "monospace" }),
  },
  emptyText: {
    fontSize: 12,
    color: "#6b7280",
  },
  skillInstalledCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 8,
    gap: 4,
    backgroundColor: "#f9fafb",
  },
});
