// App.tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Import all your features
import FitnessScreen from './src/FitnessScreen';
import JournalScreen from './src/JournalScreen';
import PlannerNavigator from './src/PlannerNavigator';
import LifeNavigator from './src/LifeNavigator';
import ChatScreen from './src/ChatScreen';

const Tab = createBottomTabNavigator();

// This is your main 5-tab app
function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: 'blue',
        tabBarInactiveTintColor: 'gray',
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: React.ComponentProps<typeof Ionicons>['name'];

          if (route.name === 'Planner') {
            iconName = focused ? 'today' : 'today-outline';
          } else if (route.name === 'Fitness') {
            iconName = focused ? 'fitness' : 'fitness-outline';
          } else if (route.name === 'Journal') {
            iconName = focused ? 'book' : 'book-outline';
          } else if (route.name === 'Life') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'Chat') {
            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
          } else {
            iconName = 'help';
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Planner" component={PlannerNavigator} />
      <Tab.Screen name="Fitness" component={FitnessScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
      <Tab.Screen name="Life" component={LifeNavigator} />
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
}

// The app will now always render the main tabs
export default function App() {
  return (
    <NavigationContainer>
      <MainApp />
    </NavigationContainer>
  );
}
