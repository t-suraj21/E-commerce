import React, { useState } from 'react';
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
import { COLORS, SPACING, SIZES, SHADOWS } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../api/client';

export default function OtpVerificationScreen({ route, navigation }) {
  const { email } = route.params;
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/auth/verify-otp', {
        email,
        otp
      });

      if (response.data.success && response.data.resetToken) {
        Alert.alert('OTP Verified', 'Verification successful! Please choose a new password.');
        // Navigate to Reset Password Screen
        navigation.navigate('ResetPassword', { resetToken: response.data.resetToken });
      }
    } catch (error) {
      console.log('OTP verification error:', error.response?.data || error.message);
      setErrorMessage(error.response?.data?.message || 'Invalid OTP code. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setIsResending(true);
    setErrorMessage('');
    try {
      const response = await apiClient.post('/auth/forgot-password', { email });
      if (response.data.success) {
        Alert.alert(
          'OTP Resent',
          `A new OTP code has been generated. For testing, your OTP is: ${response.data.otp}`
        );
      }
    } catch (error) {
      setErrorMessage('Failed to resend OTP. Try again.');
    } finally {
      setIsResending(false);
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
          <Text style={styles.title}>OTP Verification</Text>
          <Text style={styles.subtitle}>
            Enter the 6-digit verification code sent to <Text style={styles.bold}>{email}</Text>
          </Text>
        </View>

        {errorMessage ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={20} color={COLORS.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Enter 6-Digit Code</Text>
            <TextInput
              style={styles.otpInput}
              placeholder="000000"
              value={otp}
              onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              maxLength={6}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, isLoading && styles.disabledButton]}
            onPress={handleVerifyOtp}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitButtonText}>Verify & Proceed</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendRow}>
            <Text style={styles.resendText}>Didn't receive code? </Text>
            {isResending ? (
              <ActivityIndicator size="small" color={COLORS.primary} />
            ) : (
              <TouchableOpacity onPress={handleResendOtp}>
                <Text style={styles.linkText}>Resend OTP</Text>
              </TouchableOpacity>
            )}
          </View>
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
    borderColor: COLORS.border,
    ...SHADOWS.sm
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
    color: COLORS.textSecondary,
    lineHeight: 22
  },
  bold: {
    fontWeight: '700',
    color: COLORS.text
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
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text
  },
  otpInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMd,
    width: '100%',
    paddingVertical: 14,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 8,
    color: COLORS.primaryDark
  },
  submitButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: SIZES.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm
  },
  disabledButton: {
    opacity: 0.7
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700'
  },
  resendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.sm
  },
  resendText: {
    color: COLORS.textSecondary,
    fontSize: 14
  },
  linkText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '700'
  }
});
