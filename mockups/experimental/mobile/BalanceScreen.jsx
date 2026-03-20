/**
 * LeaveFlow Mobile — Balance Screen (Experimental)
 *
 * Creative data visualization for leave balances.
 * Uses animated radial charts, spring physics, and creative number displays.
 *
 * Stack: React Native / Expo with Reanimated 3 + Skia
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withDelay,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Canvas, Circle, Path, Skia, SweepGradient, vec } from '@shopify/react-native-skia';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  surface: '#0A0E1A',
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

// -- Animated Ring Chart (Skia) --
const BalanceRing = ({ percentage, color, size = 140, strokeWidth = 12 }) => {
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Create arc path for the filled portion
  const endAngle = (percentage / 100) * 360;

  return (
    <Canvas style={{ width: size, height: size }}>
      {/* Background ring */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        style="stroke"
        strokeWidth={strokeWidth}
        color="rgba(255,255,255,0.04)"
      />
      {/* Filled arc - using sweep gradient for smooth color */}
      <Circle
        cx={center}
        cy={center}
        r={radius}
        style="stroke"
        strokeWidth={strokeWidth}
        strokeCap="round"
        color={color}
        opacity={0.8}
        // The arc is controlled by start/end via a clip or path
        // Simplified: full circle with opacity representing the percentage
      >
        <SweepGradient
          c={vec(center, center)}
          colors={[color, color, 'transparent']}
          positions={[0, percentage / 100, percentage / 100]}
        />
      </Circle>
    </Canvas>
  );
};

// -- Balance Card --
const BalanceCard = ({ type, used, total, color, index }) => {
  const remaining = total - used;
  const percentage = Math.round((remaining / total) * 100);
  const isLow = percentage < 40;

  return (
    <Animated.View entering={FadeInDown.delay(index * 120).springify()}>
      <View style={styles.balanceCard}>
        <LinearGradient
          colors={[color + '08', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.balanceCardHeader}>
          <View style={[styles.balanceIcon, { backgroundColor: color + '15' }]}>
            <Text style={[styles.balanceIconText, { color }]}>{type[0]}</Text>
          </View>
          <Text style={styles.balanceTypeName}>{type}</Text>
        </View>

        {/* Large number display */}
        <View style={styles.balanceNumberRow}>
          <Text style={[styles.balanceNumber, { color }]}>{remaining}</Text>
          <Text style={styles.balanceOf}>/ {total}</Text>
          <Text style={styles.balanceDays}>days</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: `${percentage}%`,
                backgroundColor: isLow ? COLORS.accentAmber : color,
              },
            ]}
          />
        </View>

        {/* Usage info */}
        <View style={styles.balanceFooter}>
          <Text style={styles.balanceFooterText}>
            {used} used &middot; {percentage}% remaining
          </Text>
          {isLow && (
            <View style={styles.lowBadge}>
              <Text style={styles.lowBadgeText}>Low</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// -- Monthly Usage Sparkline --
const MonthlySparkline = ({ data, color }) => (
  <View style={styles.sparklineContainer}>
    <Text style={styles.sparklineTitle}>Monthly Usage</Text>
    <View style={styles.sparklineBars}>
      {data.map((value, index) => (
        <Animated.View
          key={index}
          entering={FadeInDown.delay(index * 60).springify()}
          style={styles.sparklineBarContainer}
        >
          <View
            style={[
              styles.sparklineBar,
              {
                height: `${(value / Math.max(...data)) * 100}%`,
                backgroundColor: index === data.length - 1 ? color : color + '40',
              },
            ]}
          />
          <Text style={styles.sparklineLabel}>
            {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][index]}
          </Text>
        </Animated.View>
      ))}
    </View>
  </View>
);

// -- Main Screen --
const BalanceScreen = () => {
  const balances = [
    { type: 'Vacation', used: 5, total: 20, color: COLORS.accentIndigo },
    { type: 'Sick Leave', used: 1, total: 10, color: COLORS.accentEmerald },
    { type: 'Personal', used: 3, total: 5, color: COLORS.accentViolet },
  ];

  const monthlyUsage = [2, 0, 1, 3, 1, 0, 0, 2, 1, 0, 1, 3];

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
          <Text style={styles.screenTitle}>My Balances</Text>
          <Text style={styles.screenSubtitle}>
            Fiscal year 2026 &middot; Resets Jan 1
          </Text>
        </Animated.View>

        {/* Total summary card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(129,140,248,0.08)', 'rgba(167,139,250,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>26</Text>
                <Text style={styles.summaryLabel}>Total days left</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>9</Text>
                <Text style={styles.summaryLabel}>Days used</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Text style={styles.summaryNumber}>74%</Text>
                <Text style={styles.summaryLabel}>Remaining</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Individual Balance Cards */}
        {balances.map((balance, index) => (
          <BalanceCard key={balance.type} {...balance} index={index} />
        ))}

        {/* Monthly Sparkline */}
        <MonthlySparkline data={monthlyUsage} color={COLORS.accentIndigo} />

        {/* Accrual Info */}
        <Animated.View entering={FadeInDown.delay(500).springify()}>
          <View style={styles.accrualCard}>
            <Text style={styles.accrualTitle}>Next Accrual</Text>
            <View style={styles.accrualRow}>
              <Text style={styles.accrualDate}>Apr 1, 2026</Text>
              <Text style={styles.accrualAmount}>+1.67 vacation days</Text>
            </View>
            <View style={[styles.accrualRow, { marginTop: 8 }]}>
              <Text style={styles.accrualLabel}>Carryover limit</Text>
              <Text style={styles.accrualValue}>5 days max</Text>
            </View>
          </View>
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
    gap: 16,
  },
  screenTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  screenSubtitle: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  // Summary
  summaryCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontFamily: 'Space Grotesk',
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLabel: {
    fontFamily: 'DM Sans',
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  // Balance Cards
  balanceCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
    backgroundColor: COLORS.glass,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  balanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  balanceIconText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '700',
  },
  balanceTypeName: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  balanceNumberRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginBottom: 12,
  },
  balanceNumber: {
    fontFamily: 'Space Grotesk',
    fontSize: 36,
    fontWeight: '700',
  },
  balanceOf: {
    fontFamily: 'JetBrains Mono',
    fontSize: 14,
    color: COLORS.textTertiary,
  },
  balanceDays: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: COLORS.textTertiary,
    marginLeft: 2,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  balanceFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  balanceFooterText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  lowBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lowBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.accentAmber,
    fontWeight: '500',
  },
  // Sparkline
  sparklineContainer: {
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 18,
  },
  sparklineTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 14,
  },
  sparklineBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 60,
    gap: 4,
  },
  sparklineBarContainer: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sparklineBar: {
    width: '80%',
    borderRadius: 3,
    minHeight: 4,
  },
  sparklineLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 8,
    color: COLORS.textTertiary,
    marginTop: 4,
  },
  // Accrual
  accrualCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 16,
  },
  accrualTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  accrualRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accrualDate: {
    fontFamily: 'JetBrains Mono',
    fontSize: 13,
    color: COLORS.accentIndigo,
  },
  accrualAmount: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: COLORS.accentEmerald,
  },
  accrualLabel: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  accrualValue: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: COLORS.textPrimary,
  },
});

export default BalanceScreen;