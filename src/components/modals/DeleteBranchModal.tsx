import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Branch } from '../../types/database.types';
import {
  AlertTriangle,
  Trash2,
  Building2,
  Users,
  GraduationCap,
  Calendar,
  X,
  ShieldAlert,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DeleteBranchModalProps {
  branch: Branch;
  onClose: () => void;
  onSuccess?: (branchName: string) => void;
}

export const DeleteBranchModal: React.FC<DeleteBranchModalProps> = ({
  branch,
  onClose,
  onSuccess,
}) => {
  const {
    branches,
    students,
    cohorts,
    profiles,
    invoices,
    payments,
    deleteBranch,
  } = useApp();

  const [confirmText, setConfirmText] = useState('');
  const [understoodCheckbox, setUnderstoodCheckbox] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Impact calculations
  const bCohorts = cohorts.filter((c) => c.branch_id === branch.id);
  const bStudents = students.filter((s) => s.branch_id === branch.id);
  const bStaff = profiles.filter(
    (p) => p.branch_id === branch.id && p.role !== 'student'
  );
  const bInvoices = invoices.filter(
    (i) => i.branch_id === branch.id || bStudents.some((s) => s.id === i.student_id)
  );
  const bPayments = payments.filter(
    (p) => p.branch_id === branch.id || bStudents.some((s) => s.id === p.student_id)
  );
  const totalRevenue = bPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  // Safety checks
  const isOnlyBranch = branches.length <= 1;
  const isFlagship =
    branch.id === 'b1000000-0000-0000-0000-000000000001' ||
    branch.code?.toUpperCase() === 'NBO' ||
    branch.name.toLowerCase().includes('coffee institute');

  const expectedConfirmText = branch.code ? branch.code.toUpperCase() : 'DELETE';
  const isConfirmValid =
    confirmText.trim().toUpperCase() === expectedConfirmText ||
    confirmText.trim().toUpperCase() === 'DELETE';

  const canDelete = !isOnlyBranch && isConfirmValid && understoodCheckbox && !isDeleting;

  const handleDelete = async () => {
    if (!canDelete) return;
    setIsDeleting(true);
    setErrorMsg(null);

    try {
      await deleteBranch(branch.id);
      if (onSuccess) {
        onSuccess(branch.name);
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to delete branch:', err);
      setErrorMsg(err?.message || 'Failed to delete campus. Please try again.');
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        className="modal-content glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(239, 68, 68, 0.15)',
        }}
      >
        {/* HEADER */}
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(185, 28, 28, 0.08))',
            padding: '20px 24px',
            borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.2)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#EF4444',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#F87171', margin: 0 }}>
                Decommission Campus Facility
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '3px 0 0 0' }}>
                Permanent deletion and multi-system cascade assessment
              </p>
            </div>
          </div>

          <button
            className="btn btn-ghost"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '6px',
              borderRadius: '50%',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div style={{ padding: '24px', maxHeight: '75vh', overflowY: 'auto' }}>
          {/* CAMPUS IDENTITY CARD */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '14px',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
                flexShrink: 0,
              }}
            >
              <Building2 size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span className="badge badge-gold" style={{ fontSize: '0.72rem' }}>
                  CODE: {branch.code}
                </span>
                {isFlagship && (
                  <span
                    className="badge"
                    style={{
                      background: 'rgba(212, 154, 91, 0.2)',
                      color: 'var(--crema-gold)',
                      fontSize: '0.7rem',
                      border: '1px solid rgba(212, 154, 91, 0.4)',
                    }}
                  >
                    Flagship Branch
                  </span>
                )}
              </div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                {branch.name}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                {branch.address}, {branch.city} {branch.country ? `• ${branch.country}` : ''}
              </p>
            </div>
          </div>

          {/* CRITICAL WARNING: SOLE BRANCH RESTRICTION */}
          {isOnlyBranch && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <ShieldAlert size={20} color="#EF4444" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#F87171', margin: 0 }}>
                  Action Prohibited: Sole Operating Campus
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                  The Tripple T / Aurevia institution requires at least one registered regional campus. You cannot delete the only remaining campus in the system. To remove this facility, add another campus first.
                </p>
              </div>
            </div>
          )}

          {/* FLAGSHIP WARNING */}
          {!isOnlyBranch && isFlagship && (
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}
            >
              <AlertCircle size={20} color="#F59E0B" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#FBBF24', margin: 0 }}>
                  Attention: Primary Flagship Headquarters
                </h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0', lineHeight: 1.45 }}>
                  <strong>{branch.name}</strong> is designated as the primary regional headquarters. Deleting it will permanently remove all associated training infrastructure.
                </p>
              </div>
            </div>
          )}

          {/* IMPACT METRICS GRID */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
              Impacted Campus Assets & Records
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '10px',
              }}
            >
              {/* Students Metric */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: bStudents.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: bStudents.length > 0 ? '#EF4444' : 'var(--text-muted)',
                  }}
                >
                  <GraduationCap size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Trainees</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: bStudents.length > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                    {bStudents.length} Students
                  </div>
                </div>
              </div>

              {/* Cohorts Metric */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: bCohorts.length > 0 ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: bCohorts.length > 0 ? '#EF4444' : 'var(--text-muted)',
                  }}
                >
                  <Calendar size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Intake Cohorts</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: bCohorts.length > 0 ? '#EF4444' : 'var(--text-primary)' }}>
                    {bCohorts.length} Batches
                  </div>
                </div>
              </div>

              {/* Staff Metric */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                  }}
                >
                  <Users size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Staff Assigned</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {bStaff.length} Members
                  </div>
                </div>
              </div>

              {/* Invoices Metric */}
              <div
                style={{
                  background: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(212, 154, 91, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--crema-gold)',
                  }}
                >
                  <CreditCard size={18} />
                </div>
                <div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Ledger Invoices</div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {bInvoices.length} Records
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* WARNING CHECKLIST */}
          <div
            style={{
              background: 'rgba(0, 0, 0, 0.25)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '20px',
              fontSize: '0.8rem',
              color: 'var(--text-secondary)',
            }}
          >
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Decommissioning Outcomes:
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>
                <strong>Cohort Batches:</strong> All {bCohorts.length} intake schedules, calendar timetables, and virtual rooms will be permanently removed.
              </li>
              <li>
                <strong>Staff Personnel:</strong> {bStaff.length} staff member(s) will be unlinked from this campus and set to Unassigned status without deleting their user logins.
              </li>
              {bStudents.length > 0 ? (
                <li style={{ color: '#F87171' }}>
                  <strong>Enrolled Students:</strong> {bStudents.length} student KYC and enrollment record(s) currently registered at this campus will be removed from the registry.
                </li>
              ) : (
                <li>
                  <strong>Trainee Registry:</strong> No active students are currently tied to this campus.
                </li>
              )}
              <li>
                <strong>Financial Ledger:</strong> Campus fee structures and historical invoice bindings (KES {totalRevenue.toLocaleString()} in recorded receipts) will be cleared from regional analytics.
              </li>
            </ul>
          </div>

          {/* CONFIRMATION INPUT & CHECKBOX */}
          {!isOnlyBranch && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '6px',
                  }}
                >
                  Type <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>{expectedConfirmText}</span> or <span style={{ color: '#EF4444', fontFamily: 'monospace', fontWeight: 700 }}>DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder={`Enter "${expectedConfirmText}" or "DELETE"`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  disabled={isDeleting}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    fontSize: '0.88rem',
                    fontFamily: 'monospace',
                    borderColor: isConfirmValid ? '#EF4444' : undefined,
                    background: 'var(--bg-surface-elevated)',
                  }}
                  autoFocus
                />
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  cursor: isDeleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={understoodCheckbox}
                  onChange={(e) => setUnderstoodCheckbox(e.target.checked)}
                  disabled={isDeleting}
                  style={{ marginTop: '2px', accentColor: '#EF4444', cursor: 'pointer' }}
                />
                <span>
                  I understand this action is permanent and will cascade across regional databases, cohorts, and trainee rosters.
                </span>
              </label>
            </div>
          )}

          {errorMsg && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.4)',
                color: '#FCA5A5',
                fontSize: '0.82rem',
              }}
            >
              {errorMsg}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: '16px 24px',
            background: 'var(--bg-surface-elevated)',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </button>

          {!isOnlyBranch ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDelete}
              disabled={!canDelete}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                fontSize: '0.85rem',
                opacity: canDelete ? 1 : 0.45,
                cursor: canDelete ? 'pointer' : 'not-allowed',
                background: '#DC2626',
                borderColor: '#B91C1C',
                color: '#FFFFFF',
              }}
            >
              {isDeleting ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      border: '2px solid #FFFFFF',
                      borderTopColor: 'transparent',
                      animation: 'spin 0.8s linear infinite',
                    }}
                  />
                  <span>Decommissioning Campus...</span>
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  <span>Permanently Delete Campus</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ opacity: 0.8 }}
            >
              Understood
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
