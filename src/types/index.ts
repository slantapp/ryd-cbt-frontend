export type AccountRole = 'SUPER_ADMIN' | 'MINISTRY' | 'SCHOOL' | 'SCHOOL_ADMIN' | 'TEACHER' | 'STUDENT' | 'PARENT';

export type AccountStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Institution {
  id: string;
  name: string;
  email: string;
  uniqueSlug?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  role: AccountRole;
  status: AccountStatus;
  parentId?: string | null;
  mustResetPassword?: boolean;
  passwordResetAt?: string | null;
  username?: string | null;
  dateOfBirth?: string | null;
  firstName?: string;
  lastName?: string;
  institutionId?: string;
  institution?: {
    id: string;
    name: string;
    uniqueSlug?: string;
  };
  parent?: {
    id: string;
    name: string;
    uniqueSlug?: string;
    email: string;
  };
}

export interface Test {
  id: string;
  institutionId: string;
  teacherId?: string | null;
  title: string;
  description?: string;
  testGroup: string; // Assignment, Practice Banks, Quiz, Final Assessment
  isTimed: boolean;
  duration?: number | null;
  dueDate?: string | null;
  isPublished: boolean;
  publishedAt?: string | null;
  publishedById?: string | null;
  passingScore?: number;
  maxAttempts: number;
  allowRetrial: boolean;
  scoreVisibility: boolean;
  requiresManualGrading: boolean;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  questions?: Question[];
  sessions?: Array<{
    session: Session;
  }>;
  classrooms?: Array<{
    classroom: Classroom;
  }>;
  customFields?: TestCustomField[];
  teacher?: {
    id: string;
    name: string;
    email: string;
  };
  _count?: {
    studentTests: number;
  };
}

export interface Question {
  isInQuestionBank?: boolean;
  questionBankSubjectId?: string;
  questionBankGrade?: string;
  id: string;
  testId?: string | null;
  questionText: string;
  questionType: 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer';
  options?: Record<string, string>;
  correctAnswer?: string | null;
  points: number;
  order: number;
  requiresManualGrading: boolean;
  gradedAt?: string | null;
  gradedById?: string | null;
}

export interface Practice {
  id: string;
  name: string;
  subjectName: string;
  classLabel: string;
  isVisible?: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: { id: string; name: string };
  _count?: { questions: number; attempts?: number };
  studentsTaken?: number;
  questions?: Array<{ id: string; questionId: string; order: number; question: Question }>;
}

export interface PracticeAttempt {
  id: string;
  practiceId: string;
  studentId: string;
  startedAt: string;
  submittedAt?: string | null;
  practice?: Practice;
  answers?: PracticeAttemptAnswer[];
  summary?: { total: number; correct: number; wrong: number; score: number };
}

export interface PracticeAttemptAnswer {
  id: string;
  attemptId: string;
  questionId: string;
  selectedAnswer: string;
  isCorrect: boolean | null;
  shownAnswerAt?: string | null;
  question?: Question;
}

export interface Session {
  id: string;
  institutionId: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isArchived: boolean;
  archivedAt?: string | null;
  archivedById?: string | null;
  createdById?: string | null;
  tests?: SessionTest[];
  classAssignments?: SessionClass[];
}

export interface SessionTest {
  id: string;
  sessionId: string;
  testId: string;
  test: Test;
}

export interface Student {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  username: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  password: string;
  token?: string;
  mustResetPassword: boolean;
  passwordResetAt?: string | null;
  isAssigned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StudentTest {
  id: string;
  studentId: string;
  testId: string;
  sessionId?: string;
  score?: number;
  percentage?: number;
  isPassed?: boolean;
  attemptNumber: number;
  startedAt?: string;
  submittedAt?: string;
  timeSpent?: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'graded';
  scoreVisibleToStudent: boolean;
  scoreReleasedAt?: string | null;
  requiresManualGrading: boolean;
  manuallyGraded: boolean;
  gradedAt?: string | null;
  gradedById?: string | null;
  student?: Student;
  test?: Test;
  answers?: StudentAnswer[];
}

export interface Classroom {
  id: string;
  institutionId: string;
  name: string;
  description?: string;
  academicSession?: string;
  isActive: boolean;
  assignments?: TeacherAssignment[];
}

export interface TeacherAccount extends Institution {
  assignedClasses?: TeacherAssignment[];
}

export interface TeacherAssignment {
  id: string;
  classroomId: string;
  teacherId: string;
  assignedById: string;
  classroom?: Classroom;
}

export interface ThemeConfig {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  logoUrl?: string;
  bannerUrl?: string;
}

// New models
export interface SessionClass {
  id: string;
  sessionId: string;
  classroomId: string;
  assignedAt: string;
  assignedById: string;
  session?: Session;
  classroom?: Classroom;
}

export interface StudentClassAssignment {
  id: string;
  studentId: string;
  classroomId: string;
  sessionId: string;
  assignedAt: string;
  assignedById?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  archivedById?: string | null;
  student?: Student;
  classroom?: Classroom;
  session?: Session;
}

export interface TestCustomField {
  id: string;
  institutionId: string;
  fieldName: string;
  fieldType: string;
  isRequired: boolean;
  options?: Record<string, any>;
  order: number;
  isActive: boolean;
  testId?: string | null;
  fieldValue?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ParentStudentLink {
  id: string;
  parentId: string;
  studentId: string;
  verified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  parent?: Institution;
  student?: Student;
}

export interface Notification {
  id: string;
  userId: string;
  userType: 'institution' | 'student' | 'parent';
  type: string;
  title: string;
  message: string;
  relatedId?: string | null;
  relatedType?: string | null;
  isRead: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId?: string | null;
  changeDetails?: Record<string, any>;
  oldValue?: string | null;
  newValue?: string | null;
  relatedStudentId?: string | null;
  relatedClassId?: string | null;
  relatedTestId?: string | null;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface StudentAnswer {
  id: string;
  studentTestId: string;
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  pointsEarned: number;
  manuallyGraded: boolean;
  gradedAt?: string | null;
  gradedById?: string | null;
  createdAt: string;
  updatedAt: string;
  question?: Question;
}

