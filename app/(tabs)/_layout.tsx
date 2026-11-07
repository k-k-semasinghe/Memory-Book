import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, radius } from '../../src/constants/theme';

export default function TabsLayout() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textFaint,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 58 + insets.bottom,
            paddingTop: 6,
            paddingBottom: insets.bottom + 4,
          },
          tabBarLabelStyle: styles.tabLabel,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name="home-outline"
                size={size}
                color={focused ? colors.primary : colors.textFaint}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="timeline"
          options={{
            title: 'Timeline',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name="time-outline"
                size={size}
                color={focused ? colors.primary : colors.textFaint}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="search"
          options={{
            title: 'Search',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name="search-outline"
                size={size}
                color={focused ? colors.primary : colors.textFaint}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="scratchpad"
          options={{
            title: 'Scratchpad',
            tabBarIcon: ({ focused, size }) => (
              <Ionicons
                name="hourglass-outline"
                size={size}
                color={focused ? colors.primary : colors.textFaint}
              />
            ),
          }}
        />
      </Tabs>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a note"
        onPress={() => router.push('/capture')}
        style={({ pressed }) => [
          styles.fab,
          { bottom: insets.bottom + 74 },
          pressed && styles.fabPressed,
        ]}
      >
        <Ionicons name="add" size={30} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    width: 58,
    height: 58,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  fabPressed: {
    opacity: 0.85,
  },
});
