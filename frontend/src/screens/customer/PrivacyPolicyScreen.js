import React, { useContext } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { ThemeContext } from '../../context/ThemeContext';
import { SPACING } from '../../styles/theme';

export default function PrivacyPolicyScreen() {
  const { theme } = useContext(ThemeContext);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Privacy Policy</Text>
        <Text style={[styles.date, { color: theme.textSecondary }]}>Last updated: June 2026</Text>
        
        <Text style={[styles.heading, { color: theme.text }]}>1. Information We Collect</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          We collect information you provide directly to us, such as when you create or modify your account, request on-demand services, contact customer support, or otherwise communicate with us.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>2. How We Use Information</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          We may use the information we collect to provide, maintain, and improve our services, including to process transactions, send related information, and verify your identity.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>3. Data Security</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          We take reasonable measures to help protect information about you from loss, theft, misuse and unauthorized access, disclosure, alteration and destruction.
        </Text>

        <Text style={[styles.heading, { color: theme.text }]}>4. Contact Us</Text>
        <Text style={[styles.paragraph, { color: theme.textSecondary }]}>
          If you have any questions about this Privacy Policy, please contact us at:{"\n"}
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
