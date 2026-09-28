import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle2 } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  disabled?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
  className?: string;
  icon?: React.ReactNode;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onChange,
  options,
  disabled = false,
  placeholder = 'Select option...',
  style,
  className = '',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value);

  // Close on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', ...style }} className={className}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        style={{
          width: '100%',
          height: '38px',
          padding: '0 12px',
          background: disabled ? 'var(--bg-surface-elevated)' : 'var(--bg-input)',
          border: `1px solid ${isOpen ? 'var(--crema-gold)' : 'var(--border-medium)'}`,
          borderRadius: 'var(--radius-sm)',
          color: disabled ? 'var(--text-muted)' : 'var(--text-primary)',
          fontSize: '0.82rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.65 : 1,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
          outline: 'none',
          boxShadow: isOpen ? '0 0 0 2px var(--primary-accent-bg)' : 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
          {icon && <span style={{ color: 'var(--crema-gold)', display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
          {selectedOption?.icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{selectedOption.icon}</span>}
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={14}
          color="var(--text-muted)"
          style={{
            flexShrink: 0,
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            marginLeft: '8px',
          }}
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-bright)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            padding: '6px',
            zIndex: 1200,
            maxHeight: '260px',
            overflowY: 'auto',
            animation: 'slideUp 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '9px 10px',
                  borderRadius: 'var(--radius-xs)',
                  border: 'none',
                  background: isSelected ? 'var(--bg-active)' : 'transparent',
                  color: isSelected ? 'var(--crema-gold)' : 'var(--text-primary)',
                  fontSize: '0.82rem',
                  fontWeight: isSelected ? 700 : 500,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'background-color 0.12s ease',
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {opt.icon}
                    <span>{opt.label}</span>
                  </div>
                  {opt.sublabel && (
                    <div style={{ fontSize: '0.70rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {opt.sublabel}
                    </div>
                  )}
                </div>
                {isSelected && <CheckCircle2 size={14} color="var(--crema-gold)" style={{ flexShrink: 0 }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
