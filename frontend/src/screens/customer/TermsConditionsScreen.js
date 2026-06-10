import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';
import { SPACING } from '../../styles/theme';

export default function TermsConditionsScreen() {
  const { theme } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Terms & Conditions</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>Last updated: June 2026</Text>
        
        <Text style={[styles.heading, { color: theme.text }]}>1. Agreement to Terms</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          By accessing or using our application, you agree to be bound by these Terms and Conditions and all applicable laws and regulations.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>2. User Accounts</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          When you create an account with us, you must provide us with information that is accurate, complete, and current at all times.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>3. Purchases and Payments</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          We accept various forms of payment. You agree to provide current, complete, and accurate purchase and account information for all purchases made via the application.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>4. Delivery</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          Delivery times are estimates and cannot be guaranteed. We are not responsible for any delays in delivery.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>5. Contact Information</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          Questions about the Terms and Conditions should be sent to us at:{"\n"}
          Email: sky053200@gmail.com{"\n"}
          Phone: +91 8252490197
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  date: {
    fontSize: 14,
    marginBottom: SPACING.xl,
  },
  heading: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
  }
});
