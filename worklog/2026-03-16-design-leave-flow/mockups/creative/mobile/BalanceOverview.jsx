/**
 * BalanceOverview - Animated progress rings showing leave balances
 *
 * Design: Full-screen card with animated SVG progress rings,
 * color-coded per leave type, tap to expand details.
 *
 * Dependencies: react-native, react-native-svg, react-native-reanimated
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

const BALANCES = [
  {
    id: 'vacation',
    label: 'Vacation',
    remaining: 15,
    total: 25,
    used: 10,
    pending: 5,
    color: COLORS.primary500,
    trackColor: COLORS.primary100,
    accrual: 'Front-loaded',
    carryover: '3 days (expires Jun 30)',
  },
  {
    id: 'sick',
    label: 'Sick Leave',
    remaining: 9,
    total: 10,
    used: 1,
    pending: 0,
    color: COLORS.coral400,
    trackColor: '#FFE4E6',
    accrual: 'Front-loaded',
    carryover: 'No carryover',
  },
  {
    id: 'personal',
    label: 'Personal',
    remaining: 3,
    total: 5,
    used: 2,
    pending: 0,
    color: COLORS.amber400,
    trackColor: '#FEF3C7',
    accrual: 'Monthly (0.42/month)',
    carryover: 'No carryover',
  },
];

const BalanceOverview = () => {
  const totalRemaining = BALANCES.reduce((sum, b) => sum + b.remaining, 0);
  const totalDays = BALANCES.reduce((sum, b) => sum + b.total, 0);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Balances</Text>
        <Text style={styles.headerSubtitle}>Leave Year: Jan - Dec 2026</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card with large ring */}
        <View style={styles.summaryCard}>
          {/* Placeholder for animated SVG ring -- in production use react-native-svg */}
          <View style={styles.ringContainer}>
            <View style={styles.ringOuter}>
              {/* Ring segments would be rendered via SVG in production */}
              <View style={styles.ringCenter}>
                <Text style={styles.ringNumber}>{totalRemaining}</Text>
                <Text style={styles.ringLabel}>of {totalDays} days</Text>
                <Text style={styles.ringSubLabel}>remaining</Text>
              </View>
            </View>
          </View>

          {/* Mini legend below ring */}
          <View style={styles.legendRow}>
            {BALANCES.map((b) => (
              <View key={b.id} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: b.color }]} />
                <Text style={styles.legendText}>{b.remaining}</Text>
                <Text style={styles.legendLabel}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Individual Balance Cards */}
        {BALANCES.map((balance) => {
          const percentage = (balance.remaining / balance.total) * 100;
          return (
            <TouchableOpacity
              key={balance.id}
              style={styles.balanceCard}
              accessibilityRole="button"
              accessibilityLabel={`${balance.label}: ${balance.remaining} of ${balance.total} days remaining`}
            >
              <View style={styles.balanceHeader}>
                <View style={styles.balanceLeft}>
                  {/* Small progress ring */}
                  <View
                    style={[
                      styles.smallRing,
                      { borderColor: balance.trackColor },
                    ]}
                  >
                    <Text style={[styles.smallRingText, { color: balance.color }]}>
                      {balance.remaining}
                    </Text>
                  </View>
                  <View>
                    <Text style={styles.balanceTitle}>{balance.label}</Text>
                    <Text style={styles.balanceSubtitle}>
                      {balance.remaining} of {balance.total} days
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.percentBadge,
                    {
                      backgroundColor:
                        percentage > 50
                          ? '#F0FDF4'
                          : percentage > 25
                            ? '#FFFBEB'
                            : '#FEF2F2',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.percentText,
                      {
                        color:
                          percentage > 50
                            ? '#16A34A'
                            : percentage > 25
                              ? '#D97706'
                              : '#DC2626',
                      },
                    ]}
                  >
                    {Math.round(percentage)}%
                  </Text>
                </View>
              </View>

              {/* Progress bar */}
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressUsed,
                    {
                      width: `${((balance.used) / balance.total) * 100}%`,
                      backgroundColor: balance.color,
                      opacity: 0.3,
                    },
                  ]}
                />
                {balance.pending > 0 && (
                  <View
                    style={[
                      styles.progressPending,
                      {
                        width: `${(balance.pending / balance.total) * 100}%`,
                        left: `${(balance.used / balance.total) * 100}%`,
                        backgroundColor: balance.color,
                        opacity: 0.15,
                      },
                    ]}
                  />
                )}
              </View>

              {/* Details row */}
              <View style={styles.detailsRow}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Used</Text>
                  <Text style={styles.detailValue}>{balance.used} days</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Pending</Text>
                  <Text style={styles.detailValue}>{balance.pending} days</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Accrual</Text>
                  <Text style={styles.detailValue}>{balance.accrual}</Text>
                </View>
              </View>

              {/* Carryover info */}
              <View style={styles.carryoverRow}>
                <Text style={styles.carryoverText}>{balance.carryover}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  headerSubtitle: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // Summary
  summaryCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    alignItems: 'center',
  },
  ringContainer: { marginBottom: 20 },
  ringOuter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 10,
    borderColor: COLORS.primary100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringCenter: { alignItems: 'center' },
  ringNumber: { fontSize: 40, fontWeight: '800', color: COLORS.gray900 },
  ringLabel: { fontSize: 13, color: COLORS.gray400 },
  ringSubLabel: { fontSize: 11, color: COLORS.gray400, marginTop: 2 },
  legendRow: { flexDirection: 'row', gap: 20 },
  legendItem: { alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 18, fontWeight: '700', color: COLORS.gray900 },
  legendLabel: { fontSize: 11, color: COLORS.gray500 },

  // Balance cards
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  balanceLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallRingText: { fontSize: 14, fontWeight: '800' },
  balanceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.gray900 },
  balanceSubtitle: { fontSize: 12, color: COLORS.gray400, marginTop: 2 },
  percentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  percentText: { fontSize: 12, fontWeight: '700' },

  progressTrack: {
    height: 6,
    backgroundColor: COLORS.gray100,
    borderRadius: 3,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  progressUsed: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
  },
  progressPending: {
    position: 'absolute',
    height: '100%',
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailItem: {},
  detailLabel: { fontSize: 10, color: COLORS.gray400, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 13, color: COLORS.gray700, fontWeight: '600', marginTop: 2 },

  carryoverRow: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  carryoverText: { fontSize: 12, color: COLORS.gray500 },
});

export default BalanceOverview;
