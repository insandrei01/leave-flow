/**
 * LeaveFlow Mobile — Leave Request Screen (Experimental)
 *
 * AI-assisted leave request with smart suggestions.
 * Uses spring animations, glassmorphic cards, and haptic feedback patterns.
 *
 * Stack: React Native / Expo with Reanimated 3
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// -- Design Tokens --
const COLORS = {
  surface: '#0A0E1A',
  surfaceRaised: '#111827',
  surfaceOverlay: '#1F2937',
  glass: 'rgba(255, 255, 255, 0.04)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  accentIndigo: '#818CF8',
  accentViolet: '#A78BFA',
  accentEmerald: '#34D399',
  accentAmber: '#FBBF24',
  accentRose: '#FB7185',
  accentCyan: '#22D3EE',
  textPrimary: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',
};

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

// -- AI Suggestion Banner --
const AISuggestionBanner = ({ suggestion, onApply, onDismiss }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.97, SPRING_CONFIG);
    setTimeout(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
      onApply();
    }, 150);
  }, [onApply, scale]);

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify()}
      style={animatedStyle}
    >
      <Pressable onPress={handlePress} accessibilityRole="button">
        <LinearGradient
          colors={['rgba(129,140,248,0.12)', 'rgba(167,139,250,0.08)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.suggestionCard}
        >
          <View style={styles.suggestionHeader}>
            <View style={styles.aiBadge}>
              <Text style={styles.aiBadgeText}>AI Suggestion</Text>
            </View>
            <Pressable
              onPress={onDismiss}
              accessibilityLabel="Dismiss suggestion"
              hitSlop={12}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
          <Text style={styles.suggestionText}>{suggestion}</Text>
          <Text style={styles.suggestionAction}>Tap to apply</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// -- Leave Type Selector --
const LeaveTypeCard = ({ type, isSelected, onSelect }) => {
  const scale = useSharedValue(1);
  const borderOpacity = useSharedValue(isSelected ? 0.3 : 0.06);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    borderColor: `rgba(129, 140, 248, ${borderOpacity.value})`,
    backgroundColor: isSelected
      ? 'rgba(129, 140, 248, 0.08)'
      : COLORS.glass,
  }));

  const handlePress = useCallback(() => {
    Haptics.selectionAsync();
    scale.value = withSpring(0.95, SPRING_CONFIG);
    setTimeout(() => {
      scale.value = withSpring(1, SPRING_CONFIG);
    }, 100);
    onSelect(type);
  }, [type, onSelect, scale]);

  return (
    <Animated.View style={[styles.leaveTypeCard, animatedStyle]}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="radio"
        accessibilityState={{ checked: isSelected }}
        accessibilityLabel={`${type.name}, ${type.balance} days remaining`}
        style={styles.leaveTypeInner}
      >
        <View style={[styles.leaveTypeIcon, { backgroundColor: type.color + '20' }]}>
          <Text style={[styles.leaveTypeEmoji, { color: type.color }]}>
            {type.icon}
          </Text>
        </View>
        <View style={styles.leaveTypeInfo}>
          <Text style={styles.leaveTypeName}>{type.name}</Text>
          <Text style={styles.leaveTypeBalance}>
            <Text style={{ color: type.color, fontFamily: 'JetBrains Mono' }}>
              {type.balance}
            </Text>
            {' '}days left
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmark}>
            <Text style={styles.checkmarkText}>Selected</Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// -- Date Range Display --
const DateRangeDisplay = ({ startDate, endDate, workingDays }) => (
  <View style={styles.dateRangeContainer}>
    <View style={styles.dateBox}>
      <Text style={styles.dateLabel}>FROM</Text>
      <Text style={styles.dateValue}>{startDate}</Text>
    </View>
    <View style={styles.dateConnector}>
      <View style={styles.dateConnectorLine} />
      <View style={styles.workingDaysBadge}>
        <Text style={styles.workingDaysText}>
          {workingDays} days
        </Text>
      </View>
      <View style={styles.dateConnectorLine} />
    </View>
    <View style={styles.dateBox}>
      <Text style={styles.dateLabel}>TO</Text>
      <Text style={styles.dateValue}>{endDate}</Text>
    </View>
  </View>
);

// -- Main Screen --
const LeaveRequestScreen = () => {
  const [selectedType, setSelectedType] = useState('vacation');

  const leaveTypes = [
    { id: 'vacation', name: 'Vacation', balance: 15, color: COLORS.accentIndigo, icon: 'V' },
    { id: 'sick', name: 'Sick Leave', balance: 9, color: COLORS.accentEmerald, icon: 'S' },
    { id: 'personal', name: 'Personal', balance: 2, color: COLORS.accentViolet, icon: 'P' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.surface, '#0D1224']}
        style={StyleSheet.absoluteFill}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInUp.duration(300)}>
          <Text style={styles.screenTitle}>Request Leave</Text>
          <Text style={styles.screenSubtitle}>
            Choose a type and pick your dates
          </Text>
        </Animated.View>

        {/* AI Suggestion */}
        <AISuggestionBanner
          suggestion="Bridge Mar 27 (holiday) with Mar 25-26 for a 5-day break using only 2 PTO days"
          onApply={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }}
          onDismiss={() => {}}
        />

        {/* Leave Type Selection */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Leave Type</Text>
          {leaveTypes.map((type, index) => (
            <Animated.View
              key={type.id}
              entering={SlideInRight.delay(index * 80).springify()}
            >
              <LeaveTypeCard
                type={type}
                isSelected={selectedType === type.id}
                onSelect={(t) => setSelectedType(t.id)}
              />
            </Animated.View>
          ))}
        </View>

        {/* Date Range */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Dates</Text>
          <DateRangeDisplay
            startDate="Mar 25"
            endDate="Mar 27"
            workingDays={3}
          />
        </View>

        {/* Half-day Toggle */}
        <View style={[styles.glassCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
          <View>
            <Text style={styles.toggleLabel}>Half-day option</Text>
            <Text style={styles.toggleDescription}>
              Take half of start or end day
            </Text>
          </View>
          <View style={styles.toggleTrack}>
            <View style={styles.toggleThumb} />
          </View>
        </View>

        {/* Reason */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Reason (optional)</Text>
          <View style={styles.textAreaContainer}>
            <Text style={styles.textAreaPlaceholder}>
              Family visiting from out of town
            </Text>
          </View>
        </View>

        {/* Impact Preview */}
        <View style={[styles.glassCard, { borderLeftWidth: 3, borderLeftColor: COLORS.accentEmerald }]}>
          <Text style={styles.impactTitle}>Impact Check</Text>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Balance after</Text>
            <Text style={styles.impactValue}>12 / 20 days</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Team coverage</Text>
            <Text style={[styles.impactValue, { color: COLORS.accentEmerald }]}>92% OK</Text>
          </View>
          <View style={styles.impactRow}>
            <Text style={styles.impactLabel}>Holiday overlap</Text>
            <Text style={styles.impactValue}>None</Text>
          </View>
        </View>

        {/* Submit Button */}
        <Animated.View entering={FadeInDown.delay(400).springify()}>
          <Pressable
            style={styles.submitButton}
            accessibilityRole="button"
            accessibilityLabel="Submit leave request for 3 days vacation"
          >
            <LinearGradient
              colors={[COLORS.accentIndigo, COLORS.accentViolet]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitGradient}
            >
              <Text style={styles.submitText}>Submit Request</Text>
              <Text style={styles.submitSubtext}>3 days PTO &middot; Mar 25-27</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.surface,
  },
  scrollContent: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
    gap: 20,
  },
  screenTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  // AI Suggestion
  suggestionCard: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.15)',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  aiBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.accentIndigo,
    fontWeight: '500',
  },
  dismissText: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: COLORS.textTertiary,
  },
  suggestionText: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  suggestionAction: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.accentIndigo,
    marginTop: 8,
  },
  // Leave Types
  sectionContainer: {
    gap: 10,
  },
  sectionTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  leaveTypeCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  leaveTypeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    minHeight: 56,
  },
  leaveTypeIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaveTypeEmoji: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '700',
  },
  leaveTypeInfo: {
    flex: 1,
  },
  leaveTypeName: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  leaveTypeBalance: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  checkmark: {
    backgroundColor: 'rgba(129, 140, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  checkmarkText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.accentIndigo,
  },
  // Date Range
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  dateBox: {
    flex: 1,
    backgroundColor: COLORS.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 16,
    alignItems: 'center',
  },
  dateLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.textTertiary,
    letterSpacing: 1.5,
  },
  dateValue: {
    fontFamily: 'Space Grotesk',
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  dateConnector: {
    width: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  dateConnectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
  },
  workingDaysBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  workingDaysText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.accentIndigo,
  },
  // Glass card
  glassCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 16,
  },
  // Toggle
  toggleLabel: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  toggleDescription: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.textSecondary,
  },
  // Text area
  textAreaContainer: {
    backgroundColor: COLORS.glass,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 14,
    minHeight: 80,
  },
  textAreaPlaceholder: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    color: COLORS.textPrimary,
    fontStyle: 'italic',
  },
  // Impact
  impactTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.accentEmerald,
    marginBottom: 10,
  },
  impactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  impactLabel: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  impactValue: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  // Submit
  submitButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 8,
  },
  submitGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  submitText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  submitSubtext: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
});

export default LeaveRequestScreen;