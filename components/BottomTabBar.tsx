import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStreak } from '../hooks/useStreak';
import { colors, spacing } from '../constants/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_CONFIG: Record<string, { active: IconName; inactive: IconName; label: string }> = {
  index:    { active: 'home',        inactive: 'home-outline',        label: 'Home'    },
  streak:   { active: 'flame',       inactive: 'flame-outline',       label: 'Streaks' },
  squad:    { active: 'people',      inactive: 'people-outline',      label: 'Squad'   },
  profile:  { active: 'person',      inactive: 'person-outline',      label: 'Profile' },
};

const TAB_HREFS: Record<string, string> = {
  index: '/',
  streak: '/(tabs)/streak',
  squad: '/(tabs)/squad',
  profile: '/(tabs)/profile',
};

export function BottomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { current: streakCount } = useStreak();
  const currentRouteName = state.routes[state.index]?.name;

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs }]}>
      {state.routes.map((route, i) => {
        const cfg = TAB_CONFIG[route.name];
        if (!cfg) return null;

        const isStreak = route.name === 'streak';
        const focused = route.name === 'profile'
          ? currentRouteName === 'profile' || currentRouteName === 'settings'
          : currentRouteName === route.name;
        const isCurrentRoute = state.index === i;
        const iconColor = focused ? (isStreak ? colors.streak : colors.brandDark) : colors.subtext;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          const href = TAB_HREFS[route.name];
          if (!isCurrentRoute && !event.defaultPrevented) {
            router.navigate((href ?? '/') as any);
          }
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
    paddingHorizontal: spacing.xs,
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
    paddingBottom: spacing.xs,
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillActive: {
    backgroundColor: colors.brandSoft,
  },
  pillStreak: {
    backgroundColor: colors.streakSoft,
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
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
    color: colors.subtext,
  },
  labelActive: {
    color: colors.brandDark,
    fontWeight: '700',
  },
  labelStreak: {
    color: colors.streak,
    fontWeight: '700',
  },
});
