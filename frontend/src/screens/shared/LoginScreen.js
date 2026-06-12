import React, { useState, useContext, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../../utils/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { login, googleLogin, isLoading } = useContext(AuthContext);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '1079591731539-1adt18ka2qqjbktoe81je05r835ds480.apps.googleusercontent.com',
      iosClientId: '1079591731539-33k2hf1nc8357p3vpoopb53b9kcc0e9f.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      setErrorMessage('Please fill in all fields');
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setErrorMessage('');
    const result = await login(email.trim(), password);
    if (!result.success) {
      setErrorMessage(result.message);
      Alert.alert('Login Failed', 'Incorrect Email, Phone Number or Password. Please try again.');
    } else {
      await analytics().logLogin({ method: 'email' });
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setErrorMessage('');
      await GoogleSignin.hasPlayServices();
      
      // Clear previous sign-in state to force account selection prompt
      try {
        await GoogleSignin.signOut();
      } catch (signOutError) {
        // Ignore error if not signed in
      }

      const userInfo = await GoogleSignin.signIn({ prompt: 'select_account' });
      const idToken = userInfo.idToken || (userInfo.data && userInfo.data.idToken);
      if (!idToken) {
        throw new Error('No ID token received from Google');
      }
      
      const result = await googleLogin(idToken);
      if (!result.success) {
        setErrorMessage(result.message);
      } else {
        await analytics().logLogin({ method: 'google' });
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('Google Sign-In Cancelled');
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log('Google Sign-In In Progress');
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        setErrorMessage('Google Play Services not available or outdated');
      } else {
        setErrorMessage(error.message || 'Google Sign-In failed');
      }
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Back Button */}


        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Log in to access Tarun Kirana Store</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address / Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email or phone number"
                value={email}
                onChangeText={setEmail}
                keyboardType="default"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.forgotPasswordContainer}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Log In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
         </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkText}>Register here</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background
  },
  scrollContainer: {
    flexGrow: 1,
    padding: SPACING.lg,
    justifyContent: 'center'
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SPACING.lg,
    width: 40,
    height: 40,
    borderRadius: SIZES.radiusSm,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border
  },
  header: {
    marginTop: 60,
    marginBottom: SPACING.xl
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: SPACING.xs
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: SPACING.sm,
    borderRadius: SIZES.radiusSm,
    marginBottom: SPACING.md,
    gap: SPACING.xs
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    fontWeight: '600',
    flex: 1
  },
  form: {
    gap: SPACING.md
  },
  inputContainer: {
    gap: SPACING.xs
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.sm
  },
  inputIcon: {
    marginRight: SPACING.sm
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text
  },
  eyeIcon: {
    padding: SPACING.xs
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
  },
  disabledButton: {
    opacity: 0.7
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700'
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border
  },
  dividerText: {
    marginHorizontal: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '500'
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 14,
    borderRadius: SIZES.radiusMd,
    ...SHADOWS.sm
  },
  googleIcon: {
    marginRight: 10
  },
  googleButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: SPACING.lg,
    marginBottom: SPACING.lg
  },
  footerText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700'
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 6
  },
  forgotPasswordText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: '700'
  },
});
