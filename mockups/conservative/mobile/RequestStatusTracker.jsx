/**
 * RequestStatusTracker — Mobile Request Status Tracker
 *
 * "Package tracking" UX for leave request progress.
 * Shows the vertical stepper with completed, current, and upcoming steps.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';

const COLORS = {
  primary50: '#eff6ff',
  primary600: '#2563eb',
  primary700: '#1d4ed8',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  success100: '#dcfce7',
  success500: '#22c55e',
  success600: '#16a34a',
  success700: '#15803d',
  warning100: '#fef3c7',
  warning500: '#f59e0b',
  warning600: '#d97706',
  danger100: '#fee2e2',
  danger500: '#ef4444',
  danger600: '#dc2626',
};

const STEP_STATUS = {
  COMPLETED: 'completed',
  CURRENT: 'current',
  UPCOMING: 'upcoming',
  REJECTED: 'rejected',
};

function StepIcon({ status }) {
  const iconConfig = {
    [STEP_STATUS.COMPLETED]: {
      bg: COLORS.success500,
      text: '\u2713',
      textColor: COLORS.white,
    },
    [STEP_STATUS.CURRENT]: {
      bg: COLORS.warning500,
      text: '\u2022\u2022\u2022',
      textColor: COLORS.white,
    },
    [STEP_STATUS.UPCOMING]: {
      bg: COLORS.gray200,
      text: '',
      textColor: COLORS.gray400,
    },
    [STEP_STATUS.REJECTED]: {
      bg: COLORS.danger500,
      text: '\u2717',
      textColor: COLORS.white,
    },
  };

  const config = iconConfig[status];

  return (
    <View style={[styles.stepIcon, { backgroundColor: config.bg }]}>
      <Text style={[styles.stepIconText, { color: config.textColor }]}>{config.text}</Text>
    </View>
  );
}

function StepConnector({ status }) {
  return (
    <View
      style={[
        styles.connector,
        {
          backgroundColor:
            status === STEP_STATUS.COMPLETED ? COLORS.success500 : COLORS.gray200,
        },
      ]}
    />
  );
}

export default function RequestStatusTracker({ onClose }) {
  const request = {
    id: 'REQ-2026-0147',
    type: 'Vacation',
    dates: 'Mar 24 - Mar 28, 2026',
    days: 5,
    status: 'pending',
  };

  const steps = [
    {
      label: 'Request Submitted',
      description: 'Submitted via Slack',
      timestamp: 'Mar 13, 2026 at 14:05',
      status: STEP_STATUS.COMPLETED,
    },
    {
      label: 'Step 1: Direct Manager',
      description: 'Approved by Tom Park',
      timestamp: 'Mar 14, 2026 at 09:23',
      status: STEP_STATUS.COMPLETED,
    },
    {
      label: 'Step 2: HR Review',
      description: 'Awaiting Sarah Admin',
      timestamp: 'Waiting 3 days',
      status: STEP_STATUS.CURRENT,
    },
    {
      label: 'Approved',
      description: 'Calendar sync and notification',
      timestamp: '',
      status: STEP_STATUS.UPCOMING,
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Text style={styles.backText}>{'\u2190'} Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Status</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Request summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryRef}>{request.id}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>Pending</Text>
            </View>
          </View>
          <Text style={styles.summaryType}>{request.type}</Text>
          <Text style={styles.summaryDates}>{request.dates}</Text>
          <Text style={styles.summaryDays}>{request.days} working days</Text>
        </View>

        {/* Stepper */}
        <View style={styles.stepperContainer}>
          {steps.map((step, index) => (
            <View key={index}>
              <View style={styles.stepRow}>
                <View style={styles.stepIconColumn}>
                  <StepIcon status={step.status} />
                </View>
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepLabel,
                      step.status === STEP_STATUS.UPCOMING && styles.stepLabelUpcoming,
                    ]}
                  >
                    {step.label}
                  </Text>
                  <Text
                    style={[
                      styles.stepDescription,
                      step.status === STEP_STATUS.CURRENT && styles.stepDescriptionCurrent,
                    ]}
                  >
                    {step.description}
                  </Text>
                  {step.timestamp && (
                    <Text
                      style={[
                        styles.stepTimestamp,
                        step.status === STEP_STATUS.CURRENT && styles.stepTimestampCurrent,
                      ]}
                    >
                      {step.timestamp}
                    </Text>
                  )}
                </View>
              </View>
              {/* Connector between steps */}
              {index < steps.length - 1 && (
                <View style={styles.connectorContainer}>
                  <StepConnector status={step.status} />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Cancel button for pending requests */}
        <TouchableOpacity
          style={styles.cancelButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel this leave request"
        >
          <Text style={styles.cancelText}>Cancel Request</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  backButton: {
    width: 60,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary600,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 24,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryRef: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.gray400,
  },
  statusBadge: {
    backgroundColor: COLORS.warning100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.warning600,
  },
  summaryType: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  summaryDates: {
    fontSize: 14,
    color: COLORS.gray700,
    marginTop: 4,
  },
  summaryDays: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  // Stepper
  stepperContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  stepIconColumn: {
    width: 32,
    alignItems: 'center',
  },
  stepIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIconText: {
    fontSize: 14,
    fontWeight: '700',
  },
  stepContent: {
    flex: 1,
    marginLeft: 12,
    paddingBottom: 4,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  stepLabelUpcoming: {
    color: COLORS.gray400,
  },
  stepDescription: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 2,
  },
  stepDescriptionCurrent: {
    color: COLORS.warning600,
    fontWeight: '500',
  },
  stepTimestamp: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 2,
  },
  stepTimestampCurrent: {
    color: COLORS.warning600,
  },
  connectorContainer: {
    paddingLeft: 14, // center under the 28px icon
    paddingVertical: 0,
  },
  connector: {
    width: 2,
    height: 24,
    borderRadius: 1,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.danger500,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger600,
  },
});
