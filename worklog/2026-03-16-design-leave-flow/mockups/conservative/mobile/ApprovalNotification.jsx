/**
 * ApprovalNotification — Mobile Approval Card
 *
 * Shown to managers when they receive a leave request to approve/reject.
 * Renders as a notification card with action buttons.
 * Includes reject reason modal.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';

const COLORS = {
  primary50: '#eff6ff',
  primary600: '#2563eb',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray700: '#374151',
  gray900: '#111827',
  white: '#ffffff',
  success50: '#f0fdf4',
  success600: '#16a34a',
  success700: '#15803d',
  danger50: '#fef2f2',
  danger500: '#ef4444',
  danger600: '#dc2626',
  warning50: '#fffbeb',
  warning600: '#d97706',
};

export default function ApprovalNotification({
  request = {
    id: 'REQ-2026-0147',
    employeeName: 'John Doe',
    employeeInitials: 'JD',
    team: 'Engineering',
    type: 'Vacation',
    startDate: 'Mar 24',
    endDate: 'Mar 28',
    days: 5,
    reason: 'Family vacation planned in advance.',
    step: '1 of 2',
    submittedAt: '2 hours ago',
  },
  onApprove,
  onReject,
}) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isActing, setIsActing] = useState(false);
  const [actionTaken, setActionTaken] = useState(null); // 'approved' | 'rejected' | null

  const handleApprove = async () => {
    setIsActing(true);
    try {
      await onApprove?.(request.id);
      setActionTaken('approved');
    } finally {
      setIsActing(false);
    }
  };

  const handleReject = async () => {
    if (rejectReason.trim().length < 10) {
      Alert.alert('Reason required', 'Please provide at least 10 characters explaining the rejection.');
      return;
    }
    setShowRejectModal(false);
    setIsActing(true);
    try {
      await onReject?.(request.id, rejectReason);
      setActionTaken('rejected');
    } finally {
      setIsActing(false);
    }
  };

  // Post-action state
  if (actionTaken) {
    return (
      <View style={styles.card}>
        <View style={[
          styles.resultBanner,
          actionTaken === 'approved' ? styles.resultApproved : styles.resultRejected,
        ]}>
          <Text style={styles.resultText}>
            {actionTaken === 'approved'
              ? '\u2713 You approved this request'
              : '\u2717 You rejected this request'}
          </Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.requestRef}>{request.id}</Text>
          <Text style={styles.employeeName}>{request.employeeName}</Text>
          <Text style={styles.details}>
            {request.type} \u00B7 {request.startDate} - {request.endDate} \u00B7 {request.days} days
          </Text>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{request.employeeInitials}</Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.employeeName}>{request.employeeName}</Text>
              <Text style={styles.teamLabel}>{request.team}</Text>
            </View>
          </View>
          <Text style={styles.timestamp}>{request.submittedAt}</Text>
        </View>

        {/* Request details */}
        <View style={styles.cardBody}>
          <View style={styles.detailRow}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Type</Text>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>{request.type}</Text>
              </View>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Dates</Text>
              <Text style={styles.detailValue}>{request.startDate} - {request.endDate}</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Days</Text>
              <Text style={styles.detailValue}>{request.days}</Text>
            </View>
          </View>

          {request.reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason</Text>
              <Text style={styles.reasonText}>{request.reason}</Text>
            </View>
          )}

          <Text style={styles.stepInfo}>Approval step: {request.step}</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.approveButton}
            onPress={handleApprove}
            disabled={isActing}
            accessibilityRole="button"
            accessibilityLabel="Approve leave request"
          >
            {isActing ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.approveText}>{'\u2713'} Approve</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => setShowRejectModal(true)}
            disabled={isActing}
            accessibilityRole="button"
            accessibilityLabel="Reject leave request"
          >
            <Text style={styles.rejectText}>{'\u2717'} Reject</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Reject Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rejection Reason</Text>
            <Text style={styles.modalSubtitle}>
              Please explain why this request is being rejected (minimum 10 characters).
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason..."
              placeholderTextColor={COLORS.gray400}
              multiline
              numberOfLines={4}
              value={rejectReason}
              onChangeText={setRejectReason}
              textAlignVertical="top"
              accessibilityLabel="Rejection reason"
            />
            <Text style={styles.charCount}>
              {rejectReason.trim().length}/10 minimum characters
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setShowRejectModal(false)}
                accessibilityRole="button"
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalConfirm,
                  rejectReason.trim().length < 10 && styles.modalConfirmDisabled,
                ]}
                onPress={handleReject}
                disabled={rejectReason.trim().length < 10}
                accessibilityRole="button"
              >
                <Text style={styles.modalConfirmText}>Confirm Rejection</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e9d5ff', // purple-100
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#7c3aed', // purple-600
  },
  headerInfo: {
    gap: 2,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray900,
  },
  teamLabel: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  timestamp: {
    fontSize: 12,
    color: COLORS.gray400,
  },
  cardBody: {
    padding: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 16,
  },
  detailItem: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.gray900,
  },
  typeBadge: {
    backgroundColor: COLORS.primary50,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primary600,
  },
  reasonBox: {
    marginTop: 12,
    backgroundColor: COLORS.gray50,
    borderRadius: 8,
    padding: 12,
  },
  reasonLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray400,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: COLORS.gray700,
    lineHeight: 20,
  },
  stepInfo: {
    marginTop: 12,
    fontSize: 12,
    color: COLORS.gray500,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  approveButton: {
    flex: 1,
    backgroundColor: COLORS.success600,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  approveText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  rejectButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.danger500,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  rejectText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.danger600,
  },
  // Post-action result
  resultBanner: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  resultApproved: {
    backgroundColor: COLORS.success50,
  },
  resultRejected: {
    backgroundColor: COLORS.danger50,
  },
  resultText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  requestRef: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: COLORS.gray400,
    marginBottom: 4,
  },
  details: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 4,
  },
  // Reject Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.gray900,
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.gray500,
    marginBottom: 16,
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: COLORS.gray50,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: COLORS.gray900,
    minHeight: 100,
  },
  charCount: {
    fontSize: 12,
    color: COLORS.gray400,
    marginTop: 4,
    textAlign: 'right',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancel: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalCancelText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray700,
  },
  modalConfirm: {
    flex: 1,
    backgroundColor: COLORS.danger600,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  modalConfirmDisabled: {
    backgroundColor: COLORS.gray300,
  },
  modalConfirmText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
