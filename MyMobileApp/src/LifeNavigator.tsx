// src/LifeNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import FinanceScreen from './FinanceScreen';
import HealthScreen from './HealthScreen';
import TravelScreen from './TravelScreen';

const LifeTab = createBottomTabNavigator();

export default function LifeNavigator() {
  return (
    <LifeTab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: 'green',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'];

          if (route.name === 'Finance') {
            iconName = focused ? 'cash' : 'cash-outline';
          } else if (route.name === 'Health') {
            iconName = focused ? 'medkit' : 'medkit-outline';
          } else if (route.name === 'Travel') {
            iconName = focused ? 'airplane' : 'airplane-outline';
          } else {
            iconName = 'help';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <LifeTab.Screen name="Finance" component={FinanceScreen} />
      <LifeTab.Screen name="Health" component={HealthScreen} />
      <LifeTab.Screen name="Travel" component={TravelScreen} />
    </LifeTab.Navigator>
  );
}
