/**
 * LeaveFlow Mobile — Approval Action Screen (Experimental)
 *
 * Manager approval view with haptic feedback, swipe gestures,
 * and animated status transitions.
 *
 * Stack: React Native / Expo with Reanimated 3 + Gesture Handler
 */

import React, { useCallback } from 'react';
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
  FadeInUp,
  SlideInRight,
  SlideOutLeft,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

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

const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.8 };

// -- Swipeable Approval Card --
const SwipeableApprovalCard = ({ request, onApprove, onReject }) => {
  const translateX = useSharedValue(0);
  const cardScale = useSharedValue(1);

  const triggerApproveHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onApprove(request.id);
  }, [request.id, onApprove]);

  const triggerRejectHaptic = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onReject(request.id);
  }, [request.id, onReject]);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      // Haptic feedback at thresholds
      if (Math.abs(event.translationX) > 80) {
        cardScale.value = withSpring(0.97, SPRING_CONFIG);
      } else {
        cardScale.value = withSpring(1, SPRING_CONFIG);
      }
    })
    .onEnd((event) => {
      if (event.translationX > 120) {
        // Swipe right = Approve
        translateX.value = withTiming(400, { duration: 300 });
        runOnJS(triggerApproveHaptic)();
      } else if (event.translationX < -120) {
        // Swipe left = Reject
        translateX.value = withTiming(-400, { duration: 300 });
        runOnJS(triggerRejectHaptic)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        cardScale.value = withSpring(1, SPRING_CONFIG);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: cardScale.value },
    ],
  }));

  const approveReveal = useAnimatedStyle(() => ({
    opacity: translateX.value > 0 ? Math.min(translateX.value / 120, 1) : 0,
  }));

  const rejectReveal = useAnimatedStyle(() => ({
    opacity: translateX.value < 0 ? Math.min(Math.abs(translateX.value) / 120, 1) : 0,
  }));

  return (
    <View style={styles.swipeContainer}>
      {/* Background reveals */}
      <Animated.View style={[styles.swipeRevealLeft, approveReveal]}>
        <Text style={styles.swipeRevealText}>Approve</Text>
      </Animated.View>
      <Animated.View style={[styles.swipeRevealRight, rejectReveal]}>
        <Text style={styles.swipeRevealText}>Reject</Text>
      </Animated.View>

      {/* Card */}
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.approvalCard, cardStyle]}>
          <View style={styles.approvalCardHeader}>
            <View style={styles.approvalAvatar}>
              <Text style={styles.approvalAvatarText}>{request.initials}</Text>
            </View>
            <View style={styles.approvalInfo}>
              <Text style={styles.approvalName}>{request.name}</Text>
              <Text style={styles.approvalDept}>{request.department}</Text>
            </View>
            <View style={styles.approvalBadge}>
              <Text style={styles.approvalBadgeText}>{request.type}</Text>
            </View>
          </View>

          <View style={styles.approvalDetails}>
            <View style={styles.approvalDetailItem}>
              <Text style={styles.approvalDetailLabel}>Dates</Text>
              <Text style={styles.approvalDetailValue}>{request.dates}</Text>
            </View>
            <View style={styles.approvalDetailItem}>
              <Text style={styles.approvalDetailLabel}>Duration</Text>
              <Text style={styles.approvalDetailValue}>{request.days} days</Text>
            </View>
            <View style={styles.approvalDetailItem}>
              <Text style={styles.approvalDetailLabel}>Coverage</Text>
              <Text style={[
                styles.approvalDetailValue,
                { color: request.coverageOk ? COLORS.accentEmerald : COLORS.accentRose }
              ]}>
                {request.coverage}
              </Text>
            </View>
          </View>

          {request.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonText}>"{request.reason}"</Text>
            </View>
          )}

          {/* Swipe hint */}
          <View style={styles.swipeHint}>
            <Text style={styles.swipeHintText}>Swipe right to approve, left to reject</Text>
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

// -- Approval Action Buttons (tap alternative) --
const ApprovalButtons = ({ onApprove, onReject }) => {
  const approveScale = useSharedValue(1);
  const rejectScale = useSharedValue(1);

  const approveStyle = useAnimatedStyle(() => ({
    transform: [{ scale: approveScale.value }],
  }));

  const rejectStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rejectScale.value }],
  }));

  return (
    <View style={styles.actionButtons}>
      <Animated.View style={[{ flex: 1 }, rejectStyle]}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            rejectScale.value = withSequence(
              withSpring(0.95, SPRING_CONFIG),
              withSpring(1, SPRING_CONFIG)
            );
            onReject();
          }}
          style={styles.rejectButton}
          accessibilityRole="button"
          accessibilityLabel="Reject leave request"
        >
          <Text style={styles.rejectButtonText}>Reject</Text>
        </Pressable>
      </Animated.View>

      <Animated.View style={[{ flex: 2 }, approveStyle]}>
        <Pressable
          onPress={() => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            approveScale.value = withSequence(
              withSpring(0.95, SPRING_CONFIG),
              withSpring(1, SPRING_CONFIG)
            );
            onApprove();
          }}
          accessibilityRole="button"
          accessibilityLabel="Approve leave request"
        >
          <LinearGradient
            colors={[COLORS.accentEmerald, '#059669']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.approveButton}
          >
            <Text style={styles.approveButtonText}>Approve</Text>
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );
};

// -- Main Screen --
const ApprovalScreen = () => {
  const pendingRequests = [
    {
      id: '1',
      name: 'Maria Santos',
      initials: 'MS',
      department: 'Engineering',
      type: 'PTO',
      dates: 'Mar 25-27',
      days: 3,
      coverage: '92%',
      coverageOk: true,
      reason: 'Family visiting from out of town',
    },
    {
      id: '2',
      name: 'Dan Kim',
      initials: 'DK',
      department: 'Engineering',
      type: 'Vacation',
      dates: 'Mar 20-24',
      days: 5,
      coverage: '85%',
      coverageOk: true,
      reason: null,
    },
  ];

  return (
    <GestureHandlerRootView style={styles.container}>
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
          <Text style={styles.screenTitle}>Approvals</Text>
          <Text style={styles.screenSubtitle}>
            {pendingRequests.length} pending &middot; Your team
          </Text>
        </Animated.View>

        {/* Pending cards */}
        {pendingRequests.map((request, index) => (
          <Animated.View
            key={request.id}
            entering={SlideInRight.delay(index * 100).springify()}
          >
            <SwipeableApprovalCard
              request={request}
              onApprove={(id) => console.log('Approved:', id)}
              onReject={(id) => console.log('Rejected:', id)}
            />
            <ApprovalButtons
              onApprove={() => console.log('Approved via button:', request.id)}
              onReject={() => console.log('Rejected via button:', request.id)}
            />
          </Animated.View>
        ))}

        {/* Recently resolved */}
        <View style={styles.recentSection}>
          <Text style={styles.recentTitle}>Recently Resolved</Text>
          <View style={styles.recentItem}>
            <View style={[styles.recentDot, { backgroundColor: COLORS.accentEmerald }]} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>Alex Kim - Vacation</Text>
              <Text style={styles.recentMeta}>Approved 2h ago</Text>
            </View>
          </View>
          <View style={styles.recentItem}>
            <View style={[styles.recentDot, { backgroundColor: COLORS.accentRose }]} />
            <View style={styles.recentInfo}>
              <Text style={styles.recentName}>Lisa Ray - PTO</Text>
              <Text style={styles.recentMeta}>Rejected yesterday</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </GestureHandlerRootView>
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
  // Swipeable
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 20,
  },
  swipeRevealLeft: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accentEmerald + '20',
    justifyContent: 'center',
    paddingLeft: 24,
    borderRadius: 20,
  },
  swipeRevealRight: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.accentRose + '20',
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingRight: 24,
    borderRadius: 20,
  },
  swipeRevealText: {
    fontFamily: 'Space Grotesk',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Approval card
  approvalCard: {
    backgroundColor: COLORS.glass,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
    padding: 18,
  },
  approvalCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  approvalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.accentIndigo + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approvalAvatarText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accentIndigo,
  },
  approvalInfo: {
    flex: 1,
  },
  approvalName: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  approvalDept: {
    fontFamily: 'DM Sans',
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  approvalBadge: {
    backgroundColor: COLORS.accentIndigo + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  approvalBadgeText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.accentIndigo,
    fontWeight: '500',
  },
  approvalDetails: {
    flexDirection: 'row',
    gap: 0,
    marginBottom: 12,
  },
  approvalDetailItem: {
    flex: 1,
    paddingVertical: 8,
  },
  approvalDetailLabel: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  approvalDetailValue: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  reasonContainer: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  reasonText: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  swipeHint: {
    alignItems: 'center',
    paddingTop: 4,
  },
  swipeHintText: {
    fontFamily: 'JetBrains Mono',
    fontSize: 9,
    color: COLORS.textTertiary,
  },
  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  rejectButton: {
    backgroundColor: COLORS.accentRose + '15',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.accentRose + '20',
  },
  rejectButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accentRose,
  },
  approveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  approveButtonText: {
    fontFamily: 'Space Grotesk',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  // Recent
  recentSection: {
    marginTop: 8,
    gap: 10,
  },
  recentTitle: {
    fontFamily: 'Space Grotesk',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.glass,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.glassBorder,
  },
  recentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontFamily: 'DM Sans',
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  recentMeta: {
    fontFamily: 'JetBrains Mono',
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});

export default ApprovalScreen;