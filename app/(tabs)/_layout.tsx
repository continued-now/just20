import { Tabs } from 'expo-router';
import { BottomTabBar } from '../../components/BottomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="streak" />
      <Tabs.Screen name="squad" />
      <Tabs.Screen name="settings" />
      <Tabs.Screen name="stats" options={{ href: null }} />
    </Tabs>
  );
}
