import React, { useState, useMemo } from 'react';
import { useApp } from '../../lib/store';
import { LeaveRequest, Profile } from '../../types/database.types';
import { RecordStaffLeaveModal } from '../modals/RecordStaffLeaveModal';
import { exportToCSV, exportToPDFReport } from '../../lib/exportUtils';
import { ExportActionsMenu } from '../common/ExportActionsMenu';
import {
  Calendar,
  CalendarCheck,
  Check,
  X,
  Clock,
  User,
  Building2,
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Plus,
  FileText,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  MessageSquare,
  ChevronRight,
  Info
} from 'lucide-react';

interface StaffLeaveManagementProps {
  isBranchManagerMode?: boolean;
}

export const StaffLeaveManagement: React.FC<StaffLeaveManagementProps> = ({
  isBranchManagerMode = false,
}) => {
  const {
    currentProfile,
    profiles,
    branches,
    leaveRequests,
    reviewLeaveRequest,
  } = useApp();

  // Active view tab: 'pending' | 'balances' | 'all_history'
  const [activeTab, setActiveTab] = useState<'pending' | 'balances' | 'all_history'>('pending');

  // Filters
  const [selectedBranchId, setSelectedBranchId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal triggers
  const [showRecordModal, setShowRecordModal] = useState<boolean>(false);
  const [selectedStaffForModal, setSelectedStaffForModal] = useState<Profile | null>(null);

  // Review / Remarks Modal State
  const [reviewingRequest, setReviewingRequest] = useState<LeaveRequest | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [actionSuccessToast, setActionSuccessToast] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  // Scoped Staff List
  const eligibleStaff = useMemo(() => {
    return profiles.filter((p) => {
      if (p.role === 'student') return false;
      if (isBranchManagerMode) return p.branch_id === currentProfile.branch_id;
      if (selectedBranchId !== 'ALL') return p.branch_id === selectedBranchId;
      return true;
    });
  }, [profiles, isBranchManagerMode, currentProfile, selectedBranchId]);

  // Scoped Leave Requests
  const scopedLeaveRequests = useMemo(() => {
    return leaveRequests.filter((l) => {
      if (isBranchManagerMode) return l.branch_id === currentProfile.branch_id;
      if (selectedBranchId !== 'ALL') return l.branch_id === selectedBranchId;
      return true;
    });
  }, [leaveRequests, isBranchManagerMode, currentProfile, selectedBranchId]);

  // Calculated Stats
  const stats = useMemo(() => {
    const pending = scopedLeaveRequests.filter((l) => l.status === 'pending');
    const approved = scopedLeaveRequests.filter((l) => l.status === 'approved');
    const activeToday = approved.filter(
      (l) => todayStr >= l.start_date && todayStr <= l.end_date
    );

    // Calculate total days taken
    const totalDaysTaken = approved.reduce((sum, l) => sum + (l.days_count || 1), 0);

    return {
      pendingCount: pending.length,
      approvedCount: approved.length,
      activeTodayCount: activeToday.length,
      totalDaysTaken,
    };
  }, [scopedLeaveRequests, todayStr]);

  // Filtered Leave Requests for the Audit Table
  const filteredHistory = useMemo(() => {
    return scopedLeaveRequests.filter((req) => {
      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      // Type filter
      if (typeFilter !== 'ALL' && req.leave_type !== typeFilter) return false;
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const staff = profiles.find((p) => p.id === req.profile_id);
        const staffName = staff?.full_name?.toLowerCase() || '';
        const reason = req.reason?.toLowerCase() || '';
        const notes = req.review_notes?.toLowerCase() || '';
        return staffName.includes(term) || reason.includes(term) || notes.includes(term);
      }
      return true;
    });
  }, [scopedLeaveRequests, statusFilter, typeFilter, searchTerm, profiles]);

  // Pending Queue list
  const pendingRequests = useMemo(() => {
    return scopedLeaveRequests.filter((l) => l.status === 'pending');
  }, [scopedLeaveRequests]);

  // Format Helper for Leave Category Badge
  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'off_day':
        return { label: 'Off-Day', color: '#60A5FA', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.3)' };
      case 'annual':
        return { label: 'Annual Leave', color: '#D49A5B', bg: 'rgba(212, 154, 91, 0.15)', border: 'rgba(212, 154, 91, 0.3)' };
      case 'sick':
        return { label: 'Sick / Medical', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' };
      case 'short':
        return { label: 'Short Leave', color: '#A78BFA', bg: 'rgba(167, 139, 250, 0.15)', border: 'rgba(167, 139, 250, 0.3)' };
      case 'compassionate':
        return { label: 'Compassionate', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
      case 'maternity_paternity':
        return { label: 'Maternity/Paternity', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' };
      default:
        return { label: type.toUpperCase(), color: '#D6C7BB', bg: 'rgba(255, 255, 255, 0.1)', border: 'rgba(255, 255, 255, 0.2)' };
    }
  };

  // Helper for Staff Annual Balance calculation
  const getStaffLeaveBalance = (staffId: string) => {
    const staffApproved = leaveRequests.filter(
      (l) => l.profile_id === staffId && l.status === 'approved'
    );
    const annualTaken = staffApproved
      .filter((l) => l.leave_type === 'annual')
      .reduce((sum, l) => sum + l.days_count, 0);
    const offDaysTaken = staffApproved
      .filter((l) => l.leave_type === 'off_day')
      .reduce((sum, l) => sum + l.days_count, 0);
    const otherTaken = staffApproved
      .filter((l) => l.leave_type !== 'annual' && l.leave_type !== 'off_day')
      .reduce((sum, l) => sum + l.days_count, 0);

    const remainingAnnual = Math.max(0, 21 - annualTaken);
    return {
      entitlement: 21,
      annualTaken,
      offDaysTaken,
      otherTaken,
      remainingAnnual,
      totalApprovedDays: annualTaken + offDaysTaken + otherTaken,
    };
  };

  // Quick 1-Click Approve / Decline
  const handleQuickReview = async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      const defaultNote =
        status === 'approved'
          ? `Authorized by ${currentProfile.full_name} (${currentProfile.role.replace('_', ' ')})`
          : `Declined by ${currentProfile.full_name} (${currentProfile.role.replace('_', ' ')})`;
      await reviewLeaveRequest(requestId, status, defaultNote);
      setActionSuccessToast(`Request ${status === 'approved' ? 'Approved' : 'Declined'} Successfully!`);
      setTimeout(() => setActionSuccessToast(null), 3000);
    } catch (err) {
      alert('Error updating leave status');
    }
  };

  // Detailed Review Submit
  const handleDetailedReviewSubmit = async (status: 'approved' | 'rejected') => {
    if (!reviewingRequest) return;
    setIsSubmittingReview(true);
    try {
      const finalNote =
        reviewNotes.trim() ||
        (status === 'approved'
          ? `Authorized by ${currentProfile.full_name} (${currentProfile.role.replace('_', ' ')})`
          : `Declined by ${currentProfile.full_name}`);
      await reviewLeaveRequest(reviewingRequest.id, status, finalNote);
      setReviewingRequest(null);
      setReviewNotes('');
      setActionSuccessToast(`Leave application ${status === 'approved' ? 'Approved' : 'Declined'}!`);
      setTimeout(() => setActionSuccessToast(null), 3000);
    } catch (err) {
      alert('Error updating request');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Export handlers
  const handleExportCSV = () => {
    const headers = ['Staff Member', 'Role', 'Campus', 'Category', 'Start Date', 'End Date', 'Days', 'Status', 'Reason', 'Review Notes'];
    const rows = filteredHistory.map((req) => {
      const staff = profiles.find((p) => p.id === req.profile_id);
      const b = branches.find((branch) => branch.id === req.branch_id);
      return [
        staff?.full_name || 'N/A',
        staff?.role || 'N/A',
        b?.name || 'Aurevia Campus',
        req.leave_type.toUpperCase(),
        req.start_date,
        req.end_date,
        req.days_count.toString(),
        req.status.toUpperCase(),
        req.reason,
        req.review_notes || 'N/A',
      ];
    });
    exportToCSV('Aurevia_Staff_Leave_Report', headers, rows);
  };

  const handleExportPDF = () => {
    const headers = ['Staff Member', 'Campus', 'Leave Type', 'Dates', 'Days', 'Status'];
    const rows = filteredHistory.map((req) => {
      const staff = profiles.find((p) => p.id === req.profile_id);
      const b = branches.find((branch) => branch.id === req.branch_id);
      return [
        staff?.full_name || 'Staff',
        b?.name || 'Campus',
        req.leave_type.replace('_', ' ').toUpperCase(),
        `${req.start_date} to ${req.end_date}`,
        `${req.days_count} d`,
        req.status.toUpperCase(),
      ];
    });
    exportToPDFReport(
      'Aurevia_Staff_Leave_Report.pdf',
      'Aurevia Institute - Staff Leave & Off-Days Audit',
      `Generated for ${isBranchManagerMode ? 'Campus Division' : 'National Directorate'}`,
      headers,
      rows,
      'landscape'
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Notification */}
      {actionSuccessToast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            background: 'linear-gradient(135deg, #10B981, #059669)',
            color: '#FFFFFF',
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            zIndex: 9999,
            fontWeight: 700,
            fontSize: '0.86rem',
            animation: 'slideUp 0.2s ease',
          }}
        >
          <CheckCircle2 size={18} />
          <span>{actionSuccessToast}</span>
        </div>
      )}

      {/* TOP HEADER & BAR */}
      <div
        className="glass-card"
        style={{
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.2), rgba(212, 154, 91, 0.05))',
                border: '1px solid rgba(212, 154, 91, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <CalendarCheck size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Staff Leave & Off-Days Management
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Review pending applications, authorize official off-days, and monitor the statutory 21-day annual allowances
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {!isBranchManagerMode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Campus:</span>
              <select
                className="form-select"
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '6px 12px', height: 'auto', background: 'var(--bg-input)' }}
              >
                <option value="ALL">All Campuses (National)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.city})
                  </option>
                ))}
              </select>
            </div>
          )}

          <ExportActionsMenu
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
            label="Export Report"
          />

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setSelectedStaffForModal(null);
              setShowRecordModal(true);
            }}
            style={{
              padding: '8px 16px',
              fontSize: '0.82rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Plus size={16} />
            <span>Record Leave / Off-Day</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS BAR WITH DIRECT TAB SHORTCUTS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* Metric 1: Pending Approvals Queue */}
        <div
          className="glass-card"
          onClick={() => setActiveTab('pending')}
          style={{
            padding: '16px 18px',
            cursor: 'pointer',
            border: activeTab === 'pending' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'pending' ? 'rgba(212, 154, 91, 0.08)' : 'var(--bg-surface)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
              Action Required
            </span>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: stats.pendingCount > 0 ? '#F59E0B' : '#10B981',
                boxShadow: stats.pendingCount > 0 ? '0 0 10px #F59E0B' : 'none',
              }}
            />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.pendingCount > 0 ? 'var(--crema-gold)' : 'var(--text-primary)', marginTop: '4px' }}>
            {stats.pendingCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>{stats.pendingCount === 1 ? 'Request waiting review' : 'Requests waiting review'}</span>
            <ChevronRight size={13} />
          </div>
        </div>

        {/* Metric 2: Active On Leave Today */}
        <div
          className="glass-card"
          onClick={() => {
            setActiveTab('all_history');
            setStatusFilter('approved');
          }}
          style={{
            padding: '16px 18px',
            cursor: 'pointer',
            border: '1px solid var(--border-subtle)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Away Today ({new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })})
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: stats.activeTodayCount > 0 ? '#6EE7B7' : 'var(--text-primary)', marginTop: '4px' }}>
            {stats.activeTodayCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.activeTodayCount > 0 ? 'Staff on approved time-off' : 'Full campus station coverage'}
          </div>
        </div>

        {/* Metric 3: Total Approved Time-Offs */}
        <div
          className="glass-card"
          onClick={() => {
            setActiveTab('all_history');
            setStatusFilter('approved');
          }}
          style={{
            padding: '16px 18px',
            cursor: 'pointer',
            border: '1px solid var(--border-subtle)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Approved Time-Offs
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#10B981', marginTop: '4px' }}>
            {stats.approvedCount}
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {stats.totalDaysTaken} total authorized working days
          </div>
        </div>

        {/* Metric 4: Statutory Allowance Standard */}
        <div
          className="glass-card"
          onClick={() => setActiveTab('balances')}
          style={{
            padding: '16px 18px',
            cursor: 'pointer',
            border: activeTab === 'balances' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'balances' ? 'rgba(212, 154, 91, 0.08)' : 'var(--bg-surface)',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)' }}>
            Statutory Allowance
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--crema-gold)', marginTop: '4px' }}>
            21 Days / Yr
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span>View staff balance tracking</span>
            <ChevronRight size={13} />
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS BAR */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          borderBottom: '1px solid var(--border-medium)',
          paddingBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'pending' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'pending' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface)',
            color: activeTab === 'pending' ? 'var(--crema-gold)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <Clock size={16} />
          <span>Pending Approvals Queue</span>
          {stats.pendingCount > 0 && (
            <span
              style={{
                background: '#F59E0B',
                color: '#181310',
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 7px',
                borderRadius: '10px',
              }}
            >
              {stats.pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('balances')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'balances' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'balances' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface)',
            color: activeTab === 'balances' ? 'var(--crema-gold)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <ShieldCheck size={16} />
          <span>Statutory 21-Day Balances</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '10px',
            }}
          >
            {eligibleStaff.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all_history')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '10px',
            fontSize: '0.84rem',
            fontWeight: 700,
            cursor: 'pointer',
            border: activeTab === 'all_history' ? '1.5px solid var(--crema-gold)' : '1px solid var(--border-subtle)',
            background: activeTab === 'all_history' ? 'rgba(212, 154, 91, 0.15)' : 'var(--bg-surface)',
            color: activeTab === 'all_history' ? 'var(--crema-gold)' : 'var(--text-secondary)',
            transition: 'all 0.15s ease',
          }}
        >
          <FileText size={16} />
          <span>All Requests & History</span>
          <span
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-primary)',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: '10px',
            }}
          >
            {scopedLeaveRequests.length}
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: PENDING APPROVALS QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'pending' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {pendingRequests.length === 0 ? (
            <div
              className="glass-card"
              style={{
                textAlign: 'center',
                padding: '60px 24px',
                borderRadius: '16px',
              }}
            >
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10B981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <CheckCircle2 size={32} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px', color: 'var(--text-primary)' }}>
                All Caught Up!
              </h3>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto' }}>
                There are no pending staff leave or off-day requests awaiting management approval right now.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setSelectedStaffForModal(null);
                  setShowRecordModal(true);
                }}
                style={{ marginTop: '18px', padding: '7px 16px', fontSize: '0.8rem' }}
              >
                + Record Leave on Behalf of Staff
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingRequests.map((req) => {
                const staff = profiles.find((p) => p.id === req.profile_id);
                const sBranch = branches.find((b) => b.id === req.branch_id);
                const badge = getLeaveTypeBadge(req.leave_type);
                const balance = staff ? getStaffLeaveBalance(staff.id) : null;

                return (
                  <div
                    key={req.id}
                    className="glass-card"
                    style={{
                      padding: '18px 22px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '16px',
                      border: '1.5px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '16px',
                      background: 'linear-gradient(180deg, #1C1613 0%, #17120F 100%)',
                    }}
                  >
                    {/* Staff Profile and Metadata */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '260px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, rgba(212, 154, 91, 0.25), rgba(212, 154, 91, 0.08))',
                          border: '1px solid rgba(212, 154, 91, 0.3)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--crema-gold)',
                          fontWeight: 800,
                          fontSize: '0.95rem',
                          flexShrink: 0,
                        }}
                      >
                        {staff?.full_name ? staff.full_name.substring(0, 2).toUpperCase() : 'ST'}
                      </div>

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                          {staff?.full_name || 'Staff Member'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px' }}>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {staff?.job_title || staff?.specialty || staff?.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--crema-gold)' }}>•</span>
                          <span style={{ fontSize: '0.74rem', color: 'var(--crema-gold)', fontWeight: 600 }}>
                            {sBranch?.name || 'Aurevia Main Campus'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Leave Type & Dates */}
                    <div style={{ minWidth: '200px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {badge.label}
                        </span>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {req.days_count} {req.days_count === 1 ? 'Working Day' : 'Working Days'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        📅 {req.start_date} to {req.end_date}
                      </div>
                      {balance && req.leave_type === 'annual' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Remaining entitlement: <strong>{balance.remainingAnnual} of 21 days</strong>
                        </div>
                      )}
                    </div>

                    {/* Reason / Handover Notes */}
                    <div style={{ flex: '1', minWidth: '220px', maxWidth: '320px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
                        Stated Justification
                      </div>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        "{req.reason || 'No specific reason provided'}"
                      </p>
                    </div>

                    {/* Quick Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => {
                          setReviewingRequest(req);
                          setReviewNotes('');
                        }}
                        style={{
                          padding: '7px 12px',
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                        }}
                      >
                        <MessageSquare size={13} />
                        <span>Remarks</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickReview(req.id, 'rejected')}
                        style={{
                          padding: '7px 14px',
                          borderRadius: '8px',
                          background: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#EF4444',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <X size={14} />
                        <span>Decline</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickReview(req.id, 'approved')}
                        style={{
                          padding: '7px 16px',
                          borderRadius: '8px',
                          background: 'linear-gradient(135deg, #10B981, #059669)',
                          border: 'none',
                          color: '#FFFFFF',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px',
                          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: STATUTORY 21-DAY BALANCES & ROSTER */}
      {/* ========================================================================= */}
      {activeTab === 'balances' && (
        <div className="glass-card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                Statutory 21-Day Annual Leave Allowance Registry
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
                Monitors annual leave days consumed vs remaining statutory allowance per Kenya Employment Act standards
              </p>
            </div>
          </div>

          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '760px' }}>
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Staff Member</th>
                  <th style={{ width: '15%' }}>Staff Reg ID</th>
                  <th style={{ width: '16%' }}>Campus</th>
                  <th style={{ width: '12%' }}>Statutory Entitlement</th>
                  <th style={{ width: '13%' }}>Days Taken</th>
                  <th style={{ width: '18%' }}>Remaining Allowance</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {eligibleStaff.map((staff, idx) => {
                  const sBranch = branches.find((b) => b.id === staff.branch_id) || branches[0];
                  const balance = getStaffLeaveBalance(staff.id);
                  const percentLeft = Math.round((balance.remainingAnnual / 21) * 100);

                  return (
                    <tr key={staff.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                          {staff.full_name}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {staff.job_title || staff.specialty || staff.role.replace('_', ' ').toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem', color: 'var(--crema-gold)', fontWeight: 700 }}>
                          {staff.staff_id || `AUR/${sBranch?.code || 'HQ'}/STF-${idx + 1}`}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.82rem' }}>
                        {sBranch?.name || 'Aurevia Coffee Institute'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.84rem' }}>
                          21 Days
                        </span>
                      </td>
                      <td>
                        <div>
                          <span style={{ fontWeight: 700, color: balance.annualTaken > 0 ? 'var(--crema-gold)' : 'var(--text-muted)' }}>
                            {balance.annualTaken} {balance.annualTaken === 1 ? 'day' : 'days'}
                          </span>
                          {balance.offDaysTaken > 0 && (
                            <div style={{ fontSize: '0.68rem', color: '#60A5FA' }}>
                              +{balance.offDaysTaken} off-days
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', marginBottom: '3px' }}>
                            <strong style={{ color: balance.remainingAnnual > 5 ? '#10B981' : '#EF4444' }}>
                              {balance.remainingAnnual} Days Left
                            </strong>
                            <span style={{ color: 'var(--text-muted)' }}>{percentLeft}%</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${percentLeft}%`,
                                height: '100%',
                                background: balance.remainingAnnual > 10 ? '#10B981' : balance.remainingAnnual > 5 ? '#F59E0B' : '#EF4444',
                                borderRadius: '4px',
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedStaffForModal(staff);
                            setShowRecordModal(true);
                          }}
                          style={{ padding: '5px 10px', fontSize: '0.74rem', whiteSpace: 'nowrap' }}
                        >
                          + Log Leave
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ALL REQUESTS & HISTORICAL AUDIT TRAIL */}
      {/* ========================================================================= */}
      {activeTab === 'all_history' && (
        <div className="glass-card" style={{ padding: '22px' }}>
          {/* Controls bar */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', minWidth: '240px', flex: '1', maxWidth: '340px' }}>
              <Search
                size={15}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--crema-gold)' }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search staff, leave type, or justification..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ paddingLeft: '34px', fontSize: '0.82rem' }}
              />
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface-elevated)', padding: '3px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                {[
                  { id: 'ALL', label: 'All Status' },
                  { id: 'pending', label: 'Pending' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'rejected', label: 'Rejected' },
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setStatusFilter(s.id as any)}
                    style={{
                      padding: '4px 10px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      border: 'none',
                      background: statusFilter === s.id ? 'var(--crema-gold)' : 'transparent',
                      color: statusFilter === s.id ? '#1A1412' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Leave Type Selector */}
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ fontSize: '0.76rem', padding: '4px 10px', height: 'auto' }}
              >
                <option value="ALL">All Categories</option>
                <option value="annual">Annual Leave</option>
                <option value="off_day">Official Off-Day</option>
                <option value="short">Short Leave</option>
                <option value="sick">Sick Leave</option>
                <option value="compassionate">Compassionate</option>
                <option value="maternity_paternity">Maternity/Paternity</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-container" style={{ width: '100%', overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', minWidth: '820px' }}>
              <thead>
                <tr>
                  <th style={{ width: '20%' }}>Staff Member</th>
                  <th style={{ width: '14%' }}>Campus</th>
                  <th style={{ width: '12%' }}>Category</th>
                  <th style={{ width: '15%' }}>Dates</th>
                  <th style={{ width: '8%' }}>Days</th>
                  <th style={{ width: '20%' }}>Justification / Reason</th>
                  <th style={{ width: '11%' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((req) => {
                  const staff = profiles.find((p) => p.id === req.profile_id);
                  const sBranch = branches.find((b) => b.id === req.branch_id);
                  const badge = getLeaveTypeBadge(req.leave_type);

                  return (
                    <tr key={req.id}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--text-primary)' }}>
                          {staff?.full_name || 'Staff Member'}
                        </div>
                        <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)' }}>
                          {staff?.role.replace('_', ' ').toUpperCase()}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.80rem' }}>
                        {sBranch?.name || 'Aurevia Coffee Institute'}
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '6px',
                            background: badge.bg,
                            color: badge.color,
                            border: `1px solid ${badge.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                        {req.start_date} to {req.end_date}
                      </td>
                      <td>
                        <span style={{ fontWeight: 700 }}>{req.days_count} d</span>
                      </td>
                      <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        <div>{req.reason}</div>
                        {req.review_notes && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--crema-gold)', marginTop: '2px' }}>
                            💬 {req.review_notes}
                          </div>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge badge-${
                            req.status === 'approved' ? 'paid' : req.status === 'rejected' ? 'danger' : 'pending'
                          }`}
                          style={{ fontSize: '0.7rem', padding: '3px 8px', textTransform: 'uppercase' }}
                        >
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      No staff leave records found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REVIEW & REMARKS MODAL */}
      {/* ========================================================================= */}
      {reviewingRequest && (
        <div className="modal-overlay" onClick={() => setReviewingRequest(null)} style={{ zIndex: 1300 }}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '520px', padding: '0', overflow: 'hidden' }}
          >
            {/* Header */}
            <div
              style={{
                padding: '20px 24px',
                background: 'linear-gradient(180deg, #1F1813 0%, #17120E 100%)',
                borderBottom: '1px solid rgba(212, 154, 91, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(212, 154, 91, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--crema-gold)',
                  }}
                >
                  <MessageSquare size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: '#F8F5F1' }}>
                    Review Leave & Off-Day Application
                  </h3>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                    Authorized decision by {currentProfile.full_name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn-icon"
                onClick={() => setReviewingRequest(null)}
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Application Summary Box */}
              <div
                style={{
                  background: '#1D1714',
                  border: '1px solid rgba(212, 154, 91, 0.2)',
                  borderRadius: '12px',
                  padding: '14px 16px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {profiles.find((p) => p.id === reviewingRequest.profile_id)?.full_name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(212, 154, 91, 0.15)',
                      color: 'var(--crema-gold)',
                    }}
                  >
                    {reviewingRequest.days_count} Working Days
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  📅 <strong>Period:</strong> {reviewingRequest.start_date} to {reviewingRequest.end_date}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  📝 <strong>Reason:</strong> "{reviewingRequest.reason}"
                </div>
              </div>

              {/* Reviewer Notes Field */}
              <div>
                <label className="form-label" style={{ fontSize: '0.78rem', marginBottom: '6px' }}>
                  Manager Remarks / Handover Instructions (Optional)
                </label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="e.g. Approved. Assigned instructor will cover practical sessions."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  style={{ fontSize: '0.84rem', resize: 'vertical' }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDetailedReviewSubmit('rejected')}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    color: '#EF4444',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                  }}
                >
                  Decline Application
                </button>

                <button
                  type="button"
                  disabled={isSubmittingReview}
                  onClick={() => handleDetailedReviewSubmit('approved')}
                  style={{
                    padding: '8px 22px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    border: 'none',
                    color: '#FFFFFF',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
                  }}
                >
                  {isSubmittingReview ? 'Authorizing...' : 'Authorize & Approve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECORD STAFF LEAVE MODAL */}
      {showRecordModal && (
        <RecordStaffLeaveModal
          presetStaffId={selectedStaffForModal?.id}
          isBranchManagerMode={isBranchManagerMode}
          onClose={() => {
            setShowRecordModal(false);
            setSelectedStaffForModal(null);
          }}
          onSuccess={() => {
            setActionSuccessToast('Leave / Off-day successfully registered!');
            setTimeout(() => setActionSuccessToast(null), 3000);
          }}
        />
      )}
    </div>
  );
};
