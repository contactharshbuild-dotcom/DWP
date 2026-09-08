import React, { useState, useRef } from 'react';
import { 
  FiX, 
  FiFolder, 
  FiUploadCloud, 
  FiFile, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiAlertTriangle,
  FiLoader
} from 'react-icons/fi';
import { materialBankService } from '../services/materialBankService';

interface UploadFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: number | null;
  onUploadComplete: () => Promise<void> | void;
}

interface ScannedFile {
  file: File;
  relativePath: string;
  dirPath: string; // Directory path relative to the root (e.g. "RootFolder/SubFolder")
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'skipped';
  error?: string;
}

const MAX_TOTAL_FILES = 200;
const BATCH_SIZE = 10;
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

export const UploadFolderModal: React.FC<UploadFolderModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  onUploadComplete
}) => {
  const [scannedFiles, setScannedFiles] = useState<ScannedFile[]>([]);
  const [rootFolderName, setRootFolderName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  
  // Progress state
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(0);
  const [totalBatches, setTotalBatches] = useState<number>(0);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [successCount, setSuccessCount] = useState<number>(0);
  const [failedCount, setFailedCount] = useState<number>(0);
  const [skippedCount, setSkippedCount] = useState<number>(0);

  const isCancelledRef = useRef<boolean>(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setScannedFiles([]);
    setRootFolderName('');
    setIsDragging(false);
    setIsScanning(false);
    setIsUploading(false);
    setIsFinished(false);
    setCurrentBatchIndex(0);
    setTotalBatches(0);
    setProcessedCount(0);
    setSuccessCount(0);
    setFailedCount(0);
    setSkippedCount(0);
    isCancelledRef.current = false;
  };

  const handleClose = () => {
    if (isUploading && !isFinished) {
      if (!window.confirm('An upload is currently in progress. Are you sure you want to cancel and exit?')) {
        return;
      }
      isCancelledRef.current = true;
    }
    resetState();
    onClose();
  };

  // Helper to convert Raw File list to ScannedFiles
  const processDiscoveredFiles = (rawItems: { file: File; relativePath: string }[]) => {
    if (rawItems.length === 0) return;

    // Detect root folder name from the first file with a path
    let detectedRoot = 'Uploaded Folder';
    for (const item of rawItems) {
      const parts = item.relativePath.replace(/\\/g, '/').split('/');
      if (parts.length > 1) {
        detectedRoot = parts[0];
        break;
      }
    }
    setRootFolderName(detectedRoot);

    // Limit to max 200 files
    const cappedItems = rawItems.slice(0, MAX_TOTAL_FILES);

    let skipped = 0;
    const processed: ScannedFile[] = cappedItems.map((item) => {
      const normalizedPath = item.relativePath.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      const dirPath = parts.slice(0, -1).join('/');

      const isOverSize = item.file.size > MAX_FILE_SIZE;
      if (isOverSize) {
        skipped++;
      }

      return {
        file: item.file,
        relativePath: normalizedPath,
        dirPath,
        status: isOverSize ? 'skipped' : 'pending',
        error: isOverSize ? 'Exceeds 15MB limit' : undefined
      };
    });

    setScannedFiles(processed);
    setSkippedCount(skipped);
  };

  // Handle standard folder input change (webkitdirectory)
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    setIsScanning(true);
    try {
      const items: { file: File; relativePath: string }[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        // webkitRelativePath contains the full relative path e.g. "Folder/Sub/file.pdf"
        const relativePath = file.webkitRelativePath || file.name;
        items.push({ file, relativePath });
      }
      processDiscoveredFiles(items);
    } finally {
      setIsScanning(false);
      // Reset input value so same folder can be re-selected if needed
      e.target.value = '';
    }
  };

  // Recursive directory reader for drag-and-drop
  const traverseFileSystemEntry = async (entry: any, currentPath = ''): Promise<{ file: File; relativePath: string }[]> => {
    if (entry.isFile) {
      return new Promise((resolve) => {
        entry.file(
          (file: File) => {
            const relPath = currentPath ? `${currentPath}/${file.name}` : file.name;
            resolve([{ file, relativePath: relPath }]);
          },
          () => resolve([])
        );
      });
    } else if (entry.isDirectory) {
      const dirReader = entry.createReader();
      const childEntries: any[] = await new Promise((resolve) => {
        const accumulated: any[] = [];
        const readEntriesBatch = () => {
          dirReader.readEntries(
            (entries: any[]) => {
              if (!entries.length) {
                resolve(accumulated);
              } else {
                accumulated.push(...entries);
                readEntriesBatch(); // readEntries may return in chunks
              }
            },
            () => resolve(accumulated)
          );
        };
        readEntriesBatch();
      });

      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      const subResults = await Promise.all(
        childEntries.map((child) => traverseFileSystemEntry(child, nextPath))
      );
      return subResults.flat();
    }
    return [];
  };

  // Drag and drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const items = e.dataTransfer.items;
    if (!items || items.length === 0) return;

    setIsScanning(true);
    try {
      const results: { file: File; relativePath: string }[] = [];
      const entryPromises: Promise<{ file: File; relativePath: string }[]>[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            entryPromises.push(traverseFileSystemEntry(entry));
          } else {
            const file = item.getAsFile();
            if (file) {
              results.push({ file, relativePath: file.name });
            }
          }
        }
      }

      const traversed = await Promise.all(entryPromises);
      const allFiles = [...results, ...traversed.flat()];
      processDiscoveredFiles(allFiles);
    } catch (err) {
      console.error('Failed to read dropped folder:', err);
    } finally {
      setIsScanning(false);
    }
  };

  // Start folder hierarchy creation and batched upload
  const handleStartUpload = async () => {
    const uploadQueue = scannedFiles.filter((f) => f.status === 'pending');
    if (uploadQueue.length === 0) return;

    setIsUploading(true);
    isCancelledRef.current = false;

    // 1. Gather all unique folder paths and build directory hierarchy in Material Bank
    // Directory paths are like "MyFolder", "MyFolder/Sub1", "MyFolder/Sub1/Sub2"
    const uniqueDirPaths = Array.from(
      new Set(uploadQueue.map((item) => item.dirPath).filter(Boolean))
    );

    // Sort directory paths by depth (shallowest first)
    uniqueDirPaths.sort((a, b) => a.split('/').length - b.split('/').length);

    // Cache: relative directory path string -> created/existing folderId
    const folderCache = new Map<string, number>();

    try {
      for (const dirPath of uniqueDirPaths) {
        if (isCancelledRef.current) break;

        const segments = dirPath.split('/');
        const folderName = segments[segments.length - 1];
        
        let parentFolderId = currentFolderId;
        if (segments.length > 1) {
          const parentPath = segments.slice(0, -1).join('/');
          parentFolderId = folderCache.get(parentPath) ?? currentFolderId;
        }

        // Call backend (idempotent createFolder)
        const createdFolder = await materialBankService.createFolder(folderName, parentFolderId);
        folderCache.set(dirPath, createdFolder.id);
      }
    } catch (err: any) {
      console.error('Error creating folder hierarchy:', err);
      alert('Error creating folder hierarchy: ' + (err.response?.data?.message || err.message));
      setIsUploading(false);
      return;
    }

    if (isCancelledRef.current) {
      setIsUploading(false);
      return;
    }

    // 2. Prepare batches of size BATCH_SIZE (10)
    const batches: ScannedFile[][] = [];
    for (let i = 0; i < uploadQueue.length; i += BATCH_SIZE) {
      batches.push(uploadQueue.slice(i, i + BATCH_SIZE));
    }

    setTotalBatches(batches.length);
    setCurrentBatchIndex(0);

    let success = 0;
    let failed = 0;
    let processed = 0;

    // 3. Process batches sequentially, with parallel uploads inside each batch
    for (let bIndex = 0; bIndex < batches.length; bIndex++) {
      if (isCancelledRef.current) break;

      setCurrentBatchIndex(bIndex + 1);
      const currentBatch = batches[bIndex];

      // Mark batch items as uploading in UI
      setScannedFiles((prev) =>
        prev.map((item) => {
          if (currentBatch.some((b) => b.relativePath === item.relativePath)) {
            return { ...item, status: 'uploading' };
          }
          return item;
        })
      );

      // Run parallel uploads for this batch of 10
      const batchPromises = currentBatch.map(async (item) => {
        try {
          const targetFolderId = item.dirPath ? folderCache.get(item.dirPath) ?? currentFolderId : currentFolderId;
          await materialBankService.uploadFile(item.file, targetFolderId);
          return { relativePath: item.relativePath, success: true };
        } catch (err: any) {
          const errMsg = err.response?.data?.message || err.message || 'Upload failed';
          return { relativePath: item.relativePath, success: false, error: errMsg };
        }
      });

      const results = await Promise.allSettled(batchPromises);

      // Process results and update status
      const resultMap = new Map<string, { success: boolean; error?: string }>();
      results.forEach((res) => {
        if (res.status === 'fulfilled') {
          resultMap.set(res.value.relativePath, res.value);
          if (res.value.success) {
            success++;
          } else {
            failed++;
          }
        } else {
          failed++;
        }
        processed++;
      });

      setProcessedCount(processed);
      setSuccessCount(success);
      setFailedCount(failed);

      // Update item statuses
      setScannedFiles((prev) =>
        prev.map((item) => {
          const result = resultMap.get(item.relativePath);
          if (result) {
            return {
              ...item,
              status: result.success ? 'completed' : 'failed',
              error: result.error
            };
          }
          return item;
        })
      );
    }

    setIsUploading(false);
    setIsFinished(true);

    // Notify parent to refresh contents
    try {
      await onUploadComplete();
    } catch (e) {
      console.error('Failed to refresh materials:', e);
    }
  };

  const totalValid = scannedFiles.filter((f) => f.status !== 'skipped').length;
  const progressPercent = totalValid > 0 ? Math.round((processedCount / totalValid) * 100) : 0;
  const totalSizeMB = (
    scannedFiles.reduce((acc, f) => acc + f.file.size, 0) / (1024 * 1024)
  ).toFixed(2);

  return (
    <div className="modal-overlay-ld" onClick={handleClose}>
      <div
        className="modal-content-ld"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '640px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                padding: '8px',
                borderRadius: '8px',
                background: 'rgba(79, 70, 229, 0.1)',
                color: 'var(--light-primary)'
              }}
            >
              <FiUploadCloud size={22} />
            </div>
            <div>
              <h3 className="modal-title-ld" style={{ margin: 0, fontSize: '18px' }}>
                Upload Folder
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
                Upload nested folders and files in batches of 10
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Hidden File Input for Folder Selection */}
        <input
          ref={folderInputRef}
          type="file"
          multiple
          {...({ webkitdirectory: '', directory: '' } as any)}
          style={{ display: 'none' }}
          onChange={handleFileInputChange}
          disabled={isUploading || isScanning}
        />

        {/* Modal Body */}
        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
          {/* Scanning spinner */}
          {isScanning && (
            <div style={{ padding: '30px', textAlign: 'center' }}>
              <FiLoader className="spin" size={28} style={{ color: 'var(--light-primary)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Scanning folder contents...</p>
            </div>
          )}

          {/* Initial Selection Dropzone (When no files chosen yet) */}
          {!isScanning && scannedFiles.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => folderInputRef.current?.click()}
              style={{
                border: isDragging ? '2px dashed var(--light-primary)' : '2px dashed var(--light-border-hover)',
                borderRadius: '10px',
                padding: '36px 20px',
                textAlign: 'center',
                backgroundColor: isDragging ? 'rgba(79, 70, 229, 0.1)' : 'var(--light-table-header-bg)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  margin: '0 auto 12px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(79, 70, 229, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--light-primary)'
                }}
              >
                <FiFolder size={28} />
              </div>
              <p style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: '700', color: 'var(--light-text-primary)' }}>
                Select a folder to upload
              </p>
              <p style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                Click to browse or drag & drop an entire folder here
              </p>
              <div style={{ display: 'inline-flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: 'var(--light-secondary-bg)',
                    border: '1px solid var(--light-secondary-border)',
                    borderRadius: '4px',
                    color: 'var(--light-secondary-text)',
                    fontWeight: '600'
                  }}
                >
                  Max 200 files
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: 'var(--light-secondary-bg)',
                    border: '1px solid var(--light-secondary-border)',
                    borderRadius: '4px',
                    color: 'var(--light-secondary-text)',
                    fontWeight: '600'
                  }}
                >
                  Batch size: 10
                </span>
                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 8px',
                    background: 'var(--light-secondary-bg)',
                    border: '1px solid var(--light-secondary-border)',
                    borderRadius: '4px',
                    color: 'var(--light-secondary-text)',
                    fontWeight: '600'
                  }}
                >
                  15MB max per file
                </span>
              </div>
            </div>
          )}

          {/* Folder Details and Upload Status (When files are selected) */}
          {!isScanning && scannedFiles.length > 0 && (
            <div>
              {/* Folder Summary Box */}
              <div
                style={{
                  padding: '14px 16px',
                  background: 'var(--light-table-header-bg)',
                  border: '1px solid var(--light-border)',
                  borderRadius: '8px',
                  marginBottom: '16px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiFolder size={20} style={{ color: 'var(--light-primary)' }} />
                    <span style={{ fontSize: '15px', fontWeight: '700', color: 'var(--light-text-primary)' }}>
                      {rootFolderName || 'Folder'}
                    </span>
                  </div>
                  {!isUploading && !isFinished && (
                    <button
                      type="button"
                      onClick={resetState}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '12px',
                        cursor: 'pointer',
                        textDecoration: 'underline'
                      }}
                    >
                      Choose another
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                  <span>
                    <strong>{scannedFiles.length}</strong> {scannedFiles.length === 1 ? 'file' : 'files'} found
                  </span>
                  <span>
                    Total: <strong>{totalSizeMB} MB</strong>
                  </span>
                  <span>
                    Batch Queue: <strong>{Math.ceil(totalValid / BATCH_SIZE)} batches</strong> ({BATCH_SIZE}/batch)
                  </span>
                </div>
              </div>

              {/* Warning/Info Banners */}
              {scannedFiles.length >= MAX_TOTAL_FILES && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fef3c7',
                    borderRadius: '6px',
                    color: '#b45309',
                    fontSize: '12px',
                    marginBottom: '12px'
                  }}
                >
                  <FiAlertTriangle size={16} />
                  <span>Maximum folder limit is {MAX_TOTAL_FILES} files. Remaining files were skipped.</span>
                </div>
              )}

              {skippedCount > 0 && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 14px',
                    backgroundColor: '#fff1f2',
                    border: '1px solid #ffe4e6',
                    borderRadius: '6px',
                    color: '#e11d48',
                    fontSize: '12px',
                    marginBottom: '12px'
                  }}
                >
                  <FiAlertCircle size={16} />
                  <span>
                    <strong>{skippedCount} file(s)</strong> exceed the 15MB size limit and will be skipped.
                  </span>
                </div>
              )}

              {/* Progress Bar & Live Stats when Uploading or Finished */}
              {(isUploading || isFinished) && (
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: '600', color: '#334155' }}>
                      {isUploading
                        ? `Uploading batch ${currentBatchIndex} of ${totalBatches}...`
                        : isFinished
                        ? 'Upload Finished'
                        : 'Progress'}
                    </span>
                    <span style={{ fontWeight: '700', color: 'var(--light-primary)' }}>
                      {processedCount} / {totalValid} ({progressPercent}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: '100%',
                        backgroundColor: failedCount > 0 ? '#f59e0b' : 'var(--light-primary)',
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>

                  {/* Stat badges */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '600',
                        backgroundColor: '#dcfce7',
                        color: '#15803d'
                      }}
                    >
                      ✓ {successCount} Uploaded
                    </span>
                    {failedCount > 0 && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fee2e2',
                          color: '#b91c1c'
                        }}
                      >
                        ✕ {failedCount} Failed
                      </span>
                    )}
                    {skippedCount > 0 && (
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: '600',
                          backgroundColor: '#fef3c7',
                          color: '#b45309'
                        }}
                      >
                        ⚠ {skippedCount} Skipped (&gt;15MB)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Scrollable File List */}
              <div
                style={{
                  border: '1px solid var(--light-border)',
                  borderRadius: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  backgroundColor: 'var(--light-card)'
                }}
              >
                {scannedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: idx === scannedFiles.length - 1 ? 'none' : '1px solid var(--light-border)',
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                      <FiFile size={15} style={{ color: 'var(--light-text-muted)', flexShrink: 0 }} />
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'var(--light-text-primary)'
                        }}
                        title={item.relativePath}
                      >
                        {item.relativePath}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                      <span style={{ color: '#94a3b8', fontSize: '11px' }}>
                        {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                      </span>

                      {/* Status indicator */}
                      {item.status === 'completed' && (
                        <span style={{ color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiCheckCircle size={14} /> Done
                        </span>
                      )}
                      {item.status === 'uploading' && (
                        <span style={{ color: 'var(--light-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <FiLoader className="spin" size={14} /> Uploading
                        </span>
                      )}
                      {item.status === 'failed' && (
                        <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }} title={item.error}>
                          <FiAlertCircle size={14} /> Failed
                        </span>
                      )}
                      {item.status === 'skipped' && (
                        <span style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '4px' }} title="Size > 15MB">
                          <FiAlertTriangle size={14} /> Skipped
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span style={{ color: '#94a3b8' }}>Queued</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '20px',
            paddingTop: '16px',
            borderTop: '1px solid var(--light-border)'
          }}
        >
          {isFinished ? (
            <button
              type="button"
              className="btn-ld btn-ld-primary"
              onClick={handleClose}
            >
              Done
            </button>
          ) : (
            <>
              <button
                type="button"
                className="btn-ld btn-ld-secondary"
                onClick={handleClose}
                disabled={isUploading}
              >
                Cancel
              </button>
              {isUploading ? (
                <button
                  type="button"
                  className="btn-ld btn-ld-secondary"
                  style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                  onClick={() => {
                    if (window.confirm('Pause and cancel remaining queue?')) {
                      isCancelledRef.current = true;
                    }
                  }}
                >
                  Stop Upload
                </button>
              ) : (
                <button
                  type="button"
                  className="btn-ld btn-ld-primary"
                  disabled={scannedFiles.length === 0 || totalValid === 0}
                  onClick={handleStartUpload}
                >
                  Start Upload ({totalValid} {totalValid === 1 ? 'file' : 'files'})
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
