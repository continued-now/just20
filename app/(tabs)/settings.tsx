import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { getBooleanSetting, getSetting, setBooleanSetting, setSetting } from '../../lib/db';
import { recordGrowthEvent } from '../../lib/growth';
import {
  DEFAULT_MAX_DAILY_NUDGES,
  DEFAULT_NOTIFICATION_MODE,
  DEFAULT_SCHEDULED_HOUR,
  type NotificationMode,
  cancelAllNudges,
  cancelWindowedNotification,
  getRemainingNudgeCount,
  hasScheduledWindowNotification,
  requestPermission,
  scheduleRandomNudges,
  scheduleWindowWithFallbackNudges,
  scheduleWindowedNotification,
} from '../../lib/notifications';
import { scheduleSharedJust20StatusUpdate } from '../../lib/widgetStatus';

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm
const MAX_NUDGE_OPTIONS = [8, 12, 20];
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

function normalizeNudgeLimit(value: string | null): number {
  const parsed = Number.parseInt(value ?? String(DEFAULT_MAX_DAILY_NUDGES), 10);
  return MAX_NUDGE_OPTIONS.includes(parsed) ? parsed : DEFAULT_MAX_DAILY_NUDGES;
}

export default function SettingsScreen() {
  const [notificationsOn, setNotificationsOn] = useState(false);
  const [mode, setMode] = useState<NotificationMode>(DEFAULT_NOTIFICATION_MODE);
  const [scheduledHour, setScheduledHour] = useState(DEFAULT_SCHEDULED_HOUR);
  const [widgetUrgency, setWidgetUrgency] = useState(true);
  const [watchNudges, setWatchNudges] = useState(true);
  const [lockInMode, setLockInMode] = useState(false);
  const [ugcRepostOk, setUgcRepostOk] = useState(false);
  const [maxDailyNudges, setMaxDailyNudges] = useState(DEFAULT_MAX_DAILY_NUDGES);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const [
          nudgeCount,
          scheduledActive,
          savedMode,
          savedHour,
          savedWidgetUrgency,
          savedWatchNudges,
          savedLockIn,
          savedUgcRepostOk,
          savedMaxDailyNudges,
          savedNotificationsEnabled,
        ] = await Promise.all([
          getRemainingNudgeCount(),
          hasScheduledWindowNotification(),
          getSetting('notification_mode'),
          getSetting('scheduled_hour'),
          getBooleanSetting('widget_urgency_enabled', true),
          getBooleanSetting('watch_nudges_enabled', true),
          getBooleanSetting('lock_in_mode_enabled', false),
          getBooleanSetting('ugc_repost_ok', false),
          getSetting('max_daily_nudges'),
          getSetting('notifications_enabled'),
        ]);
        if (!active) return;
        const initialMode = normalizeMode(savedMode);
        setMode(initialMode);
        setNotificationsOn(
          savedNotificationsEnabled === '1' &&
            (initialMode === 'strict' ? scheduledActive : scheduledActive || nudgeCount > 0)
        );
        if (savedHour) setScheduledHour(parseInt(savedHour, 10));
        setWidgetUrgency(savedWidgetUrgency);
        setWatchNudges(savedWatchNudges);
        setLockInMode(savedLockIn);
        setUgcRepostOk(savedUgcRepostOk);
        setMaxDailyNudges(normalizeNudgeLimit(savedMaxDailyNudges));
      } catch {
        if (active) setNotificationsOn(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  async function ensureNotificationPermission(): Promise<boolean> {
    const granted = await requestPermission();
    if (!granted) {
      setNotificationsOn(false);
      Alert.alert('Notifications blocked', 'Enable notifications in system settings to use daily reminders.');
      return false;
    }
    return true;
  }

  async function enableMode(next: NotificationMode, hour = scheduledHour): Promise<boolean> {
    const granted = await ensureNotificationPermission();
    if (!granted) return false;
    await setSetting('notifications_enabled', '1');

    if (next === 'random') {
      await cancelWindowedNotification();
      await scheduleRandomNudges();
      const count = await getRemainingNudgeCount();
      setNotificationsOn(count > 0);
      return count > 0;
    }

    if (next === 'strict') {
      await cancelAllNudges();
      await scheduleWindowedNotification(hour);
      setNotificationsOn(true);
      return true;
    }

    await scheduleWindowWithFallbackNudges(hour);
    setNotificationsOn(true);
    return true;
  }

  async function handleModeChange(next: NotificationMode) {
    const previousMode = mode;
    const previousNotificationsOn = notificationsOn;
    setMode(next);
    try {
      await setSetting('notification_mode', next);
      await enableMode(next);
      scheduleSharedJust20StatusUpdate();
    } catch {
      setMode(previousMode);
      setNotificationsOn(previousNotificationsOn);
      Alert.alert('Notifications unavailable', 'Could not update reminder settings. Please try again.');
    }
  }

  async function handleHourChange(h: number) {
    const previousHour = scheduledHour;
    setScheduledHour(h);
    try {
      await setSetting('scheduled_hour', String(h));
      if (notificationsOn) {
        await enableMode(mode, h);
      }
      scheduleSharedJust20StatusUpdate();
    } catch {
      setScheduledHour(previousHour);
      Alert.alert('Notifications unavailable', 'Could not update reminder time. Please try again.');
    }
  }

  async function handleMaxNudgesChange(next: number) {
    const previous = maxDailyNudges;
    setMaxDailyNudges(next);
    try {
      await setSetting('max_daily_nudges', String(next));
      if (notificationsOn && mode !== 'strict') {
        await enableMode(mode);
      }
      scheduleSharedJust20StatusUpdate();
    } catch {
      setMaxDailyNudges(previous);
      Alert.alert('Notifications unavailable', 'Could not update nudge limits. Please try again.');
    }
  }

  async function handleReschedule() {
    let scheduled = false;
    try {
      scheduled = await enableMode(mode);
      if (!scheduled) return;
    } catch {
      Alert.alert('Notifications unavailable', 'Could not reschedule reminders. Please try again.');
      return;
    }

    if (mode === 'strict') {
      Alert.alert('Window scheduled', `You'll get notified at ${formatHour(scheduledHour)} daily.`);
    } else if (mode === 'scheduled_fallback') {
      Alert.alert('Daily window scheduled', `Your 10-minute window opens at ${formatHour(scheduledHour)}. Backup nudges kick in if you miss it.`);
    } else {
      Alert.alert('Nudges rescheduled', `${maxDailyNudges} new nudges scheduled for today.`);
    }
    scheduleSharedJust20StatusUpdate();
  }

  async function handleClearNudges() {
    try {
      await cancelAllNudges();
      await cancelWindowedNotification();
      await setSetting('notifications_enabled', '0');
      setNotificationsOn(false);
      Alert.alert('Notifications cleared', 'All reminders cancelled.');
      scheduleSharedJust20StatusUpdate();
    } catch {
      Alert.alert('Notifications unavailable', 'Could not clear reminders. Please try again.');
    }
  }

  async function setWidgetSetting(key: string, value: boolean) {
    const previousWidgetUrgency = widgetUrgency;
    const previousWatchNudges = watchNudges;
    const previousLockInMode = lockInMode;
    if (key === 'widget_urgency_enabled') setWidgetUrgency(value);
    if (key === 'watch_nudges_enabled') setWatchNudges(value);
    if (key === 'lock_in_mode_enabled') setLockInMode(value);
    try {
      await setBooleanSetting(key, value);
      scheduleSharedJust20StatusUpdate();
    } catch {
      setWidgetUrgency(previousWidgetUrgency);
      setWatchNudges(previousWatchNudges);
      setLockInMode(previousLockInMode);
      Alert.alert('Settings unavailable', 'Could not update companion settings. Please try again.');
    }
  }

  async function handleUgcRepostChange(value: boolean) {
    const previous = ugcRepostOk;
    setUgcRepostOk(value);
    try {
      await setBooleanSetting('ugc_repost_ok', value);
      await recordGrowthEvent({
        eventType: 'repost_preference_updated',
        context: 'profile',
        source: 'system',
        campaign: 'proof_card',
        metadata: { enabled: value },
      });
    } catch {
      setUgcRepostOk(previous);
      Alert.alert('Settings unavailable', 'Could not update sharing preferences. Please try again.');
    }
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
                <Text style={styles.modeSub}>Default. 10-minute window. If you miss it, backup nudges kick in and XP starts dropping.</Text>
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
                <Text style={styles.modeSub}>
                  Up to {maxDailyNudges} random nudges, 7am-10pm. Flexible, but lower XP as nudges stack.
                </Text>
              </View>
              {mode === 'random' && <Text style={styles.modeCheck}>✓</Text>}
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Widget & Watch</Text>
          <Text style={styles.sectionDesc}>Let your mascot keep the promise visible outside the app.</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Home Screen Widget urgency</Text>
              <Text style={styles.rowSub}>Use stronger reminder copy as the day gets late.</Text>
            </View>
            <Switch
              value={widgetUrgency}
              onValueChange={(v) => setWidgetSetting('widget_urgency_enabled', v)}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Apple Watch nudges</Text>
              <Text style={styles.rowSub}>Mirror your daily status and reminders on your watch.</Text>
            </View>
            <Switch
              value={watchNudges}
              onValueChange={(v) => setWidgetSetting('watch_nudges_enabled', v)}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Lock-in Mode</Text>
              <Text style={styles.rowSub}>Opt into a firmer late-day reminder tone.</Text>
            </View>
            <Switch
              value={lockInMode}
              onValueChange={(v) => setWidgetSetting('lock_in_mode_enabled', v)}
              trackColor={{ true: colors.streak, false: colors.border }}
            />
          </View>

        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nudge Limits</Text>
          <Text style={styles.sectionDesc}>Cap fallback reminders before quiet hours begin.</Text>
          <NudgeLimitPicker
            maxDailyNudges={maxDailyNudges}
            onNudgeLimitChange={handleMaxNudgesChange}
          />
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>Quiet hours</Text>
            <Text style={styles.rowSub}>10pm-7am</Text>
          </View>
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
                  ? `${formatHour(scheduledHour)} window + backup nudges`
                  : `${maxDailyNudges} random nudges between 7am-10pm`}
              </Text>
            </View>
            <Switch
              value={notificationsOn}
              onValueChange={async (v) => {
                const previous = notificationsOn;
                setNotificationsOn(v);
                try {
                  if (v) {
                    await enableMode(mode);
                  } else {
                    await cancelAllNudges();
                    await cancelWindowedNotification();
                    await setSetting('notifications_enabled', '0');
                  }
                } catch {
                  setNotificationsOn(previous);
                  Alert.alert('Notifications unavailable', 'Could not update reminders. Please try again.');
                }
                scheduleSharedJust20StatusUpdate();
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
          <Text style={styles.sectionTitle}>Sharing</Text>
          <Text style={styles.sectionDesc}>Choose how your proof cards can be shared.</Text>

          <View style={styles.row}>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>Okay to repost tagged proof</Text>
              <Text style={styles.rowSub}>If you tag Just 20, this marks you as open to being featured later.</Text>
            </View>
            <Switch
              value={ugcRepostOk}
              onValueChange={handleUgcRepostChange}
              trackColor={{ true: colors.success, false: colors.border }}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.rowLabel}>App</Text>
            <Text style={styles.rowSub}>Just 20</Text>
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

function NudgeLimitPicker({
  maxDailyNudges,
  onNudgeLimitChange,
}: {
  maxDailyNudges: number;
  onNudgeLimitChange: (count: number) => void;
}) {
  return (
    <View style={styles.limitCard}>
      <Text style={styles.timePickerLabel}>Maximum daily nudges</Text>
      <View style={styles.limitRow}>
        {MAX_NUDGE_OPTIONS.map((count) => (
          <TouchableOpacity
            key={count}
            style={[styles.limitChip, count === maxDailyNudges && styles.hourChipActive]}
            onPress={() => onNudgeLimitChange(count)}
            activeOpacity={0.75}
          >
            <Text style={[styles.hourChipText, count === maxDailyNudges && styles.hourChipTextActive]}>
              {count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxl + spacing.xl },
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

  limitCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  limitRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  limitChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  row: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowText: { flex: 1, paddingRight: spacing.md },
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
    gap: spacing.md,
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
