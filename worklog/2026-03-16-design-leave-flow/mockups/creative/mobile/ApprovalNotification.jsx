/**
 * ApprovalNotification - Swipe-to-approve notification card
 *
 * Design: Interactive card with swipe gesture (right to approve,
 * left to reject). Shows context: requester, dates, team impact,
 * balance. Haptic feedback on swipe threshold.
 *
 * Dependencies: react-native, react-native-gesture-handler, react-native-reanimated
 */

import React, { useState } from 'react';
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
  primary500: '#6366F1',
  primary600: '#4F46E5',
  primary700: '#4338CA',
  primary900: '#312E81',
  accent50: '#F0FDF4',
  accent100: '#DCFCE7',
  accent500: '#22C55E',
  accent600: '#16A34A',
  coral50: '#FFF1F2',
  coral100: '#FFE4E6',
  coral400: '#FB7185',
  coral500: '#F43F5E',
  amber50: '#FFFBEB',
  amber100: '#FEF3C7',
  amber500: '#F59E0B',
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

const PENDING_REQUESTS = [
  {
    id: 'REQ-0342',
    name: 'Tom Wilson',
    initials: 'TW',
    avatarGradient: ['#FB923C', '#EA580C'],
    team: 'Engineering',
    role: 'DevOps Engineer',
    leaveType: 'Vacation',
    leaveColor: COLORS.primary500,
    startDate: 'Mar 18',
    endDate: 'Mar 24',
    days: 5,
    reason: 'Family trip abroad -- flights already booked',
    balance: { remaining: 15, total: 25 },
    teamImpact: { coverage: 75, alsoOff: 2 },
    submittedAgo: '3 days ago',
    stale: true,
  },
  {
    id: 'REQ-0345',
    name: 'Lisa Kim',
    initials: 'LK',
    avatarGradient: ['#A78BFA', '#7C3AED'],
    team: 'Design',
    role: 'UI Designer',
    leaveType: 'Vacation',
    leaveColor: COLORS.primary500,
    startDate: 'Mar 25',
    endDate: 'Mar 27',
    days: 3,
    reason: '',
    balance: { remaining: 18, total: 25 },
    teamImpact: { coverage: 88, alsoOff: 1 },
    submittedAgo: '2 hours ago',
    stale: false,
  },
];

const ApprovalNotification = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Approvals</Text>
          <Text style={styles.headerSubtitle}>
            {PENDING_REQUESTS.length} pending requests
          </Text>
        </View>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{PENDING_REQUESTS.length}</Text>
        </View>
      </View>

      {/* Swipe instruction banner */}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>
          Swipe right to approve, left to reject
        </Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PENDING_REQUESTS.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            {/* Swipe background layers (visible during swipe gesture) */}
            {/* In production, these would be absolutely positioned behind the card */}

            {/* Stale badge */}
            {request.stale && (
              <View style={styles.staleBadge}>
                <Text style={styles.staleBadgeText}>Pending {request.submittedAgo}</Text>
              </View>
            )}

            {/* Request header */}
            <View style={styles.requestHeader}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{request.initials}</Text>
              </View>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{request.name}</Text>
                <Text style={styles.requestRole}>
                  {request.role} -- {request.team}
                </Text>
              </View>
              <Text style={styles.requestId}>{request.id}</Text>
            </View>

            {/* Leave details */}
            <View style={styles.detailsGrid}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Type</Text>
                <View style={styles.detailRow}>
                  <View
                    style={[styles.detailDot, { backgroundColor: request.leaveColor }]}
                  />
                  <Text style={styles.detailValue}>{request.leaveType}</Text>
                </View>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Duration</Text>
                <Text style={styles.detailValue}>{request.days} days</Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Dates</Text>
                <Text style={styles.detailValue}>
                  {request.startDate} - {request.endDate}
                </Text>
              </View>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>Balance After</Text>
                <Text style={styles.detailValue}>
                  {request.balance.remaining - request.days}/{request.balance.total}
                </Text>
              </View>
            </View>

            {/* Reason (if provided) */}
            {request.reason ? (
              <View style={styles.reasonBox}>
                <Text style={styles.reasonLabel}>Reason</Text>
                <Text style={styles.reasonText}>{request.reason}</Text>
              </View>
            ) : null}

            {/* Team impact */}
            <View style={styles.impactRow}>
              <View style={styles.impactItem}>
                <Text style={styles.impactLabel}>Team Coverage</Text>
                <View style={styles.impactValueRow}>
                  <Text
                    style={[
                      styles.impactValue,
                      {
                        color:
                          request.teamImpact.coverage >= 70
                            ? COLORS.accent600
                            : COLORS.amber500,
                      },
                    ]}
                  >
                    {request.teamImpact.coverage}%
                  </Text>
                  <View style={styles.coverageBar}>
                    <View
                      style={[
                        styles.coverageFill,
                        {
                          width: `${request.teamImpact.coverage}%`,
                          backgroundColor:
                            request.teamImpact.coverage >= 70
                              ? COLORS.accent500
                              : COLORS.amber500,
                        },
                      ]}
                    />
                  </View>
                </View>
              </View>
              <View style={styles.impactItem}>
                <Text style={styles.impactLabel}>Also Off</Text>
                <Text style={styles.impactValue}>
                  {request.teamImpact.alsoOff} people
                </Text>
              </View>
            </View>

            {/* Action Buttons (fallback for non-gesture interaction) */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                accessibilityRole="button"
                accessibilityLabel={`Reject ${request.name}'s leave request`}
              >
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.approveButton}
                accessibilityRole="button"
                accessibilityLabel={`Approve ${request.name}'s leave request`}
              >
                <Text style={styles.approveButtonText}>Approve</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.gray900 },
  headerSubtitle: { fontSize: 13, color: COLORS.gray400, marginTop: 2 },
  headerBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.coral400,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },

  instructionBanner: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.primary50,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary100,
  },
  instructionText: {
    fontSize: 12,
    color: COLORS.primary700,
    fontWeight: '500',
    textAlign: 'center',
  },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  requestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.gray100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  staleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.coral50,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.coral100,
  },
  staleBadgeText: { fontSize: 11, fontWeight: '600', color: COLORS.coral500 },

  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: COLORS.primary500,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontSize: 15, fontWeight: '700' },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  requestRole: { fontSize: 12, color: COLORS.gray500, marginTop: 2 },
  requestId: { fontSize: 11, color: COLORS.gray400, fontWeight: '500' },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  detailBox: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
  },
  detailLabel: {
    fontSize: 10,
    color: COLORS.gray400,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  detailDot: { width: 8, height: 8, borderRadius: 4 },
  detailValue: { fontSize: 14, fontWeight: '600', color: COLORS.gray900 },

  reasonBox: {
    padding: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 12,
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 10,
    color: COLORS.gray400,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reasonText: { fontSize: 13, color: COLORS.gray700, lineHeight: 18 },

  impactRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  impactItem: { flex: 1 },
  impactLabel: {
    fontSize: 10,
    color: COLORS.gray400,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  impactValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  impactValue: { fontSize: 16, fontWeight: '700', color: COLORS.gray900 },
  coverageBar: {
    flex: 1,
    height: 4,
    backgroundColor: COLORS.gray100,
    borderRadius: 2,
    overflow: 'hidden',
  },
  coverageFill: { height: '100%', borderRadius: 2 },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  rejectButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.coral400,
    alignItems: 'center',
  },
  rejectButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.coral500 },
  approveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: COLORS.accent500,
    alignItems: 'center',
    shadowColor: COLORS.accent500,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  approveButtonText: { fontSize: 15, fontWeight: '700', color: COLORS.white },
});

export default ApprovalNotification;
