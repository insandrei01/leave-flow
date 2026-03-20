/**
 * RequestTimeline - Animated timeline showing request status
 *
 * Design: Vertical timeline with animated step indicators,
 * pulsing current step, expandable detail cards per step.
 * "Package tracking" metaphor adapted for mobile.
 *
 * Dependencies: react-native, react-native-reanimated
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  StatusBar,
} from 'react-native';

const COLORS = {
  primary50: '#EEF2FF',
  primary100: '#E0E7FF',
  primary200: '#C7D2FE',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary900: '#312E81',
  accent50: '#F0FDF4',
  accent100: '#DCFCE7',
  accent400: '#4ADE80',
  accent500: '#22C55E',
  accent600: '#16A34A',
  coral400: '#FB7185',
  coral500: '#F43F5E',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber700: '#B45309',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  surface: '#FAFBFF',
};

const STEPS = [
  {
    id: 'submitted',
    label: 'Request Submitted',
    description: 'You submitted a vacation request for Mar 18-24',
    status: 'completed',
    timestamp: 'Mar 13, 9:14 AM',
    duration: null,
  },
  {
    id: 'step1',
    label: 'Team Lead Review',
    description: 'David Chen approved your request',
    status: 'completed',
    timestamp: 'Mar 13, 11:32 AM',
    duration: '2h 18m',
    approver: { name: 'David Chen', initials: 'DC' },
  },
  {
    id: 'step2',
    label: 'Department Head Review',
    description: 'Awaiting Maria Santos',
    status: 'current',
    timestamp: null,
    duration: '72h elapsed',
    approver: { name: 'Maria Santos', initials: 'MS' },
    reminders: 2,
  },
  {
    id: 'step3',
    label: 'HR Final Review',
    description: 'Sarah Chen will review after previous steps',
    status: 'upcoming',
    timestamp: null,
    duration: null,
    approver: { name: 'Sarah Chen', initials: 'SC' },
  },
  {
    id: 'approved',
    label: 'Approved',
    description: 'Calendar sync and team notification',
    status: 'upcoming',
    timestamp: null,
    duration: null,
  },
];

const RequestTimeline = () => {
  const getStepStyle = (status) => {
    switch (status) {
      case 'completed':
        return {
          dot: { backgroundColor: COLORS.accent500 },
          line: { backgroundColor: COLORS.accent400 },
          label: { color: COLORS.gray900 },
        };
      case 'current':
        return {
          dot: { backgroundColor: COLORS.primary500 },
          line: { backgroundColor: COLORS.gray200 },
          label: { color: COLORS.primary700 },
        };
      case 'upcoming':
      default:
        return {
          dot: { backgroundColor: COLORS.gray200 },
          line: { backgroundColor: COLORS.gray200 },
          label: { color: COLORS.gray400 },
        };
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Text style={styles.backIcon}>{'<'}</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Request Status</Text>
          <Text style={styles.headerSubtitle}>REQ-2026-0342</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Request Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View>
              <Text style={styles.summaryType}>Vacation</Text>
              <Text style={styles.summaryDates}>Mar 18 - Mar 24, 2026</Text>
            </View>
            <View style={styles.summaryBadge}>
              <View style={styles.summaryPulse} />
              <Text style={styles.summaryBadgeText}>Step 2 of 3</Text>
            </View>
          </View>
          <Text style={styles.summaryDays}>5 working days</Text>

          {/* Progress bar */}
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          {STEPS.map((step, index) => {
            const stepStyle = getStepStyle(step.status);
            const isLast = index === STEPS.length - 1;

            return (
              <View key={step.id} style={styles.timelineStep}>
                {/* Dot and line */}
                <View style={styles.timelineLeft}>
                  <View
                    style={[
                      styles.timelineDot,
                      stepStyle.dot,
                      step.status === 'current' && styles.timelineDotCurrent,
                    ]}
                  >
                    {step.status === 'completed' && (
                      <Text style={styles.checkmark}>{'V'}</Text>
                    )}
                    {step.status === 'current' && (
                      <Text style={styles.stepNumber}>
                        {index}
                      </Text>
                    )}
                    {step.status === 'upcoming' && (
                      <Text style={styles.stepNumberGray}>
                        {index < STEPS.length - 1 ? index : ''}
                      </Text>
                    )}
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.timelineLine,
                        stepStyle.line,
                        step.status === 'completed' &&
                          STEPS[index + 1]?.status === 'current' && {
                            backgroundColor: COLORS.primary200,
                          },
                      ]}
                    />
                  )}
                </View>

                {/* Content */}
                <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
                  <View style={styles.timelineHeader}>
                    <Text style={[styles.timelineLabel, stepStyle.label]}>
                      {step.label}
                    </Text>
                    {step.timestamp && (
                      <Text style={styles.timelineTimestamp}>{step.timestamp}</Text>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.timelineDescription,
                      step.status === 'upcoming' && { color: COLORS.gray300 },
                    ]}
                  >
                    {step.description}
                  </Text>

                  {/* Approver card */}
                  {step.approver && step.status === 'completed' && (
                    <View style={styles.approverCard}>
                      <View style={styles.approverAvatar}>
                        <Text style={styles.approverAvatarText}>
                          {step.approver.initials}
                        </Text>
                      </View>
                      <Text style={styles.approverText}>
                        Approved in {step.duration}
                      </Text>
                    </View>
                  )}

                  {/* Current step with alerts */}
                  {step.status === 'current' && (
                    <View style={styles.currentCard}>
                      <View style={styles.currentHeader}>
                        <View style={styles.approverAvatar}>
                          <Text style={styles.approverAvatarText}>
                            {step.approver.initials}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.currentApproverName}>
                            {step.approver.name}
                          </Text>
                          <Text style={styles.currentElapsed}>
                            {step.duration}
                          </Text>
                        </View>
                      </View>
                      {step.reminders > 0 && (
                        <Text style={styles.reminderText}>
                          {step.reminders} reminders sent
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Bottom action */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.cancelButton}
          accessibilityRole="button"
          accessibilityLabel="Cancel this request"
        >
          <Text style={styles.cancelButtonText}>Cancel Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.gray50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 18, color: COLORS.gray700 },
  headerCenter: { alignItems: 'center' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  headerSubtitle: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  headerSpacer: { width: 40 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  summaryType: { fontSize: 18, fontWeight: '800', color: COLORS.gray900 },
  summaryDates: { fontSize: 13, color: COLORS.gray500, marginTop: 2 },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.amber50,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.amber100,
  },
  summaryPulse: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.amber500,
  },
  summaryBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.amber700 },
  summaryDays: { fontSize: 14, color: COLORS.gray400, marginBottom: 16 },
  progressBar: {
    height: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    width: '50%',
    height: '100%',
    backgroundColor: COLORS.primary500,
    borderRadius: 3,
  },

  // Timeline
  timeline: { paddingLeft: 4 },
  timelineStep: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 44 },
  timelineDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  timelineDotCurrent: {
    shadowColor: COLORS.primary500,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkmark: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
  stepNumber: { color: COLORS.white, fontSize: 13, fontWeight: '800' },
  stepNumberGray: { color: COLORS.gray400, fontSize: 13, fontWeight: '700' },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 24,
  },

  timelineContent: {
    flex: 1,
    paddingLeft: 16,
    paddingBottom: 32,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  timelineLabel: { fontSize: 15, fontWeight: '700' },
  timelineTimestamp: { fontSize: 11, color: COLORS.gray400 },
  timelineDescription: { fontSize: 13, color: COLORS.gray500, lineHeight: 18 },

  // Approver card (completed)
  approverCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    padding: 10,
    backgroundColor: COLORS.accent50,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.accent100,
  },
  approverAvatar: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approverAvatarText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  approverText: { fontSize: 12, color: COLORS.accent600, fontWeight: '500' },

  // Current step card
  currentCard: {
    marginTop: 10,
    padding: 14,
    backgroundColor: COLORS.amber50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.amber100,
  },
  currentHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currentApproverName: { fontSize: 13, fontWeight: '600', color: COLORS.gray900 },
  currentElapsed: { fontSize: 11, color: COLORS.coral500, fontWeight: '500', marginTop: 2 },
  reminderText: {
    fontSize: 11,
    color: COLORS.amber700,
    marginTop: 10,
    fontWeight: '500',
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 36,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.gray700,
  },
});

export default RequestTimeline;
