import React, { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

interface ExportActionsMenuProps {
  onExportCSV: () => void;
  onExportPDF: () => void;
  label?: string;
  disabled?: boolean;
}

export const ExportActionsMenu: React.FC<ExportActionsMenuProps> = ({
  onExportCSV,
  onExportPDF,
  label = 'Export',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={menuRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.82rem',
          padding: '7px 12px',
          fontWeight: 600,
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-medium)',
        }}
      >
        <Download size={14} color="var(--crema-gold)" />
        <span>{label}</span>
        <ChevronDown size={13} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            zIndex: 100,
            minWidth: '170px',
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-medium)',
            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
            padding: '4px',
            animation: 'fadeIn 0.15s ease-out',
          }}
        >
          <button
            type="button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '0.80rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => {
              setIsOpen(false);
              onExportCSV();
            }}
          >
            <FileSpreadsheet size={15} color="#10B981" />
            <div>
              <div>CSV Spreadsheet</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Excel / Sheets compatible</div>
            </div>
          </button>

          <button
            type="button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 12px',
              fontSize: '0.80rem',
              fontWeight: 500,
              color: 'var(--text-primary)',
              background: 'transparent',
              border: 'none',
              borderRadius: 'var(--radius-xs)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-surface-elevated)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            onClick={() => {
              setIsOpen(false);
              onExportPDF();
            }}
          >
            <FileText size={15} color="#EF4444" />
            <div>
              <div>PDF Report</div>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Formatted A4 Document</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
