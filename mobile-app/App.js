import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Auth screens
import LoginScreen from './src/screens/auth/LoginScreen';
import RegisterScreen from './src/screens/auth/RegisterScreen';
import ForgotPasswordScreen from './src/screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import VerifyOtpScreen from './src/screens/auth/VerifyOtpScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';

// Main tabs
import HomeScreen from './src/screens/main/HomeScreen';
import CategoriesScreen from './src/screens/main/CategoriesScreen';
import SearchScreen from './src/screens/main/SearchScreen';
import OrdersScreen from './src/screens/main/OrdersScreen';
import ProfileScreen from './src/screens/main/ProfileScreen';

// Stack screens (from main)
import ProductDetailScreen from './src/screens/main/ProductDetailScreen';
import ShopDetailScreen from './src/screens/main/ShopDetailScreen';
import CartCheckoutScreen from './src/screens/main/CartCheckoutScreen';
import WalletScreen from './src/screens/main/WalletScreen';
import AddressesScreen from './src/screens/main/AddressesScreen';
import NotificationsScreen from './src/screens/main/NotificationsScreen';
import HelpScreen from './src/screens/main/HelpScreen';
import AboutScreen from './src/screens/main/AboutScreen';
import EditProfileScreen from './src/screens/main/EditProfileScreen';
import OrderDetailScreen from './src/screens/main/OrderDetailScreen';
import CategoryProductsScreen from './src/screens/main/CategoryProductsScreen';
import AddressFormScreen from './src/screens/main/AddressFormScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#22c55e',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { backgroundColor: '#0f172a' },
      }}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tab.Screen name="CategoriesTab" component={CategoriesScreen} options={{ title: 'Categories', tabBarLabel: 'Categories' }} />
      <Tab.Screen name="SearchTab" component={SearchScreen} options={{ title: 'Search', tabBarLabel: 'Search' }} />
      <Tab.Screen name="OrdersTab" component={OrdersScreen} options={{ title: 'Orders', tabBarLabel: 'Orders' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </Stack.Navigator>
  );
}

function MainStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0f172a' }, headerTintColor: '#fff' }}>
      <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
      <Stack.Screen name="ShopDetail" component={ShopDetailScreen} />
      <Stack.Screen name="CartCheckout" component={CartCheckoutScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="Addresses" component={AddressesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Help" component={HelpScreen} />
      <Stack.Screen name="About" component={AboutScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
      <Stack.Screen name="CategoryProducts" component={CategoryProductsScreen} />
      <Stack.Screen name="AddressForm" component={AddressFormScreen} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();
  const [seenOnboarding, setSeenOnboarding] = React.useState(null);

  React.useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('@techaven_onboarding_done');
        setSeenOnboarding(v === '1');
      } catch {
        setSeenOnboarding(true);
      }
    })();
  }, []);

  const finishOnboarding = async () => {
    try {
      await AsyncStorage.setItem('@techaven_onboarding_done', '1');
      setSeenOnboarding(true);
    } catch {
      setSeenOnboarding(true);
    }
  };

  if (loading || seenOnboarding === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#22c55e" />
      </View>
    );
  }

  if (!seenOnboarding) {
    return <OnboardingScreen onFinish={finishOnboarding} />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <Stack.Screen name="Main" component={MainStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
});
