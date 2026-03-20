/**
 * LeaveRequestForm - Mobile leave request with gesture-based date selection
 *
 * Design: Card-based form with visual date range picker,
 * balance indicator at top, smooth transitions between fields.
 *
 * Dependencies: react-native, react-native-gesture-handler,
 * react-native-reanimated, @react-navigation/native
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  StatusBar,
  SafeAreaView,
} from 'react-native';

// Design tokens matching web design system
const COLORS = {
  primary50: '#EEF2FF',
  primary100: '#E0E7FF',
  primary400: '#818CF8',
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary900: '#312E81',
  accent50: '#F0FDF4',
  accent400: '#4ADE80',
  accent500: '#22C55E',
  coral400: '#FB7185',
  amber400: '#FBBF24',
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#FFFFFF',
  surface: '#FAFBFF',
};

const LEAVE_TYPES = [
  { id: 'vacation', label: 'Vacation', color: COLORS.primary500, remaining: 15, total: 25 },
  { id: 'sick', label: 'Sick Leave', color: COLORS.coral400, remaining: 9, total: 10 },
  { id: 'personal', label: 'Personal', color: COLORS.amber400, remaining: 3, total: 5 },
];

const LeaveRequestForm = () => {
  const [selectedType, setSelectedType] = useState('vacation');
  const [startDate, setStartDate] = useState('Mar 18, 2026');
  const [endDate, setEndDate] = useState('Mar 24, 2026');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');

  const selectedLeaveType = LEAVE_TYPES.find((t) => t.id === selectedType);

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
        <Text style={styles.headerTitle}>Request Leave</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <View style={styles.balanceHeader}>
            <View style={[styles.balanceDot, { backgroundColor: selectedLeaveType.color }]} />
            <Text style={styles.balanceLabel}>{selectedLeaveType.label} Balance</Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceNumber}>{selectedLeaveType.remaining}</Text>
            <Text style={styles.balanceTotal}>/ {selectedLeaveType.total} days</Text>
          </View>
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${(selectedLeaveType.remaining / selectedLeaveType.total) * 100}%`,
                  backgroundColor: selectedLeaveType.color,
                },
              ]}
            />
          </View>
        </View>

        {/* Leave Type Selection */}
        <Text style={styles.sectionLabel}>Leave Type</Text>
        <View style={styles.typeRow}>
          {LEAVE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                selectedType === type.id && {
                  backgroundColor: COLORS.primary50,
                  borderColor: COLORS.primary400,
                },
              ]}
              onPress={() => setSelectedType(type.id)}
              accessibilityRole="radio"
              accessibilityState={{ selected: selectedType === type.id }}
              accessibilityLabel={`${type.label}, ${type.remaining} days remaining`}
            >
              <View style={[styles.typeDot, { backgroundColor: type.color }]} />
              <Text
                style={[
                  styles.typeLabel,
                  selectedType === type.id && { color: COLORS.primary700 },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Selection (gesture-based swipe calendar concept) */}
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.dateCard}>
          <View style={styles.dateRow}>
            <TouchableOpacity
              style={styles.dateField}
              accessibilityLabel={`Start date: ${startDate}`}
              accessibilityRole="button"
              accessibilityHint="Tap to open date picker"
            >
              <Text style={styles.dateFieldLabel}>Start</Text>
              <Text style={styles.dateFieldValue}>{startDate}</Text>
            </TouchableOpacity>

            <View style={styles.dateArrow}>
              <Text style={styles.dateArrowText}>{'-->'}</Text>
            </View>

            <TouchableOpacity
              style={styles.dateField}
              accessibilityLabel={`End date: ${endDate}`}
              accessibilityRole="button"
              accessibilityHint="Tap to open date picker"
            >
              <Text style={styles.dateFieldLabel}>End</Text>
              <Text style={styles.dateFieldValue}>{endDate}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>5 working days</Text>
          </View>

          {/* Swipe hint for gesture-based date selection */}
          <Text style={styles.swipeHint}>
            Swipe left/right on calendar to select date range
          </Text>

          {/* Mini calendar preview (static representation) */}
          <View style={styles.miniCalendar}>
            <View style={styles.calendarHeader}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                <Text key={i} style={styles.calendarDayLabel}>
                  {d}
                </Text>
              ))}
            </View>
            <View style={styles.calendarRow}>
              {[16, 17, 18, 19, 20, 21, 22].map((d) => (
                <View
                  key={d}
                  style={[
                    styles.calendarDay,
                    d >= 18 && d <= 20 && styles.calendarDaySelected,
                    d === 18 && styles.calendarDayStart,
                    d === 20 && styles.calendarDayEnd,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      d >= 18 && d <= 20 && styles.calendarDayTextSelected,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.calendarRow}>
              {[23, 24, 25, 26, 27, 28, 29].map((d) => (
                <View
                  key={d}
                  style={[
                    styles.calendarDay,
                    d >= 23 && d <= 24 && styles.calendarDaySelected,
                    d === 24 && styles.calendarDayEnd,
                  ]}
                >
                  <Text
                    style={[
                      styles.calendarDayText,
                      d >= 23 && d <= 24 && styles.calendarDayTextSelected,
                    ]}
                  >
                    {d}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Half-day toggle */}
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setHalfDay(!halfDay)}
          accessibilityRole="switch"
          accessibilityState={{ checked: halfDay }}
          accessibilityLabel="Half-day option"
        >
          <Text style={styles.toggleLabel}>Half-day (first or last day)</Text>
          <View style={[styles.toggle, halfDay && styles.toggleActive]}>
            <View
              style={[styles.toggleThumb, halfDay && styles.toggleThumbActive]}
            />
          </View>
        </TouchableOpacity>

        {/* Reason */}
        <Text style={styles.sectionLabel}>Reason (optional)</Text>
        <TextInput
          style={styles.textArea}
          multiline
          numberOfLines={3}
          placeholder="Add a note for your manager..."
          placeholderTextColor={COLORS.gray400}
          value={reason}
          onChangeText={setReason}
          accessibilityLabel="Reason for leave"
        />

        {/* Approval Chain Preview */}
        <View style={styles.chainCard}>
          <Text style={styles.chainTitle}>Approval Chain</Text>
          <View style={styles.chainSteps}>
            <View style={styles.chainStep}>
              <View style={[styles.chainDot, { backgroundColor: COLORS.primary500 }]} />
              <Text style={styles.chainStepText}>David Chen (Team Lead)</Text>
            </View>
            <View style={styles.chainLine} />
            <View style={styles.chainStep}>
              <View style={[styles.chainDot, { backgroundColor: COLORS.primary400 }]} />
              <Text style={styles.chainStepText}>Maria Santos (Dept Head)</Text>
            </View>
            <View style={styles.chainLine} />
            <View style={styles.chainStep}>
              <View style={[styles.chainDot, { backgroundColor: COLORS.primary300 }]} />
              <Text style={styles.chainStepText}>Sarah Chen (HR)</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          accessibilityRole="button"
          accessibilityLabel="Submit leave request"
        >
          <Text style={styles.submitButtonText}>Submit Request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
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
  headerTitle: { fontSize: 17, fontWeight: '700', color: COLORS.gray900 },
  headerSpacer: { width: 40 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 100 },

  // Balance card
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  balanceDot: { width: 10, height: 10, borderRadius: 5 },
  balanceLabel: { fontSize: 13, color: COLORS.gray500, fontWeight: '500' },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 12 },
  balanceNumber: { fontSize: 36, fontWeight: '800', color: COLORS.gray900 },
  balanceTotal: { fontSize: 14, color: COLORS.gray400 },
  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  // Section label
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 4,
  },

  // Leave type chips
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.gray200,
  },
  typeDot: { width: 8, height: 8, borderRadius: 4 },
  typeLabel: { fontSize: 12, fontWeight: '600', color: COLORS.gray700 },

  // Date card
  dateCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dateField: {
    flex: 1,
    padding: 14,
    backgroundColor: COLORS.gray50,
    borderRadius: 14,
  },
  dateFieldLabel: { fontSize: 11, color: COLORS.gray400, fontWeight: '500', marginBottom: 4 },
  dateFieldValue: { fontSize: 15, fontWeight: '600', color: COLORS.gray900 },
  dateArrow: { width: 32 },
  dateArrowText: { fontSize: 14, color: COLORS.gray400, textAlign: 'center' },
  durationBadge: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: COLORS.primary50,
    borderRadius: 20,
  },
  durationText: { fontSize: 13, fontWeight: '600', color: COLORS.primary700 },
  swipeHint: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.gray400,
    marginTop: 8,
  },

  // Mini calendar
  miniCalendar: { marginTop: 16 },
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  calendarDayLabel: { fontSize: 11, color: COLORS.gray400, fontWeight: '600', width: 36, textAlign: 'center' },
  calendarRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 4 },
  calendarDay: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDaySelected: { backgroundColor: COLORS.primary100 },
  calendarDayStart: {
    backgroundColor: COLORS.primary500,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
  },
  calendarDayEnd: {
    backgroundColor: COLORS.primary500,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
  },
  calendarDayText: { fontSize: 13, color: COLORS.gray700, fontWeight: '500' },
  calendarDayTextSelected: { color: COLORS.white, fontWeight: '700' },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    marginBottom: 20,
  },
  toggleLabel: { fontSize: 14, color: COLORS.gray700, fontWeight: '500' },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.gray200,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleActive: { backgroundColor: COLORS.primary500 },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.white,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  // Text area
  textArea: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    fontSize: 14,
    color: COLORS.gray900,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 20,
  },

  // Approval chain
  chainCard: {
    backgroundColor: COLORS.primary50,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.primary100,
  },
  chainTitle: { fontSize: 13, fontWeight: '600', color: COLORS.primary700, marginBottom: 16 },
  chainSteps: {},
  chainStep: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  chainDot: { width: 10, height: 10, borderRadius: 5 },
  chainStepText: { fontSize: 13, color: COLORS.primary900, fontWeight: '500' },
  chainLine: {
    width: 1,
    height: 16,
    backgroundColor: COLORS.primary200,
    marginLeft: 4.5,
    marginVertical: 2,
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
  submitButton: {
    backgroundColor: COLORS.primary500,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: COLORS.primary500,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LeaveRequestForm;
