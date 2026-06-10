import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { COLORS, SPACING, SIZES } from '../../styles/theme';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  return (
    <ImageBackground
      source={require('../../../assets/welcome-bg.jpg')}
      style={styles.container}
      resizeMode="cover"
    >
      {/* Dark overlay for text readability */}
      <View style={styles.overlay} />

      <View style={styles.contentContainer}>
        <View style={styles.textSection}>
          <Text style={styles.title}>Tarun Kirana Store</Text>
          <Text style={styles.subtitle}>Your Daily Essentials, Delivered Fresh & Fast Right to Your Doorstep.</Text>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate('Login')}
            activeOpacity={0.8}
          >
            <Text style={styles.loginButtonText}>Login to Shop</Text>
            <Ionicons name="arrow-forward" size={20} color={COLORS.white} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.registerButton}
            onPress={() => navigation.navigate('Register')}
            activeOpacity={0.8}
          >
            <Text style={styles.registerButtonText}>Create an Account</Text>
          </TouchableOpacity>

          <Text style={styles.footerNote}>Build By Suraj Tarun Kumar</Text>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.xl,
    paddingBottom: Platform?.OS === 'ios' ? 40 : SPACING.xl,
  },
  textSection: {
    marginBottom: SPACING.xl * 1.5,
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: SPACING.sm,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.85)',
    lineHeight: 24,
    paddingRight: SPACING.xl,
  },
  actionSection: {
    gap: SPACING.md,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    paddingVertical: 18,
    borderRadius: SIZES.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xs,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  registerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingVertical: 16,
    borderRadius: SIZES.radiusLg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  registerButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 12,
    marginTop: SPACING.sm,
    fontWeight: '500',
  }
});
