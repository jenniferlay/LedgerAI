import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  // Minimal mock token state: change to 'mock-token' to test authenticated flow
  const [token, setToken] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = (segments[0] as string) === '(auth)';

    if (!token && !inAuthGroup) {
      console.log('No token and not in auth group, redirecting to login');
      router.replace('/(auth)/login');
    } else if (token && inAuthGroup) {
      console.log('Token exists and in auth group, redirecting to add-category');
      router.replace('/(app)');
    }
  }, [token, segments]);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ThemeProvider>
  );
}
