import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
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
  FiX,
  FiPaperclip,
  FiAward,
  FiClock,
  FiShield,
  FiActivity,
  FiCalendar,
  FiUserPlus,
  FiChevronDown,
  FiEdit2
} from 'react-icons/fi';
import api, { getServerUrl } from '../services/api';
import DashboardLayout from '../components/DashboardLayout';
import { useClassrooms } from '../components/ClassroomContext';
import { TeachersTab } from './classroom-modules/TeachersTab';
import { JoinRequestsTab } from './classroom-modules/JoinRequestsTab';
import { StudentsTab } from './classroom-modules/StudentsTab';
import { ResourcesTab } from './classroom-modules/ResourcesTab';
import { PracticalsTab } from './classroom-modules/PracticalsTab';
import { SessionsTab } from './classroom-modules/SessionsTab';
import { AssignQuizTab } from '../quiz-builder/components/AssignQuizTab';
import { AssignContentModal } from './classroom-modules/modals/AssignContentModal';
import { ImportMaterialBankModal } from './classroom-modules/modals/ImportMaterialBankModal';
import { materialBankService } from '../material-bank/services/materialBankService';

interface Teacher {
  id: number;
  name: string;
  email: string;
  role?: string;
  status: string; // user account status (active/pending)
  batch?: string | null;
  invite_token?: string | null;
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
  assigned_student_ids?: number[];
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

export interface MCQQuestionInput {
  id?: number;
  question_type?: string;
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

export interface MCQTest {
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
  assigned_student_ids?: number[];
  security_tab_switch_behavior: 'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit';
  security_max_warnings: number;
  security_force_fullscreen: boolean;
  questions?: MCQQuestionInput[];
  attempts?: MCQAttempt[];
  created_at: string;
}

export interface MCQAttempt {
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

export interface PracticalExam {
  id: number;
  classroom_id: number;
  title: string;
  instructions: string;
  due_date: string;
  total_marks: number;
  batches?: string[];
  submissions?: PracticalSubmission[];
  created_at: string;
}

export interface PracticalSubmission {
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

// Helper to shuffle an array (Fisher-Yates)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const validTabs = ['active', 'pending', 'students', 'resources', 'mcqs', 'practicals', 'sessions', 'assign_quiz'];

const ClassroomDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useSelector((state: RootState) => state.auth);
  const { fetchClassrooms } = useClassrooms();

  // Classroom Detail State
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs state from URL query parameter
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam && validTabs.includes(tabParam))
    ? tabParam
    : (user?.role === 'student' ? 'resources' : 'active');

  const [activeTab, setActiveTab] = useState<'active' | 'pending' | 'students' | 'resources' | 'mcqs' | 'practicals' | 'sessions' | 'assign_quiz'>(initialTab as any);

  // Loaded tab flags for lazy on-demand data fetching
  const [resourcesLoaded, setResourcesLoaded] = useState(false);
  const [mcqLoaded, setMcqLoaded] = useState(false);
  const [practicalsLoaded, setPracticalsLoaded] = useState(false);

  // Sync activeTab with URL search params when user navigates (e.g. browser Back/Forward)
  useEffect(() => {
    const currentTabInUrl = searchParams.get('tab');
    if (currentTabInUrl && validTabs.includes(currentTabInUrl) && currentTabInUrl !== activeTab) {
      setActiveTab(currentTabInUrl as any);
    }
  }, [searchParams]);

  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab as any);
    setSearchParams({ tab: newTab });
  };
  const [pendingQuizCount, setPendingQuizCount] = useState<number>(0);

  // Student Invitation States
  const [showStudentInviteModal, setShowStudentInviteModal] = useState(false);
  const [inviteStudentName, setInviteStudentName] = useState('');
  const [inviteStudentEmail, setInviteStudentEmail] = useState('');
  const [inviteStudentBatch, setInviteStudentBatch] = useState('');
  const [inviteStudentLoading, setInviteStudentLoading] = useState(false);
  const [studentInviteLink, setStudentInviteLink] = useState<string | null>(null);

  // Share Modal State
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // Delete Classroom Modal State
  const [showDeleteClassroomModal, setShowDeleteClassroomModal] = useState(false);
  const [deleteClassroomLoading, setDeleteClassroomLoading] = useState(false);
  const [deleteClassroomError, setDeleteClassroomError] = useState<string | null>(null);

  const handleDeleteCurrentClassroom = async () => {
    if (!id || !classroom) return;
    setDeleteClassroomLoading(true);
    setDeleteClassroomError(null);
    try {
      await api.delete(`/classrooms/${id}`);
      setShowDeleteClassroomModal(false);
      navigate('/');
    } catch (err: any) {
      console.error(err);
      setDeleteClassroomError(err.response?.data?.message || 'Failed to delete classroom.');
    } finally {
      setDeleteClassroomLoading(false);
    }
  };

  // Rename Classroom Modal State
  const [showRenameClassroomModal, setShowRenameClassroomModal] = useState(false);
  const [renameClassName, setRenameClassName] = useState('');
  const [renameClassSubject, setRenameClassSubject] = useState('');
  const [renameClassroomLoading, setRenameClassroomLoading] = useState(false);
  const [renameClassroomError, setRenameClassroomError] = useState<string | null>(null);

  const handleRenameCurrentClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !classroom) return;
    if (!renameClassName.trim()) {
      setRenameClassroomError('Classroom name is required.');
      return;
    }

    setRenameClassroomLoading(true);
    setRenameClassroomError(null);
    try {
      const response = await api.put(`/classrooms/${id}`, {
        name: renameClassName.trim(),
        subject: renameClassSubject.trim() || undefined
      });
      setClassroom((prev: any) => prev ? { ...prev, ...response.data.classroom } : response.data.classroom);
      setShowRenameClassroomModal(false);
      await fetchClassroomDetails();
      if (typeof fetchClassrooms === 'function') {
        fetchClassrooms();
      }
    } catch (err: any) {
      console.error(err);
      setRenameClassroomError(err.response?.data?.message || 'Failed to rename classroom.');
    } finally {
      setRenameClassroomLoading(false);
    }
  };

  // Assign Teacher Modal State
  const [showAssignTeacherModal, setShowAssignTeacherModal] = useState(false);
  const [availableOrgTeachers, setAvailableOrgTeachers] = useState<Array<{ id: number; name: string; email: string }>>([]);
  const [loadingOrgTeachers, setLoadingOrgTeachers] = useState(false);
  const [selectedTeacherIdsToAssign, setSelectedTeacherIdsToAssign] = useState<number[]>([]);
  const [selectedAssignRole, setSelectedAssignRole] = useState<'co-teacher' | 'teacher'>('co-teacher');
  const [assignTeacherLoading, setAssignTeacherLoading] = useState(false);
  const [assignTeacherError, setAssignTeacherError] = useState<string | null>(null);

  // Multi-select dropdown menu state
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const teacherDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teacherDropdownRef.current && !teacherDropdownRef.current.contains(event.target as Node)) {
        setIsTeacherDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenAssignTeacherModal = async () => {
    setShowAssignTeacherModal(true);
    setLoadingOrgTeachers(true);
    setAssignTeacherError(null);
    setSelectedTeacherIdsToAssign([]);
    setSelectedAssignRole('co-teacher');
    setIsTeacherDropdownOpen(false);
    try {
      const res = await api.get('/teachers');
      const allTeachers: Array<{ id: number; name: string; email: string }> = res.data.teachers || [];
      const currentTeacherIds = (classroom?.teachers || []).map(t => t.id);
      const unassigned = allTeachers.filter(t => !currentTeacherIds.includes(t.id));
      setAvailableOrgTeachers(unassigned);
    } catch (err: any) {
      console.error(err);
      setAssignTeacherError('Failed to load organization teachers.');
    } finally {
      setLoadingOrgTeachers(false);
    }
  };

  const handleToggleTeacherSelection = (teacherId: number) => {
    setSelectedTeacherIdsToAssign(prev => 
      prev.includes(teacherId) 
        ? prev.filter(id => id !== teacherId) 
        : [...prev, teacherId]
    );
  };

  const handleSelectAllTeachers = () => {
    if (selectedTeacherIdsToAssign.length === availableOrgTeachers.length) {
      setSelectedTeacherIdsToAssign([]);
    } else {
      setSelectedTeacherIdsToAssign(availableOrgTeachers.map(t => t.id));
    }
  };

  const handleAssignTeacherSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || selectedTeacherIdsToAssign.length === 0) {
      setAssignTeacherError('Please select at least one teacher to assign.');
      return;
    }
    setAssignTeacherLoading(true);
    setAssignTeacherError(null);
    try {
      await api.post(`/classrooms/${id}/teachers/assign`, {
        teacherIds: selectedTeacherIdsToAssign,
        role: selectedAssignRole
      });
      setShowAssignTeacherModal(false);
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      setAssignTeacherError(err.response?.data?.message || 'Failed to assign teachers.');
    } finally {
      setAssignTeacherLoading(false);
    }
  };

  // Folders and Resources State
  const [folders, setFolders] = useState<Folder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);

  // Add Material Modal / Form State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState<'file' | 'link' | 'bank'>('file');
  const [materialName, setMaterialName] = useState('');
  const [materialLink, setMaterialLink] = useState('');
  const [materialModuleSession, setMaterialModuleSession] = useState('');
  const [materialVisibility, setMaterialVisibility] = useState<'all_students' | 'specific_batch' | 'specific_students' | 'hidden'>('hidden');
  const [materialBatch, setMaterialBatch] = useState('');
  const [materialSelectedStudentIds, setMaterialSelectedStudentIds] = useState<number[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('root');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [bankItemsList, setBankItemsList] = useState<any[]>([]);
  const [selectedBankItem, setSelectedBankItem] = useState<any | null>(null);
  const [loadingBankItems, setLoadingBankItems] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Create Folder Modal State
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showImportBankModal, setShowImportBankModal] = useState(false);
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
  const [_mcqLoading, setMcqLoading] = useState(false);

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
  const [testAssignToSpecificStudents, setTestAssignToSpecificStudents] = useState(false);
  const [testSelectedStudentIds, setTestSelectedStudentIds] = useState<number[]>([]);
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
  const [pledgeConfirmed, setPledgeConfirmed] = useState(false);
  const [attemptTimeRemaining, setAttemptTimeRemaining] = useState(0); // in seconds
  const [studentResponses, setStudentResponses] = useState<Record<number, string>>({});
  const [proctorWarningMsg, setProctorWarningMsg] = useState<string | null>(null);
  const [proctorWarningCount, setProctorWarningCount] = useState(0);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [visitedQuestionIndexes, setVisitedQuestionIndexes] = useState<number[]>([0]);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);

  // Analytics State
  const [showAnalyticsModal, setShowAnalyticsModal] = useState(false);
  const [analyticsTest, setAnalyticsTest] = useState<MCQTest | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'leaderboard'>('overview');

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
  const [pracBatches, setPracBatches] = useState('');
  const [pracAssignToSpecificStudents, setPracAssignToSpecificStudents] = useState(false);
  const [pracSelectedStudentIds, setPracSelectedStudentIds] = useState<number[]>([]);
  const [pracSubmitting, setPracSubmitting] = useState(false);

  // Post-hoc Assignment Modal States
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargetType, setAssignTargetType] = useState<'material' | 'folder' | 'mcq' | 'practical' | null>(null);
  const [assignTargetId, setAssignTargetId] = useState<number | null>(null);
  const [assignBatches, setAssignBatches] = useState('');
  const [assignVisibility, setAssignVisibility] = useState<'all_students' | 'specific_students' | 'hidden'>('hidden');
  const [assignToSpecificStudents, setAssignToSpecificStudents] = useState(false);
  const [assignSelectedStudentIds, setAssignSelectedStudentIds] = useState<number[]>([]);
  const [assignToSpecificTeachers, setAssignToSpecificTeachers] = useState(false);
  const [assignSelectedTeacherIds, setAssignSelectedTeacherIds] = useState<number[]>([]);
  const [scheduledAt, setScheduledAt] = useState('');
  const [expiryAt, setExpiryAt] = useState('');
  const [assignSaving, setAssignSaving] = useState(false);

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

  const fetchResources = async (targetFolderId?: number | null) => {
    setResourcesLoading(true);
    try {
      const url = targetFolderId 
        ? `/resources/classroom/${id}?folderId=${targetFolderId}` 
        : `/resources/classroom/${id}`;
      const response = await api.get(url);
      if (targetFolderId) {
        setResources(response.data.resources || []);
      } else {
        setFolders(response.data.folders || []);
        setResources([]);
      }
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

  // Initial page mount: ONLY fetch basic classroom details
  useEffect(() => {
    fetchClassroomDetails();
    setCurrentFolderId(null);
    setResourcesLoaded(false);
    setMcqLoaded(false);
    setPracticalsLoaded(false);
  }, [id]);

  // Lazy / On-Demand Data Fetching (only fetch tab data when that tab becomes active!)
  useEffect(() => {
    if (!id) return;
    if (activeTab === 'resources' && !resourcesLoaded) {
      fetchResources();
      setResourcesLoaded(true);
    } else if (activeTab === 'mcqs' && !mcqLoaded) {
      fetchMcqTests();
      setMcqLoaded(true);
    } else if (activeTab === 'practicals' && !practicalsLoaded) {
      fetchPracticals();
      setPracticalsLoaded(true);
    }
  }, [id, activeTab, resourcesLoaded, mcqLoaded, practicalsLoaded]);

  // Fetch folder-specific resources on-demand ONLY when user opens a folder
  useEffect(() => {
    if (id && currentFolderId !== null) {
      fetchResources(currentFolderId);
    }
  }, [id, currentFolderId]);

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

  const handleInviteStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteStudentName.trim() || !inviteStudentEmail.trim()) {
      alert('Student name and email are required.');
      return;
    }

    setInviteStudentLoading(true);
    setStudentInviteLink(null);
    try {
      const response = await api.post(`/classrooms/${id}/students/invite`, {
        name: inviteStudentName.trim(),
        email: inviteStudentEmail.trim(),
        batch: inviteStudentBatch.trim() || undefined
      });

      if (response.data.inviteLink) {
        let link = response.data.inviteLink;
        const token = response.data.student?.invite_token;

        if (typeof window !== 'undefined' && window.location?.origin) {
          if (token) {
            link = `${window.location.origin}/accept-invite?token=${token}`;
          } else {
            try {
              const url = new URL(link);
              link = `${window.location.origin}${url.pathname}${url.search}`;
            } catch {
              // keep fallback link
            }
          }
        }

        setStudentInviteLink(link);
      } else {
        alert('Student linked to classroom successfully!');
        setShowStudentInviteModal(false);
        setInviteStudentName('');
        setInviteStudentEmail('');
        setInviteStudentBatch('');
      }

      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to invite student.');
    } finally {
      setInviteStudentLoading(false);
    }
  };

  const handleRemoveStudent = async (studentId: number) => {
    if (!window.confirm('Are you sure you want to remove this student from this classroom?')) {
      return;
    }

    try {
      await api.delete(`/classrooms/${id}/students/${studentId}`);
      alert('Student removed successfully.');
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to remove student.');
    }
  };

  const handleApproveStudentRequest = async (studentId: number) => {
    try {
      await api.post(`/classrooms/${id}/students/${studentId}/approve`);
      alert('Student request approved!');
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to approve student request.');
    }
  };

  const handleRejectStudentRequest = async (studentId: number) => {
    if (!window.confirm('Are you sure you want to reject this student request?')) {
      return;
    }
    try {
      await api.delete(`/classrooms/${id}/students/${studentId}/reject`);
      alert('Student request rejected.');
      fetchClassroomDetails();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to reject student request.');
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

  const fetchBankItems = async () => {
    setLoadingBankItems(true);
    try {
      const data = await materialBankService.getContents();
      setBankItemsList(data.items || []);
    } catch (err) {
      console.error('Failed to fetch Material Bank items:', err);
    } finally {
      setLoadingBankItems(false);
    }
  };

  // Submit link, file, or Material Bank item
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
    if (addType === 'bank' && !selectedBankItem) {
      alert('Please select an item from the Material Bank.');
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
        formData.append('assignedStudentIds', materialVisibility === 'specific_students' ? JSON.stringify(materialSelectedStudentIds) : '[]');

        const response = await api.post('/resources/upload', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        setResources(prev => [response.data.resource, ...prev]);
        alert('File uploaded successfully!');
      } else if (addType === 'bank' && selectedBankItem) {
        const response = await api.post('/resources/link', {
          classroomId: id,
          name: materialName || selectedBankItem.name,
          link: selectedBankItem.file_url,
          driveFileId: selectedBankItem.drive_file_id,
          mimeType: selectedBankItem.mime_type || (selectedBankItem.type === 'youtube' ? 'youtube' : 'application/octet-stream'),
          folderId: folderVal,
          moduleSession: materialModuleSession,
          visibility: materialVisibility,
          batch: materialBatch,
          assignedStudentIds: materialVisibility === 'specific_students' ? materialSelectedStudentIds : []
        });
        setResources(prev => [response.data.resource, ...prev]);
        alert('Material added from Material Bank successfully!');
      } else {
        // Link Upload
        const response = await api.post('/resources/link', {
          classroomId: id,
          name: materialName,
          link: materialLink,
          folderId: folderVal,
          moduleSession: materialModuleSession,
          visibility: materialVisibility,
          batch: materialBatch,
          assignedStudentIds: materialVisibility === 'specific_students' ? materialSelectedStudentIds : []
        });
        setResources(prev => [response.data.resource, ...prev]);
        alert('Link added successfully!');
      }

      setShowAddModal(false);
      setSelectedFile(null);
      setSelectedBankItem(null);
      setMaterialName('');
      setMaterialLink('');
      setMaterialModuleSession('');
      setMaterialBatch('');
      setMaterialVisibility('hidden');
      setMaterialSelectedStudentIds([]);
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

  const openAssignModal = (type: 'material' | 'folder' | 'mcq' | 'practical', item: any) => {
    setAssignTargetType(type);
    setAssignTargetId(item.id);
    
    if (type === 'material' || type === 'folder') {
      const vis = item.visibility || 'hidden';
      setAssignVisibility(vis);
      setAssignToSpecificStudents(vis === 'specific_students' || (item.assigned_student_ids && item.assigned_student_ids.length > 0));
      setAssignSelectedStudentIds(item.assigned_student_ids || []);
      setAssignToSpecificTeachers(item.assigned_teacher_ids && item.assigned_teacher_ids.length > 0);
      setAssignSelectedTeacherIds(item.assigned_teacher_ids || []);
      setAssignBatches(item.batch || '');
      setScheduledAt(item.scheduled_at ? new Date(item.scheduled_at).toISOString().slice(0, 16) : '');
      setExpiryAt(item.expiry_at ? new Date(item.expiry_at).toISOString().slice(0, 16) : '');
    } else {
      const hasIndStudents = item.assigned_student_ids && item.assigned_student_ids.length > 0;
      setAssignVisibility(hasIndStudents ? 'specific_students' : 'all_students');
      setAssignToSpecificStudents(hasIndStudents);
      setAssignSelectedStudentIds(item.assigned_student_ids || []);
      setAssignToSpecificTeachers(false);
      setAssignSelectedTeacherIds([]);
      setAssignBatches(item.batches ? item.batches.join(', ') : '');
      setScheduledAt('');
      setExpiryAt('');
    }
    
    setShowAssignModal(true);
  };

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTargetType || !assignTargetId) return;

    setAssignSaving(true);
    try {
      const batchesList = assignBatches ? assignBatches.split(',').map(b => b.trim()) : [];
      
      let payload: any = {};
      if (assignTargetType === 'material' || assignTargetType === 'folder') {
        payload = {
          visibility: assignVisibility,
          batch: null,
          assignedStudentIds: assignVisibility === 'specific_students' ? assignSelectedStudentIds : [],
          assignedTeacherIds: assignToSpecificTeachers ? assignSelectedTeacherIds : [],
          scheduledAt: scheduledAt || null,
          expiryAt: expiryAt || null
        };
      } else {
        payload = {
          batches: batchesList,
          assignedStudentIds: assignToSpecificStudents ? assignSelectedStudentIds : []
        };
      }

      let url = '';
      if (assignTargetType === 'material') {
        url = `/resources/${assignTargetId}/assign`;
      } else if (assignTargetType === 'folder') {
        url = `/resources/folders/${assignTargetId}/assign`;
      } else if (assignTargetType === 'mcq') {
        url = `/mcq/tests/${assignTargetId}/assign`;
      } else {
        url = `/practical/${assignTargetId}/assign`;
      }

      const response = await api.put(url, payload);

      if (assignTargetType === 'material') {
        setResources(prev => prev.map(r => r.id === assignTargetId ? { ...r, ...response.data.resource } : r));
      } else if (assignTargetType === 'folder') {
        setFolders(prev => prev.map(f => f.id === assignTargetId ? { ...f, ...response.data.folder } : f));
      } else if (assignTargetType === 'mcq') {
        setMcqTests(prev => prev.map(t => t.id === assignTargetId ? { ...t, ...response.data.test } : t));
      } else {
        setPracticals(prev => prev.map(p => p.id === assignTargetId ? { ...p, ...response.data.practical } : p));
      }

      setShowAssignModal(false);
      alert('Assignments updated successfully!');
    } catch (err: any) {
      console.error(err);
      alert('Failed to update assignments.');
    } finally {
      setAssignSaving(false);
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

  // Partition teachers and students by role & status (checks both user.role and ClassroomTeacher.role)
  const isStudentMember = (t: any) => t.role === 'student' || t.ClassroomTeacher?.role === 'student';
  const isTeacherMember = (t: any) => !isStudentMember(t);

  const activeTeachers = classroom?.teachers.filter(t => isTeacherMember(t) && t.ClassroomTeacher?.status === 'approved') || [];
  const pendingRequests = classroom?.teachers.filter(t => isTeacherMember(t) && t.ClassroomTeacher?.status === 'pending') || [];
  const activeStudents = classroom?.teachers.filter(t => isStudentMember(t) && t.ClassroomTeacher?.status === 'approved') || [];
  const pendingStudents = classroom?.teachers.filter(t => isStudentMember(t) && t.ClassroomTeacher?.status === 'pending') || [];

  const myMember = classroom?.teachers?.find(t => t.id === user?.id);
  const isStudentUser = user?.role === 'student' || myMember?.role === 'student' || myMember?.ClassroomTeacher?.role === 'student';

  // Generate generic shareable link for this classroom ID
  const inviteLink = classroom ? `${window.location.origin}/join-classroom/${classroom.classroom_id}` : '';

  // Filter resources and folders for display (show ONLY folders at root level; show resources ONLY inside opened folder)
  const currentFolders = currentFolderId === null ? folders : [];
  const currentResources = currentFolderId === null ? [] : resources.filter(resrc => resrc.folder_id === currentFolderId);

  // Check if resource is previewable (all materials open in-app modal)
  const isPreviewable = (_resrc: Resource): boolean => true;


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
        assignedStudentIds: testAssignToSpecificStudents ? testSelectedStudentIds : [],
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
      setTestAssignToSpecificStudents(false);
      setTestSelectedStudentIds([]);
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



  // Preview MCQ Test
  const handlePreviewTest = async (test: MCQTest) => {
    try {
      const response = await api.get(`/mcq/tests/${test.id}`);
      const fullTest = response.data.test;
      
      const processedQuestions = (fullTest.questions || []).map((q: any) => {
        const options = [
          { key: 'A', text: q.option_a },
          { key: 'B', text: q.option_b },
          { key: 'C', text: q.option_c },
          { key: 'D', text: q.option_d }
        ];
        const finalOptions = fullTest.shuffle_options ? shuffleArray(options) : options;
        return {
          ...q,
          options: finalOptions
        };
      });
      
      const finalQuestions = fullTest.shuffle_questions ? shuffleArray(processedQuestions) : processedQuestions;
      
      setActiveTest({
        ...fullTest,
        questions: finalQuestions
      });
      setIsPreviewMode(true);
      setActivePledgeChecked(false);
      setPledgeConfirmed(false);
      setActiveAttempt({
        id: 0,
        test_id: test.id,
        user_id: 0,
        score: 0,
        percentage: 0,
        time_taken: 0,
        responses: {},
        tab_switch_count: 0,
        tab_switch_log: [],
        fullscreen_exit_count: 0,
        fullscreen_exit_log: [],
        start_time: new Date().toISOString(),
        submit_type: 'manual',
        status: 'started'
      });
      setStudentResponses({});
      setProctorWarningCount(0);
      setProctorWarningMsg(null);
      setAttemptTimeRemaining(test.time_limit * 60);
    } catch (err: any) {
      console.error(err);
      alert('Failed to load test details for preview.');
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
      setPledgeConfirmed(true);
      setStudentResponses({});
      setProctorWarningCount(0);
      setProctorWarningMsg(null);
      setAttemptTimeRemaining(test.time_limit * 60);
      setCurrentQuestionIndex(0);
      setVisitedQuestionIndexes([0]);

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
    if (!activeAttempt || !activeAttempt.id || !activeTest) return;

    // Clear active timers
    if (timerRef.current) clearInterval(timerRef.current);

    if (isPreviewMode) {
      // Exit fullscreen if active
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error(err));
      }

      // Calculate preview score locally
      let score = 0;
      activeTest.questions?.forEach(q => {
        const correctAns = q.correct_answer;
        const studentAns = studentResponses[q.id!];
        if (correctAns && studentAns === correctAns) {
          score += q.marks;
        }
      });
      const totalMarks = activeTest.questions?.reduce((acc, q) => acc + q.marks, 0) || 0;
      const percentage = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

      alert(`[PREVIEW MODE] MCQ Exam submitted successfully!\n\nYour Mock Score: ${score} / ${totalMarks} (${percentage}%)\n\n(No data was saved to the database)`);
      setActiveAttempt(null);
      setActiveTest(null);
      setIsPreviewMode(false);
      return;
    }

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
    if (!activeAttempt || !activeAttempt.id || !activeTest) return;

    if (isPreviewMode) {
      const count = proctorWarningCount + 1;
      setProctorWarningCount(count);
      if (activeTest.security_tab_switch_behavior !== 'warning' && count >= activeTest.security_max_warnings) {
        if (timerRef.current) clearInterval(timerRef.current);
        alert('[PREVIEW MODE] EXAM TERMINATED: Too many tab switches detected. (In real exam, student attempt would be auto-submitted)');
        setActiveAttempt(null);
        setActiveTest(null);
        setIsPreviewMode(false);
      } else {
        setProctorWarningMsg(`[PREVIEW MODE] WARNING: Tab switch detected! Switch count: ${count} / ${activeTest.security_max_warnings}.`);
      }
      return;
    }

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
    if (!activeAttempt || !activeAttempt.id || !activeTest) return;

    setShowFullscreenWarning(true);

    if (isPreviewMode) {
      return;
    }

    try {
      await api.post(`/mcq/attempts/${activeAttempt.id}/log-event`, {
        eventType: 'fullscreen_exit'
      });
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
      } else {
        setShowFullscreenWarning(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [activeAttempt, activeTest]);

  // Track visited question indexes for question palette
  useEffect(() => {
    if (activeAttempt && activeTest) {
      if (!visitedQuestionIndexes.includes(currentQuestionIndex)) {
        setVisitedQuestionIndexes(prev => [...prev, currentQuestionIndex]);
      }
    }
  }, [currentQuestionIndex, activeAttempt, activeTest]);

  // Open attempt analytics
  const handleOpenAnalytics = async (testId: number) => {
    setAnalyticsLoading(true);
    setAnalyticsTab('overview');
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
      const batchesList = pracBatches ? pracBatches.split(',').map(b => b.trim()) : [];
      const response = await api.post('/practical', {
        classroomId: id,
        title: pracTitle,
        instructions: pracInstructions,
        dueDate: pracDueDate,
        totalMarks: pracTotalMarks,
        batches: batchesList,
        assignedStudentIds: pracAssignToSpecificStudents ? pracSelectedStudentIds : []
      });

      setPracticals(prev => [...prev, response.data.practical]);
      setShowPracticalModal(false);
      setPracTitle('');
      setPracInstructions('');
      setPracDueDate('');
      setPracBatches('');
      setPracAssignToSpecificStudents(false);
      setPracSelectedStudentIds([]);
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
          {/* Fullscreen Required Warning Modal Overlay */}
          {showFullscreenWarning && activeTest.security_force_fullscreen && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              width: '100vw',
              height: '100vh',
              backgroundColor: 'rgba(15, 23, 42, 0.95)',
              backdropFilter: 'blur(10px)',
              zIndex: 20000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px'
            }}>
              <div style={{
                backgroundColor: '#ffffff',
                borderRadius: '16px',
                padding: '36px',
                maxWidth: '520px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
              }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px'
                }}>
                  <FiShield size={34} />
                </div>

                <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', fontWeight: '800', color: '#0f172a' }}>
                  Full-Screen Mode Required
                </h3>

                <p style={{ fontSize: '14px', color: '#64748b', lineHeight: '1.6', marginBottom: '24px' }}>
                  You have exited full-screen mode. To maintain academic integrity, this examination requires active full-screen mode. Your exit has been logged in your proctor report.
                </p>

                <button
                  type="button"
                  className="btn-ld btn-ld-primary"
                  style={{ width: '100%', padding: '14px 20px', fontSize: '15px', fontWeight: '700', justifyContent: 'center' }}
                  onClick={async () => {
                    try {
                      await document.documentElement.requestFullscreen();
                      setShowFullscreenWarning(false);
                    } catch (err) {
                      console.error('Failed to re-enter fullscreen:', err);
                    }
                  }}
                >
                  Re-enter Full Screen to Resume Exam
                </button>
              </div>
            </div>
          )}
          {isPreviewMode && (
            <div style={{
              maxWidth: '850px',
              margin: '0 auto 16px',
              backgroundColor: 'var(--light-primary)',
              color: 'white',
              textAlign: 'center',
              padding: '10px 16px',
              fontSize: '14px',
              fontWeight: '700',
              borderRadius: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.2)'
            }}>
              <span>👁️ MCQ Exam Preview Mode — No attempts or scores will be saved.</span>
              <button 
                onClick={() => {
                  if (document.fullscreenElement) {
                    document.exitFullscreen().catch(err => console.error(err));
                  }
                  setActiveAttempt(null);
                  setActiveTest(null);
                  setIsPreviewMode(false);
                }}
                className="btn-ld btn-ld-danger btn-ld-small"
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Exit Preview
              </button>
            </div>
          )}
          {/* Pledge Screen */}
          {activeAttempt.status === 'started' && !pledgeConfirmed ? (
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
                    setIsPreviewMode(false);
                  }}
                >
                  Cancel
                </button>
                <button 
                  className="btn-ld btn-ld-primary" 
                  style={{ flex: 2 }}
                  disabled={!activePledgeChecked}
                  onClick={() => {
                    if (isPreviewMode) {
                      setActivePledgeChecked(true);
                      setPledgeConfirmed(true);
                      setAttemptTimeRemaining(activeTest.time_limit * 60);
                      if (activeTest.security_force_fullscreen) {
                        try {
                          document.documentElement.requestFullscreen();
                        } catch (fErr) {
                          console.error('Failed to trigger fullscreen:', fErr);
                        }
                      }
                    } else {
                      handleStartAttempt(activeTest);
                    }
                  }}
                >
                  Start Exam
                </button>
              </div>
            </div>
          ) : (
            /* Active questions panel */
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
              {/* Sticky Header Bar with Live Clock Timer */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'white', padding: '16px 24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '20px', position: 'sticky', top: 0, zIndex: 10 }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontWeight: 700, fontSize: '18px', color: '#0f172a' }}>{activeTest.title}</h3>
                  <span style={{ fontSize: '13px', color: 'var(--light-text-secondary)' }}>
                    Total Questions: {activeTest.questions?.length || activeTest.total_questions}
                    {proctorWarningCount > 0 && ` • Warnings: ${proctorWarningCount}/${activeTest.security_max_warnings}`}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: attemptTimeRemaining < 180 ? '#dc2626' : 'var(--light-primary)',
                    backgroundColor: attemptTimeRemaining < 180 ? '#fef2f2' : '#eef2ff',
                    border: attemptTimeRemaining < 180 ? '1px solid #fca5a5' : '1px solid #c7d2fe',
                    padding: '8px 16px',
                    borderRadius: '30px',
                    fontWeight: 800,
                    fontSize: '18px'
                  }}>
                    <FiClock size={20} />
                    <span>
                      {Math.floor(attemptTimeRemaining / 3600) > 0 && `${Math.floor(attemptTimeRemaining / 3600)}:`}
                      {Math.floor((attemptTimeRemaining % 3600) / 60).toString().padStart(2, '0')}:
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

              {/* Main 2-Column Grid Layout */}
              {(() => {
                const questions = activeTest.questions || [];
                const safeIndex = Math.min(Math.max(0, currentQuestionIndex), Math.max(0, questions.length - 1));
                const currentQuestion = questions[safeIndex];

                if (!currentQuestion) {
                  return (
                    <div style={{ padding: '40px', backgroundColor: '#fff', borderRadius: '12px', textAlign: 'center' }}>
                      No questions found in this examination.
                    </div>
                  );
                }

                const isSubjective = currentQuestion.question_type === 'subjective';
                const options = (currentQuestion.options && currentQuestion.options.length > 0)
                  ? currentQuestion.options
                  : [
                      { key: 'A', text: (currentQuestion as any).option_a },
                      { key: 'B', text: (currentQuestion as any).option_b },
                      { key: 'C', text: (currentQuestion as any).option_c },
                      { key: 'D', text: (currentQuestion as any).option_d }
                    ].filter(opt => opt.text);

                // Palette status counts
                const answeredCount = questions.filter(q => studentResponses[q.id!] !== undefined && studentResponses[q.id!] !== '').length;
                const visitedCount = visitedQuestionIndexes.length;
                const skippedCount = visitedQuestionIndexes.filter(idx => {
                  const q = questions[idx];
                  return q && (!studentResponses[q.id!] || studentResponses[q.id!] === '');
                }).length;
                const notVisitedCount = Math.max(0, questions.length - visitedCount);

                return (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 310px', gap: '24px', alignItems: 'start', marginBottom: '40px' }}>
                    {/* Left Column: Current Question Card */}
                    <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '28px', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      {/* Question Top Meta */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '14px' }}>
                        <span style={{ fontWeight: '700', fontSize: '15px', color: 'var(--light-primary)' }}>
                          Question {safeIndex + 1} of {questions.length} ({isSubjective ? 'Subjective / Essay' : 'MCQ'})
                        </span>
                        <span className="badge-ld badge-ld-secondary" style={{ fontSize: '12px', fontWeight: '600' }}>
                          {currentQuestion.marks} Marks
                        </span>
                      </div>

                      {/* Question Text */}
                      <p style={{ fontSize: '16px', fontWeight: '600', color: '#0f172a', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>
                        {currentQuestion.question_text}
                      </p>

                      {/* Question Answers Panel */}
                      {isSubjective ? (
                        <div>
                          <label className="form-label-ld" style={{ marginBottom: '8px', fontSize: '13px', color: '#475569' }}>
                            Type your detailed response below:
                          </label>
                          <textarea
                            className="input-ld"
                            rows={6}
                            placeholder="Write your answer clearly here..."
                            value={studentResponses[currentQuestion.id!] || ''}
                            onChange={(e) => {
                              setStudentResponses(prev => ({ ...prev, [currentQuestion.id!]: e.target.value }));
                            }}
                            style={{
                              width: '100%',
                              padding: '14px',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              borderRadius: '10px',
                              backgroundColor: '#fff',
                              border: '1.5px solid #cbd5e1'
                            }}
                          />
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', textAlign: 'right' }}>
                            Word count: {(studentResponses[currentQuestion.id!] || '').trim().split(/\s+/).filter(Boolean).length} words
                          </div>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {options.map((opt: any) => {
                            const isSelected = studentResponses[currentQuestion.id!] === opt.key;

                            return (
                              <label 
                                key={opt.key}
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '12px', 
                                  padding: '14px 18px', 
                                  borderRadius: '10px', 
                                  border: isSelected ? '2px solid var(--light-primary)' : '1px solid #cbd5e1',
                                  backgroundColor: isSelected ? '#eef2ff' : '#ffffff',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                  boxShadow: isSelected ? '0 2px 4px rgba(99, 102, 241, 0.1)' : 'none'
                                }}
                              >
                                <input 
                                  type="radio" 
                                  name={`q-${currentQuestion.id}`} 
                                  value={opt.key}
                                  checked={isSelected}
                                  onChange={() => {
                                    setStudentResponses(prev => ({ ...prev, [currentQuestion.id!]: opt.key }));
                                  }}
                                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: '700', minWidth: '22px', fontSize: '15px', color: isSelected ? 'var(--light-primary)' : '#475569' }}>
                                  {opt.key}.
                                </span>
                                <span style={{ fontSize: '14.5px', color: '#0f172a', fontWeight: isSelected ? '600' : 'normal' }}>
                                  {opt.text}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Question Navigation Controls */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '18px', marginTop: '10px' }}>
                        <button
                          type="button"
                          className="btn-ld btn-ld-secondary"
                          disabled={safeIndex === 0}
                          onClick={() => setCurrentQuestionIndex(safeIndex - 1)}
                        >
                          Previous
                        </button>

                        {studentResponses[currentQuestion.id!] && (
                          <button
                            type="button"
                            className="btn-ld btn-ld-secondary btn-ld-small"
                            onClick={() => {
                              setStudentResponses(prev => {
                                const copy = { ...prev };
                                delete copy[currentQuestion.id!];
                                return copy;
                              });
                            }}
                            style={{ color: '#ef4444' }}
                          >
                            Clear Response
                          </button>
                        )}

                        {safeIndex < questions.length - 1 ? (
                          <button
                            type="button"
                            className="btn-ld btn-ld-primary"
                            onClick={() => setCurrentQuestionIndex(safeIndex + 1)}
                          >
                            Next Question
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-ld btn-ld-primary"
                            onClick={() => handleAttemptSubmit(false)}
                          >
                            Finish & Submit Exam
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Right Column: Question Palette matching standard exam UI */}
                    <div style={{ backgroundColor: '#ffffff', borderRadius: '14px', padding: '20px', boxShadow: '0 4px 14px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0', position: 'sticky', top: '90px' }}>
                      <h4 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px' }}>
                        Question Palette
                      </h4>

                      {/* Numbered Palette Grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', marginBottom: '20px' }}>
                        {questions.map((q, idx) => {
                          const isCurrent = idx === safeIndex;
                          const isAnswered = studentResponses[q.id!] !== undefined && studentResponses[q.id!] !== '';
                          const isVisited = visitedQuestionIndexes.includes(idx);

                          let bgColor = '#e2e8f0'; // Gray (Not Visited)
                          let textColor = '#475569';

                          if (isCurrent) {
                            bgColor = '#2563eb'; // Blue (Current Active)
                            textColor = '#ffffff';
                          } else if (isAnswered) {
                            bgColor = '#16a34a'; // Green (Answered)
                            textColor = '#ffffff';
                          } else if (isVisited) {
                            bgColor = '#dc2626'; // Red (Skipped / Unanswered)
                            textColor = '#ffffff';
                          }

                          return (
                            <button
                              key={q.id || idx}
                              type="button"
                              onClick={() => setCurrentQuestionIndex(idx)}
                              style={{
                                backgroundColor: bgColor,
                                color: textColor,
                                border: 'none',
                                borderRadius: '8px 8px 8px 2px',
                                height: '38px',
                                fontWeight: '700',
                                fontSize: '13px',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                                boxShadow: isCurrent ? '0 0 0 3px rgba(37, 99, 235, 0.3)' : 'none'
                              }}
                              title={`Question ${idx + 1}`}
                            >
                              {idx + 1}
                            </button>
                          );
                        })}
                      </div>

                      {/* Palette Status Legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', paddingTop: '14px', borderTop: '1px solid #f1f5f9' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px 4px 4px 1px', backgroundColor: '#16a34a', display: 'inline-block' }}></span>
                          <span style={{ fontWeight: '600' }}>Answered ({answeredCount})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px 4px 4px 1px', backgroundColor: '#dc2626', display: 'inline-block' }}></span>
                          <span style={{ fontWeight: '600' }}>Unanswered / Skipped ({skippedCount})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px 4px 4px 1px', backgroundColor: '#2563eb', display: 'inline-block' }}></span>
                          <span style={{ fontWeight: '600' }}>Current Active</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ width: '14px', height: '14px', borderRadius: '4px 4px 4px 1px', backgroundColor: '#e2e8f0', display: 'inline-block' }}></span>
                          <span style={{ fontWeight: '600' }}>Not Visited ({notVisitedCount})</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
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
              {classroom && (user?.role === 'admin' || user?.role === 'teacher') && (
                <button
                  type="button"
                  onClick={() => {
                    setRenameClassName(classroom.name || '');
                    setRenameClassSubject(classroom.subject || '');
                    setRenameClassroomError(null);
                    setShowRenameClassroomModal(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--light-text-muted)',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    marginLeft: '4px'
                  }}
                  title="Rename Classroom"
                >
                  <FiEdit2 size={16} />
                </button>
              )}
            </h2>
            <span className="ld-subtitle">
              Subject: {classroom?.subject} • Classroom ID: {classroom?.classroom_id}
              {user?.role === 'student' && user?.batch && ` • Batch: ${user.batch}`}
            </span>
          </div>
        </div>

        {classroom && (user?.role === 'admin' || user?.role === 'teacher') && (
          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              className="btn-ld btn-ld-secondary" 
              onClick={() => {
                setRenameClassName(classroom.name || '');
                setRenameClassSubject(classroom.subject || '');
                setRenameClassroomError(null);
                setShowRenameClassroomModal(true);
              }}
            >
              <FiEdit2 size={15} />
              <span>Rename</span>
            </button>
            {user?.role === 'admin' && (
              <button 
                className="btn-ld" 
                style={{ backgroundColor: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}
                onClick={() => {
                  setDeleteClassroomError(null);
                  setShowDeleteClassroomModal(true);
                }}
              >
                <FiTrash2 size={16} />
                <span>Delete Classroom</span>
              </button>
            )}
            <button className="btn-ld btn-ld-primary" onClick={() => setShowModal(true)}>
              <FiPlus size={18} />
              <span>Invite Teacher</span>
            </button>
          </div>
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
            {!isStudentUser && (
              <>
                <button
                  onClick={() => handleTabChange('active')}
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
                    onClick={() => handleTabChange('pending')}
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
                <button
                  onClick={() => handleTabChange('students')}
                  style={{
                    padding: '12px 20px',
                    background: 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'students' ? '2px solid var(--light-primary)' : '2px solid transparent',
                    color: activeTab === 'students' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                    fontWeight: '600',
                    cursor: 'pointer',
                    fontSize: '14px',
                    outline: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <span>Students ({activeStudents.length})</span>
                  {pendingStudents.length > 0 && (
                    <span style={{
                      backgroundColor: '#ef4444',
                      color: 'white',
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '99px',
                      fontWeight: '700'
                    }}>
                      {pendingStudents.length}
                    </span>
                  )}
                </button>
              </>
            )}
            <button
              onClick={() => handleTabChange('resources')}
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
              onClick={() => handleTabChange('assign_quiz')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'assign_quiz' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'assign_quiz' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
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
              <span>{user?.role === 'student' ? 'MCQ Exams' : 'Assign Quiz'}</span>
              {user?.role === 'student' && pendingQuizCount > 0 && (
                <span style={{
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '11px',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  lineHeight: '1',
                  marginLeft: '2px'
                }}>
                  {pendingQuizCount}
                </span>
              )}
            </button>
            <button
              onClick={() => handleTabChange('practicals')}
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
            <button
              onClick={() => handleTabChange('sessions')}
              style={{
                padding: '12px 20px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === 'sessions' ? '2px solid var(--light-primary)' : '2px solid transparent',
                color: activeTab === 'sessions' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '14px',
                outline: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiCalendar size={16} />
              <span>Sessions</span>
            </button>
          </div>

          {/* Active Teachers Tab */}
          {activeTab === 'active' && !isStudentUser && (
            <TeachersTab
              activeTeachers={activeTeachers}
              user={user}
              onUpgradeTeacher={handleUpgradeTeacher}
              onRejectTeacher={handleRejectTeacher}
              onOpenAssignModal={handleOpenAssignTeacherModal}
            />
          )}

          {/* Pending Teacher Join Requests Tab */}
          {activeTab === 'pending' && user?.role === 'admin' && (
            <JoinRequestsTab
              pendingRequests={pendingRequests}
              onApproveTeacher={handleApproveTeacher}
              onRejectTeacher={handleRejectTeacher}
            />
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <StudentsTab
              activeStudents={activeStudents}
              pendingStudents={pendingStudents}
              user={user}
              classroomId={classroom?.classroom_id}
              onOpenInviteOneStudent={() => {
                setInviteStudentName('');
                setInviteStudentEmail('');
                setInviteStudentBatch('');
                setStudentInviteLink(null);
                setShowStudentInviteModal(true);
              }}
              onApproveStudentRequest={handleApproveStudentRequest}
              onRejectStudentRequest={handleRejectStudentRequest}
              onRemoveStudent={handleRemoveStudent}
            />
          )}

          {/* Resources Tab */}
          {activeTab === 'resources' && (
            <ResourcesTab
              user={user}
              currentFolderId={currentFolderId}
              setCurrentFolderId={setCurrentFolderId}
              folders={folders}
              currentFolders={currentFolders}
              currentResources={currentResources}
              resourcesLoading={resourcesLoading}
              dragActive={dragActive}
              showAddModal={showAddModal}
              handleDrag={handleDrag}
              handleDrop={handleDrop}
              handleFileChange={handleFileChange}
              handleDeleteFolder={handleDeleteFolder}
              handleDeleteResource={handleDeleteResource}
              openAssignModal={openAssignModal}
              isPreviewable={isPreviewable}
              setPreviewResource={setPreviewResource}
              onOpenAddModal={(type) => {
                if (type === 'file') {
                  setAddType('file');
                  setSelectedFile(null);
                  setMaterialName('');
                  setMaterialVisibility('hidden');
                  setMaterialBatch('');
                  setMaterialModuleSession('');
                  setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
                  setShowAddModal(true);
                } else {
                  setAddType('link');
                  setMaterialName('');
                  setMaterialLink('');
                  setMaterialVisibility('hidden');
                  setMaterialBatch('');
                  setMaterialModuleSession('');
                  setSelectedFolderId(currentFolderId ? String(currentFolderId) : 'root');
                  setShowAddModal(true);
                }
              }}
              onOpenFolderModal={() => {
                setNewFolderName('');
                setShowFolderModal(true);
              }}
              onOpenImportBankModal={() => setShowImportBankModal(true)}
            />
          )}

          {/* Assign Quiz / MCQ Exams Tab */}
          {activeTab === 'assign_quiz' && (
            <AssignQuizTab
              classroomId={Number(id)}
              userRole={user?.role || 'student'}
              user={user}
              classroomStudents={activeStudents.map(s => ({ id: s.id, name: s.name, email: s.email }))}
              onViewReport={handleViewResultDetails}
              onPreviewTest={handlePreviewTest}
              onOpenAnalytics={handleOpenAnalytics}
              onStartAttempt={(test) => {
                setActiveTest(test);
                setActivePledgeChecked(false);
                setPledgeConfirmed(false);
                setActiveAttempt({ status: 'started' } as any);
              }}
              onPendingCountChange={(count) => setPendingQuizCount(count)}
            />
          )}

          {/* Practical Exams Tab */}
          {activeTab === 'practicals' && (
            <PracticalsTab
              user={user}
              practicalsLoading={practicalsLoading}
              practicals={practicals}
              onOpenCreatePractical={() => {
                setPracTitle('');
                setPracInstructions('');
                setPracDueDate('');
                setPracTotalMarks(100);
                setShowPracticalModal(true);
              }}
              onStartSubmit={(prac) => {
                setSelectedPrac(prac);
                const sub = prac.submissions && prac.submissions[0];
                setPracTextAnswer(sub?.text_answer || '');
                setPracGithubLink(sub?.github_link || '');
                setPracDriveLink(sub?.drive_link || '');
                setPracFiles([]);
                setShowPracSubmissionModal(true);
              }}
              onViewGrade={(sub) => {
                setViewSubFeedback(sub);
                setShowStudentFeedbackModal(true);
              }}
              onOpenGrading={handleOpenGrading}
              onOpenAssignModal={(prac) => openAssignModal('practical', prac)}
            />
          )}

          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <SessionsTab
              classroomId={classroom?.id}
              user={user}
              teachers={classroom?.teachers}
              activeStudents={activeStudents}
            />
          )}
        </div>
      ) : null}

      {/* Student Invite Modal */}
      {showStudentInviteModal && (
        <div className="modal-overlay-ld" onClick={() => { if (!inviteStudentLoading) setShowStudentInviteModal(false); }}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0 }}>Invite Student</h3>
              <button 
                onClick={() => setShowStudentInviteModal(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--light-text-secondary)' }}
                disabled={inviteStudentLoading}
              >
                <FiX size={20} />
              </button>
            </div>

            {studentInviteLink ? (
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <div style={{ 
                  width: '56px', 
                  height: '56px', 
                  borderRadius: '50%', 
                  background: 'rgba(16, 185, 129, 0.12)', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  color: '#10b981',
                  margin: '0 auto 16px'
                }}>
                  <FiCheck size={26} />
                </div>
                
                <h4 style={{ fontWeight: '700', marginBottom: '8px' }}>Invitation Link Generated</h4>
                <p className="modal-subtitle-ld" style={{ marginBottom: '20px' }}>
                  Share this invitation link with the student so they can activate their account and join their batch.
                </p>

                <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      className="form-input-ld"
                      style={{ paddingRight: '48px', textOverflow: 'ellipsis', fontWeight: '500' }}
                      type="text"
                      readOnly
                      value={studentInviteLink}
                    />
                    <button 
                      type="button"
                      onClick={() => copyToClipboard(studentInviteLink)}
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
                  onClick={() => setShowStudentInviteModal(false)}
                  style={{ width: '100%' }}
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteStudentSubmit}>
                <div className="form-group-ld" style={{ marginBottom: '16px' }}>
                  <label className="form-label-ld">Full Name *</label>
                  <input 
                    type="text" 
                    className="form-input-ld" 
                    placeholder="e.g. Jane Doe"
                    value={inviteStudentName}
                    onChange={(e) => setInviteStudentName(e.target.value)}
                    required
                    disabled={inviteStudentLoading}
                  />
                </div>

                <div className="form-group-ld" style={{ marginBottom: '16px' }}>
                  <label className="form-label-ld">Email Address *</label>
                  <input 
                    type="email" 
                    className="form-input-ld" 
                    placeholder="e.g. jane.doe@school.edu"
                    value={inviteStudentEmail}
                    onChange={(e) => setInviteStudentEmail(e.target.value)}
                    required
                    disabled={inviteStudentLoading}
                  />
                </div>

                <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                  <label className="form-label-ld">Classroom Batch (Optional)</label>
                  <input 
                    type="text" 
                    className="form-input-ld" 
                    placeholder="e.g. Batch A, Morning, 2026"
                    value={inviteStudentBatch}
                    onChange={(e) => setInviteStudentBatch(e.target.value)}
                    disabled={inviteStudentLoading}
                  />
                  <small style={{ display: 'block', color: 'var(--light-text-secondary)', marginTop: '4px', fontSize: '11px' }}>
                    Student will only see tests and resources assigned to this batch.
                  </small>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    className="btn-ld btn-ld-secondary" 
                    onClick={() => setShowStudentInviteModal(false)}
                    disabled={inviteStudentLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn-ld btn-ld-primary" 
                    disabled={inviteStudentLoading}
                  >
                    {inviteStudentLoading ? 'Generating...' : 'Invite Student'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Rename Classroom Modal */}
      {showRenameClassroomModal && classroom && (
        <div className="modal-overlay-ld" onClick={() => setShowRenameClassroomModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiEdit2 size={20} style={{ color: 'var(--light-primary)' }} />
                <span>Rename Classroom</span>
              </h3>
              <button 
                onClick={() => setShowRenameClassroomModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '20px' }}>
              Update the name or subject for this classroom.
            </p>

            {renameClassroomError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{renameClassroomError}</span>
              </div>
            )}

            <form onSubmit={handleRenameCurrentClassroom}>
              <div className="form-group-ld" style={{ marginBottom: '16px' }}>
                <label className="form-label-ld" htmlFor="detailsRenameClassName">Classroom Name *</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="detailsRenameClassName"
                  value={renameClassName}
                  onChange={(e) => setRenameClassName(e.target.value)}
                  placeholder="e.g. Mathematics Grade 10"
                  required
                />
              </div>

              <div className="form-group-ld" style={{ marginBottom: '24px' }}>
                <label className="form-label-ld" htmlFor="detailsRenameClassSubject">Subject</label>
                <input
                  className="form-input-ld"
                  type="text"
                  id="detailsRenameClassSubject"
                  value={renameClassSubject}
                  onChange={(e) => setRenameClassSubject(e.target.value)}
                  placeholder="e.g. Algebra / Trigonometry"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button 
                  type="button" 
                  className="btn-ld btn-ld-secondary" 
                  onClick={() => setShowRenameClassroomModal(false)}
                  disabled={renameClassroomLoading}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-ld btn-ld-primary" 
                  disabled={renameClassroomLoading}
                >
                  {renameClassroomLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Classroom Modal */}
      {showDeleteClassroomModal && classroom && (
        <div className="modal-overlay-ld" onClick={() => setShowDeleteClassroomModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiAlertCircle size={22} />
                <span>Delete Classroom</span>
              </h3>
              <button 
                onClick={() => setShowDeleteClassroomModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>
            
            <p className="modal-subtitle-ld" style={{ marginBottom: '16px', fontSize: '14px', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete <strong>{classroom.name}</strong>? All associated modules, resources, and tests will be removed.
            </p>

            {deleteClassroomError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{deleteClassroomError}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button 
                type="button" 
                className="btn-ld btn-ld-secondary" 
                onClick={() => setShowDeleteClassroomModal(false)}
                disabled={deleteClassroomLoading}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn-ld" 
                style={{ backgroundColor: '#dc2626', color: 'white', border: 'none' }}
                onClick={handleDeleteCurrentClassroom}
                disabled={deleteClassroomLoading}
              >
                {deleteClassroomLoading ? 'Deleting...' : 'Delete Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Teacher Modal */}
      {showAssignTeacherModal && (
        <div className="modal-overlay-ld" onClick={() => setShowAssignTeacherModal(false)}>
          <div className="modal-content-ld" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 className="modal-title-ld" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUserPlus style={{ color: 'var(--light-primary)' }} />
                <span>Assign Teacher to Classroom</span>
              </h3>
              <button 
                onClick={() => setShowAssignTeacherModal(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--light-text-muted)' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <p className="modal-subtitle-ld" style={{ marginBottom: '20px' }}>
              Select an existing teacher from your organization to assign to <strong>{classroom?.name}</strong>. Teachers are assigned as <strong>Co-Teacher</strong> by default.
            </p>

            {assignTeacherError && (
              <div className="alert-ld alert-ld-error" style={{ marginBottom: '16px' }}>
                <FiAlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{assignTeacherError}</span>
              </div>
            )}

            {loadingOrgTeachers ? (
              <div style={{ padding: '30px', display: 'flex', justifyContent: 'center' }}>
                <span className="spinner" style={{ width: '28px', height: '28px' }}></span>
              </div>
            ) : availableOrgTeachers.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: 'var(--light-text-secondary)', background: 'var(--light-bg-subtle)', borderRadius: '8px' }}>
                <p style={{ margin: 0, fontSize: '14px' }}>All organization teachers are already assigned to this classroom, or no teachers exist.</p>
              </div>
            ) : (
              <form onSubmit={handleAssignTeacherSubmit}>
                <div className="form-group-ld">
                  <label className="form-label-ld">Select Teacher(s) *</label>

                  {/* Multi-Select Dropdown Menu Trigger */}
                  <div ref={teacherDropdownRef} style={{ position: 'relative' }}>
                    <div 
                      onClick={() => setIsTeacherDropdownOpen(!isTeacherDropdownOpen)}
                      className="form-input-ld"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        userSelect: 'none',
                        background: '#fff',
                        borderColor: isTeacherDropdownOpen ? 'var(--light-primary)' : 'var(--light-border)'
                      }}
                    >
                      <span style={{ 
                        color: selectedTeacherIdsToAssign.length === 0 ? 'var(--light-text-muted)' : 'var(--light-text-main)', 
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {selectedTeacherIdsToAssign.length === 0 
                          ? 'Select Teachers...' 
                          : selectedTeacherIdsToAssign.length === availableOrgTeachers.length
                            ? `All Teachers Selected (${availableOrgTeachers.length})`
                            : availableOrgTeachers
                                .filter(t => selectedTeacherIdsToAssign.includes(t.id))
                                .map(t => t.name)
                                .join(', ')
                        }
                      </span>
                      <FiChevronDown 
                        size={18} 
                        style={{ 
                          transform: isTeacherDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                          transition: 'transform 0.2s', 
                          flexShrink: 0,
                          color: 'var(--light-text-muted)' 
                        }} 
                      />
                    </div>

                    {/* Floating Dropdown Options Menu */}
                    {isTeacherDropdownOpen && (
                      <div style={{
                        position: 'absolute',
                        top: 'calc(100% + 4px)',
                        left: 0,
                        right: 0,
                        backgroundColor: '#fff',
                        border: '1px solid var(--light-border)',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)',
                        zIndex: 1000,
                        padding: '6px',
                        maxHeight: '220px',
                        overflowY: 'auto'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', borderBottom: '1px solid var(--light-border)', marginBottom: '4px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--light-text-muted)' }}>
                            {selectedTeacherIdsToAssign.length} of {availableOrgTeachers.length} selected
                          </span>
                          <button
                            type="button"
                            onClick={handleSelectAllTeachers}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--light-primary)',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: 600
                            }}
                          >
                            {selectedTeacherIdsToAssign.length === availableOrgTeachers.length ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>

                        {availableOrgTeachers.map((t) => {
                          const isSelected = selectedTeacherIdsToAssign.includes(t.id);
                          return (
                            <div
                              key={t.id}
                              onClick={() => handleToggleTeacherSelection(t.id)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 10px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                backgroundColor: isSelected ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                                transition: 'background-color 0.15s',
                                marginBottom: '2px'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {}}
                                style={{ cursor: 'pointer', width: '15px', height: '15px' }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--light-text-main)' }}>{t.name}</span>
                                <span style={{ fontSize: '11px', color: 'var(--light-text-muted)' }}>{t.email}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-group-ld" style={{ marginBottom: '24px', marginTop: '16px' }}>
                  <label className="form-label-ld">Assign Role *</label>
                  <select
                    className="form-input-ld"
                    value={selectedAssignRole}
                    onChange={(e) => setSelectedAssignRole(e.target.value as any)}
                    required
                  >
                    <option value="co-teacher">Co-Teacher (Default)</option>
                    <option value="teacher">Full Teacher</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn-ld btn-ld-secondary"
                    onClick={() => setShowAssignTeacherModal(false)}
                    disabled={assignTeacherLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-ld btn-ld-primary"
                    disabled={assignTeacherLoading || selectedTeacherIdsToAssign.length === 0}
                  >
                    {assignTeacherLoading ? 'Assigning...' : `Assign ${selectedTeacherIdsToAssign.length} Teacher(s)`}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

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

      {/* Import from Material Bank Modal */}
      {showImportBankModal && classroom && (
        <ImportMaterialBankModal
          isOpen={showImportBankModal}
          classroomId={classroom.id}
          targetFolderId={currentFolderId}
          onClose={() => setShowImportBankModal(false)}
          onSuccess={() => fetchResources(currentFolderId)}
        />
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
                onClick={() => { setAddType('file'); setMaterialName(''); setSelectedBankItem(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: addType === 'file' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: addType === 'file' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                File Upload
              </button>
              <button
                type="button"
                onClick={() => { setAddType('link'); setMaterialName(''); setSelectedBankItem(null); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: addType === 'link' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: addType === 'link' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                YouTube / Link
              </button>
              <button
                type="button"
                onClick={() => { setAddType('bank'); fetchBankItems(); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: addType === 'bank' ? '2px solid var(--light-primary)' : '2px solid transparent',
                  color: addType === 'bank' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                From Material Bank
              </button>
            </div>

            <form onSubmit={handleAddMaterialSubmit}>
              {addType === 'bank' ? (
                <>
                  <div className="form-group-ld">
                    <label className="form-label-ld">Select Material Bank Item *</label>
                    <select
                      className="form-input-ld"
                      value={selectedBankItem ? String(selectedBankItem.id) : ''}
                      onChange={(e) => {
                        const item = bankItemsList.find(b => String(b.id) === e.target.value);
                        setSelectedBankItem(item || null);
                        if (item) {
                          setMaterialName(item.name);
                        }
                      }}
                      required
                    >
                      <option value="">-- Choose from Material Bank --</option>
                      {bankItemsList.map(b => (
                        <option key={b.id} value={b.id}>
                          [{b.type === 'youtube' ? 'YouTube' : 'File'}] {b.name}
                        </option>
                      ))}
                    </select>
                    {loadingBankItems && (
                      <span style={{ fontSize: '11px', color: 'var(--light-text-muted)', marginTop: '4px', display: 'block' }}>Loading items...</span>
                    )}
                  </div>

                  <div className="form-group-ld">
                    <label className="form-label-ld">Material Title *</label>
                    <input 
                      type="text" 
                      className="form-input-ld" 
                      placeholder="e.g. Organic Chemistry Video"
                      value={materialName}
                      onChange={(e) => setMaterialName(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : addType === 'file' ? (
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
                  <option value="hidden">🔒 Hidden / Unassigned (Default)</option>
                  <option value="all_students">👥 All Students</option>
                  <option value="specific_students">🎯 Specific Students</option>
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

              {materialVisibility === 'specific_students' && (
                <div className="form-group-ld">
                  <label className="form-label-ld">Select Students *</label>
                  <div style={{
                    maxHeight: '150px',
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
                        <label key={`material-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                          <input 
                            type="checkbox" 
                            checked={materialSelectedStudentIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setMaterialSelectedStudentIds(prev => [...prev, student.id]);
                              } else {
                                setMaterialSelectedStudentIds(prev => prev.filter(id => id !== student.id));
                              }
                            }}
                          />
                          <span>{student.name} ({student.email})</span>
                        </label>
                      ))
                    )}
                  </div>
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
                    disabled={testAssignToSpecificStudents}
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

              <div className="form-group-ld">
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                  <input 
                    type="checkbox"
                    checked={testAssignToSpecificStudents}
                    onChange={(e) => {
                      setTestAssignToSpecificStudents(e.target.checked);
                      if (e.target.checked) setTestBatches('');
                    }}
                  />
                  <span>Assign to specific individual students instead of batches</span>
                </label>
                {testAssignToSpecificStudents && (
                  <div style={{
                    maxHeight: '150px',
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
                        <label key={`test-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                          <input 
                            type="checkbox" 
                            checked={testSelectedStudentIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setTestSelectedStudentIds(prev => [...prev, student.id]);
                              } else {
                                setTestSelectedStudentIds(prev => prev.filter(id => id !== student.id));
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
            ) : analyticsData ? (() => {
              const sortedAttempts = [...(analyticsData.attempts || [])].sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                return a.time_taken - b.time_taken;
              });
              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Tab Navigation */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--light-border)', marginBottom: '10px', gap: '16px' }}>
                    <button 
                      type="button"
                      onClick={() => setAnalyticsTab('overview')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        color: analyticsTab === 'overview' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                        borderBottom: analyticsTab === 'overview' ? '3px solid var(--light-primary)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                    >
                      Overview & Performance
                    </button>
                    <button 
                      type="button"
                      onClick={() => setAnalyticsTab('leaderboard')}
                      style={{
                        padding: '10px 16px',
                        border: 'none',
                        background: 'transparent',
                        fontSize: '14px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        color: analyticsTab === 'leaderboard' ? 'var(--light-primary)' : 'var(--light-text-secondary)',
                        borderBottom: analyticsTab === 'leaderboard' ? '3px solid var(--light-primary)' : '3px solid transparent',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                    >
                      🏆 Ranking Leaderboard
                    </button>
                  </div>

                  {analyticsTab === 'overview' && (
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

                      {/* Student Attempts/Scores List */}
                      <div>
                        <h4 style={{ margin: '0 0 10px 0', fontWeight: '700' }}>Student Submissions & Results</h4>
                        {!analyticsData.attempts || analyticsData.attempts.length === 0 ? (
                          <p style={{ color: 'var(--light-text-secondary)', fontSize: '13px', margin: 0 }}>No submissions yet.</p>
                        ) : (
                          <div className="ld-table-container" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                            <table className="ld-table">
                              <thead>
                                <tr>
                                  <th>Student</th>
                                  <th>Score / Percentage</th>
                                  <th>Time Taken</th>
                                  <th>Proctor Flags</th>
                                  <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {analyticsData.attempts.map((att: any) => (
                                  <tr key={att.id}>
                                    <td style={{ fontWeight: '600' }}>
                                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span>{att.user?.name}</span>
                                        <span style={{ fontSize: '11.5px', color: 'var(--light-text-secondary)', fontWeight: '500' }}>
                                          {att.user?.email} • {att.user?.batch || 'No Batch'}
                                        </span>
                                      </div>
                                    </td>
                                    <td style={{ fontWeight: '700', color: 'var(--light-primary)' }}>
                                      {att.score} Marks ({att.percentage}%)
                                    </td>
                                    <td>{Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s</td>
                                    <td>
                                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                        {att.tab_switch_count > 0 && (
                                          <span className="badge-ld badge-ld-warning" style={{ fontSize: '10px' }}>
                                            {att.tab_switch_count} Tab Switches
                                          </span>
                                        )}
                                        {att.fullscreen_exit_count > 0 && (
                                          <span className="badge-ld badge-ld-danger" style={{ fontSize: '10px' }}>
                                            {att.fullscreen_exit_count} FS Exits
                                          </span>
                                        )}
                                        {att.tab_switch_count === 0 && att.fullscreen_exit_count === 0 && (
                                          <span className="badge-ld badge-ld-success" style={{ fontSize: '10px' }}>Clean</span>
                                        )}
                                      </div>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                      <button
                                        className="btn-ld btn-ld-secondary btn-ld-small"
                                        onClick={() => handleViewResultDetails(att.id)}
                                      >
                                        View Details
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {analyticsTab === 'leaderboard' && (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '20px',
                      backgroundColor: '#581c87',
                      padding: '24px',
                      borderRadius: '16px',
                      color: '#fff'
                    }}>
                      
                      {/* Top 3 Podium */}
                      {sortedAttempts.length > 0 && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'center',
                          alignItems: 'flex-end',
                          gap: '20px',
                          padding: '20px 0 10px 0',
                          position: 'relative'
                        }}>
                          {/* Arch background effect */}
                          <div style={{
                            position: 'absolute',
                            top: '10px',
                            width: '280px',
                            height: '140px',
                            borderTopLeftRadius: '140px',
                            borderTopRightRadius: '140px',
                            backgroundColor: 'rgba(255,255,255,0.04)',
                            zIndex: 0
                          }}></div>

                          {/* 3rd Place */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100px',
                            zIndex: 1
                          }}>
                            {sortedAttempts.length > 2 ? (
                              <>
                                <div style={{
                                  width: '56px',
                                  height: '56px',
                                  borderRadius: '50%',
                                  backgroundColor: '#ea580c',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '18px',
                                  border: '3px solid #fdba74',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                }}>
                                  {sortedAttempts[2].user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '3'}
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center', marginTop: '8px', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sortedAttempts[2].user?.name}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fcd34d', marginTop: '2px' }}>
                                  {sortedAttempts[2].percentage}%
                                </span>
                              </>
                            ) : (
                              <div style={{ height: '86px' }}></div>
                            )}
                            <div style={{
                              marginTop: '12px',
                              height: '80px',
                              width: '90px',
                              background: 'linear-gradient(to top, #7c3aed, #a78bfa)',
                              borderRadius: '8px 8px 0 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}>
                              <span style={{ fontWeight: '800', fontSize: '36px', color: '#fff' }}>3</span>
                            </div>
                          </div>

                          {/* 1st Place */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '120px',
                            zIndex: 1
                          }}>
                            <div style={{
                              width: '68px',
                              height: '68px',
                              borderRadius: '50%',
                              backgroundColor: '#ca8a04',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: '800',
                              fontSize: '22px',
                              border: '3px solid #facc15',
                              boxShadow: '0 6px 15px rgba(250, 204, 21, 0.3)',
                              position: 'relative'
                            }}>
                              {sortedAttempts[0].user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '1'}
                              <div style={{ position: 'absolute', top: '-18px', fontSize: '16px' }}>👑</div>
                            </div>
                            <span style={{ fontWeight: '800', fontSize: '14px', textAlign: 'center', marginTop: '8px', width: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {sortedAttempts[0].user?.name}
                            </span>
                            <span style={{ fontSize: '13px', fontWeight: '800', color: '#facc15', marginTop: '2px' }}>
                              {sortedAttempts[0].percentage}%
                            </span>
                            <div style={{
                              marginTop: '12px',
                              height: '130px',
                              width: '100px',
                              background: 'linear-gradient(to top, #4c1d95, #7c3aed)',
                              borderRadius: '8px 8px 0 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 15px rgba(0,0,0,0.15)'
                            }}>
                              <span style={{ fontWeight: '800', fontSize: '48px', color: '#fff' }}>1</span>
                            </div>
                          </div>

                          {/* 2nd Place */}
                          <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            width: '100px',
                            zIndex: 1
                          }}>
                            {sortedAttempts.length > 1 ? (
                              <>
                                <div style={{
                                  width: '58px',
                                  height: '58px',
                                  borderRadius: '50%',
                                  backgroundColor: '#1e3a8a',
                                  color: '#fff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: '800',
                                  fontSize: '18px',
                                  border: '3px solid #93c5fd',
                                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                                }}>
                                  {sortedAttempts[1].user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || '2'}
                                </div>
                                <span style={{ fontWeight: '700', fontSize: '13px', textAlign: 'center', marginTop: '8px', width: '90px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {sortedAttempts[1].user?.name}
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '700', color: '#fcd34d', marginTop: '2px' }}>
                                  {sortedAttempts[1].percentage}%
                                </span>
                              </>
                            ) : (
                              <div style={{ height: '88px' }}></div>
                            )}
                            <div style={{
                              marginTop: '12px',
                              height: '105px',
                              width: '90px',
                              background: 'linear-gradient(to top, #6d28d9, #8b5cf6)',
                              borderRadius: '8px 8px 0 0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
                            }}>
                              <span style={{ fontWeight: '800', fontSize: '40px', color: '#fff' }}>2</span>
                            </div>
                          </div>

                        </div>
                      )}

                      {/* Standings List Container */}
                      <div style={{
                        backgroundColor: '#d8b4fe',
                        borderRadius: '24px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}>
                        {sortedAttempts.length === 0 ? (
                          <p style={{ color: '#581c87', fontSize: '13.5px', fontWeight: '600', margin: 0, textAlign: 'center' }}>No standings available yet.</p>
                        ) : (
                          sortedAttempts.map((att: any, index: number) => {
                            const trend = (att.id % 3 === 0) ? 'up' : (att.id % 3 === 1) ? 'down' : 'stable';
                            return (
                              <div key={`rank-row-${att.id}`} style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: '#ffffff',
                                borderRadius: '16px',
                                padding: '12px 16px',
                                boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
                                color: '#1e1b4b'
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  
                                  {/* Trend and Rank */}
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '24px' }}>
                                    {trend === 'up' ? (
                                      <span style={{ color: '#10b981', fontSize: '11px', fontWeight: 'bold' }}>▲</span>
                                    ) : trend === 'down' ? (
                                      <span style={{ color: '#ef4444', fontSize: '11px', fontWeight: 'bold' }}>▼</span>
                                    ) : (
                                      <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>•</span>
                                    )}
                                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--light-text)' }}>
                                      {index + 1}
                                    </span>
                                  </div>

                                  {/* Student circular initials avatar */}
                                  <div style={{
                                    width: '42px',
                                    height: '42px',
                                    borderRadius: '50%',
                                    backgroundColor: index === 0 ? '#fef08a' : index === 1 ? '#cbd5e1' : index === 2 ? '#ffedd5' : '#e0d7ff',
                                    color: index === 0 ? '#854d0e' : index === 1 ? '#334155' : index === 2 ? '#c2410c' : '#581c87',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: '800',
                                    fontSize: '14px',
                                    border: '1.5px solid var(--light-border)'
                                  }}>
                                    {att.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                  </div>

                                  {/* Name and Progress bar */}
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <span style={{ fontWeight: '700', fontSize: '14px', color: '#1e1b4b' }}>
                                      {att.user?.name}
                                    </span>
                                    {/* Progress Bar */}
                                    <div style={{
                                      width: '180px',
                                      height: '14px',
                                      backgroundColor: '#f3e8ff',
                                      borderRadius: '7px',
                                      overflow: 'hidden',
                                      position: 'relative'
                                    }}>
                                      <div style={{
                                        width: `${att.percentage}%`,
                                        height: '100%',
                                        background: 'linear-gradient(to right, #c084fc, #8b5cf6)',
                                        borderRadius: '7px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'flex-end',
                                        paddingRight: '6px'
                                      }}>
                                        <span style={{ fontSize: '9px', fontWeight: '800', color: '#fff' }}>
                                          {att.percentage}%
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: '60px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#581c87' }}>
                                      {att.score} Marks
                                    </span>
                                    <span style={{ fontSize: '10px', color: 'var(--light-text-secondary)' }}>
                                      {Math.floor(att.time_taken / 60)}m {att.time_taken % 60}s
                                    </span>
                                  </div>
                                  <button
                                    className="btn-ld btn-ld-secondary btn-ld-small"
                                    onClick={() => handleViewResultDetails(att.id)}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '11px',
                                      backgroundColor: '#f3e8ff',
                                      border: '1px solid #c084fc',
                                      color: '#6b21a8'
                                    }}
                                  >
                                    Report
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  )}
                </div>
              );
            })() : null}

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
                      const studentChoice = viewAttemptDetails.responses ? viewAttemptDetails.responses[q.id!] : undefined;
                      const isSubjective = q.question_type === 'subjective';
                      const isCorrect = !isSubjective && (studentChoice && q.correct_answer && studentChoice.toUpperCase() === q.correct_answer.toUpperCase());

                      return (
                        <div key={q.id || idx} style={{
                          padding: '16px',
                          border: '1.5px solid var(--light-border)',
                          borderRadius: '8px',
                          backgroundColor: isSubjective ? '#f8fafc' : (isCorrect ? '#f0fdf4' : '#fef2f2')
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--light-text-secondary)' }}>
                              Question {idx + 1} ({isSubjective ? 'Subjective' : 'MCQ'})
                            </span>
                            <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--light-primary)' }}>
                              {q.marks} Marks
                            </span>
                          </div>

                          <p style={{ fontWeight: '700', margin: '4px 0 10px 0', whiteSpace: 'pre-wrap' }}>{q.question_text}</p>

                          {isSubjective ? (
                            <div style={{ fontSize: '13.5px', marginBottom: '8px' }}>
                              <div style={{ fontWeight: '600', color: '#475569', marginBottom: '4px' }}>Your Answer:</div>
                              <div style={{ padding: '10px 14px', backgroundColor: '#ffffff', borderRadius: '6px', border: '1px solid #cbd5e1', whiteSpace: 'pre-wrap', color: '#0f172a' }}>
                                {studentChoice || <em style={{ color: '#94a3b8' }}>No response submitted</em>}
                              </div>
                              {q.explanation && (
                                <div style={{ marginTop: '8px', padding: '8px 12px', backgroundColor: '#f0fdf4', borderLeft: '3px solid #22c55e', borderRadius: '4px', fontSize: '12.5px', color: '#15803d' }}>
                                  <strong>Rubric / Model Answer:</strong> {q.explanation}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div>
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

              <div className="form-group-ld">
                <label className="form-label-ld">Assigned Batches (comma-separated, leave blank for all)</label>
                <input 
                  type="text" 
                  className="form-input-ld" 
                  placeholder="e.g. Batch A, Batch B"
                  value={pracBatches} 
                  onChange={(e) => setPracBatches(e.target.value)} 
                  disabled={pracAssignToSpecificStudents}
                />
              </div>

              <div className="form-group-ld">
                <label style={{ display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer', fontWeight: '600', marginBottom: '8px' }}>
                  <input 
                    type="checkbox"
                    checked={pracAssignToSpecificStudents}
                    onChange={(e) => {
                      setPracAssignToSpecificStudents(e.target.checked);
                      if (e.target.checked) setPracBatches('');
                    }}
                  />
                  <span>Assign to specific individual students instead of batches</span>
                </label>
                {pracAssignToSpecificStudents && (
                  <div style={{
                    maxHeight: '150px',
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
                        <label key={`prac-student-${student.id}`} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>
                          <input 
                            type="checkbox" 
                            checked={pracSelectedStudentIds.includes(student.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setPracSelectedStudentIds(prev => [...prev, student.id]);
                              } else {
                                setPracSelectedStudentIds(prev => prev.filter(id => id !== student.id));
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
                      const fileLink = f.url.startsWith('/uploads/') ? `${getServerUrl()}${f.url}` : f.url;
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
                const link = previewResource.drive_link || '';
                const isYouTube = previewResource.mime_type === 'youtube' || link.includes('youtube.com') || link.includes('youtu.be');
                const isPDF = previewResource.mime_type === 'application/pdf' || previewResource.name.toLowerCase().endsWith('.pdf');
                const isImage = previewResource.mime_type.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(previewResource.name);
                const isVideo = previewResource.mime_type.startsWith('video/') || previewResource.name.toLowerCase().endsWith('.mp4') || previewResource.name.toLowerCase().endsWith('.webm');
                const isOfficeDoc = /\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(previewResource.name);

                const fullLink = link.startsWith('/uploads/') 
                  ? `${getServerUrl()}${link}` 
                  : link;

                if (isYouTube) {
                  const ytId = getYouTubeId(link);
                  if (ytId) {
                    return (
                      <iframe 
                        width="100%" 
                        height="480" 
                        src={`https://www.youtube.com/embed/${ytId}?autoplay=1`} 
                        title="YouTube video player" 
                        frameBorder="0" 
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                        allowFullScreen
                        style={{ width: '100%', border: 'none', borderRadius: '8px' }}
                      />
                    );
                  }
                }

                if (isPDF) {
                  return (
                    <iframe 
                      src={fullLink} 
                      width="100%" 
                      height="580px" 
                      style={{ border: 'none' }} 
                      title="PDF Preview" 
                    />
                  );
                }

                if (isImage) {
                  return (
                    <img 
                      src={fullLink} 
                      alt={previewResource.name}
                      style={{ maxWidth: '100%', maxHeight: '550px', objectFit: 'contain' }}
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
                      style={{ maxHeight: '520px', outline: 'none' }} 
                    />
                  );
                }

                if (isOfficeDoc) {
                  const officeViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(fullLink)}&embedded=true`;
                  return (
                    <iframe 
                      src={officeViewerUrl} 
                      width="100%" 
                      height="580px" 
                      style={{ border: 'none' }} 
                      title="Document Preview" 
                    />
                  );
                }

                return (
                  <iframe 
                    src={fullLink} 
                    width="100%" 
                    height="550px" 
                    style={{ border: 'none' }} 
                    title="Web Link" 
                  />
                );
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
      {/* Dynamic Assign to Students Modal */}
      <AssignContentModal
        show={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        assignTargetType={assignTargetType}
        assignBatches={assignBatches}
        setAssignBatches={setAssignBatches}
        assignToSpecificStudents={assignToSpecificStudents}
        setAssignToSpecificStudents={setAssignToSpecificStudents}
        activeStudents={activeStudents.map(s => ({ id: s.id, name: s.name, email: s.email }))}
        assignSelectedStudentIds={assignSelectedStudentIds}
        setAssignSelectedStudentIds={setAssignSelectedStudentIds}
        assignVisibility={assignVisibility}
        setAssignVisibility={setAssignVisibility}
        activeTeachers={activeTeachers.map(t => ({ id: t.id, name: t.name, email: t.email }))}
        assignToSpecificTeachers={assignToSpecificTeachers}
        setAssignToSpecificTeachers={setAssignToSpecificTeachers}
        assignSelectedTeacherIds={assignSelectedTeacherIds}
        setAssignSelectedTeacherIds={setAssignSelectedTeacherIds}
        scheduledAt={scheduledAt}
        setScheduledAt={setScheduledAt}
        expiryAt={expiryAt}
        setExpiryAt={setExpiryAt}
        assignSaving={assignSaving}
        onAssignSubmit={handleAssignSubmit}
      />
    </DashboardLayout>
  );
};

export default ClassroomDetails;
