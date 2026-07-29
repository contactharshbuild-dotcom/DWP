export type QuestionType = 'mcq' | 'subjective';

export interface QuizQuestionInput {
  id?: number;
  question_type: QuestionType;
  question_text: string;
  option_a?: string | null;
  option_b?: string | null;
  option_c?: string | null;
  option_d?: string | null;
  correct_answer?: string | null; // 'A', 'B', 'C', 'D'
  explanation?: string | null; // Explanation or Rubric / Model Answer
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  marks: number;
}

export interface Quiz {
  id: number;
  organization_id: number;
  classroom_id?: number | null;
  title: string;
  description?: string | null;
  total_questions: number;
  time_limit: number;
  test_type?: string;
  status?: string;
  shuffle_questions?: boolean;
  shuffle_options?: boolean;
  show_result_immediately?: boolean;
  start_window?: string | null;
  end_window?: string | null;
  activation_mode?: 'auto' | 'manual';
  score_release_mode?: 'immediate' | 'manual_review' | 'after_deadline';
  security_force_fullscreen?: boolean;
  security_tab_switch_behavior?: 'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit';
  security_max_warnings?: number;
  proctor_extension_required?: boolean;
  assigned_student_ids?: number[];
  attempts?: any[];
  created_at?: string;
  questions?: QuizQuestionInput[];
  classroom?: {
    id: number;
    name: string;
    subject: string;
  } | null;
}

export interface CreateQuizPayload {
  title: string;
  description?: string;
  timeLimit?: number;
  classroomId?: number | null;
  testType?: string;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  showResultImmediately?: boolean;
  startWindow?: string | null;
  endWindow?: string | null;
  activationMode?: 'auto' | 'manual';
  scoreReleaseMode?: 'immediate' | 'manual_review' | 'after_deadline';
  securityForceFullscreen?: boolean;
  securityTabSwitchBehavior?: 'warning' | 'auto_submit_n_warnings' | 'immediate_auto_submit';
  securityMaxWarnings?: number;
  proctorExtensionRequired?: boolean;
  assignedStudentIds?: number[];
  questions?: QuizQuestionInput[];
}
