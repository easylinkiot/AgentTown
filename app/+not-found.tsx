import { Link, Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { tx } from "@/src/i18n/translate";
import { useAgentTown } from "@/src/state/agenttown-context";

export default function NotFoundScreen() {
  const { language } = useAgentTown();
  const tr = (zh: string, en: string) => tx(language, zh, en);
  return (
    <>
      <Stack.Screen options={{ title: tr("未找到", "Not Found") }} />
      <View style={styles.container}>
        <Text style={styles.title}>{tr("这个页面不存在。", "This screen does not exist.")}</Text>
        <Link href="/" style={styles.link}>
          {tr("返回首页", "Back to Home")}
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#f3f4f6",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
  },
  link: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563eb",
  },
});
