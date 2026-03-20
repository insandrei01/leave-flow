/**
 * LeaveFlow Mobile — Status Journey Screen (Experimental)
 *
 * Animated story/journey view for request status tracking.
 * Package-tracking inspired with personality and micro-animations.
 *
 * Stack: React Native / Expo with Reanimated 3
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInLeft,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';

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

// -- Animated Pulse Dot --
const PulseDot = ({ color, active = false }) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.6);

  React.useEffect(() => {
    if (active) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      opacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1000 }),
          withTiming(0.4, { duration: 1000 })
        ),
        -1,
        true
      );
    }
  }, [active, scale, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={styles.dotContainer}>
      {active && (
        <Animated.View
          style={[
            styles.dotPulseRing,
            { borderColor: color },
            pulseStyle,
          ]}
        />
      )}
      <View style={[styles.dot, { backgroundColor: color }]} />
    </View>
  );
};

// -- Journey Step --
const JourneyStep = ({
  status, // 'completed' | 'active' | 'upcoming'
  title,
  subtitle,
  timestamp,
  actor,
  detail,
  color,
  isLast = false,
  index,
}) => {
  const isCompleted = status === 'completed';
  const isActive = status === 'active';

  return (
    <Animated.View
      entering={FadeInLeft.delay(index * 150).springify()}
      style={styles.journeyStep}
    >
      {/* Timeline connector */}
      <View style={styles.timelineColumn}>
        <PulseDot
          color={isCompleted ? COLORS.accentEmerald : isActive ? color : 'rgba(255,255,255,0.15)'}
          active={isActive}
        />
        {!isLast && (
          <View
            style={[
              styles.timelineLine,
              {
                backgroundColor: isCompleted
                  ? COLORS.accentEmerald + '40'
                  : 'rgba(255,255,255,0.06)',
              },
            ]}
          />
        )}
      </View>

      {/* Content */}
      <View style={[
        styles.stepContent,
        isActive && styles.stepContentActive,
        { opacity: status === 'upcoming' ? 0.35 : 1 },
      ]}>
        <View style={styles.stepHeader}>
          <Text style={[
            styles.stepTitle,
            isCompleted && { color: COLORS.accentEmerald },
            isActive && { color },
          ]}>
            {title}
          </Text>
          {timestamp && (
            <Text style={styles.stepTimestamp}>{timestamp}</Text>
          )}
        </View>

        {actor && (
          <View style={styles.actorRow}>
            <View style={[styles.actorAvatar, { backgroundColor: color + '20' }]}>
              <Text style={[styles.actorInitials, { color }]}>
                {actor.initials}
              </Text>
            </View>
            <Text style={styles.actorName}>{actor.name}</Text>
            {actor.via && (
              <Text style={styles.actorVia}>via {actor.via}</Text>
            )}
          </View>
        )}

        {subtitle && (
          <Text style={styles.stepSubtitle}>{subtitle}</Text>
        )}

        {detail && (
          <View style={styles.stepDetail}>
            <Text style={styles.stepDetailText}>{detail}</Text>
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <Text style={styles.completedBadgeText}>Done</Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// -- Main Screen --
const StatusJourneyScreen = () => {
  const steps = [
    {
      status: 'completed',
      title: 'Submitted',
      subtitle: 'Validation passed: balance OK, no overlap',
      timestamp: 'Today, 10:24am',
      actor: { initials: 'MS', name: 'Maria Santos', via: 'Slack' },
      color: COLORS.accentEmerald,
    },
    {
      status: 'active',
      title: 'Manager Review',
      subtitle: 'Awaiting approval. Timeout in 23h 45m',
      timestamp: 'Waiting...',
      actor: { initials: 'TW', name: 'Tom Wilson', via: 'Slack DM' },
      detail: 'Notification sent 15 minutes ago',
      color: COLORS.accentIndigo,
    },
    {
      status: 'upcoming',
      title: 'HR Review',
      actor: { initials: 'SC', name: 'Sarah Chen' },
      color: COLORS.accentViolet,
    },
    {
      status: 'upcoming',
      title: 'Approved',
      subtitle: 'Calendar sync, balance deduction, team notification',
      color: COLORS.accentEmerald,
    },
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
          <Text style={styles.screenTitle}>Request Status</Text>
          <Text style={styles.requestId}>LR-2026-0342</Text>
        </Animated.View>

        {/* Request Summary Card */}
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.summaryCard}>
            <LinearGradient
              colors={['rgba(129,140,248,0.08)', 'rgba(167,139,250,0.04)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.summaryLabel}>Type</Text>
                <Text style={styles.summaryValue}>PTO</Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Dates</Text>
                <Text style={styles.summaryValue}>Mar 25-27</Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Days</Text>
                <Text style={styles.summaryValue}>3</Text>
              </View>
              <View>
                <Text style={styles.summaryLabel}>Status</Text>
                <View style={styles.statusBadge}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>In Progress</Text>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Journey Timeline */}
        <View style={styles.journeyContainer}>
          <Text style={styles.journeyTitle}>Journey</Text>
          {steps.map((step, index) => (
            <JourneyStep
              key={index}
              {...step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </View>

        {/* Cancel button */}
        <Animated.View entering={FadeInDown.delay(600).springify()}>
          <Pressable
            style={styles.cancelButton}
            accessibilityRole="button"
            accessibilityLabel="Cancel this leave request"
          >
            <Text style={styles.cancelButtonText}>Cancel Request</Text>
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
  requestId: {
    fontFamily: 'JetBrains Mono',
    fontSize: 12,
    color: COLORS.accentIndigo,
    marginTop: 4,
  },
  // Summary
  summaryCard: {
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accentIndigo,
  },
  statusText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 11,
    color: COLORS.accentIndigo,
  },
  // Journey
  journeyContainer: {
    gap: 0,
  },
  journeyTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 16,
  },
  journeyStep: {
    flexDirection: 'row',
    gap: 14,
  },
  // Timeline
  timelineColumn: {
    alignItems: 'center',
    width: 20,
  },
  dotContainer: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPulseRing: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    borderRadius: 1,
  },
  // Step content
  stepContent: {
    flex: 1,
    paddingBottom: 24,
  },
  stepContentActive: {
    backgroundColor: COLORS.glass,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 14,
    marginBottom: 10,
    marginLeft: -4,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  stepTimestamp: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  actorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  actorAvatar: {
    width: 22,
    height: 22,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actorInitials: {
    fontFamily: 'Space Grotesk',
    fontSize: 9,
    fontWeight: '700',
  },
  actorName: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  actorVia: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  stepSubtitle: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
    lineHeight: 17,
  },
  stepDetail: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  stepDetailText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.textTertiary,
  },
  completedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.accentEmerald + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 6,
  },
  completedBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.accentEmerald,
    fontWeight: '500',
  },
  // Cancel
  cancelButton: {
    borderWidth: 1,
    borderColor: COLORS.accentRose + '30',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.accentRose,
  },
});

export default StatusJourneyScreen;