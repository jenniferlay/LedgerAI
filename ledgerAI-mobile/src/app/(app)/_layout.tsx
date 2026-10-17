import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme, View } from 'react-native';

export default function AppLayout() {
  const colorScheme = useColorScheme();
  const activeColor = colorScheme === 'dark' ? '#fff' : '#000';
  
  const themeGreen = '#10B981'; 

  return (
    <Tabs
      screenOptions={{
        headerShown: false, 
        tabBarActiveTintColor: activeColor,
        tabBarStyle: {
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home-outline" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="add-category"
        options={{
          title: 'Marty',
          tabBarLabel: () => null, 
          tabBarIcon: ({ focused }) => (
            <View
              style={{
                backgroundColor: themeGreen,
                width: 54,
                height: 54,
                borderRadius: 30,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: themeGreen,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3,
                elevation: 3,
              }}
            >
              <Ionicons name="sparkles" size={22} color="#ffffff" />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="add-expense"
        options={{
          title: 'Add Expense',
          tabBarIcon: ({ color }) => (
            <Ionicons name="add-circle-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}