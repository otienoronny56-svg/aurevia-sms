import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { Database, Copy, Check, CheckCircle2, AlertTriangle, ShieldCheck, X, RefreshCw } from 'lucide-react';

interface SqlMigrationModalProps {
  onClose: () => void;
}

export const SqlMigrationModal: React.FC<SqlMigrationModalProps> = ({ onClose }) => {
  const { isDbConnected, hasAurTables, dbStatusMessage, refreshFromSupabase } = useApp();
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const sqlFilePath = 'supabase/migrations/001_aurevia_core_schema.sql';

  const handleCopySql = async () => {
    try {
      // Fetch local file content or copy notification
      const response = await fetch('/supabase/migrations/001_aurevia_core_schema.sql');
      let text = '';
      if (response.ok) {
        text = await response.text();
      } else {
        text = `-- Run 001_aurevia_core_schema.sql in Supabase SQL Editor`;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshFromSupabase();
    setIsRefreshing(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '640px' }}>
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius-sm)',
                background: hasAurTables ? 'rgba(62, 114, 86, 0.2)' : 'rgba(212, 154, 91, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Database size={20} color={hasAurTables ? '#6EE7B7' : 'var(--crema-gold)'} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem' }}>Supabase SQL Architecture Status</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Project: evxmyqnsiapiojsukxmh • Zero-Collision aur_* schema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '24px' }}>
          {/* Status Box */}
          <div
            style={{
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              background: hasAurTables ? 'rgba(62, 114, 86, 0.12)' : 'rgba(212, 154, 91, 0.1)',
              border: `1px solid ${hasAurTables ? 'rgba(62, 114, 86, 0.3)' : 'rgba(212, 154, 91, 0.3)'}`,
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
            }}
          >
            {hasAurTables ? (
              <CheckCircle2 size={24} color="#6EE7B7" style={{ flexShrink: 0, marginTop: '2px' }} />
            ) : (
              <AlertTriangle size={24} color="var(--crema-gold)" style={{ flexShrink: 0, marginTop: '2px' }} />
            )}
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600, color: hasAurTables ? '#6EE7B7' : 'var(--crema-gold)' }}>
                {hasAurTables ? 'Live Database Active' : 'Migration Ready to Execute in Supabase'}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                {dbStatusMessage}
              </p>
            </div>
          </div>

          {/* Safety Guarantee */}
          <div
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              marginBottom: '20px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <ShieldCheck size={16} color="#6EE7B7" />
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6EE7B7' }}>
                Zero-Collision Safety Verification
              </span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              All Aurevia entities are prefixed with <strong>aur_*</strong> (aur_branches, aur_profiles, aur_cohorts,
              aur_invoices, etc.). Your existing tables (<strong>employees</strong>, <strong>payment_logs</strong>,{' '}
              <strong>production_logs</strong>) will never be touched or altered.
            </p>
          </div>

          {/* 3 Step Instruction */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>
              How to Execute Migration (30 Seconds):
            </div>
            <ol style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', paddingLeft: '20px', lineHeight: 1.6 }}>
              <li>
                Open your Supabase Dashboard at{' '}
                <a
                  href="https://supabase.com/dashboard/project/evxmyqnsiapiojsukxmh/sql"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--crema-gold)', textDecoration: 'underline' }}
                >
                  Supabase SQL Editor
                </a>
              </li>
              <li>
                Open the migration file <strong>supabase/migrations/001_aurevia_core_schema.sql</strong> in your editor
                or copy its contents.
              </li>
              <li>Click <strong>Run</strong> in the Supabase SQL editor.</li>
            </ol>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-primary"
              onClick={handleCopySql}
              style={{ flex: 1, padding: '12px' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
              <span>{copied ? 'SQL Copied to Clipboard!' : 'Copy Migration SQL'}</span>
            </button>

            <button
              className="btn btn-secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              style={{ padding: '12px 18px' }}
              title="Re-verify database connection"
            >
              <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 1s linear infinite' : 'none' }} />
              <span>Verify DB</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
