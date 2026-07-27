import React, { useState } from 'react';
import { FiDownload, FiUploadCloud, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import type { QuizQuestionInput } from '../types/quizBuilder.types';

interface ExcelImportModalProps {
  onImportComplete: (importedQuestions: QuizQuestionInput[]) => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({ onImportComplete }) => {
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedPreview, setParsedPreview] = useState<QuizQuestionInput[]>([]);

  // Function to generate and download sample CSV template file
  const handleDownloadSample = () => {
    const csvContent = 
`question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,explanation,marks
mcq,"What is the capital of France?",Paris,London,Berlin,Madrid,A,"Paris is the capital of France.",1
mcq,"Which programming language is used for web application styling?",Python,HTML,CSS,C++,C,"CSS controls visual styling.",1
subjective,"Explain the main differences between SQL and NoSQL databases.",,,,,,"Include key-value storage vs relational tables, schema flexibility, and scaling differences.",5
`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'quiz_import_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper CSV parser function
  const parseCSV = (text: string): QuizQuestionInput[] => {
    const lines: string[][] = [];
    let row = [""];
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const next = text[i + 1];

      if (c === '"') {
        if (inQuotes && next === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        row.push("");
      } else if ((c === '\r' || c === '\n') && !inQuotes) {
        if (c === '\r' && next === '\n') {
          i++;
        }
        lines.push(row.map(cell => cell.trim()));
        row = [""];
      } else {
        row[row.length - 1] += c;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row.map(cell => cell.trim()));
    }

    if (lines.length < 2) return [];

    const headers = lines[0].map(h => h.toLowerCase().replace(/[\s_]+/g, ''));
    const parsedQuestions: QuizQuestionInput[] = [];

    for (let r = 1; r < lines.length; r++) {
      const rowCells = lines[r];
      if (rowCells.length === 1 && rowCells[0] === "") continue;

      const obj: Record<string, string> = {};
      for (let c = 0; c < headers.length; c++) {
        obj[headers[c]] = c < rowCells.length ? rowCells[c] : "";
      }

      const rawType = (obj['questiontype'] || obj['type'] || 'mcq').toLowerCase();
      const isSubjective = rawType === 'subjective';

      const questionText = obj['questiontext'] || obj['question'] || '';
      if (!questionText) continue;

      parsedQuestions.push({
        question_type: isSubjective ? 'subjective' : 'mcq',
        question_text: questionText,
        option_a: isSubjective ? null : (obj['optiona'] || obj['opta'] || ''),
        option_b: isSubjective ? null : (obj['optionb'] || obj['optb'] || ''),
        option_c: isSubjective ? null : (obj['optionc'] || obj['optc'] || ''),
        option_d: isSubjective ? null : (obj['optiond'] || obj['optd'] || ''),
        correct_answer: isSubjective ? null : (obj['correctanswer'] || obj['answer'] || 'A').toUpperCase(),
        explanation: obj['explanation'] || obj['rubric'] || '',
        marks: parseInt(obj['marks']) || 1
      });
    }

    return parsedQuestions;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    setSuccessMsg(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const questions = parseCSV(text);

        if (questions.length === 0) {
          setError('No valid question rows found in file. Please ensure CSV matches the sample template format.');
          return;
        }

        setParsedPreview(questions);
        setSuccessMsg(`Successfully parsed ${questions.length} questions from file.`);
      } catch (err: any) {
        setError('Failed to parse file: ' + err.message);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (parsedPreview.length > 0) {
      onImportComplete(parsedPreview);
    }
  };

  return (
    <div style={{
      border: '1px solid var(--light-border)',
      borderRadius: '12px',
      padding: '20px',
      backgroundColor: '#f8fafc'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '700' }}>
            Import Questions from CSV / Excel File
          </h4>
          <p style={{ margin: 0, fontSize: '12px', color: 'var(--light-text-secondary)' }}>
            Upload a CSV file with question prompts, option choices, and rubrics.
          </p>
        </div>

        <button
          type="button"
          className="btn-ld btn-ld-secondary btn-ld-small"
          onClick={handleDownloadSample}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <FiDownload size={14} />
          <span>Download Sample Template</span>
        </button>
      </div>

      {/* Upload Zone */}
      <div style={{
        border: '2px dashed #cbd5e1',
        borderRadius: '12px',
        padding: '24px',
        textAlign: 'center',
        backgroundColor: '#fff',
        marginBottom: '16px'
      }}>
        <FiUploadCloud size={36} style={{ color: 'var(--light-primary)', marginBottom: '8px' }} />
        <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600' }}>
          Select or Drag & Drop CSV File
        </p>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFileUpload}
          style={{ fontSize: '12px' }}
        />
      </div>

      {error && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fca5a5',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <FiAlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          padding: '10px 14px',
          backgroundColor: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '8px',
          color: '#166534',
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '16px'
        }}>
          <FiCheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {parsedPreview.length > 0 && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '700' }}>
              Parsed Questions Preview ({parsedPreview.length})
            </span>
            <button
              type="button"
              className="btn-ld btn-ld-primary btn-ld-small"
              onClick={handleConfirmImport}
            >
              Apply Parsed Questions to Quiz
            </button>
          </div>

          <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--light-border)', borderRadius: '8px', backgroundColor: '#fff' }}>
            <table className="ld-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Type</th>
                  <th>Question Text</th>
                  <th>Marks</th>
                </tr>
              </thead>
              <tbody>
                {parsedPreview.map((q, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td>
                      <span className={`badge-ld ${q.question_type === 'subjective' ? 'badge-ld-warning' : 'badge-ld-primary'}`}>
                        {q.question_type.toUpperCase()}
                      </span>
                    </td>
                    <td>{q.question_text}</td>
                    <td>{q.marks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
