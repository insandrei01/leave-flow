/**
 * LeaveRequestForm — Mobile Leave Request Modal
 *
 * React Native component for requesting leave.
 * Renders as a bottom sheet / modal overlay.
 *
 * Design tokens reference the LeaveFlow design system.
 * Uses React Native core components + expo-router for navigation.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Platform,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';

const COLORS = {
  primary600: '#2563eb',
  primary700: '#1d4ed8',
  primary50: '#eff6ff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  danger600: '#dc2626',
  warning500: '#f59e0b',
};

const LEAVE_TYPES = [
  { id: 'vacation', label: 'Vacation', emoji: '\u{1F334}', balance: '13 of 20 days' },
  { id: 'sick', label: 'Sick Leave', emoji: '\u{1F321}\u{FE0F}', balance: '8 of 10 days' },
  { id: 'personal', label: 'Personal', emoji: '\u{1F464}', balance: '2 of 3 days' },
  { id: 'unpaid', label: 'Unpaid Leave', emoji: '\u{1F4C5}', balance: 'Unlimited' },
];

export default function LeaveRequestForm({ onClose, onSubmit }) {
  const [selectedType, setSelectedType] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [halfDay, setHalfDay] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // -- States --
  // Default: form visible
  // Loading: isSubmitting = true, overlay with spinner
  // Error: validation errors shown inline
  // Empty: n/a (always shows form)

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit({ selectedType, startDate, endDate, halfDay, reason });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onClose}
          accessibilityLabel="Close form"
          accessibilityRole="button"
          style={styles.closeButton}
        >
          <Text style={styles.closeText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Request</Text>
        <View style={styles.closeButton} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Leave Type Selection */}
        <Text style={styles.sectionLabel}>Leave Type</Text>
        <View style={styles.typeGrid}>
          {LEAVE_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeCard,
                selectedType === type.id && styles.typeCardSelected,
              ]}
              onPress={() => setSelectedType(type.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selectedType === type.id }}
              accessibilityLabel={`${type.label}, ${type.balance}`}
            >
              <Text style={styles.typeEmoji}>{type.emoji}</Text>
              <Text style={styles.typeLabel}>{type.label}</Text>
              <Text style={styles.typeBalance}>{type.balance}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Date Pickers */}
        <Text style={styles.sectionLabel}>Dates</Text>
        <View style={styles.dateRow}>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>Start Date</Text>
            {/* In real app: DateTimePicker from @react-native-community */}
            <TouchableOpacity
              style={styles.dateInput}
              accessibilityLabel="Select start date"
              accessibilityRole="button"
            >
              <Text style={startDate ? styles.dateValue : styles.datePlaceholder}>
                {startDate || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
          <View style={styles.dateField}>
            <Text style={styles.fieldLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              accessibilityLabel="Select end date"
              accessibilityRole="button"
            >
              <Text style={endDate ? styles.dateValue : styles.datePlaceholder}>
                {endDate || 'Select date'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Half Day Toggle */}
        <View style={styles.toggleRow}>
          <View>
            <Text style={styles.fieldLabel}>Half Day</Text>
            <Text style={styles.fieldHint}>Request only half a day</Text>
          </View>
          <Switch
            value={halfDay}
            onValueChange={setHalfDay}
            trackColor={{ false: COLORS.gray200, true: COLORS.primary600 }}
            thumbColor={COLORS.white}
            accessibilityLabel="Toggle half day"
          />
        </View>

        {/* Working Days Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryLabel}>Working Days</Text>
          <Text style={styles.summaryValue}>5 days</Text>
        </View>

        {/* Reason */}
        <Text style={styles.sectionLabel}>Reason (optional)</Text>
        <TextInput
          style={styles.reasonInput}
          placeholder="Add a note for your manager..."
          placeholderTextColor={COLORS.gray400}
          multiline
          numberOfLines={3}
          value={reason}
          onChangeText={setReason}
          accessibilityLabel="Leave reason"
          textAlignVertical="top"
        />
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            (!selectedType || isSubmitting) && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!selectedType || isSubmitting}
          accessibilityRole="button"
          accessibilityLabel="Submit leave request"
          accessibilityState={{ disabled: !selectedType || isSubmitting }}
        >
          {isSubmitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.submitText}>Submit Request</Text>
          )}
        </TouchableOpacity>
      </View>
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
  closeButton: {
    width: 60,
  },
  closeText: {
    fontSize: 16,
    color: COLORS.primary600,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeCard: {
    width: '48%',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    // 44px minimum touch target satisfied by card size
    minHeight: 80,
    justifyContent: 'center',
  },
  typeCardSelected: {
    borderColor: COLORS.primary600,
    borderWidth: 2,
    backgroundColor: COLORS.primary50,
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  typeBalance: {
    fontSize: 12,
    color: COLORS.gray500,
    marginTop: 2,
  },
  dateRow: {
    flexDirection: 'row',
    gap: 12,
  },
  dateField: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray700,
    marginBottom: 4,
  },
  fieldHint: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  dateInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 44, // WCAG touch target
  },
  dateValue: {
    fontSize: 14,
    color: COLORS.gray900,
  },
  datePlaceholder: {
    fontSize: 14,
    color: COLORS.gray400,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    backgroundColor: COLORS.white,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  summaryBox: {
    marginTop: 16,
    backgroundColor: COLORS.primary50,
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary700,
  },
  reasonInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.gray900,
    minHeight: 80,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray200,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    backgroundColor: COLORS.primary600,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48, // Touch target
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.gray300,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
});
