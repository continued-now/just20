import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { cancelAllNudges, getRemainingNudgeCount, scheduleNudges } from '../../lib/notifications';

export default function SettingsScreen() {
  const [notificationsOn, setNotificationsOn] = useState(false);

  useEffect(() => {
    getRemainingNudgeCount().then((n) => setNotificationsOn(n > 0));
  }, []);

  async function handleReschedule() {
    await cancelAllNudges();
    await scheduleNudges();
    Alert.alert('Nudges rescheduled', '20 new nudges scheduled for today.');
  }

  async function handleClearNudges() {
    await cancelAllNudges();
    Alert.alert('Nudges cleared', 'Daily nudges cancelled. Other reminders stay scheduled.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Daily nudges</Text>
              <Text style={styles.rowSub}>20 random nudges between 7am–10pm</Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={async (v) => {
                setNotificationsOn(v);
                if (v) await scheduleNudges();
                else await cancelAllNudges();
              }}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleReschedule}>
            <Text style={styles.btnText}>Reschedule today's nudges</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnDestructive]} onPress={handleClearNudges}>
            <Text style={[styles.btnText, styles.btnTextDestructive]}>Clear all nudges</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>App</Text>
            <Text style={styles.rowSub}>just20</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowSub}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Pose detection</Text>
            <Text style={styles.rowSub}>MoveNet Lightning (on-device)</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl },
  heading: { fontSize: 28, fontWeight: '900', color: colors.text },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowLabel: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  rowSub: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    marginTop: 2,
  },
  infoRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btn: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnDestructive: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  btnText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
  },
  btnTextDestructive: {
    color: colors.accent,
  },
});
