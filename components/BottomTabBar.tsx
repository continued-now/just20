import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStreak } from '../hooks/useStreak';
import { colors } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index:    { active: 'home',     inactive: 'home-outline',     label: 'Home'     },
  streak:   { active: 'flame',    inactive: 'flame-outline',    label: 'Streak'   },
  settings: { active: 'settings', inactive: 'settings-outline', label: 'Settings' },
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { current: streakCount } = useStreak();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, i) => {
        const focused = state.index === i;
        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;

        const isStreak = route.name === 'streak';
        const iconColor = focused ? (isStreak ? colors.streak : colors.text) : colors.subtext;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.7}>
            <View style={[styles.pill, focused && (isStreak ? styles.pillStreak : styles.pillActive)]}>
              <View style={styles.iconWrap}>
                <Ionicons name={focused ? cfg.active : cfg.inactive} size={24} color={iconColor} />
                {isStreak && streakCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{streakCount}</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={[styles.label, focused && (isStreak ? styles.labelStreak : styles.labelActive)]}>
              {cfg.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 12,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    paddingBottom: 2,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: '#F0F0EC',
  },
  pillStreak: {
    backgroundColor: '#FFF0E8',
  },
  iconWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    backgroundColor: colors.streak,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: colors.card,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '800',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.subtext,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  labelStreak: {
    color: colors.streak,
    fontWeight: '700',
  },
});
