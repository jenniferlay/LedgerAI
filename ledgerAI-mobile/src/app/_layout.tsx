import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { Text, useColorScheme, View } from 'react-native';
import { AuthProvider, useAuth } from '../context/auth';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const colorScheme = useColorScheme();
  const { isLoggedIn, authError } = useAuth();
  const ready = isLoggedIn !== null || authError;

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync();
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      {authError ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <Text>Unable to check saved sign-in information. Please restart the app.</Text>
        </View>
      ) : (
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Protected guard={isLoggedIn === true}>
            <Stack.Screen name="(app)" />
          </Stack.Protected>
          <Stack.Protected guard={isLoggedIn === false}>
            <Stack.Screen name="(auth)" />
          </Stack.Protected>
        </Stack>
      )}
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}
