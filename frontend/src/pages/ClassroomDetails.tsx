import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiTrash2, 
  FiAlertCircle, 
  FiCheck, 
  FiCopy, 
  FiBookOpen, 
  FiUserPlus,
  FiUserCheck,
  FiX,
  FiFileText,
  FiImage,
  FiUploadCloud,
  FiExternalLink,
  FiPaperclip,
  FiFolder,
  FiFolderPlus,
  FiYoutube,
  FiLink,
  FiVideo,
  FiChevronRight,
  FiUsers,
  FiAward,
  FiClock,
  FiShield,
  FiFile,
  FiTrendingUp,
  FiActivity
} from 'react-icons/fi';
import api from '../services/api';
import DashboardLayout from '../components/DashboardLayout';

interface Teacher {
  id: number;
  name: string;
  email: string;
  status: string; // user account status (active/pending)
  ClassroomTeacher: {
    status: string; // join status (pending/approved)
    role: string;   // classroom role (co-teacher/teacher/student)
  };
}

interface Folder {
  id: number;
  classroom_id: number;
  name: string;
  created_at: string;
}

interface Resource {
  id: number;
  name: string;
  drive_file_id: string | null;
  drive_link: string;
  mime_type: string;
  folder_id: number | null;
  module_session: string | null;
  visibility: string;
  batch: string | null;
  uploader?: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
}

interface Classroom {
  id: number;
  classroom_id: number;
  name: string;
  subject: string;
  teachers: Teacher[];
}

// ----------------------------------------------------
// MCQ & Practical Types
// ----------------------------------------------------

interface MCQQuestionInput {
  id?: number;
  course?: string;
  module?: string;
  session?: string;
  topic?: string;
  question_text: string;
  option_a?: string;
  option_b?: string;
  option_c?: string;
  option_d?: string;
  correct_answer?: string; // 'A', 'B', 'C', 'D'
  explanation?: string;
  difficulty?: string; // 'Easy', 'Medium', 'Hard'
  marks: number;
  options?: Array<{ key: string; text: string }>;
}

interface MCQTest {
  id: number;
  classroom_id: number;
  title: string;
  description: string;
  total_questions: number;
  time_limit: number;
  shuffle_questions: boolean;
  shuffle_options: boolean;
  show_result_immediately: boolean;
  test_type: 'session' | 'module';
  start_window: string;
  end_window: string;
  batches: string[];
  security_tab_switch_behavior: 'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit';
  security_max_warnings: number;
  security_force_fullscreen: boolean;
  questions?: MCQQuestionInput[];
  attempts?: MCQAttempt[];
  created_at: string;
}

interface MCQAttempt {
  id: number;
  test_id: number;
  user_id: number;
  score: number;
  percentage: number;
  time_taken: number;
  responses: Record<number, string>;
  tab_switch_count: number;
  tab_switch_log: any[];
  fullscreen_exit_count: number;
  fullscreen_exit_log: any[];
  start_time: string;
  end_time?: string;
  submit_type: 'manual' | 'auto';
  status: 'started' | 'submitted';
  user?: {
    id: number;
    name: string;
    email: string;
    batch: string | null;
  };
  test?: MCQTest;
}

interface PracticalExam {
  id: number;
  classroom_id: number;
  title: string;
  instructions: string;
  due_date: string;
  total_marks: number;
  submissions?: PracticalSubmission[];
  created_at: string;
}

interface PracticalSubmission {
  id: number;
  practical_id: number;
  user_id: number;
  text_answer?: string;
  github_link?: string;
  drive_link?: string;
  submitted_files?: Array<{ name: string; url: string; file_type: string }>;
  graded: boolean;
  grade_components?: Record<string, number>;
  total_grade: number;
  feedback?: string;
  submitted_at: string;
  user?: {
    id: number;
    name: string;
    email: string;
    batch: string | null;
  };
}

// Helper to extract YouTube video ID from URL
function getYouTubeId(url: string) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Helper to parse CSV strings into key-value objects
function parseCSV(text: string): Record<string, string>[] {
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
  const results: Record<string, string>[] = [];

  for (let r = 1; r < lines.length; r++) {
    const rowCells = lines[r];
    if (rowCells.length === 1 && rowCells[0] === "") continue; // Skip empty lines

    const obj: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      if (c < rowCells.length) {
        obj[headers[c]] = rowCells[c];
      } else {
        obj[headers[c]] = "";
      }
    }
    results.push(obj);
  }

  return results;
}

const ClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  // Classroom Detail State
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs state
  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'resources' | 'mcqs' | 'practicals'>('active');

  // Share Modal State
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Folders and Resources State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  // Add Material Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'file' | 'link'>('file');
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [materialModuleSession, setMaterialModuleSession] = useState('');
  const [materialVisibility, setMaterialVisibility] = useState<'all_students' | 'specific_batch' | 'hidden'>('all_students');
  const [materialBatch, setMaterialBatch] = useState('');
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Create Folder Modal State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderCreating, setFolderCreating] = useState(false);

  // Preview Modal State
  const [previewResource, setPreviewResource] = useState<Resource | null>(null);

  // Drag state
  const [dragActive, setDragActive] = useState(false);

  // ----------------------------------------------------
  // MCQ Examination States
  // ----------------------------------------------------
  const [mcqTests, setMcqTests] = useState<MCQTest[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);

  // Test builder
  const [showTestBuilderModal, setShowTestBuilderModal] = useState(false);
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [testTimeLimit, setTestTimeLimit] = useState(30);
  const [testShuffleQuestions, setTestShuffleQuestions] = useState(false);
  const [testShuffleOptions, setTestShuffleOptions] = useState(false);
  const [testShowResultImmediately, setTestShowResultImmediately] = useState(true);
  const [testTypeVal, setTestTypeVal] = useState<'session' | 'module'>('session');
  const [testStartWindow, setTestStartWindow] = useState('');
  const [testEndWindow, setTestEndWindow] = useState('');
  const [testBatches, setTestBatches] = useState('');
  const [testSecTabSwitch, setTestSecTabSwitch] = useState<'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit'>('warning');
  const [testSecMaxWarnings, setTestSecMaxWarnings] = useState(3);
  const [testSecForceFullscreen, setTestSecForceFullscreen] = useState(false);
  const [testQuestions, setTestQuestions] = useState<MCQQuestionInput[]>([]);
  const [testBuilderSubmitting, setTestBuilderSubmitting] = useState(false);

  // Single Question builder
  const [showAddQuestionModal, setShowAddQuestionModal] = useState(false);
  const [qText, setQText] = useState('');
  const [qOptA, setQOptA] = useState('');
  const [qOptB, setQOptB] = useState('');
  const [qOptC, setQOptC] = useState('');
  const [qOptD, setQOptD] = useState('');
  const [qCorrect, setQCorrect] = useState('A');
  const [qExplanation, setQExplanation] = useState('');
  const [qDifficulty, setQDifficulty] = useState('Medium');
  const [qMarks, setQMarks] = useState(1);
  const [qCourse, setQCourse] = useState('');
  const [qModule, setQModule] = useState('');
  const [qSession, setQSession] = useState('');
  const [qTopic, setQTopic] = useState('');

  // Reusable Question Bank State
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [bankQuestions, setBankQuestions] = useState<MCQQuestionInput[]>([]);
  const [bankCourseFilter, setBankCourseFilter] = useState('');
  const [bankModuleFilter, setBankModuleFilter] = useState('');
  const [bankTopicFilter, setBankTopicFilter] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [selectedBankQuestionIds, setSelectedBankQuestionIds] = useState<number[]>([]);

  // Student Attempt proctor state
  const [activeTest, setActiveTest] = useState<MCQTest | null>(null);
  const [activeAttempt, setActiveAttempt] = useState<MCQAttempt | null>(null);
  const [activePledgeChecked, setActivePledgeChecked] = useState(false);
  const [attemptTimeRemaining, setAttemptTimeRemaining] = useState(0); // in seconds
  const [studentResponses, setStudentResponses] = useState<Record<number, string>>({});
  const [proctorWarningMsg, setProctorWarningMsg] = useState<string | null>(null);
  const [proctorWarningCount, setProctorWarningCount] = useState(0);

  // Analytics State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsTest, setAnalyticsTest] = useState<MCQTest | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // Student Attempt Result View
  const [showResultModal, setShowResultModal] = useState(false);
  const [viewAttemptDetails, setViewAttemptDetails] = useState<MCQAttempt | null>(null);
  const [resultLoading, setResultLoading] = useState(false);

  // Timer Ref for active attempt
  const timerRef = useRef<any>(null);

  // ----------------------------------------------------
  // Practical Exams States
  // ----------------------------------------------------
  const [practicals, setPracticals] = useState<PracticalExam[]>([]);
  const [practicalsLoading, setPracticalsLoading] = useState(false);

  // Practical Builder
  const [showPracticalModal, setShowPracticalModal] = useState(false);
  const [pracTitle, setPracTitle] = useState('');
  const [pracInstructions, setPracInstructions] = useState('');
  const [pracDueDate, setPracDueDate] = useState('');
  const [pracTotalMarks, setPracTotalMarks] = useState(100);
  const [pracSubmitting, setPracSubmitting] = useState(false);

  // Student Submission state
  const [selectedPrac, setSelectedPrac] = useState<PracticalExam | null>(null);
  const [showPracSubmissionModal, setShowPracSubmissionModal] = useState(false);
  const [pracTextAnswer, setPracTextAnswer] = useState('');
  const [pracGithubLink, setPracGithubLink] = useState('');
  const [pracDriveLink, setPracDriveLink] = useState('');
  const [pracFiles, setPracFiles] = useState<File[]>([]);
  const [pracSubmitLoading, setPracSubmitLoading] = useState(false);

  // Teacher Grading panel
  const [selectedPracForGrading, setSelectedPracForGrading] = useState<PracticalExam | null>(null);
  const [showGradingModal, setShowGradingModal] = useState(false);
  const [gradingSubmissions, setGradingSubmissions] = useState<PracticalSubmission[]>([]);
  const [gradingSubmissionsLoading, setGradingSubmissionsLoading] = useState(false);

  // Individual Grading Form
  const [selectedSubForGrading, setSelectedSubForGrading] = useState<PracticalSubmission | null>(null);
  const [showGradeFormModal, setShowGradeFormModal] = useState(false);
  const [gradeTextScore, setGradeTextScore] = useState(0);
  const [gradeFileScore, setGradeFileScore] = useState(0);
  const [gradeLinkScore, setGradeLinkScore] = useState(0);
  const [gradeTotalMarks, setGradeTotalMarks] = useState(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [gradeSubmitting, setGradeSubmitting] = useState(false);

  // Student grading view
  const [showStudentFeedbackModal, setShowStudentFeedbackModal] = useState(false);
  const [viewSubFeedback, setViewSubFeedback] = useState<PracticalSubmission | null>(null);

  // Fetch Classroom details
  const fetchClassroomDetails = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/classrooms/${id}`);
      setClassroom(response.data.classroom);
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch classroom details. It may not exist or you do not have permission.');
    } finally {
      setLoading(false);
    }
  };

  const fetchResources = async () => {
    setResourcesLoading(true);
    try {
      const response = await api.get(`/resources/classroom/${id}`);
      setResources(response.data.resources);
      setFolders(response.data.folders || []);
    } catch (err) {
      console.error('Failed to fetch resources:', err);
    } finally {
      setResourcesLoading(false);
    }
  };

  const fetchMcqTests = async () => {
    setMcqLoading(true);
    try {
      const response = await api.get(`/mcq/classroom/${id}`);
      setMcqTests(response.data.tests);
    } catch (err) {
      console.error('Failed to load MCQ tests:', err);
    } finally {
      setMcqLoading(false);
    }
  };

  const fetchPracticals = async () => {
    setPracticalsLoading(true);
    try {
      const response = await api.get(`/practical/classroom/${id}`);
      setPracticals(response.data.practicals);
    } catch (err) {
      console.error('Failed to load practicals:', err);
    } finally {
      setPracticalsLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroomDetails();
    fetchResources();
    fetchMcqTests();
    fetchPracticals();
    // Reset folder view
    setCurrentFolderId(null);
  }, [id]);

  // Handle setting default tab based on role
  useEffect(() => {
    if (user?.role === 'student') {
      setActiveTab('resources');
    }
  }, [user]);

  const handleApproveTeacher = async (teacherId: number) => {
    try {
      await api.post(`/classrooms/${id}/teachers/${teacherId}/approve`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve teacher request.');
    }
  };

  const handleRejectTeacher = async (teacherId: number, isPending: boolean = true) => {
    const confirmMessage = isPending
      ? 'Are you sure you want to reject this join request?'
      : 'Are you sure you want to remove this teacher from the classroom?';
      
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await api.delete(`/classrooms/${id}/teachers/${teacherId}/reject`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove/reject teacher.');
    }
  };

  const handleUpgradeTeacher = async (teacherId: number) => {
    if (!window.confirm('Are you sure you want to upgrade this teacher to the Teacher role?')) {
      return;
    }

    try {
      await api.post(`/classrooms/${id}/teachers/${teacherId}/upgrade`);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upgrade teacher role.');
    }
  };

  // Multer & File upload validations
  const validateFile = (file: File): boolean => {
    const allowedExtensions = ['.pdf', '.ppt', '.pptx', '.doc', '.docx', '.xls', '.xlsx', '.zip', '.mp4', '.webm'];
    const fileExt = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      alert('Invalid file format. Allowed formats: PDF, PPT, PPTX, DOC, DOCX, XLS, XLSX, ZIP, MP4, WebM.');
      return false;
    }

    if (file.size > 50 * 1024 * 1024) { // 50MB (FR-MAT-04)
      alert('File size exceeds the 50 MB limit.');
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setMaterialName(file.name);
        setAddType('file');
        setMaterialVisibility('all_students');
        setMaterialBatch('');
        setMaterialModuleSession('');
        setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
        setShowAddModal(true);
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (validateFile(file)) {
        setSelectedFile(file);
        setMaterialName(file.name);
        setAddType('file');
        setMaterialVisibility('all_students');
        setMaterialBatch('');
        setMaterialModuleSession('');
        setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
        setShowAddModal(true);
      }
    }
  };

  // Submit link or upload file
  const handleAddMaterialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addType === 'link' && (!materialName || !materialLink)) {
      alert('Material name and link are required.');
      return;
    }
    if (addType === 'file' && !selectedFile) {
      alert('Please select a file to upload.');
      return;
    }

    setUploading(true);

    try {
      const folderVal = selectedFolderId === 'root' ? '' : selectedFolderId;

      if (addType === 'file' && selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('classroomId', id || '');
        formData.append('folderId', folderVal);
        formData.append('moduleSession', materialModuleSession);
        formData.append('visibility', materialVisibility);
        formData.append('batch', materialBatch);

        const response = await api.post('/resources/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResources(prev => [response.data.resource, ...prev]);
        alert('File uploaded successfully!');
      } else {
        // Link Upload
        const response = await api.post('/resources/link', {
          classroomId: id,
          name: materialName,
          link: materialLink,
          folderId: folderVal,
          moduleSession: materialModuleSession,
          visibility: materialVisibility,
          batch: materialBatch
        });
        setResources(prev => [response.data.resource, ...prev]);
        alert('Link added successfully!');
      }

      setShowAddModal(false);
      setSelectedFile(null);
      setMaterialName('');
      setMaterialLink('');
      setMaterialModuleSession('');
      setMaterialBatch('');
      setMaterialVisibility('all_students');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to add study material.');
    } finally {
      setUploading(false);
    }
  };

  // Folder creation
  const handleCreateFolderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) {
      alert('Folder name is required.');
      return;
    }

    setFolderCreating(true);
    try {
      const response = await api.post('/resources/folders', {
        classroomId: id,
        name: newFolderName.trim()
      });
      setFolders(prev => [...prev, response.data.folder]);
      setShowFolderModal(false);
      setNewFolderName('');
      alert('Folder created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create folder.');
    } finally {
      setFolderCreating(false);
    }
  };

  // Delete Resource
  const handleDeleteResource = async (resourceId: number) => {
    if (!window.confirm('Are you sure you want to delete this resource?')) {
      return;
    }

    try {
      await api.delete(`/resources/${resourceId}`);
      setResources(prev => prev.filter(r => r.id !== resourceId));
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete resource.');
    }
  };

  // Delete Folder
  const handleDeleteFolder = async (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering folder click navigation
    if (!window.confirm('Warning: Deleting this folder will delete all materials inside it. Proceed?')) {
      return;
    }

    try {
      await api.delete(`/resources/folders/${folderId}`);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      setResources(prev => prev.filter(r => r.folder_id !== folderId));
      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      alert('Folder deleted successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to delete folder.');
    }
  };

  const copyToClipboard = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Partition teachers by join status
  const activeTeachers = classroom?.teachers.filter(t => t.ClassroomTeacher?.status === 'approved') || [];
  const pendingRequests = classroom?.teachers.filter(t => t.ClassroomTeacher?.status === 'pending') || [];

  // Generate generic shareable link for this classroom ID
  const inviteLink = classroom ? `http://localhost:5173/join-classroom/${classroom.classroom_id}` : '';

  // Filter resources and folders for display
  const currentFolders = currentFolderId === null ? folders : [];
  const currentResources = resources.filter(resrc => resrc.folder_id === currentFolderId);

  // Check if resource is previewable
  const isPreviewable = (resrc: Resource): boolean => {
    const isPDF = resrc.mime_type === 'application/pdf' || resrc.name.toLowerCase().endsWith('.pdf');
    const isVideo = resrc.mime_type.startsWith('video/') || resrc.mime_type === 'youtube' || resrc.name.toLowerCase().endsWith('.mp4') || resrc.name.toLowerCase().endsWith('.webm');
    return isPDF || isVideo;
  };


  // ----------------------------------------------------
  // MCQ Examination Logic
  // ----------------------------------------------------

  // Create MCQ Test Submit
  const handleCreateTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (testQuestions.length === 0) {
      alert('You must add at least 1 question to the test.');
      return;
    }

    setTestBuilderSubmitting(true);
    try {
      const batchesList = testBatches ? testBatches.split(',').map(b => b.trim()) : [];
      const response = await api.post('/mcq/tests', {
        classroomId: id,
        title: testTitle,
        description: testDescription,
        timeLimit: testTimeLimit,
        shuffleQuestions: testShuffleQuestions,
        shuffleOptions: testShuffleOptions,
        showResultImmediately: testShowResultImmediately,
        testType: testTypeVal,
        startWindow: testStartWindow,
        endWindow: testEndWindow,
        batches: batchesList,
        securityTabSwitchBehavior: testSecTabSwitch,
        securityMaxWarnings: testSecMaxWarnings,
        securityForceFullscreen: testSecForceFullscreen,
        questions: testQuestions
      });

      setMcqTests(prev => [response.data.test, ...prev]);
      setShowTestBuilderModal(false);
      setTestTitle('');
      setTestDescription('');
      setTestTimeLimit(30);
      setTestQuestions([]);
      alert('MCQ Test created successfully!');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create MCQ test.');
    } finally {
      setTestBuilderSubmitting(false);
    }
  };

  // Add Question Local to Test Builder
  const handleAddQuestionLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !qOptA || !qOptB || !qOptC || !qOptD) {
      alert('Please fill out question text and all options.');
      return;
    }

    const newQ: MCQQuestionInput = {
      question_text: qText,
      option_a: qOptA,
      option_b: qOptB,
      option_c: qOptC,
      option_d: qOptD,
      correct_answer: qCorrect,
      explanation: qExplanation,
      difficulty: qDifficulty,
      marks: qMarks,
      course: qCourse,
      module: qModule,
      session: qSession,
      topic: qTopic
    };

    setTestQuestions(prev => [...prev, newQ]);
    setShowAddQuestionModal(false);

    // Reset fields
    setQText('');
    setQOptA('');
    setQOptB('');
    setQOptC('');
    setQOptD('');
    setQCorrect('A');
    setQExplanation('');
  };

  // Import MCQ Questions from CSV file
  const handleCSVImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const rows = parseCSV(text);
        if (rows.length === 0) {
          alert('CSV file is empty or could not be parsed.');
          return;
        }

        const mappedQuestions: MCQQuestionInput[] = [];
        let skippedRows = 0;

        for (const row of rows) {
          const keys = Object.keys(row);
          const findVal = (possibleKeys: string[]) => {
            const key = keys.find(k => possibleKeys.includes(k.toLowerCase().replace(/[\s_]+/g, '')));
            return key ? row[key] : '';
          };

          const qText = findVal(['questiontext', 'question', 'text', 'question_text']);
          const optA = findVal(['optiona', 'a', 'option_a']);
          const optB = findVal(['optionb', 'b', 'option_b']);
          const optC = findVal(['optionc', 'c', 'option_c']);
          const optD = findVal(['optiond', 'd', 'option_d']);
          let correct = findVal(['correctanswer', 'correct', 'answer', 'correct_answer']).toUpperCase().trim();

          if (!['A', 'B', 'C', 'D'].includes(correct)) {
            correct = 'A'; // fallback
          }

          const explanation = findVal(['explanation']);
          const difficulty = findVal(['difficulty']) || 'Medium';
          const marksVal = findVal(['marks', 'mark', 'points']);
          const marks = parseInt(marksVal) || 1;
          const course = findVal(['course']);
          const module = findVal(['module']);
          const session = findVal(['session']);
          const topic = findVal(['topic']);

          if (!qText || !optA || !optB) {
            skippedRows++;
            continue;
          }

          mappedQuestions.push({
            question_text: qText,
            option_a: optA,
            option_b: optB,
            option_c: optC,
            option_d: optD,
            correct_answer: correct,
            explanation,
            difficulty,
            marks,
            course,
            module,
            session,
            topic
          });
        }

        if (mappedQuestions.length === 0) {
          alert('No valid questions found. Ensure CSV headers are present (e.g. question, A, B, C, D, correct).');
          return;
        }

        setTestQuestions(prev => [...prev, ...mappedQuestions]);
        let msg = `Successfully imported ${mappedQuestions.length} questions from CSV.`;
        if (skippedRows > 0) {
          msg += ` (Skipped ${skippedRows} rows missing question text or options A/B)`;
        }
        alert(msg);
      } catch (err) {
        console.error(err);
        alert('Failed to parse CSV file.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    event.target.value = '';
  };

  // Load Reusable Question Bank
  const loadQuestionBank = async () => {
    setBankLoading(true);
    try {
      const response = await api.get('/mcq/bank', {
        params: {
          course: bankCourseFilter,
          module: bankModuleFilter,
          topic: bankTopicFilter
        }
      });
      setBankQuestions(response.data.questions);
    } catch (err) {
      console.error(err);
    } finally {
      setBankLoading(false);
    }
  };

  // Add Question to Reusable Bank directly
  const handleAddQuestionToBank = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qText || !qOptA || !qOptB || !qOptC || !qOptD) {
      alert('Please fill out question text and all options.');
      return;
    }

    try {
      const response = await api.post('/mcq/bank', {
        course: qCourse,
        module: qModule,
        session: qSession,
        topic: qTopic,
        question_text: qText,
        option_a: qOptA,
        option_b: qOptB,
        option_c: qOptC,
        option_d: qOptD,
        correct_answer: qCorrect,
        explanation: qExplanation,
        difficulty: qDifficulty,
        marks: qMarks
      });

      setBankQuestions(prev => [response.data.question, ...prev]);
      alert('Question added to Question Bank!');
      // Reset fields
      setQText('');
      setQOptA('');
      setQOptB('');
      setQOptC('');
      setQOptD('');
      setQCorrect('A');
      setQExplanation('');
    } catch (err: any) {
      console.error(err);
      alert('Failed to save question to bank.');
    }
  };

  // Pull Selected bank questions into Test Builder
  const handlePullQuestionsToTest = () => {
    const selected = bankQuestions.filter(q => selectedBankQuestionIds.includes(q.id!));
    setTestQuestions(prev => [...prev, ...selected]);
    setShowQuestionBankModal(false);
    setSelectedBankQuestionIds([]);
    alert(`Imported ${selected.length} questions from Bank!`);
  };

  // Clone MCQ Test
  const handleCloneTest = async (testId: number) => {
    if (!window.confirm('Clone this test?')) return;
    try {
      const response = await api.post(`/mcq/tests/${testId}/clone`);
      setMcqTests(prev => [response.data.test, ...prev]);
      alert('Test cloned successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to clone test.');
    }
  };

  // Start Attempt
  const handleStartAttempt = async (test: MCQTest) => {
    if (!activePledgeChecked) {
      alert('You must confirm the honor pledge first.');
      return;
    }

    try {
      const response = await api.post('/mcq/attempts/start', { testId: test.id });
      const attempt = response.data.attempt;
      
      // Fetch full details of test for attempt (shuffled questions/options)
      const testDetailsRes = await api.get(`/mcq/tests/${test.id}`);
      
      setActiveTest(testDetailsRes.data.test);
      setActiveAttempt(attempt);
      setStudentResponses({});
      setProctorWarningCount(0);
      setProctorWarningMsg(null);
      setAttemptTimeRemaining(test.time_limit * 60);

      // Force Fullscreen if configured
      if (test.security_force_fullscreen) {
        try {
          await document.documentElement.requestFullscreen();
        } catch (fErr) {
          console.error('Failed to trigger fullscreen:', fErr);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to start attempt.');
    }
  };

  // Submit Attempt (Manual or Auto)
  const handleAttemptSubmit = async (isAuto = false) => {
    if (!activeAttempt || !activeTest) return;

    // Clear active timers
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      await api.post(`/mcq/attempts/${activeAttempt.id}/submit`, {
        responses: studentResponses,
        submitType: isAuto ? 'auto' : 'manual'
      });

      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error(err));
      }

      alert(isAuto ? 'Time is up! Your exam has been automatically submitted.' : 'Exam submitted successfully.');
      setActiveAttempt(null);
      setActiveTest(null);
      fetchMcqTests(); // refresh lists
    } catch (err) {
      console.error(err);
      alert('Failed to submit exam attempt.');
    }
  };

  // Timer Tick for attempt
  useEffect(() => {
    if (!activeAttempt || attemptTimeRemaining <= 0) {
      if (activeAttempt && attemptTimeRemaining === 0) {
        handleAttemptSubmit(true);
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setAttemptTimeRemaining(prev => prev - 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeAttempt, attemptTimeRemaining]);

  // Tab switch hook for security
  const handleTabSwitch = async () => {
    if (!activeAttempt || !activeTest) return;

    try {
      const response = await api.post(`/mcq/attempts/${activeAttempt.id}/log-event`, {
        eventType: 'tab_switch',
        duration: 3
      });

      const updatedAttempt = response.data.attempt;
      const count = updatedAttempt.tab_switch_count;
      setProctorWarningCount(count);

      if (response.data.triggeredAutoSubmit) {
        if (timerRef.current) clearInterval(timerRef.current);
        alert('EXAM TERMINATED: Too many tab switches detected. Your exam has been automatically submitted.');
        setActiveAttempt(null);
        setActiveTest(null);
        fetchMcqTests();
      } else {
        setProctorWarningMsg(`WARNING: Tab switch detected! You must focus on your exam window. Switch count: ${count} / ${activeTest.security_max_warnings}.`);
      }
    } catch (err) {
      console.error('Failed to log proctor tab event:', err);
    }
  };

  // Fullscreen exit hook for security
  const handleFullscreenExit = async () => {
    if (!activeAttempt || !activeTest) return;

    try {
      await api.post(`/mcq/attempts/${activeAttempt.id}/log-event`, {
        eventType: 'fullscreen_exit'
      });

      alert('FULLSCREEN EXIT DETECTED: This exit has been logged in your proctor report.');
    } catch (err) {
      console.error('Failed to log proctor fullscreen event:', err);
    }
  };

  // Monitor Window Focus / Tab Switching
  useEffect(() => {
    if (!activeAttempt) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitch();
      }
    };

    const handleBlur = () => {
      handleTabSwitch();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
    };
  }, [activeAttempt, activeTest]);

  // Monitor Fullscreen changes
  useEffect(() => {
    if (!activeAttempt || !activeTest?.security_force_fullscreen) return;

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        handleFullscreenExit();
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeAttempt, activeTest]);

  // Open attempt analytics
  const handleOpenAnalytics = async (testId: number) => {
    setAnalyticsLoading(true);
    setShowAnalyticsModal(true);
    try {
      const response = await api.get(`/mcq/tests/${testId}/analytics`);
      setAnalyticsData(response.data.analytics);
      const test = mcqTests.find(t => t.id === testId);
      if (test) setAnalyticsTest(test);
    } catch (err) {
      console.error(err);
      alert('Failed to load attempt analytics.');
      setShowAnalyticsModal(false);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Open result details
  const handleViewResultDetails = async (attemptId: number) => {
    setResultLoading(true);
    setShowResultModal(true);
    try {
      const response = await api.get(`/mcq/attempts/${attemptId}`);
      setViewAttemptDetails(response.data.attempt);
    } catch (err) {
      console.error(err);
      alert('Failed to load result details.');
      setShowResultModal(false);
    } finally {
      setResultLoading(false);
    }
  };


  // ----------------------------------------------------
  // Practical Exam Logic
  // ----------------------------------------------------

  // Create practical
  const handleCreatePracticalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pracTitle || !pracInstructions || !pracDueDate) {
      alert('Please fill out all fields.');
      return;
    }

    setPracSubmitting(true);
    try {
      const response = await api.post('/practical', {
        classroomId: id,
        title: pracTitle,
        instructions: pracInstructions,
        dueDate: pracDueDate,
        totalMarks: pracTotalMarks
      });

      setPracticals(prev => [...prev, response.data.practical]);
      setShowPracticalModal(false);
      setPracTitle('');
      setPracInstructions('');
      setPracDueDate('');
      alert('Practical Exam created successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to create practical exam.');
    } finally {
      setPracSubmitting(false);
    }
  };

  // Student upload attachment
  const handlePracFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const list = Array.from(e.target.files);
      // Validate all files < 50MB
      const valid = list.every(f => f.size <= 50 * 1024 * 1024);
      if (!valid) {
        alert('One or more files exceed the 50 MB limit.');
        return;
      }
      setPracFiles(prev => [...prev, ...list]);
    }
  };

  // Submit Practical Task
  const handlePracSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrac) return;

    setPracSubmitLoading(true);
    try {
      const formData = new FormData();
      formData.append('textAnswer', pracTextAnswer);
      formData.append('githubLink', pracGithubLink);
      formData.append('driveLink', pracDriveLink);
      
      pracFiles.forEach(file => {
        formData.append('files', file);
      });

      await api.post(`/practical/${selectedPrac.id}/submit`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert('Practical exam submitted successfully!');
      setShowPracSubmissionModal(false);
      setPracTextAnswer('');
      setPracGithubLink('');
      setPracDriveLink('');
      setPracFiles([]);
      fetchPracticals();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to upload practical submission.');
    } finally {
      setPracSubmitLoading(false);
    }
  };

  // Open submissions for grading
  const handleOpenGrading = async (prac: PracticalExam) => {
    setSelectedPracForGrading(prac);
    setGradingSubmissionsLoading(true);
    setShowGradingModal(true);
    try {
      const response = await api.get(`/practical/${prac.id}/submissions`);
      setGradingSubmissions(response.data.submissions);
    } catch (err) {
      console.error(err);
      alert('Failed to load submissions.');
      setShowGradingModal(false);
    } finally {
      setGradingSubmissionsLoading(false);
    }
  };

  // Save Grade
  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubForGrading) return;

    setGradeSubmitting(true);
    try {
      const components = {
        text_answer: gradeTextScore,
        files: gradeFileScore,
        links: gradeLinkScore
      };

      await api.post(`/practical/submissions/${selectedSubForGrading.id}/grade`, {
        gradeComponents: components,
        totalGrade: gradeTotalMarks,
        feedback: gradeFeedback
      });

      alert('Graded successfully!');
      setShowGradeFormModal(false);
      
      // reload submissions list
      if (selectedPracForGrading) {
        handleOpenGrading(selectedPracForGrading);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to save grade.');
    } finally {
      setGradeSubmitting(false);
    }
  };

  // Format date helper
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <DashboardLayout>
      {/* Active student exam attempt fullscreen overlay (locked view) */}
      {activeAttempt && activeTest && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#f3f4f6',
          zIndex: 9999,
          overflowY: 'auto',
          padding: '24px 16px',
          fontFamily: 'system-ui, sans-serif'
        }}>
          {/* Pledge Screen */}
          {activeAttempt.status === 'started' && !activePledgeChecked ? (
            <div style={{ maxWidth: '600px', margin: '80px auto', backgroundColor: 'white', borderRadius: '16px', padding: '32px', boxShadow: '0 10px 25px rgba(0,0,0,0.08)' }}>
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <FiShield size={48} style={{ color: 'var(--light-primary)' }} />
                <h2 style={{ fontWeight: 700, marginTop: '12px' }}>Academic Integrity Pledge</h2>
                <p style={{ color: 'var(--light-text-secondary)', fontSize: '14px', marginTop: '6px' }}>
                  Please confirm the honor pledge before beginning the examination.
                </p>
              </div>

              <div style={{ padding: '16px', backgroundColor: 'var(--light-bg-hover)', borderRadius: '8px', borderLeft: '4px solid var(--light-primary)', fontSize: '14.5px', lineHeight: '1.6', color: 'var(--light-text)', marginBottom: '24px' }}>
                "I pledge my honor as a student that I have not and will not give or receive unauthorized aid on this examination. I understand that my tab switches, loss of browser focus, and fullscreen exits will be actively monitored and logged."
              </div>

              <label style={{ display: 'flex', gap: '10px', alignItems: 'center', cursor: 'pointer', marginBottom: '32px' }}>
                <input 
                  type="checkbox" 
                  checked={activePledgeChecked} 
                  onChange={(e) => setActivePledgeChecked(e.target.checked)} 
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '14px', fontWeight: '500', color: 'var(--light-text)' }}>I confirm and agree to this pledge.</span>
              </label>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button 
                  className="btn-ld btn-ld-secondary" 
                  style={{ flex: 1 }}
                  onClick={() => {
                    setActiveAttempt(null);
                    setActiveTest(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-ld btn-ld-primary" 
                  style={{ flex: 2 }}
                  disabled={!activePledgeChecked}
                  onClick={() => handleStartAttempt(activeTest)}
                >
                  Start Exam
                </button>
              </div>
            </div>
          ) : (
            /* Active questions panel */
            <div style={{ maxWidth: '850px', margin: '0 auto' }}>
              {/* Header bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>{activeTest.title}</h3>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                    Total Questions: {activeTest.total_questions} • Time Limit: {activeTest.time_limit} mins
                    {proctorWarningCount > 0 && ` • Warnings: ${proctorWarningCount}/${activeTest.security_max_warnings}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: attemptTimeRemaining < 60 ? '#ef4444' : 'var(--light-primary)', fontWeight: 700, fontSize: '18px' }}>
                    <FiClock />
                    <span>
                      {Math.floor(attemptTimeRemaining / 60)}:
                      {String(attemptTimeRemaining % 60).padStart(2, '0')}
                    </span>
                  </div>

                  <button className="btn-ld btn-ld-primary" onClick={() => handleAttemptSubmit(false)}>
                    Submit Exam
                  </button>
                </div>
              </div>

              {/* Proctor Warning Toast */}
              {proctorWarningMsg && (
                <div style={{ padding: '12px 16px', backgroundColor: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', color: '#b91c1c', fontWeight: '600', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiAlertCircle size={20} />
                    <span>{proctorWarningMsg}</span>
                  </div>
                  <button 
                    onClick={() => setProctorWarningMsg(null)}
                    style={{ background: 'transparent', border: 'none', color: '#b91c1c', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Questions list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '40px' }}>
                {activeTest.questions?.map((q, idx) => (
                  <div key={q.id} style={{ backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span style={{ fontWeight: '700', color: 'var(--light-primary)' }}>Question {idx + 1}</span>
                      <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)', fontWeight: '600' }}>{q.marks} Marks</span>
                    </div>

                    <p style={{ fontSize: '16px', fontWeight: '600', marginBottom: '20px', whiteSpace: 'pre-wrap' }}>{q.question_text}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {q.options?.map((opt: any) => {
                        const isSelected = studentResponses[q.id!] === opt.key;
                        return (
                          <label 
                            key={opt.key}
                            style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '12px', 
                              padding: '12px 16px', 
                              borderRadius: '8px', 
                              border: isSelected ? '2px solid var(--light-primary)' : '1px solid var(--light-border)',
                              backgroundColor: isSelected ? 'var(--light-primary-glow)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            <input 
                              type="radio" 
                              name={`q-${q.id}`} 
                              value={opt.key}
                              checked={isSelected}
                              onChange={() => {
                                setStudentResponses(prev => ({ ...prev, [q.id!]: opt.key }));
                              }}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: '700', minWidth: '20px' }}>{opt.key}.</span>
                            <span style={{ fontSize: '14.5px' }}>{opt.text}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Header / Navigation bar */}
      <div className="ld-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button 
            className="btn-ld btn-ld-secondary btn-ld-small" 
            style={{ padding: '8px' }}
            onClick={() => navigate('/')}
          >
            <FiArrowLeft size={18} />
          </button>
          <div className="ld-header-left">
            <h2 className="ld-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiBookOpen style={{ color: 'var(--light-primary)' }} />
              <span>{classroom?.name || 'Classroom Details'}</span>
            </h2>
            <span className="ld-subtitle">
              Subject: {classroom?.subject} • Classroom ID: {classroom?.classroom_id}
              {user?.role === 'student' && user?.batch && ` • Batch: ${user.batch}`}
            </span>
          </div>
        </div>

        {classroom && user?.role === 'admin' && (
          <button className="btn-ld btn-ld-primary" onClick={() => setShowModal(true)}>
            <FiPlus size={18} />
            <span>Invite Teacher</span>
          </button>
        )}
      </div>

      {error && (
        <div className="alert-ld alert-ld-error">
          <FiAlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', display: 'flex', justifyContent: 'center' }}>
          <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '40px', height: '40px' }}></span>
        </div>
      ) : classroom ? (
        <div className="ld-card">
          {/* Tabs header */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--light-border)', marginBottom: '24px' }}>
            {user?.role !== 'student' && (
              <>
                <button
                  onClick={() => setActiveTab('active')}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'active' ? '2px solid var(--light-primary)' : '2px solid transparent',
                    color: activeTab === 'active' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    outline: 'none'
                  }}
                >
                  Active Teachers ({activeTeachers.length})
                </button>
                {user?.role === 'admin' && (
                  <button
                    onClick={() => setActiveTab('pending')}
                    style={{
                      padding: '12px 20px',
                      background: 'transparent',
                      border: 'none',
                      borderBottom: activeTab === 'pending' ? '2px solid var(--light-primary)' : '2px solid transparent',
                      color: activeTab === 'pending' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      fontSize: '14px',
                      outline: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <span>Join Requests</span>
                    {pendingRequests.length > 0 && (
                      <span style={{
                        backgroundColor: '#ef4444',
                        color: 'white',
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '99px',
                        fontWeight: '700'
                      }}>
                        {pendingRequests.length}
                      </span>
                    )}
                  </button>
                )}
              </>
            )}
            <button
              onClick={() => setActiveTab('resources')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'resources' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'resources' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiPaperclip size={16} />
              <span>Study Materials</span>
            </button>
            <button
              onClick={() => setActiveTab('mcqs')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'mcqs' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'mcqs' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiAward size={16} />
              <span>MCQ Exams</span>
            </button>
            <button
              onClick={() => setActiveTab('practicals')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'practicals' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'practicals' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiActivity size={16} />
              <span>Practical Exams</span>
            </button>
          </div>

          {/* Active Teachers Tab */}
          {activeTab === 'active' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiUsers style={{ color: 'var(--light-primary)' }} />
                  <span>Active Teachers</span>
                </h3>
              </div>

              {activeTeachers.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
                  <FiUsers size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                  <h4>No active teachers found</h4>
                </div>
              ) : (
                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        {user?.role === 'admin' && <th style={{ textAlign: 'right' }}>Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {activeTeachers.map((teacher) => (
                        <tr key={`teacher-${teacher.id}`}>
                          <td style={{ fontWeight: '600' }}>{teacher.name}</td>
                          <td>{teacher.email}</td>
                          <td>
                            {teacher.ClassroomTeacher?.role === 'teacher' ? (
                              <span className="badge-ld badge-ld-success">Teacher</span>
                            ) : (
                              <span className="badge-ld badge-ld-secondary">Co-Teacher</span>
                            )}
                          </td>
                          {user?.role === 'admin' && (
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                                {teacher.ClassroomTeacher?.role === 'co-teacher' && (
                                  <button
                                    className="btn-ld btn-ld-primary btn-ld-small"
                                    onClick={() => handleUpgradeTeacher(teacher.id)}
                                  >
                                    <FiUserCheck size={13} />
                                    <span>Upgrade to Teacher</span>
                                  </button>
                                )}
                                {teacher.id !== user.id && (
                                  <button
                                    className="btn-ld btn-ld-danger btn-ld-small"
                                    onClick={() => handleRejectTeacher(teacher.id, false)}
                                  >
                                    <FiTrash2 size={13} />
                                    <span>Remove</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Pending Teacher Join Requests Tab */}
          {activeTab === 'pending' && user?.role === 'admin' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiUserPlus style={{ color: 'var(--light-primary)' }} />
                  <span>Join Requests</span>
                </h3>
              </div>

              {pendingRequests.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
                  <FiUserPlus size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                  <h4>No pending join requests</h4>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Share the invite link with teachers to let them request to join.</p>
                </div>
              ) : (
                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => (
                        <tr key={`request-${request.id}`}>
                          <td style={{ fontWeight: '600' }}>{request.name}</td>
                          <td>{request.email}</td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                              <button
                                className="btn-ld btn-ld-primary btn-ld-small"
                                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                                onClick={() => handleApproveTeacher(request.id)}
                              >
                                <FiUserCheck size={13} />
                                <span>Approve</span>
                              </button>
                              <button
                                className="btn-ld btn-ld-danger btn-ld-small"
                                onClick={() => handleRejectTeacher(request.id, true)}
                              >
                                <FiX size={13} />
                                <span>Reject</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <div>
              {/* Breadcrumb path navigation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', fontWeight: '600' }}>
                <span 
                  style={{ color: currentFolderId === null ? 'var(--light-text)' : 'var(--light-primary)', cursor: currentFolderId === null ? 'default' : 'pointer' }}
                  onClick={() => setCurrentFolderId(null)}
                >
                  Materials
                </span>
                {currentFolderId !== null && (
                  <>
                    <FiChevronRight size={14} style={{ color: 'var(--light-text-muted)' }} />
                    <span style={{ color: 'var(--light-text)' }}>
                      {folders.find(f => f.id === currentFolderId)?.name || 'Folder'}
                    </span>
                  </>
                )}
              </div>

              {/* Management Actions - Teachers/Admin only */}
              {user?.role !== 'student' && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
                  <button 
                    className="btn-ld btn-ld-primary" 
                    onClick={() => {
                      setAddType('file');
                      setSelectedFile(null);
                      setMaterialName('');
                      setMaterialVisibility('all_students');
                      setMaterialBatch('');
                      setMaterialModuleSession('');
                      setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
                      setShowAddModal(true);
                    }}
                  >
                    <FiPlus size={16} />
                    <span>Add File</span>
                  </button>
                  <button 
                    className="btn-ld btn-ld-secondary" 
                    onClick={() => {
                      setAddType('link');
                      setMaterialName('');
                      setMaterialLink('');
                      setMaterialVisibility('all_students');
                      setMaterialBatch('');
                      setMaterialModuleSession('');
                      setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
                      setShowAddModal(true);
                    }}
                  >
                    <FiYoutube size={16} />
                    <span>Add YouTube / Link</span>
                  </button>
                  <button 
                    className="btn-ld btn-ld-secondary" 
                    onClick={() => {
                      setNewFolderName('');
                      setShowFolderModal(true);
                    }}
                  >
                    <FiFolderPlus size={16} />
                    <span>New Folder</span>
                  </button>
                </div>
              )}

              {/* File Dropzone/Upload Box */}
              {user?.role !== 'student' && !showAddModal && (
                <div 
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  style={{
                    border: dragActive ? '2px dashed var(--light-primary)' : '2px dashed var(--light-border)',
                    backgroundColor: dragActive ? 'var(--light-primary-glow)' : 'var(--light-bg-hover)',
                    borderRadius: '12px',
                    padding: '30px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    marginBottom: '24px'
                  }}
                >
                  <input 
                    type="file" 
                    id="resource-file-upload" 
                    style={{ display: 'none' }} 
                    onChange={handleFileChange}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.mp4,.webm"
                  />
                  <label 
                    htmlFor="resource-file-upload" 
                    style={{ cursor: 'pointer', display: 'block' }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <FiUploadCloud size={40} style={{ color: 'var(--light-primary)' }} />
                      <h4 style={{ fontWeight: '600', color: 'var(--light-text)' }}>Drag and drop files here, or <span style={{ color: 'var(--light-primary)', textDecoration: 'underline' }}>browse</span></h4>
                      <p style={{ fontSize: '12px', color: 'var(--light-text-secondary)' }}>Supports PDF, PPT, Word, Excel, ZIP, MP4, WebM (Max 50MB)</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Folders and Files Display */}
              {resourcesLoading ? (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
                </div>
              ) : currentFolders.length === 0 && currentResources.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
                  <FiFolder size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                  <h4>This folder is empty</h4>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Share study materials, notes, recordings, or web links here.</p>
                </div>
              ) : (
                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                        <th>Module / Session</th>
                        {user?.role !== 'student' && <th>Visibility</th>}
                        <th>Uploaded By</th>
                        <th>Upload Date</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Folders */}
                      {currentFolders.map((folder) => (
                        <tr 
                          key={`folder-${folder.id}`} 
                          onClick={() => setCurrentFolderId(folder.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <td style={{ fontWeight: '600' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <FiFolder style={{ color: '#d97706', flexShrink: 0 }} size={20} />
                              <span>{folder.name}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>FOLDER</span>
                          </td>
                          <td>—</td>
                          {user?.role !== 'student' && <td>—</td>}
                          <td>—</td>
                          <td style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                            {new Date(folder.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                          <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {user?.role !== 'student' && (
                              <button
                                className="btn-ld btn-ld-danger btn-ld-small"
                                onClick={(e) => handleDeleteFolder(folder.id, e)}
                                title="Delete folder"
                              >
                                <FiTrash2 size={13} />
                                <span>Delete</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}

                      {/* Files/Links */}
                      {currentResources.map((res) => {
                        const isPDF = res.mime_type === 'application/pdf' || res.name.toLowerCase().endsWith('.pdf');
                        const isImage = res.mime_type.startsWith('image/');
                        const isVideo = res.mime_type.startsWith('video/') || res.name.toLowerCase().endsWith('.mp4') || res.name.toLowerCase().endsWith('.webm');
                        const isYouTube = res.mime_type === 'youtube';

                        const uploadDate = new Date(res.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        });

                        const fullLink = res.drive_link.startsWith('/uploads/') 
                          ? `http://localhost:5000${res.drive_link}` 
                          : res.drive_link;

                        return (
                          <tr key={`resource-${res.id}`}>
                            <td style={{ fontWeight: '600' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                {isYouTube ? (
                                  <FiYoutube style={{ color: '#ef4444', flexShrink: 0 }} size={18} />
                                ) : isPDF ? (
                                  <FiFileText style={{ color: '#8b5cf6', flexShrink: 0 }} size={18} />
                                ) : isImage ? (
                                  <FiImage style={{ color: '#10b981', flexShrink: 0 }} size={18} />
                                ) : isVideo ? (
                                  <FiVideo style={{ color: '#6366f1', flexShrink: 0 }} size={18} />
                                ) : res.mime_type === 'url' ? (
                                  <FiLink style={{ color: '#3b82f6', flexShrink: 0 }} size={18} />
                                ) : (
                                  <FiPaperclip style={{ color: 'var(--light-text-secondary)', flexShrink: 0 }} size={18} />
                                )}
                                <span style={{ 
                                  maxWidth: '220px', 
                                  whiteSpace: 'nowrap', 
                                  overflow: 'hidden', 
                                  textOverflow: 'ellipsis' 
                                }} title={res.name}>
                                  {res.name}
                                </span>
                              </div>
                            </td>
                            <td>
                              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--light-text-secondary)', textTransform: 'uppercase' }}>
                                {isYouTube ? 'YOUTUBE' : res.mime_type.split('/')[1]?.toUpperCase() || 'FILE'}
                              </span>
                            </td>
                            <td>
                              {res.module_session ? (
                                <span className="badge-ld badge-ld-secondary">
                                  {res.module_session}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--light-text-muted)', fontSize: '13px', fontStyle: 'italic' }}>None</span>
                              )}
                            </td>
                            {user?.role !== 'student' && (
                              <td>
                                {res.visibility === 'hidden' ? (
                                  <span className="badge-ld badge-ld-warning">Hidden</span>
                                ) : res.visibility === 'specific_batch' ? (
                                  <span className="badge-ld badge-ld-primary">Batch: {res.batch}</span>
                                ) : (
                                  <span className="badge-ld badge-ld-success">All Students</span>
                                )}
                              </td>
                            )}
                            <td>{res.uploader?.name}</td>
                            <td style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>{uploadDate}</td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {isPreviewable(res) && (
                                  <button
                                    onClick={() => setPreviewResource(res)}
                                    className="btn-ld btn-ld-secondary btn-ld-small"
                                  >
                                    <span>Preview</span>
                                  </button>
                                )}
                                <a 
                                  href={fullLink} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="btn-ld btn-ld-secondary btn-ld-small"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                                >
                                  <FiExternalLink size={12} />
                                  <span>Open</span>
                                </a>
                                {(user?.role === 'admin' || res.uploader?.id === user?.id) && (
                                  <button
                                    className="btn-ld btn-ld-danger btn-ld-small"
                                    onClick={() => handleDeleteResource(res.id)}
                                  >
                                    <FiTrash2 size={12} />
                                    <span>Delete</span>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* MCQ Exams Tab */}
          {activeTab === 'mcqs' && (
            <div>
              {/* Header actions */}
              {user?.role !== 'student' && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button 
                    className="btn-ld btn-ld-primary" 
                    onClick={() => {
                      setTestTitle('');
                      setTestDescription('');
                      setTestTimeLimit(30);
                      setTestShuffleQuestions(false);
                      setTestShuffleOptions(false);
                      setTestShowResultImmediately(true);
                      setTestQuestions([]);
                      setShowTestBuilderModal(true);
                    }}
                  >
                    <FiPlus size={16} />
                    <span>Create MCQ Test</span>
                  </button>
                  <button 
                    className="btn-ld btn-ld-secondary" 
                    onClick={() => {
                      loadQuestionBank();
                      setShowQuestionBankModal(true);
                    }}
                  >
                    <FiBookOpen size={16} />
                    <span>Question Bank</span>
                  </button>
                </div>
              )}

              {mcqLoading ? (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
                </div>
              ) : mcqTests.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
                  <FiAward size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                  <h4>No examinations scheduled yet</h4>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Schedule module exams or session quizzes for this classroom.</p>
                </div>
              ) : (
                /* Group exams by test_type (Session Quiz vs Module Exams) */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  {['session', 'module'].map((typeKey) => {
                    const typedTests = mcqTests.filter(t => t.test_type === typeKey);
                    if (typedTests.length === 0) return null;

                    return (
                      <div key={typeKey}>
                        <h3 style={{ textTransform: 'capitalize', fontWeight: '700', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid var(--light-border)', paddingBottom: '8px' }}>
                          <FiTrendingUp style={{ color: 'var(--light-primary)' }} />
                          <span>{typeKey === 'session' ? 'Session-wise MCQ Tests' : 'Module MCQ Examinations'}</span>
                        </h3>

                        <div className="ld-table-container">
                          <table className="ld-table">
                            <thead>
                              <tr>
                                <th>Exam Title</th>
                                <th>Active Window</th>
                                <th>Configs</th>
                                <th>Status / Grade</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {typedTests.map((test) => {
                                const now = new Date();
                                const start = new Date(test.start_window);
                                const end = new Date(test.end_window);
                                const isActive = now >= start && now <= end;
                                const isExpired = now > end;
                                const isFuture = now < start;

                                // Check if user has attempt
                                const attempt = test.attempts && test.attempts[0];
                                const hasAttempt = !!attempt;

                                return (
                                  <tr key={test.id}>
                                    <td style={{ fontWeight: '600' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{test.title}</span>
                                        <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>
                                          {test.total_questions} Questions • {test.time_limit} Mins
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>Start: {formatDate(test.start_window)}</span>
                                        <span>End: {formatDate(test.end_window)}</span>
                                      </div>
                                    </td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {test.security_force_fullscreen && (
                                          <span className="badge-ld badge-ld-danger" style={{ fontSize: '10px' }}>Full-Screen</span>
                                        )}
                                        {test.security_tab_switch_behavior !== 'warning' && (
                                          <span className="badge-ld badge-ld-warning" style={{ fontSize: '10px' }}>Tab Monitor</span>
                                        )}
                                      </div>
                                    </td>
                                    <td>
                                      {hasAttempt ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                          <span className="badge-ld badge-ld-success" style={{ width: 'fit-content' }}>Submitted</span>
                                          {test.show_result_immediately || isExpired ? (
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--light-success)' }}>
                                              Score: {attempt.score} ({attempt.percentage}%)
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontStyle: 'italic' }}>
                                              Grades visible after deadline
                                            </span>
                                          )}
                                        </div>
                                      ) : isExpired ? (
                                        <span className="badge-ld badge-ld-secondary">Expired</span>
                                      ) : isFuture ? (
                                        <span className="badge-ld badge-ld-warning">Scheduled</span>
                                      ) : (
                                        <span className="badge-ld badge-ld-primary">Active</span>
                                      )}
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                        {user?.role === 'student' && !hasAttempt && isActive && (
                                          <button 
                                            className="btn-ld btn-ld-primary"
                                            onClick={() => {
                                              setActiveTest(test);
                                              setActivePledgeChecked(false);
                                              setActiveAttempt({ status: 'started' } as any); // open pledge screen
                                            }}
                                          >
                                            Start Attempt
                                          </button>
                                        )}

                                        {hasAttempt && (test.show_result_immediately || isExpired) && (
                                          <button 
                                            className="btn-ld btn-ld-secondary btn-ld-small"
                                            onClick={() => handleViewResultDetails(attempt.id)}
                                          >
                                            View Report
                                          </button>
                                        )}

                                        {user?.role !== 'student' && (
                                          <>
                                            <button 
                                              className="btn-ld btn-ld-secondary btn-ld-small"
                                              onClick={() => handleCloneTest(test.id)}
                                            >
                                              Clone
                                            </button>
                                            <button 
                                              className="btn-ld btn-ld-secondary btn-ld-small"
                                              onClick={() => handleOpenAnalytics(test.id)}
                                            >
                                              Analytics
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Practical Exams Tab */}
          {activeTab === 'practicals' && (
            <div>
              {/* Header actions */}
              {user?.role !== 'student' && (
                <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                  <button 
                    className="btn-ld btn-ld-primary" 
                    onClick={() => {
                      setPracTitle('');
                      setPracInstructions('');
                      setPracDueDate('');
                      setPracTotalMarks(100);
                      setShowPracticalModal(true);
                    }}
                  >
                    <FiPlus size={16} />
                    <span>Create Practical Exam</span>
                  </button>
                </div>
              )}

              {practicalsLoading ? (
                <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
                  <span className="spinner" style={{ borderColor: 'rgba(79, 70, 229, 0.2)', borderTopColor: 'var(--light-primary)', width: '30px', height: '30px' }}></span>
                </div>
              ) : practicals.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--light-text-secondary)', backgroundColor: '#fff', border: '1px solid var(--light-border)', borderRadius: '12px' }}>
                  <FiFile size={44} style={{ color: 'var(--light-text-muted)', marginBottom: '12px' }} />
                  <h4>No practical exams created yet</h4>
                  <p style={{ fontSize: '13px', marginTop: '6px' }}>Assign laboratory work, SQL tests, or coding challenges here.</p>
                </div>
              ) : (
                <div className="ld-table-container">
                  <table className="ld-table">
                    <thead>
                      <tr>
                        <th>Practical Task</th>
                        <th>Due Date</th>
                        <th>Max Marks</th>
                        <th>Submission / Grade</th>
                        <th style={{ textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practicals.map((prac) => {
                        const now = new Date();
                        const due = new Date(prac.due_date);
                        const isOverdue = now > due;

                        const submission = prac.submissions && prac.submissions[0];
                        const hasSubmitted = !!submission;

                        return (
                          <tr key={prac.id}>
                            <td style={{ fontWeight: '600' }}>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span>{prac.title}</span>
                                <span style={{ fontSize: '12.5px', color: 'var(--light-text-secondary)', fontWeight: '500', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {prac.instructions}
                                </span>
                              </div>
                            </td>
                            <td style={{ fontSize: '13px', color: isOverdue && !hasSubmitted ? '#ef4444' : 'var(--light-text)' }}>
                              {formatDate(prac.due_date)}
                            </td>
                            <td>{prac.total_marks} Marks</td>
                            <td>
                              {hasSubmitted ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                  <span className="badge-ld badge-ld-success" style={{ width: 'fit-content' }}>Submitted</span>
                                  {submission.graded ? (
                                    <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--light-success)' }}>
                                      Grade: {submission.total_grade} / {prac.total_marks}
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontStyle: 'italic' }}>Pending Grade</span>
                                  )}
                                </div>
                              ) : isOverdue ? (
                                <span className="badge-ld badge-ld-danger">Missing</span>
                              ) : (
                                <span className="badge-ld badge-ld-primary">Assigned</span>
                              )}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                                {user?.role === 'student' && (
                                  <button 
                                    className="btn-ld btn-ld-primary"
                                    onClick={() => {
                                      setSelectedPrac(prac);
                                      setPracTextAnswer(submission?.text_answer || '');
                                      setPracGithubLink(submission?.github_link || '');
                                      setPracDriveLink(submission?.drive_link || '');
                                      setPracFiles([]);
                                      setShowPracSubmissionModal(true);
                                    }}
                                  >
                                    {hasSubmitted ? 'Resubmit' : 'Submit task'}
                                  </button>
                                )}

                                {hasSubmitted && submission.graded && (
                                  <button 
                                    className="btn-ld btn-ld-secondary btn-ld-small"
                                    onClick={() => {
                                      setViewSubFeedback(submission);
                                      setShowStudentFeedbackModal(true);
                                    }}
                                  >
                                    View Grade
                                  </button>
                                )}

                                {user?.role !== 'student' && (
                                  <button 
                                    className="btn-ld btn-ld-secondary"
                                    onClick={() => handleOpenGrading(prac)}
                                  >
                                    Grade submissions
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* Shareable Invite Modal */}
      {showModal && (
        <div className="modal-overlay-ld" onClick={() => setShowModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ 
                width: '56px', 
                height: '56px', 
                borderRadius: '50%', 
                background: 'rgba(79, 70, 229, 0.12)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'var(--light-primary)',
                margin: '0 auto 16px'
              }}>
                <FiCopy size={26} />
              </div>
              
              <h3 className="modal-title-ld">Classroom Invite Link</h3>
              <p className="modal-subtitle-ld">
                Share this generic invitation link with teachers or students. When clicked, they can configure their roles and join this classroom.
              </p>

              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <input
                    className="form-input-ld"
                    style={{ paddingRight: '48px', textOverflow: 'ellipsis', fontWeight: '500' }}
                    type="text"
                    readOnly
                    value={inviteLink}
                  />
                  <button 
                    type="button"
                    onClick={() => copyToClipboard(inviteLink)}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'transparent',
                      border: 'none',
                      color: copied ? 'var(--light-success)' : 'var(--light-text-secondary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '8px'
                    }}
                  >
                    {copied ? <FiCheck size={18} /> : <FiCopy size={18} />}
                  </button>
                </div>
                {copied && (
                  <span style={{ fontSize: '12px', color: 'var(--light-success)', marginTop: '6px', display: 'block', textAlign: 'left' }}>
                    Copied link to clipboard!
                  </span>
                )}
              </div>

              <button 
                type="button" 
                className="btn-ld btn-ld-primary" 
                onClick={() => setShowModal(false)}
                style={{ width: '100%' }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Folder Modal */}
      {showFolderModal && (
        <div className="modal-overlay-ld" onClick={() => setShowFolderModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <h3 className="modal-title-ld">Create New Folder</h3>
            <p className="modal-subtitle-ld">Organize your materials by creating a new custom folder.</p>

            <form onSubmit={handleCreateFolderSubmit}>
              <div className="form-group-ld" style={{ marginBottom: '20px' }}>
                <label className="form-label-ld">Folder Name *</label>
                <input 
                  type="text" 
                  className="form-input-ld" 
                  placeholder="e.g. Notes, Session 1, Final Exam"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowFolderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={folderCreating}>
                  {folderCreating ? 'Creating...' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Study Material Modal (Unified File & Link) */}
      {showAddModal && (
        <div className="modal-overlay-ld" onClick={() => setShowAddModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 className="modal-title-ld">Add Study Material</h3>
            <p className="modal-subtitle-ld">Upload documents, video recordings, or embed YouTube links.</p>

            <div style={{ display: 'flex', borderBottom: '1px solid var(--light-border)', marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => { setAddType('file'); setMaterialName(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: addType === 'file' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: addType === 'file' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => { setAddType('link'); setMaterialName(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: addType === 'link' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: addType === 'link' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                YouTube / Web Link
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit}>
              {addType === 'file' ? (
                <div className="form-group-ld">
                  <label className="form-label-ld">Select File *</label>
                  <input 
                    type="file" 
                    className="form-input-ld" 
                    onChange={handleFileChange}
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.xls,.xlsx,.zip,.mp4,.webm"
                  />
                  {selectedFile && (
                    <span style={{ fontSize: '12px', color: 'var(--light-primary)', marginTop: '4px', display: 'block', fontWeight: '500' }}>
                      Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  )}
                </div>
              ) : (
                <>
                  <div className="form-group-ld">
                    <label className="form-label-ld">Material Title *</label>
                    <input 
                      type="text" 
                      className="form-input-ld" 
                      placeholder="e.g. Intro to Algebra YouTube Lecture"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group-ld">
                    <label className="form-label-ld">YouTube / Web Link URL *</label>
                    <input 
                      type="url" 
                      className="form-input-ld" 
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={materialLink}
                      onChange={(e) => setMaterialLink(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}

              <div className="form-group-ld">
                <label className="form-label-ld">Module / Session (Optional)</label>
                <input 
                  type="text" 
                  className="form-input-ld" 
                  placeholder="e.g. Module 1, Session B"
                  value={materialModuleSession}
                  onChange={(e) => setMaterialModuleSession(e.target.value)}
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Destinated Folder</label>
                <select 
                  className="form-input-ld"
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                >
                  <option value="root">Root / No Folder</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Student Visibility</label>
                <select 
                  className="form-input-ld"
                  value={materialVisibility}
                  onChange={(e) => setMaterialVisibility(e.target.value as any)}
                >
                  <option value="all_students">All Students</option>
                  <option value="specific_batch">Specific Batch</option>
                  <option value="hidden">Hidden</option>
                </select>
              </div>

              {materialVisibility === 'specific_batch' && (
                <div className="form-group-ld">
                  <label className="form-label-ld">Student Batch Name *</label>
                  <input 
                    type="text" 
                    className="form-input-ld" 
                    placeholder="e.g. Batch A"
                    value={materialBatch}
                    onChange={(e) => setMaterialBatch(e.target.value)}
                    required
                  />
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={uploading}>
                  {uploading ? 'Processing...' : 'Save Material'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MCQ Test Builder Modal */}
      {showTestBuilderModal && (
        <div className="modal-overlay-ld" onClick={() => setShowTestBuilderModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
            <h3 className="modal-title-ld">Create New MCQ Examination</h3>
            <p className="modal-subtitle-ld">Design a secure proctored examination for your batches.</p>

            <form onSubmit={handleCreateTestSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Exam Title *</label>
                  <input 
                    type="text" 
                    className="form-input-ld" 
                    placeholder="e.g. Mid-term Algebra Exam"
                    value={testTitle} 
                    onChange={(e) => setTestTitle(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Exam Type *</label>
                  <select 
                    className="form-input-ld"
                    value={testTypeVal}
                    onChange={(e) => setTestTypeVal(e.target.value as any)}
                  >
                    <option value="session">Session-wise MCQ Quiz</option>
                    <option value="module">Module Examination MCQ</option>
                  </select>
                </div>
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Description / Instructions</label>
                <textarea 
                  className="form-input-ld" 
                  placeholder="Instructions for the students..."
                  value={testDescription} 
                  onChange={(e) => setTestDescription(e.target.value)} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Time Limit (Minutes) *</label>
                  <input 
                    type="number" 
                    className="form-input-ld" 
                    value={testTimeLimit} 
                    onChange={(e) => setTestTimeLimit(parseInt(e.target.value) || 30)} 
                    required 
                  />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Start Date / Window *</label>
                  <input 
                    type="datetime-local" 
                    className="form-input-ld" 
                    value={testStartWindow} 
                    onChange={(e) => setTestStartWindow(e.target.value)} 
                    required 
                  />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">End Date / Deadline *</label>
                  <input 
                    type="datetime-local" 
                    className="form-input-ld" 
                    value={testEndWindow} 
                    onChange={(e) => setTestEndWindow(e.target.value)} 
                    required 
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Assigned Batches (comma-separated, leave blank for all)</label>
                  <input 
                    type="text" 
                    className="form-input-ld" 
                    placeholder="e.g. Batch A, Batch B"
                    value={testBatches} 
                    onChange={(e) => setTestBatches(e.target.value)} 
                  />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Tab Switch Behavior</label>
                  <select 
                    className="form-input-ld"
                    value={testSecTabSwitch}
                    onChange={(e) => setTestSecTabSwitch(e.target.value as any)}
                  >
                    <option value="warning">Warning Notification only</option>
                    <option value="auto_submit_n_warnings">Auto-submit after warnings exceed N</option>
                    <option value="immediate_auto_submit">Immediate auto-submit</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', alignItems: 'center' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Max Warnings (For auto-submit)</label>
                  <input 
                    type="number" 
                    className="form-input-ld" 
                    value={testSecMaxWarnings} 
                    onChange={(e) => setTestSecMaxWarnings(parseInt(e.target.value) || 3)}
                    disabled={testSecTabSwitch !== 'auto_submit_n_warnings'}
                  />
                </div>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={testSecForceFullscreen} 
                    onChange={(e) => setTestSecForceFullscreen(e.target.checked)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Force Fullscreen API</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={testShuffleQuestions} 
                    onChange={(e) => setTestShuffleQuestions(e.target.checked)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Shuffle Questions</span>
                </label>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'center', margin: '8px 0' }}>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={testShuffleOptions} 
                    onChange={(e) => setTestShuffleOptions(e.target.checked)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Shuffle Options</span>
                </label>
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600' }}>
                  <input 
                    type="checkbox" 
                    checked={testShowResultImmediately} 
                    onChange={(e) => setTestShowResultImmediately(e.target.checked)} 
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Show Results Immediately</span>
                </label>
              </div>

              {/* Questions selection list */}
              <div style={{ border: '1px solid var(--light-border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--light-bg-hover)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontWeight: '700' }}>Questions ({testQuestions.length})</h4>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      type="button" 
                      className="btn-ld btn-ld-secondary btn-ld-small" 
                      onClick={() => {
                        loadQuestionBank();
                        setShowQuestionBankModal(true);
                      }}
                    >
                      Import Bank
                    </button>
                    <button 
                      type="button" 
                      className="btn-ld btn-ld-secondary btn-ld-small" 
                      onClick={() => {
                        const fileInput = document.getElementById('csv-question-import-file') as HTMLInputElement;
                        if (fileInput) fileInput.click();
                      }}
                    >
                      Import CSV
                    </button>
                    <input 
                      type="file" 
                      id="csv-question-import-file" 
                      style={{ display: 'none' }} 
                      accept=".csv"
                      onChange={handleCSVImport} 
                    />
                    <button 
                      type="button" 
                      className="btn-ld btn-ld-primary btn-ld-small" 
                      onClick={() => {
                        setQText('');
                        setQOptA('');
                        setQOptB('');
                        setQOptC('');
                        setQOptD('');
                        setQCorrect('A');
                        setQExplanation('');
                        setShowAddQuestionModal(true);
                      }}
                    >
                      Add Question
                    </button>
                  </div>
                </div>

                {testQuestions.length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <p style={{ color: 'var(--light-text-muted)', fontSize: '13px', margin: 0 }}>No questions added to this exam yet.</p>
                    <p style={{ fontSize: '12px', color: 'var(--light-text-secondary)', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                      💡 <strong>CSV Template Header Format:</strong><br />
                      <code>question_text, option_a, option_b, option_c, option_d, correct_answer, explanation, difficulty, marks</code>
                    </p>
                  </div>
                ) : (
                  <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {testQuestions.map((q, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid var(--light-border)' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {idx + 1}. {q.question_text}
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge-ld badge-ld-secondary" style={{ fontSize: '11px' }}>{q.marks} Marks</span>
                          <button 
                            type="button" 
                            style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                            onClick={() => setTestQuestions(prev => prev.filter((_, i) => i !== idx))}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowTestBuilderModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={testBuilderSubmitting}>
                  {testBuilderSubmitting ? 'Creating Test...' : 'Create Examination'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Question Modal */}
      {showAddQuestionModal && (
        <div className="modal-overlay-ld" style={{ zIndex: 10000 }} onClick={() => setShowAddQuestionModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <h3 className="modal-title-ld">Add MCQ Question</h3>
            <form onSubmit={handleAddQuestionLocal} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld">Question Text *</label>
                <textarea 
                  className="form-input-ld" 
                  value={qText} 
                  onChange={(e) => setQText(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Option A *</label>
                  <input type="text" className="form-input-ld" value={qOptA} onChange={(e) => setQOptA(e.target.value)} required />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Option B *</label>
                  <input type="text" className="form-input-ld" value={qOptB} onChange={(e) => setQOptB(e.target.value)} required />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Option C *</label>
                  <input type="text" className="form-input-ld" value={qOptC} onChange={(e) => setQOptC(e.target.value)} required />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Option D *</label>
                  <input type="text" className="form-input-ld" value={qOptD} onChange={(e) => setQOptD(e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Correct Option *</label>
                  <select className="form-input-ld" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)}>
                    <option value="A">Option A</option>
                    <option value="B">Option B</option>
                    <option value="C">Option C</option>
                    <option value="D">Option D</option>
                  </select>
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Marks *</label>
                  <input type="number" className="form-input-ld" value={qMarks} onChange={(e) => setQMarks(parseInt(e.target.value) || 1)} required />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Difficulty *</label>
                  <select className="form-input-ld" value={qDifficulty} onChange={(e) => setQDifficulty(e.target.value)}>
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Explanation (Optional)</label>
                <textarea className="form-input-ld" value={qExplanation} onChange={(e) => setQExplanation(e.target.value)} />
              </div>

              {/* Categorizations */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                <input type="text" className="form-input-ld" placeholder="Course" value={qCourse} onChange={(e) => setQCourse(e.target.value)} />
                <input type="text" className="form-input-ld" placeholder="Module" value={qModule} onChange={(e) => setQModule(e.target.value)} />
                <input type="text" className="form-input-ld" placeholder="Session" value={qSession} onChange={(e) => setQSession(e.target.value)} />
                <input type="text" className="form-input-ld" placeholder="Topic" value={qTopic} onChange={(e) => setQTopic(e.target.value)} />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowAddQuestionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary">
                  Add to test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Bank Modal */}
      {showQuestionBankModal && (
        <div className="modal-overlay-ld" style={{ zIndex: 10000 }} onClick={() => setShowQuestionBankModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <h3 className="modal-title-ld">Question Bank Repository</h3>
            <p className="modal-subtitle-ld">Retrieve or save questions for reuse across modules.</p>

            {/* Quick Filters */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <input type="text" className="form-input-ld" placeholder="Course" value={bankCourseFilter} onChange={(e) => setBankCourseFilter(e.target.value)} />
              <input type="text" className="form-input-ld" placeholder="Module" value={bankModuleFilter} onChange={(e) => setBankModuleFilter(e.target.value)} />
              <input type="text" className="form-input-ld" placeholder="Topic" value={bankTopicFilter} onChange={(e) => setBankTopicFilter(e.target.value)} />
              <button className="btn-ld btn-ld-primary" onClick={loadQuestionBank}>Filter</button>
            </div>

            {/* Question selection board */}
            <div style={{ border: '1px solid var(--light-border)', borderRadius: '8px', padding: '16px', maxHeight: '250px', overflowY: 'auto', backgroundColor: 'var(--light-bg-hover)', marginBottom: '20px' }}>
              {bankLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '20px' }}><span className="spinner"></span></div>
              ) : bankQuestions.length === 0 ? (
                <p style={{ color: 'var(--light-text-muted)', fontSize: '13px', margin: 0 }}>No matching question bank items.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bankQuestions.map((bq) => {
                    const isChecked = selectedBankQuestionIds.includes(bq.id!);
                    return (
                      <label 
                        key={bq.id}
                        style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', cursor: 'pointer', border: isChecked ? '1.5px solid var(--light-primary)' : '1px solid var(--light-border)' }}
                      >
                        <input 
                          type="checkbox" 
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBankQuestionIds(prev => [...prev, bq.id!]);
                            } else {
                              setSelectedBankQuestionIds(prev => prev.filter(id => id !== bq.id));
                            }
                          }}
                          style={{ marginTop: '3px' }}
                        />
                        <div style={{ fontSize: '13.5px' }}>
                          <span style={{ fontWeight: '700', color: 'var(--light-primary)', display: 'block', marginBottom: '2px' }}>
                            [{bq.difficulty}] {bq.marks} Marks • Course: {bq.course || 'None'}
                          </span>
                          <span style={{ fontWeight: '500' }}>{bq.question_text}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form to save new question directly to bank */}
            <div style={{ borderTop: '1px solid var(--light-border)', paddingTop: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0' }}>Add Question to Bank</h4>
              <form onSubmit={handleAddQuestionToBank} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input type="text" className="form-input-ld" placeholder="Question Text" value={qText} onChange={(e) => setQText(e.target.value)} required />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px' }}>
                  <input type="text" className="form-input-ld" placeholder="Option A" value={qOptA} onChange={(e) => setQOptA(e.target.value)} required />
                  <input type="text" className="form-input-ld" placeholder="Option B" value={qOptB} onChange={(e) => setQOptB(e.target.value)} required />
                  <input type="text" className="form-input-ld" placeholder="Option C" value={qOptC} onChange={(e) => setQOptC(e.target.value)} required />
                  <input type="text" className="form-input-ld" placeholder="Option D" value={qOptD} onChange={(e) => setQOptD(e.target.value)} required />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: '8px' }}>
                  <select className="form-input-ld" value={qCorrect} onChange={(e) => setQCorrect(e.target.value)}>
                    <option value="A">Correct: A</option>
                    <option value="B">Correct: B</option>
                    <option value="C">Correct: C</option>
                    <option value="D">Correct: D</option>
                  </select>
                  <input type="number" className="form-input-ld" placeholder="Marks" value={qMarks} onChange={(e) => setQMarks(parseInt(e.target.value) || 1)} required />
                  <input type="text" className="form-input-ld" placeholder="Course" value={qCourse} onChange={(e) => setQCourse(e.target.value)} />
                  <input type="text" className="form-input-ld" placeholder="Module" value={qModule} onChange={(e) => setQModule(e.target.value)} />
                  <button type="submit" className="btn-ld btn-ld-secondary" style={{ padding: '6px' }}>Save to Bank</button>
                </div>
              </form>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowQuestionBankModal(false)}>
                Close
              </button>
              {selectedBankQuestionIds.length > 0 && showTestBuilderModal && (
                <button type="button" className="btn-ld btn-ld-primary" onClick={handlePullQuestionsToTest}>
                  Pull Selected ({selectedBankQuestionIds.length}) Questions
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Attempt Analytics Modal */}
      {showAnalyticsModal && (
        <div className="modal-overlay-ld" onClick={() => setShowAnalyticsModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
            <h3 className="modal-title-ld">Attempt Analytics: {analyticsTest?.title}</h3>

            {analyticsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner"></span></div>
            ) : analyticsData ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Stats Summary cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ padding: '16px', backgroundColor: 'var(--light-primary-glow)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Average Score</span>
                    <h2 style={{ fontSize: '32px', color: 'var(--light-primary)', fontWeight: '800', margin: '4px 0' }}>{analyticsData.averageScore}</h2>
                  </div>
                  <div style={{ padding: '16px', backgroundColor: 'var(--light-primary-glow)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Total Attempts</span>
                    <h2 style={{ fontSize: '32px', color: 'var(--light-primary)', fontWeight: '800', margin: '4px 0' }}>{analyticsData.totalAttempts}</h2>
                  </div>
                </div>

                {/* Question level success rate */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontWeight: '700' }}>Question Performance</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
                    {analyticsData.questionPerformance?.map((qp: any, idx: number) => (
                      <div key={qp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', border: '1px solid var(--light-border)', borderRadius: '6px' }}>
                        <span style={{ fontSize: '13.5px', fontWeight: '600', maxWidth: '450px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Q{idx + 1}. {qp.question_text}
                        </span>
                        <span style={{ fontWeight: '700', color: qp.success_rate < 50 ? '#ef4444' : '#10b981' }}>
                          {qp.success_rate}% Correct
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Students not attempted */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontWeight: '700' }}>Not Attempted Students ({analyticsData.notAttempted?.length || 0})</h4>
                  {analyticsData.notAttempted?.length === 0 ? (
                    <p style={{ color: 'var(--light-text-secondary)', fontSize: '13px', margin: 0 }}>All students have completed this examination.</p>
                  ) : (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {analyticsData.notAttempted?.map((stud: any) => (
                        <span key={stud.id} className="badge-ld badge-ld-secondary" style={{ fontSize: '12px', padding: '6px 10px' }}>
                          {stud.name} ({stud.batch || 'No Batch'})
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-ld btn-ld-secondary" onClick={() => setShowAnalyticsModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Result Details Report Modal */}
      {showResultModal && (
        <div className="modal-overlay-ld" onClick={() => setShowResultModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '750px', width: '90%' }}>
            <h3 className="modal-title-ld">Exam Submission Report</h3>

            {resultLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner"></span></div>
            ) : viewAttemptDetails ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div style={{ padding: '12px', border: '1px solid var(--light-border)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', fontWeight: '600' }}>SCORE</span>
                    <h3 style={{ margin: '4px 0', color: 'var(--light-success)' }}>{viewAttemptDetails.score} Marks</h3>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--light-border)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', fontWeight: '600' }}>PERCENTAGE</span>
                    <h3 style={{ margin: '4px 0', color: 'var(--light-primary)' }}>{viewAttemptDetails.percentage}%</h3>
                  </div>
                  <div style={{ padding: '12px', border: '1px solid var(--light-border)', borderRadius: '8px', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'var(--light-text-secondary)', fontWeight: '600' }}>DURATION</span>
                    <h3 style={{ margin: '4px 0' }}>{Math.floor(viewAttemptDetails.time_taken / 60)}m {viewAttemptDetails.time_taken % 60}s</h3>
                  </div>
                </div>

                {/* Proctor violation logs */}
                {user?.role !== 'student' && (
                  <div style={{ padding: '12px', backgroundColor: '#fff5f5', border: '1px solid #fed7d7', borderRadius: '8px' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#c53030', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <FiShield />
                      <span>Security proctoring log</span>
                    </h4>
                    <span style={{ fontSize: '13px', display: 'block' }}>Tab switches: <strong>{viewAttemptDetails.tab_switch_count}</strong> times</span>
                    <span style={{ fontSize: '13px', display: 'block' }}>Fullscreen exits: <strong>{viewAttemptDetails.fullscreen_exit_count}</strong> times</span>
                    <span style={{ fontSize: '13px', display: 'block' }}>Submission trigger: <strong>{viewAttemptDetails.submit_type.toUpperCase()}</strong></span>
                  </div>
                )}

                {/* Review Questions & Answers */}
                <div>
                  <h4 style={{ margin: '0 0 12px 0', fontWeight: '700' }}>Answer Key & Responses</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '250px', overflowY: 'auto' }}>
                    {viewAttemptDetails.test?.questions?.map((q, idx) => {
                      const studentChoice = viewAttemptDetails.responses[q.id!];
                      const isCorrect = studentChoice?.toUpperCase() === q.correct_answer?.toUpperCase();

                      return (
                        <div key={q.id} style={{ padding: '16px', border: '1.5px solid var(--light-border)', borderRadius: '8px', backgroundColor: isCorrect ? '#f0fdf4' : '#fef2f2' }}>
                          <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--light-text-secondary)' }}>Question {idx + 1}</span>
                          <p style={{ fontWeight: '700', margin: '4px 0 10px 0' }}>{q.question_text}</p>
                          <div style={{ fontSize: '13.5px', marginBottom: '8px' }}>
                            <span>Your Answer: <strong>{studentChoice || 'None'}</strong></span>
                            {q.correct_answer && (
                              <span style={{ marginLeft: '20px' }}>Correct Answer: <strong style={{ color: 'var(--light-success)' }}>{q.correct_answer}</strong></span>
                            )}
                          </div>
                          {q.explanation && (
                            <p style={{ fontSize: '12.5px', color: 'var(--light-text-secondary)', margin: 0, fontStyle: 'italic' }}>
                              Explanation: {q.explanation}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-ld btn-ld-secondary" onClick={() => setShowResultModal(false)}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practical exam creator */}
      {showPracticalModal && (
        <div className="modal-overlay-ld" onClick={() => setShowPracticalModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 className="modal-title-ld">Create Practical Examination</h3>
            <form onSubmit={handleCreatePracticalSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld">Task Title *</label>
                <input 
                  type="text" 
                  className="form-input-ld" 
                  placeholder="e.g. SQL Query Lab Task" 
                  value={pracTitle} 
                  onChange={(e) => setPracTitle(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Task Instructions / Instructions *</label>
                <textarea 
                  className="form-input-ld" 
                  style={{ minHeight: '120px' }}
                  placeholder="Instructions, database structure description, or coding challenge description..." 
                  value={pracInstructions} 
                  onChange={(e) => setPracInstructions(e.target.value)} 
                  required 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Due Date *</label>
                  <input type="datetime-local" className="form-input-ld" value={pracDueDate} onChange={(e) => setPracDueDate(e.target.value)} required />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Total Marks *</label>
                  <input type="number" className="form-input-ld" value={pracTotalMarks} onChange={(e) => setPracTotalMarks(parseInt(e.target.value) || 100)} required />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowPracticalModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={pracSubmitting}>
                  {pracSubmitting ? 'Creating...' : 'Create Practical'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Practical submission modal */}
      {showPracSubmissionModal && selectedPrac && (
        <div className="modal-overlay-ld" onClick={() => setShowPracSubmissionModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px', width: '90%' }}>
            <h3 className="modal-title-ld">Submit Practical Assignment: {selectedPrac.title}</h3>
            
            <div style={{ padding: '12px', backgroundColor: 'var(--light-bg-hover)', borderRadius: '8px', fontSize: '13px', margin: '8px 0 18px 0', maxHeight: '120px', overflowY: 'auto' }}>
              <strong>Instructions:</strong>
              <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>{selectedPrac.instructions}</p>
            </div>

            <form onSubmit={handlePracSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group-ld">
                <label className="form-label-ld">GitHub Repository URL (Optional)</label>
                <input 
                  type="url" 
                  className="form-input-ld" 
                  placeholder="https://github.com/..." 
                  value={pracGithubLink} 
                  onChange={(e) => setPracGithubLink(e.target.value)} 
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Google Drive / Shared Link (Optional)</label>
                <input 
                  type="url" 
                  className="form-input-ld" 
                  placeholder="https://drive.google.com/..." 
                  value={pracDriveLink} 
                  onChange={(e) => setPracDriveLink(e.target.value)} 
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Text Answer / Notes (Optional)</label>
                <textarea 
                  className="form-input-ld" 
                  placeholder="Type any answers or explanatory notes here..." 
                  value={pracTextAnswer} 
                  onChange={(e) => setPracTextAnswer(e.target.value)} 
                />
              </div>

              {/* Upload files component */}
              <div className="form-group-ld">
                <label className="form-label-ld">Upload submission files (Max 50MB per file)</label>
                <input 
                  type="file" 
                  multiple 
                  className="form-input-ld"
                  onChange={handlePracFileChange}
                />
                
                {pracFiles.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '10px' }}>
                    {pracFiles.map((f, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '6px', border: '1px solid var(--light-border)', borderRadius: '4px', backgroundColor: '#fff' }}>
                        <span>{f.name} ({(f.size/1024/1024).toFixed(2)} MB)</span>
                        <button 
                          type="button" 
                          style={{ color: '#ef4444', border: 'none', background: 'transparent', cursor: 'pointer' }}
                          onClick={() => setPracFiles(prev => prev.filter((_, idx) => idx !== i))}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowPracSubmissionModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={pracSubmitLoading}>
                  {pracSubmitLoading ? 'Uploading...' : 'Submit Practical'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Practical grading panel (list of student submissions) */}
      {showGradingModal && selectedPracForGrading && (
        <div className="modal-overlay-ld" onClick={() => setShowGradingModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px', width: '90%' }}>
            <h3 className="modal-title-ld">Grade Submissions: {selectedPracForGrading.title}</h3>

            {gradingSubmissionsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><span className="spinner"></span></div>
            ) : gradingSubmissions.length === 0 ? (
              <p style={{ color: 'var(--light-text-secondary)', padding: '20px', textAlign: 'center' }}>No submissions uploaded for this task yet.</p>
            ) : (
              <div className="ld-table-container" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                <table className="ld-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Batch</th>
                      <th>Submission Date</th>
                      <th>Attachments</th>
                      <th>Grade</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradingSubmissions.map((sub) => (
                      <tr key={sub.id}>
                        <td style={{ fontWeight: '600' }}>{sub.user?.name}</td>
                        <td>{sub.user?.batch || 'None'}</td>
                        <td style={{ fontSize: '13px' }}>{formatDate(sub.submitted_at)}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                            {sub.github_link && <span className="badge-ld badge-ld-secondary">GitHub</span>}
                            {sub.drive_link && <span className="badge-ld badge-ld-secondary">Drive</span>}
                            {sub.submitted_files && sub.submitted_files.length > 0 && (
                              <span className="badge-ld badge-ld-primary">{sub.submitted_files.length} Files</span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontWeight: '700' }}>
                          {sub.graded ? (
                            <span style={{ color: 'var(--light-success)' }}>{sub.total_grade} / {selectedPracForGrading.total_marks}</span>
                          ) : (
                            <span style={{ color: 'var(--light-warning)' }}>Ungraded</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button 
                            className="btn-ld btn-ld-primary btn-ld-small"
                            onClick={() => {
                              setSelectedSubForGrading(sub);
                              setGradeTextScore(sub.grade_components?.text_answer || 0);
                              setGradeFileScore(sub.grade_components?.files || 0);
                              setGradeLinkScore(sub.grade_components?.links || 0);
                              setGradeTotalMarks(sub.total_grade || 0);
                              setGradeFeedback(sub.feedback || '');
                              setShowGradeFormModal(true);
                            }}
                          >
                            Grade submission
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-ld btn-ld-secondary" onClick={() => setShowGradingModal(false)}>
                Close Panel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grade Form Modal */}
      {showGradeFormModal && selectedSubForGrading && selectedPracForGrading && (
        <div className="modal-overlay-ld" style={{ zIndex: 10000 }} onClick={() => setShowGradeFormModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
            <h3 className="modal-title-ld">Grade Submission: {selectedSubForGrading.user?.name}</h3>

            {/* Student Submission Contents Review */}
            <div style={{ border: '1px solid var(--light-border)', borderRadius: '8px', padding: '16px', backgroundColor: 'var(--light-bg-hover)', marginBottom: '20px', maxHeight: '180px', overflowY: 'auto', fontSize: '13.5px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontWeight: '700' }}>Submission details:</h5>
              {selectedSubForGrading.github_link && (
                <div style={{ marginBottom: '6px' }}>
                  <strong>GitHub Link:</strong> <a href={selectedSubForGrading.github_link} target="_blank" rel="noopener noreferrer">{selectedSubForGrading.github_link}</a>
                </div>
              )}
              {selectedSubForGrading.drive_link && (
                <div style={{ marginBottom: '6px' }}>
                  <strong>Google Drive Link:</strong> <a href={selectedSubForGrading.drive_link} target="_blank" rel="noopener noreferrer">{selectedSubForGrading.drive_link}</a>
                </div>
              )}
              {selectedSubForGrading.text_answer && (
                <div style={{ marginBottom: '10px' }}>
                  <strong>Text Answer:</strong>
                  <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap', backgroundColor: '#fff', padding: '8px', borderRadius: '4px', border: '1px solid var(--light-border)' }}>{selectedSubForGrading.text_answer}</p>
                </div>
              )}
              {selectedSubForGrading.submitted_files && selectedSubForGrading.submitted_files.length > 0 && (
                <div>
                  <strong>Attached Files:</strong>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {selectedSubForGrading.submitted_files.map((f, i) => {
                      const fileLink = f.url.startsWith('/uploads/') ? `http://localhost:5000${f.url}` : f.url;
                      return (
                        <a key={i} href={fileLink} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'underline' }}>{f.name}</a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleGradeSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Text Component Score</label>
                  <input type="number" className="form-input-ld" value={gradeTextScore} onChange={(e) => setGradeTextScore(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Files Component Score</label>
                  <input type="number" className="form-input-ld" value={gradeFileScore} onChange={(e) => setGradeFileScore(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group-ld">
                  <label className="form-label-ld">Links Component Score</label>
                  <input type="number" className="form-input-ld" value={gradeLinkScore} onChange={(e) => setGradeLinkScore(parseFloat(e.target.value) || 0)} />
                </div>
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Total Mark Awarded * (Max {selectedPracForGrading.total_marks})</label>
                <input 
                  type="number" 
                  className="form-input-ld" 
                  value={gradeTotalMarks} 
                  onChange={(e) => setGradeTotalMarks(parseFloat(e.target.value) || 0)} 
                  required 
                />
              </div>

              <div className="form-group-ld">
                <label className="form-label-ld">Detailed Grading Feedback / Notes</label>
                <textarea 
                  className="form-input-ld" 
                  style={{ minHeight: '100px' }}
                  placeholder="Great work! The SQL queries were completely correct..." 
                  value={gradeFeedback} 
                  onChange={(e) => setGradeFeedback(e.target.value)} 
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-ld btn-ld-secondary" onClick={() => setShowGradeFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-ld btn-ld-primary" disabled={gradeSubmitting}>
                  {gradeSubmitting ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student View Grade Feedback Modal */}
      {showStudentFeedbackModal && viewSubFeedback && (
        <div className="modal-overlay-ld" onClick={() => setShowStudentFeedbackModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3 className="modal-title-ld">Grade & Feedback Details</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
              <div style={{ padding: '16px', backgroundColor: 'var(--light-success-glow)', borderRadius: '8px', borderLeft: '4px solid var(--light-success)', textAlign: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--light-text-secondary)', fontWeight: '600' }}>TOTAL SCORE AWARDED</span>
                <h2 style={{ fontSize: '32px', color: '#10b981', fontWeight: '800', margin: '4px 0' }}>{viewSubFeedback.total_grade} Marks</h2>
              </div>

              {/* Component breakdown */}
              {viewSubFeedback.grade_components && (
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontWeight: '700' }}>Component Scores</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13.5px' }}>
                    <span>Text component: <strong>{viewSubFeedback.grade_components.text_answer || 0}</strong></span>
                    <span>Files attachment: <strong>{viewSubFeedback.grade_components.files || 0}</strong></span>
                    <span>Links / GitHub: <strong>{viewSubFeedback.grade_components.links || 0}</strong></span>
                  </div>
                </div>
              )}

              {/* Text feedback */}
              <div>
                <h4 style={{ margin: '0 0 6px 0', fontWeight: '700' }}>Teacher's Feedback</h4>
                <p style={{ margin: 0, padding: '12px', backgroundColor: 'var(--light-bg-hover)', borderRadius: '6px', fontSize: '13.5px', whiteSpace: 'pre-wrap', fontStyle: 'italic' }}>
                  {viewSubFeedback.feedback || 'No comments provided.'}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-ld btn-ld-secondary" onClick={() => setShowStudentFeedbackModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Preview Modal (PDF and Video embeds) */}
      {previewResource && (
        <div className="modal-overlay-ld" onClick={() => setPreviewResource(null)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0 }}>{previewResource.name}</h3>
              <button 
                onClick={() => setPreviewResource(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--light-text-secondary)', cursor: 'pointer' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div style={{ minHeight: '300px', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f3f4f6', borderRadius: '8px', overflow: 'hidden' }}>
              {(() => {
                const isPDF = previewResource.mime_type === 'application/pdf' || previewResource.name.toLowerCase().endsWith('.pdf');
                const isVideo = previewResource.mime_type.startsWith('video/') || previewResource.name.toLowerCase().endsWith('.mp4') || previewResource.name.toLowerCase().endsWith('.webm');
                const isYouTube = previewResource.mime_type === 'youtube';

                const fullLink = previewResource.drive_link.startsWith('/uploads/') 
                  ? `http://localhost:5000${previewResource.drive_link}` 
                  : previewResource.drive_link;

                if (isYouTube) {
                  const ytId = getYouTubeId(previewResource.drive_link);
                  if (ytId) {
                    return (
                      <iframe 
                        width="100%" 
                        height="450" 
                        src={`https://www.youtube.com/embed/${ytId}`} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        style={{ width: '100%', border: 'none' }}
                      />
                    );
                  } else {
                    return <p style={{ padding: '20px', color: 'red' }}>Invalid YouTube link.</p>;
                  }
                }

                if (isPDF) {
                  return (
                    <iframe 
                      src={fullLink} 
                      width="100%" 
                      height="550px" 
                      style={{ border: 'none' }} 
                      title="PDF Preview" 
                    />
                  );
                }

                if (isVideo) {
                  return (
                    <video 
                      src={fullLink} 
                      controls 
                      autoPlay
                      width="100%" 
                      style={{ maxHeight: '500px', outline: 'none' }} 
                    />
                  );
                }

                return <p style={{ padding: '20px' }}>Preview not available for this file type.</p>;
              })()}
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button className="btn-ld btn-ld-secondary" onClick={() => setPreviewResource(null)}>
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default ClassroomDetails;
