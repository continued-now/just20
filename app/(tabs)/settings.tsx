import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { getSetting, setSetting } from '../../lib/db';
import {
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  type NotificationMode,
  cancelAllNudges,
  cancelWindowedNotification,
  getRemainingNudgeCount,
  hasScheduledWindowNotification,
  scheduleNudges,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../../lib/notifications';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm
function formatHour(h: number) {
  if (h === 12) return '12pm';
  if (h < 12) return `${h}am`;
  return `${h - 12}pm`;
}

function normalizeMode(value: string | null): NotificationMode {
  if (value === 'random' || value === 'strict' || value === 'scheduled_fallback') return value;
  if (value === 'scheduled') return 'strict';
  return DEFAULT_NOTIFICATION_MODE;
}

export default function SettingsScreen() {
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [mode, setMode] = useState<NotificationMode>(DEFAULT_NOTIFICATION_MODE);
  const [scheduledHour, setScheduledHour] = useState(DEFAULT_SCHEDULED_HOUR);

  useEffect(() => {
    async function load() {
      const [nudgeCount, scheduledActive, savedMode, savedHour] = await Promise.all([
        getRemainingNudgeCount(),
        hasScheduledWindowNotification(),
        getSetting('notification_mode'),
        getSetting('scheduled_hour'),
      ]);
      const initialMode = normalizeMode(savedMode);
      setMode(initialMode);
      setNotificationsOn(initialMode === 'strict' ? scheduledActive : scheduledActive || nudgeCount > 0);
      if (savedHour) setScheduledHour(parseInt(savedHour, 10));
    }
    load();
  }, []);

  async function enableMode(next: NotificationMode, hour = scheduledHour) {
    if (next === 'random') {
      await cancelWindowedNotification();
      await scheduleNudges({ source: 'random' });
      const count = await getRemainingNudgeCount();
      setNotificationsOn(count > 0);
      return;
    }

    if (next === 'strict') {
      await cancelAllNudges();
      await scheduleWindowedNotification(hour);
      setNotificationsOn(true);
      return;
    }

    await scheduleWindowWithFallbackNudges(hour);
    setNotificationsOn(true);
  }

  async function handleModeChange(next: NotificationMode) {
    setMode(next);
    await setSetting('notification_mode', next);
    await enableMode(next);
  }

  async function handleHourChange(h: number) {
    setScheduledHour(h);
    await setSetting('scheduled_hour', String(h));
    if (notificationsOn) {
      if (mode === 'strict') await scheduleWindowedNotification(h);
      if (mode === 'scheduled_fallback') await scheduleWindowWithFallbackNudges(h);
    }
  }

  async function handleReschedule() {
    if (mode === 'strict') {
      await scheduleWindowedNotification(scheduledHour);
      setNotificationsOn(true);
      Alert.alert('Window scheduled', `You'll get notified at ${formatHour(scheduledHour)} daily.`);
    } else if (mode === 'scheduled_fallback') {
      await scheduleWindowWithFallbackNudges(scheduledHour);
      setNotificationsOn(true);
      Alert.alert('Window + fallback scheduled', `Your 10-minute window opens at ${formatHour(scheduledHour)}. Nudges kick in if you miss it.`);
    } else {
      await cancelAllNudges();
      await scheduleNudges({ source: 'random' });
      setNotificationsOn(true);
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
          <Text style={styles.sectionDesc}>Choose how hard the app should make the daily promise feel.</Text>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'scheduled_fallback' && styles.modeCardActive]}
            onPress={() => handleModeChange('scheduled_fallback')}
            activeOpacity={0.8}
          >
            <View style={styles.modeHeader}>
              <Text style={styles.modeEmoji}>⏰</Text>
              <View style={styles.modeTitleWrap}>
                <Text style={[styles.modeTitle, mode === 'scheduled_fallback' && styles.modeTitleActive]}>
                  Set a time
                </Text>
                <Text style={styles.modeSub}>Default. 10-minute window. If you miss it, nudges kick in and XP starts dropping.</Text>
              </View>
              {mode === 'scheduled_fallback' && <Text style={styles.modeCheck}>✓</Text>}
            </View>

            {mode === 'scheduled_fallback' && <TimePicker scheduledHour={scheduledHour} onHourChange={handleHourChange} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.modeCard, mode === 'strict' && styles.modeCardActive]}
            onPress={() => handleModeChange('strict')}
            activeOpacity={0.8}
          >
            <View style={styles.modeHeader}>
              <Text style={styles.modeEmoji}>⚡</Text>
              <View style={styles.modeTitleWrap}>
                <Text style={[styles.modeTitle, mode === 'strict' && styles.modeTitleActive]}>
                  No excuses
                </Text>
                <Text style={styles.modeSub}>Only the set time. 10-minute window. Highest XP if you hit it.</Text>
              </View>
              {mode === 'strict' && <Text style={styles.modeCheck}>✓</Text>}
            </View>

            {mode === 'strict' && <TimePicker scheduledHour={scheduledHour} onHourChange={handleHourChange} />}
          </TouchableOpacity>

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
                <Text style={styles.modeSub}>20 random nudges, 7am–10pm. Flexible, but lower XP as nudges stack.</Text>
              </View>
              {mode === 'random' && <Text style={styles.modeCheck}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.row}>
            <View>
              <Text style={styles.rowLabel}>Daily reminders</Text>
              <Text style={styles.rowSub}>
                {mode === 'strict'
                  ? `Strict window at ${formatHour(scheduledHour)}`
                  : mode === 'scheduled_fallback'
                  ? `${formatHour(scheduledHour)} window + fallback nudges`
                  : '20 random nudges between 7am–10pm'}
              </Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={async (v) => {
                setNotificationsOn(v);
                if (v) {
                  await enableMode(mode);
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
              {mode === 'random' ? "Reschedule today's nudges" : 'Reschedule window'}
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

function TimePicker({
  scheduledHour,
  onHourChange,
}: {
  scheduledHour: number;
  onHourChange: (hour: number) => void;
}) {
  return (
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
            onPress={() => onHourChange(h)}
            activeOpacity={0.7}
          >
            <Text style={[styles.hourChipText, h === scheduledHour && styles.hourChipTextActive]}>
              {formatHour(h)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
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
