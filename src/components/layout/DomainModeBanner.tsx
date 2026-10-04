import React from 'react';
import { getAppDomainMode, switchDomainMode } from '../../lib/domainConfig';
import { GraduationCap, Coffee, ArrowRightLeft, ExternalLink } from 'lucide-react';
import { useApp } from '../../lib/store';

export const DomainModeBanner: React.FC = () => {
  const currentMode = getAppDomainMode();
  const { currentRole } = useApp();

  const isStaffOrAdmin = currentRole === 'super_admin' || currentRole === 'branch_manager';

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: currentMode === 'portal' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(212, 154, 91, 0.12)',
        border: `1px solid ${currentMode === 'portal' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(212, 154, 91, 0.3)'}`,
        borderRadius: '6px',
        padding: '3px 8px',
        fontSize: '0.72rem',
        fontWeight: 600,
        color: currentMode === 'portal' ? '#10B981' : 'var(--crema-gold)',
      }}
      title={`Active Subdomain Mode: ${currentMode.toUpperCase()}. Click to switch.`}
    >
      {currentMode === 'portal' ? (
        <GraduationCap size={13} />
      ) : (
        <Coffee size={13} />
      )}
      <span>{currentMode === 'portal' ? 'Academy Portal' : 'SMS Management'}</span>

      {/* Switcher button visible for Admins/Managers or in dev */}
      {isStaffOrAdmin && (
        <button
          type="button"
          onClick={() => switchDomainMode(currentMode === 'portal' ? 'sms' : 'portal')}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0 2px',
            display: 'flex',
            alignItems: 'center',
            marginLeft: '4px',
            opacity: 0.85,
            transition: 'opacity 0.15s ease',
          }}
          title={`Switch to ${currentMode === 'portal' ? 'Aurevia SMS Management' : 'Academy Portal'}`}
        >
          <ArrowRightLeft size={11} />
        </button>
      )}
    </div>
  );
};
