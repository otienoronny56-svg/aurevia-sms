import React, { useState } from 'react';
import { useApp } from '../../lib/store';
import { LabVenue } from '../../types/database.types';
import { Beaker, Plus, Trash2, X, Users, Wrench, Sparkles, AlertTriangle } from 'lucide-react';

interface ManageLabsModalProps {
  branchId?: string;
  onClose: () => void;
  onLabCreated?: (lab: LabVenue) => void;
}

export const ManageLabsModal: React.FC<ManageLabsModalProps> = ({
  branchId,
  onClose,
  onLabCreated,
}) => {
  const { labs, lessons, createLab, deleteLab } = useApp();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [capacity, setCapacity] = useState<number | ''>(12);
  const [equipmentSummary, setEquipmentSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Quick preset lab suggestions
  const SUGGESTED_LABS = [
    { name: 'Espresso Barista Lab 3', code: 'LAB-ESP-3', capacity: 10, eq: 'Commercial Espresso Stations & Scales' },
    { name: 'Cold Brew & Nitro Suite', code: 'LAB-COLD-1', capacity: 8, eq: 'Cold Drip Towers, Nitro Kegs, Kegrators' },
    { name: 'Sample Roasting & QC Lab', code: 'LAB-QC-1', capacity: 6, eq: 'Ikawa Sample Roasters, Moisture Meters, ColorTrack' },
    { name: 'Latte Art & Milk Lab', code: 'LAB-ART-1', capacity: 12, eq: 'Specialty Steam Pitchers, Dedicated Steaming Stations' },
  ];

  const handleApplyPreset = (preset: typeof SUGGESTED_LABS[0]) => {
    setName(preset.name);
    setCode(preset.code);
    setCapacity(preset.capacity);
    setEquipmentSummary(preset.eq);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Please enter a facility / lab name.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const generatedCode = code.trim().toUpperCase() || `LAB-${Math.floor(100 + Math.random() * 900)}`;
      const newLab = await createLab({
        name: name.trim(),
        code: generatedCode,
        branch_id: branchId,
        capacity: Number(capacity) || 12,
        equipment_summary: equipmentSummary.trim() || 'Standard Specialty Training Equipment',
      });

      setName('');
      setCode('');
      setCapacity(12);
      setEquipmentSummary('');
      if (onLabCreated) onLabCreated(newLab);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to create laboratory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (labId: string) => {
    const lab = labs.find((l) => l.id === labId);
    if (!lab) return;

    // Check if lessons are currently scheduled in this lab
    const hasActiveLessons = lessons.some(
      (l) => l.lab_location.trim().toLowerCase() === lab.name.trim().toLowerCase()
    );

    if (hasActiveLessons && deleteConfirmId !== labId) {
      setDeleteConfirmId(labId);
      return;
    }

    await deleteLab(labId);
    setDeleteConfirmId(null);
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        zIndex: 1300,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
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
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0,
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.55)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color)',
            background: 'var(--bg-surface-elevated)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(212, 154, 91, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--crema-gold)',
              }}
            >
              <Beaker size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Campus Laboratories & Machine Stations
              </h3>
              <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', margin: '2px 0 0 0' }}>
                Add and configure physical machine rooms for timetable booking & collision detection
              </p>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: '6px', borderRadius: '50%' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {errorMsg && (
            <div
              style={{
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

          {/* Existing Labs List */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--crema-gold)' }}>
                Active Campus Facilities ({labs.length})
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Bookable in Timetable & Lessons
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {labs.map((lab) => {
                const bookedCount = lessons.filter(
                  (l) => l.lab_location.trim().toLowerCase() === lab.name.trim().toLowerCase()
                ).length;
                const isConfirming = deleteConfirmId === lab.id;

                return (
                  <div
                    key={lab.id}
                    style={{
                      background: 'var(--bg-surface-elevated)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '12px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {lab.name}
                        </span>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.7rem',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: 'rgba(212, 154, 91, 0.15)',
                            color: 'var(--crema-gold)',
                          }}
                        >
                          {lab.code}
                        </span>
                        {bookedCount > 0 && (
                          <span className="badge badge-secondary" style={{ fontSize: '0.65rem' }}>
                            {bookedCount} {bookedCount === 1 ? 'Scheduled Lesson' : 'Scheduled Lessons'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                        <span>
                          <Users size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Capacity: <strong>{lab.capacity || 12} Trainees</strong>
                        </span>
                        {lab.equipment_summary && (
                          <span>
                            <Wrench size={12} style={{ display: 'inline', marginRight: '4px' }} />
                            {lab.equipment_summary}
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      {isConfirming ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '0.72rem', color: '#FCA5A5' }}>In use! Delete?</span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            onClick={() => handleDelete(lab.id)}
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            Yes, Remove
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setDeleteConfirmId(null)}
                            style={{ padding: '4px 8px', fontSize: '0.72rem' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => handleDelete(lab.id)}
                          style={{ padding: '6px', color: 'var(--text-muted)' }}
                          title="Delete facility"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={13} color="var(--crema-gold)" />
              <span>1-Click Preset Facilities</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SUGGESTED_LABS.map((preset) => (
                <button
                  key={preset.code}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="btn btn-secondary"
                  style={{ padding: '5px 10px', fontSize: '0.74rem' }}
                >
                  + {preset.name}
                </button>
              ))}
            </div>
          </div>

          {/* Form to Add New Lab */}
          <form
            onSubmit={handleCreate}
            style={{
              background: 'var(--bg-surface-elevated)',
              border: '1.5px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} color="var(--crema-gold)" />
              <span>Add New Laboratory Facility</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Facility / Lab Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. Espresso Lab 3 (Specialty)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Facility Code *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g. LAB-ESP-3"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  style={{ width: '100%', fontSize: '0.82rem', fontFamily: 'monospace' }}
                />
              </div>

              <div>
                <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                  Capacity (Stations) *
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={capacity}
                  min={1}
                  max={50}
                  step="any"
                  placeholder="12"
                  onChange={(e) => {
                    const val = e.target.value;
                    setCapacity(val === '' ? '' : Number(val));
                  }}
                  required
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ fontSize: '0.76rem', marginBottom: '4px' }}>
                Key Machines & Equipment Summary (Optional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="e.g. Sanremo Cafe Racer 3-Group, Puqpress, Mahlkönig E65S GBW Grinders"
                value={equipmentSummary}
                onChange={(e) => setEquipmentSummary(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting}
                style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={14} />
                <span>{isSubmitting ? 'Adding...' : 'Create Facility'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: 'var(--bg-surface-elevated)',
          }}
        >
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
