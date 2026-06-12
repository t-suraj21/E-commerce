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
  ScrollView
} from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import { analytics } from '../../utils/firebase';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('customer'); // default customer
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const { register, googleLogin, isLoading } = useContext(AuthContext);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '1079591731539-1adt18ka2qqjbktoe81je05r835ds480.apps.googleusercontent.com',
      iosClientId: '1079591731539-33k2hf1nc8357p3vpoopb53b9kcc0e9f.apps.googleusercontent.com',
      offlineAccess: true,
    });
  }, []);

  const handleRegister = async () => {
    if (!name || !email || !password) {
      setErrorMessage('Please fill in all required fields (Name, Email, Password)');
      return;
    }
    setErrorMessage('');
    const result = await register(name.trim(), email.trim(), password, role, phone.trim());
    if (!result.success) {
      setErrorMessage(result.message);
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
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to start shopping fresh groceries</Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter full name"
                value={name}
                onChangeText={setName}
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Enter 10-digit mobile number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password *</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textSecondary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Choose password"
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
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleRegister}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Create Account</Text>
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
            <Text style={styles.googleButtonText}>Sign up with Google</Text>
          </TouchableOpacity>
         </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Log In</Text>
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
    marginTop: 80,
    marginBottom: SPACING.lg
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
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.text
  },
  eyeIcon: {
    padding: SPACING.xs
  },
  roleContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs
  },
  roleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    backgroundColor: COLORS.white,
    gap: SPACING.xs
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  roleText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textSecondary
  },
  roleTextActive: {
    color: COLORS.white
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
  }
});
