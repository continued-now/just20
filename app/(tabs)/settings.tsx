import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { getSetting, setSetting } from '../../lib/db';
import {
  cancelAllNudges,
  cancelWindowedNotification,
  getRemainingNudgeCount,
  scheduleNudges,
  scheduleWindowedNotification,
} from '../../lib/notifications';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm
function formatHour(h: number) {
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

type NotifMode = 'random' | 'scheduled';

export default function SettingsScreen() {
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [mode, setMode] = useState<NotifMode>('random');
  const [scheduledHour, setScheduledHour] = useState(8);

  useEffect(() => {
    async function load() {
      const [count, savedMode, savedHour] = await Promise.all([
        getRemainingNudgeCount(),
        getSetting('notification_mode'),
        getSetting('scheduled_hour'),
      ]);
      setNotificationsOn(count > 0);
      if (savedMode === 'scheduled') setMode('scheduled');
      if (savedHour) setScheduledHour(parseInt(savedHour, 10));
    }
    load();
  }, []);

  async function handleModeChange(next: NotifMode) {
    setMode(next);
    await setSetting('notification_mode', next);
    if (next === 'random') {
      await cancelWindowedNotification();
      await cancelAllNudges();
      await scheduleNudges();
      const count = await getRemainingNudgeCount();
      setNotificationsOn(count > 0);
    } else {
      await cancelAllNudges();
      await scheduleWindowedNotification(scheduledHour);
      setNotificationsOn(true);
    }
  }

  async function handleHourChange(h: number) {
    setScheduledHour(h);
    await setSetting('scheduled_hour', String(h));
    if (mode === 'scheduled') {
      await scheduleWindowedNotification(h);
    }
  }

  async function handleReschedule() {
    if (mode === 'scheduled') {
      await scheduleWindowedNotification(scheduledHour);
      Alert.alert('Window scheduled', `You'll get notified at ${formatHour(scheduledHour)} daily.`);
    } else {
      await cancelAllNudges();
      await scheduleNudges();
      Alert.alert('Nudges rescheduled', '20 new nudges scheduled for today.');
    }
  }

  async function handleClearNudges() {
    await cancelAllNudges();
    await cancelWindowedNotification();
    setNotificationsOn(false);
    Alert.alert('Notifications cleared', 'All reminders cancelled.');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Style</Text>
          <Text style={styles.sectionDesc}>Choose how you get pushed to do your 20.</Text>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'random' && styles.modeCardActive]}
            onPress={() => handleModeChange('random')}
            activeOpacity={0.8}
          >
            <View style={styles.modeHeader}>
              <Text style={styles.modeEmoji}>🎲</Text>
              <View style={styles.modeTitleWrap}>
                <Text style={[styles.modeTitle, mode === 'random' && styles.modeTitleActive]}>
                  Get annoyed
                </Text>
                <Text style={styles.modeSub}>20 random nudges, 7am–10pm. Each one gives you 10 minutes.</Text>
              </View>
              {mode === 'random' && <Text style={styles.modeCheck}>✓</Text>}
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'scheduled' && styles.modeCardActive]}
            onPress={() => handleModeChange('scheduled')}
            activeOpacity={0.8}
          >
            <View style={styles.modeHeader}>
              <Text style={styles.modeEmoji}>⏰</Text>
              <View style={styles.modeTitleWrap}>
                <Text style={[styles.modeTitle, mode === 'scheduled' && styles.modeTitleActive]}>
                  Get it done
                </Text>
                <Text style={styles.modeSub}>One shot at your chosen time. 10 minutes. No excuses.</Text>
              </View>
              {mode === 'scheduled' && <Text style={styles.modeCheck}>✓</Text>}
            </View>

            {mode === 'scheduled' && (
              <View style={styles.timePicker}>
                <Text style={styles.timePickerLabel}>Daily window time</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.hourRow}
                >
                  {HOURS.map((h) => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.hourChip, h === scheduledHour && styles.hourChipActive]}
                      onPress={() => handleHourChange(h)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.hourChipText, h === scheduledHour && styles.hourChipTextActive]}>
                        {formatHour(h)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Daily nudges</Text>
              <Text style={styles.rowSub}>
                {mode === 'scheduled'
                  ? `Scheduled window at ${formatHour(scheduledHour)}`
                  : '20 random nudges between 7am–10pm'}
              </Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={async (v) => {
                setNotificationsOn(v);
                if (v) {
                  if (mode === 'scheduled') await scheduleWindowedNotification(scheduledHour);
                  else await scheduleNudges();
                } else {
                  await cancelAllNudges();
                  await cancelWindowedNotification();
                }
              }}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>

          <TouchableOpacity style={styles.btn} onPress={handleReschedule}>
            <Text style={styles.btnText}>
              {mode === 'scheduled' ? 'Reschedule window' : "Reschedule today's nudges"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.btn, styles.btnDestructive]} onPress={handleClearNudges}>
            <Text style={[styles.btnText, styles.btnTextDestructive]}>Clear all notifications</Text>
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

  section: { gap: spacing.sm },
  sectionTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  sectionDesc: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '500',
    marginTop: -spacing.xs,
    marginBottom: spacing.xs,
  },

  // Mode cards
  modeCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing.md,
  },
  modeCardActive: {
    borderColor: colors.text,
    backgroundColor: colors.card,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  modeEmoji: { fontSize: 24 },
  modeTitleWrap: { flex: 1, gap: 2 },
  modeTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.subtext,
  },
  modeTitleActive: { color: colors.text },
  modeSub: {
    fontSize: fontSize.sm,
    color: colors.subtext,
    fontWeight: '500',
    lineHeight: 18,
  },
  modeCheck: {
    fontSize: fontSize.md,
    fontWeight: '900',
    color: colors.text,
  },

  // Time picker
  timePicker: {
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: -spacing.xs,
  },
  timePickerLabel: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  hourRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  hourChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  hourChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  hourChipText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.subtext,
  },
  hourChipTextActive: { color: '#FFFFFF' },

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
