import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { AVATAR_PRESETS } from "@/src/constants/avatars";
import { ChatThread } from "@/src/types";

interface AddBotFriendModalProps {
  visible: boolean;
  accentColor: string;
  onClose: () => void;
  onAdd: (thread: ChatThread) => void;
}

function randomAvatar() {
  return AVATAR_PRESETS[Math.floor(Math.random() * AVATAR_PRESETS.length)];
}

export function AddBotFriendModal({
  visible,
  accentColor,
  onClose,
  onAdd,
}: AddBotFriendModalProps) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [avatar, setAvatar] = useState(() => randomAvatar());
  const [isGroup, setIsGroup] = useState(false);

  const summary = useMemo(() => {
    const rolePart = role.trim();
    const companyPart = company.trim();
    if (rolePart && companyPart) return `${rolePart} · ${companyPart}`;
    if (rolePart) return rolePart;
    if (companyPart) return companyPart;
    return "New Bot Friend";
  }, [company, role]);

  const reset = () => {
    setName("");
    setRole("");
    setCompany("");
    setAvatar(randomAvatar());
    setIsGroup(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAdd = () => {
    const safeName = name.trim();
    if (!safeName) return;

    const created: ChatThread = {
      id: `bot_${Date.now()}`,
      name: safeName,
      avatar,
      message: summary,
      time: "Now",
      isGroup,
      memberCount: isGroup ? 6 : undefined,
      supportsVideo: true,
    };
    onAdd(created);
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerTitleWrap}>
              <View style={styles.iconBadge}>
                <Ionicons name="person-add-outline" size={14} color="white" />
              </View>
              <Text style={styles.title}>Add Bot Friend</Text>
            </View>
            <Pressable style={styles.closeBtn} onPress={handleClose}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
            </Pressable>
          </View>

          <View style={styles.body}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Bot name"
              placeholderTextColor="rgba(203,213,225,0.6)"
              style={styles.input}
            />
            <TextInput
              value={role}
              onChangeText={setRole}
              placeholder="Role (optional)"
              placeholderTextColor="rgba(203,213,225,0.6)"
              style={styles.input}
            />
            <TextInput
              value={company}
              onChangeText={setCompany}
              placeholder="Company (optional)"
              placeholderTextColor="rgba(203,213,225,0.6)"
              style={styles.input}
            />
            <TextInput
              value={avatar}
              onChangeText={setAvatar}
              placeholder="Avatar URL"
              placeholderTextColor="rgba(203,213,225,0.6)"
              style={styles.input}
            />

            <View style={styles.actionRow}>
              <Pressable style={styles.secondaryBtn} onPress={() => setAvatar(randomAvatar())}>
                <Ionicons name="shuffle-outline" size={14} color="#e2e8f0" />
                <Text style={styles.secondaryBtnText}>Random Avatar</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.secondaryBtn,
                  isGroup && styles.secondaryBtnActive,
                ]}
                onPress={() => setIsGroup((v) => !v)}
              >
                <Ionicons
                  name={isGroup ? "people" : "person-outline"}
                  size={14}
                  color="#e2e8f0"
                />
                <Text style={styles.secondaryBtnText}>
                  {isGroup ? "Group" : "Direct"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable style={styles.cancelBtn} onPress={handleClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={[styles.addBtn, { backgroundColor: accentColor }]}
              onPress={handleAdd}
              disabled={!name.trim()}
            >
              <Ionicons name="add-circle-outline" size={14} color="white" />
              <Text style={styles.addBtnText}>Add Friend</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,6,23,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    borderRadius: 24,
    backgroundColor: "rgba(15,23,42,0.96)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    overflow: "hidden",
  },
  header: {
    minHeight: 56,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  iconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "#f8fafc",
    fontSize: 17,
    fontWeight: "800",
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    padding: 14,
    gap: 10,
  },
  input: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(2,6,23,0.45)",
    paddingHorizontal: 12,
    color: "#e2e8f0",
    fontSize: 14,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  secondaryBtnActive: {
    backgroundColor: "rgba(34,197,94,0.25)",
    borderColor: "rgba(34,197,94,0.45)",
  },
  secondaryBtnText: {
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  cancelBtn: {
    flex: 1,
    minHeight: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtnText: {
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  addBtn: {
    flex: 1.4,
    minHeight: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  addBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "700",
  },
});

