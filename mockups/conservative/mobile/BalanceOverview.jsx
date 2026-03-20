/**
 * BalanceOverview — Mobile Balance Overview Screen
 *
 * Shows employee leave balances with visual progress indicators.
 * Accessible from bottom tab navigation.
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
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
  blue500: '#3b82f6',
  emerald500: '#10b981',
  violet500: '#8b5cf6',
  slate400: '#94a3b8',
};

const BALANCES = [
  {
    id: 'vacation',
    label: 'Vacation',
    emoji: '\u{1F334}',
    used: 7,
    pending: 5,
    total: 20,
    remaining: 13,
    color: COLORS.blue500,
  },
  {
    id: 'sick',
    label: 'Sick Leave',
    emoji: '\u{1F321}\u{FE0F}',
    used: 2,
    pending: 0,
    total: 10,
    remaining: 8,
    color: COLORS.emerald500,
  },
  {
    id: 'personal',
    label: 'Personal',
    emoji: '\u{1F464}',
    used: 1,
    pending: 0,
    total: 3,
    remaining: 2,
    color: COLORS.violet500,
  },
  {
    id: 'unpaid',
    label: 'Unpaid Leave',
    emoji: '\u{1F4C5}',
    used: 0,
    pending: 0,
    total: null, // unlimited
    remaining: null,
    color: COLORS.slate400,
  },
];

function BalanceCard({ balance }) {
  const usedPercent = balance.total ? (balance.used / balance.total) * 100 : 0;
  const pendingPercent = balance.total ? (balance.pending / balance.total) * 100 : 0;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={`${balance.label}: ${balance.remaining ?? 'unlimited'} ${balance.total ? `of ${balance.total}` : ''} days remaining`}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.cardEmoji}>{balance.emoji}</Text>
          <Text style={styles.cardTitle}>{balance.label}</Text>
        </View>
        <Text style={styles.cardRemaining}>
          {balance.remaining !== null ? balance.remaining : '\u221E'}
        </Text>
      </View>

      {balance.total && (
        <>
          <Text style={styles.cardSubtext}>of {balance.total} days</Text>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${usedPercent}%`, backgroundColor: balance.color },
              ]}
              accessibilityLabel={`${Math.round(usedPercent)}% used`}
            />
            {pendingPercent > 0 && (
              <View
                style={[
                  styles.progressPending,
                  {
                    width: `${pendingPercent}%`,
                    left: `${usedPercent}%`,
                    backgroundColor: balance.color,
                  },
                ]}
                accessibilityLabel={`${Math.round(pendingPercent)}% pending`}
              />
            )}
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: balance.color }]} />
              <Text style={styles.legendText}>{balance.used} used</Text>
            </View>
            {balance.pending > 0 && (
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: balance.color, opacity: 0.4 }]} />
                <Text style={styles.legendText}>{balance.pending} pending</Text>
              </View>
            )}
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.gray200 }]} />
              <Text style={styles.legendText}>{balance.remaining} available</Text>
            </View>
          </View>
        </>
      )}

      {!balance.total && (
        <Text style={styles.cardSubtext}>Unlimited - {balance.used} days used</Text>
      )}
    </View>
  );
}

/**
 * Loading state for the balance overview.
 */
function BalanceOverviewLoading() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Balance</Text>
      </View>
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary600} />
        <Text style={styles.loadingText}>Loading balances...</Text>
      </View>
    </SafeAreaView>
  );
}

/**
 * Error state for the balance overview.
 */
function BalanceOverviewError({ onRetry }) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Balance</Text>
      </View>
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>{'\u26A0\uFE0F'}</Text>
        <Text style={styles.errorTitle}>Unable to load balances</Text>
        <Text style={styles.errorMessage}>
          Please check your connection and try again.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel="Retry loading balances"
        >
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function BalanceOverview({ isLoading, error, onRetry }) {
  if (isLoading) return <BalanceOverviewLoading />;
  if (error) return <BalanceOverviewError onRetry={onRetry} />;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Balance</Text>
        <Text style={styles.headerSubtitle}>Fiscal year 2026</Text>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {BALANCES.map((b) => (
          <BalanceCard key={b.id} balance={b} />
        ))}

        {/* Upcoming holidays teaser */}
        <View style={styles.holidaySection}>
          <Text style={styles.sectionLabel}>Upcoming Holidays</Text>
          <View style={styles.holidayCard}>
            <View style={styles.holidayItem}>
              <Text style={styles.holidayDate}>Apr 18</Text>
              <Text style={styles.holidayName}>Good Friday</Text>
            </View>
            <View style={styles.holidayDivider} />
            <View style={styles.holidayItem}>
              <Text style={styles.holidayDate}>May 1</Text>
              <Text style={styles.holidayName}>Labour Day</Text>
            </View>
            <View style={styles.holidayDivider} />
            <View style={styles.holidayItem}>
              <Text style={styles.holidayDate}>May 25</Text>
              <Text style={styles.holidayName}>Memorial Day</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* FAB - New Request */}
      <TouchableOpacity
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="New leave request"
      >
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray50,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 2,
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  cardRemaining: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.gray900,
  },
  cardSubtext: {
    fontSize: 13,
    color: COLORS.gray500,
    textAlign: 'right',
    marginTop: -4,
  },
  progressTrack: {
    height: 8,
    backgroundColor: COLORS.gray100,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressPending: {
    height: 8,
    position: 'absolute',
    top: 0,
    opacity: 0.4,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: COLORS.gray500,
  },
  holidaySection: {
    marginTop: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  holidayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
  },
  holidayItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
    alignItems: 'center',
  },
  holidayDivider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginHorizontal: 16,
  },
  holidayDate: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
    width: 60,
  },
  holidayName: {
    fontSize: 14,
    color: COLORS.gray700,
    flex: 1,
    textAlign: 'right',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary600,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  fabIcon: {
    fontSize: 28,
    color: COLORS.white,
    lineHeight: 30,
  },
  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  // Error state
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray900,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: COLORS.gray500,
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: COLORS.primary600,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    minHeight: 44,
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
