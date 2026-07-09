import React from 'react';

interface StudentUser {
  id: number;
  name: string;
  email: string;
}

interface AssignContentModalProps {
  show: boolean;
  onClose: () => void;
  assignTargetType: 'material' | 'mcq' | 'practical' | null;
  assignBatches: string;
  setAssignBatches: (value: string) => void;
  assignToSpecificStudents: boolean;
  setAssignToSpecificStudents: (value: boolean) => void;
  activeStudents: StudentUser[];
  assignSelectedStudentIds: number[];
  setAssignSelectedStudentIds: React.Dispatch<React.SetStateAction<number[]>>;
  assignSaving: boolean;
  onAssignSubmit: (e: React.FormEvent) => void;
}

export const AssignContentModal: React.FC<AssignContentModalProps> = ({
  show,
  onClose,
  assignTargetType,
  assignBatches,
  setAssignBatches,
  assignToSpecificStudents,
  setAssignToSpecificStudents,
  activeStudents,
  assignSelectedStudentIds,
  setAssignSelectedStudentIds,
  assignSaving,
  onAssignSubmit
}) => {
  if (!show) return null;

  return (
    <div className="modal-overlay-ld" onClick={onClose}>
      <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3 className="modal-title-ld" style={{ textTransform: 'capitalize' }}>
          Assign {assignTargetType === 'material' ? 'Study Material' : assignTargetType === 'mcq' ? 'MCQ Exam' : 'Practical Exam'}
        </h3>
        <p className="modal-subtitle-ld">Configure which batches or individual students can access this content.</p>

        <form onSubmit={onAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group-ld">
            <label className="form-label-ld">Assigned Batches (comma-separated, leave blank for all)</label>
            <input 
              type="text" 
              className="form-input-ld" 
              placeholder="e.g. Batch A, Batch B"
              value={assignBatches} 
              onChange={(e) => setAssignBatches(e.target.value)} 
              disabled={assignToSpecificStudents}
            />
          </div>

          <div className="form-group-ld">
            <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
              <input 
                type="checkbox"
                checked={assignToSpecificStudents}
                onChange={(e) => {
                  setAssignToSpecificStudents(e.target.checked);
                  if (e.target.checked) setAssignBatches('');
                }}
              />
              <span>Assign to specific individual students instead of batches</span>
            </label>
            {assignToSpecificStudents && (
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                border: '1px solid var(--light-border)',
                borderRadius: '8px',
                padding: '10px',
                backgroundColor: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {activeStudents.length === 0 ? (
                  <span style={{ fontSize: '13px', color: 'var(--light-text-muted)' }}>No active students in classroom</span>
                ) : (
                  activeStudents.map(student => (
                    <label key={`assign-modal-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                      <input 
                        type="checkbox" 
                        checked={assignSelectedStudentIds.includes(student.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setAssignSelectedStudentIds(prev => [...prev, student.id]);
                          } else {
                            setAssignSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                          }
                        }}
                      />
                      <span>{student.name} ({student.email})</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
            <button type="button" className="btn-ld btn-ld-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-ld btn-ld-primary" disabled={assignSaving}>
              {assignSaving ? 'Saving...' : 'Save Assignments'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
