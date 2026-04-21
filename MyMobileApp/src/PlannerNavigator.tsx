// src/PlannerNavigator.tsx
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import DayScreen from './DayScreen';
import { RootTabParamList } from './types';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function PlannerNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Mon"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'];

          if (route.name === 'Mon') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Tue') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Wed') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Thu') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Fri') {
            iconName = focused ? 'calendar' : 'calendar-outline';
          } else if (route.name === 'Sat') {
            iconName = focused ? 'bonfire' : 'bonfire-outline';
          } else if (route.name === 'Sun') {
            iconName = focused ? 'bed' : 'bed-outline';
          } else {
            iconName = 'help';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Mon" component={DayScreen} initialParams={{ day: 'Monday' }} />
      <Tab.Screen name="Tue" component={DayScreen} initialParams={{ day: 'Tuesday' }} />
      <Tab.Screen name="Wed" component={DayScreen} initialParams={{ day: 'Wednesday' }} />
      <Tab.Screen name="Thu" component={DayScreen} initialParams={{ day: 'Thursday' }} />
      <Tab.Screen name="Fri" component={DayScreen} initialParams={{ day: 'Friday' }} />
      <Tab.Screen name="Sat" component={DayScreen} initialParams={{ day: 'Saturday' }} />
      <Tab.Screen name="Sun" component={DayScreen} initialParams={{ day: 'Sunday' }} />
    </Tab.Navigator>
  );
}
