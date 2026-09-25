
// Team types
export interface Team {
  id: string;
  name: string;
  slug: string; // URL-friendly identifier (e.g., 'cywoods')
  displayName: string; // Full display name (e.g., 'Cypress Woods High School')
  createdAt: string;
  settings?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    // Student permission settings
    allowStudentDocketUpload?: boolean;
    allowStudentBillCreation?: boolean;
    allowStudentVideoRecording?: boolean;
    allowStudentAnalytics?: boolean;
    allowNoviceDebateEvents?: boolean;
    allowVarsityDebateEvents?: boolean;
  };
  isActive: boolean;
  headCoachEmail?: string; // Primary contact for the school account
  alternateCoachEmail?: string; // Secondary contact for the school account
  address?: string; // Physical address of the school
  approved?: boolean; // Whether the school has been approved by superadmin
  trialEndsAt?: string; // ISO date when 30-day trial ends
  subscriptionStatus?: 'trial' | 'active' | 'expired' | 'cancelled';
  subscriptionPlanId?: string; // Future: link to payment plan
  currentInvoiceId?: string; // Reference to current/latest invoice
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // When the team was deleted
  deletedBy?: string; // User ID who deleted it
}

export type UserRole = 'superadmin' | 'coach' | 'varsity' | 'novice';

export type InvoiceStatus = 'pending' | 'paid' | 'overdue' | 'cancelled';

export interface Invoice {
  id: string;
  teamId: string; // Reference to team this invoice belongs to
  invoiceNumber: string; // e.g., "INV-2026-001"
  amount: number; // In dollars
  dueDate: string; // ISO date
  createdAt: string; // ISO date
  status: InvoiceStatus;
  description: string; // e.g., "Annual Subscription - Debate Dashboard"
  billingPeriod: string; // e.g., "2026-2027 Academic Year"
  payeeName: string; // "Kasey Willeby"
  payeeAddress: string; // "19714 Redroot Dr. Houston TX 77084"
  paidAt?: string; // ISO date when payment was received
  paidBy?: string; // User ID who marked it as paid
  notes?: string; // Admin notes
}

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  teamId: string; // Reference to team this user belongs to
  avatarUrl: string;
  approved: boolean;
  studentId?: string;
  recoveryPin?: string; // 4-digit PIN for password recovery (for students without email access)
  nsdaId?: string; // NSDA membership ID for matching tabroom results
  tabroomEmail?: string; // Tabroom.com login email
  tabroomPassword?: string; // Tabroom.com password (should be encrypted in production)
  tabroomChapterId?: string; // Tabroom chapter ID for accessing results (e.g., 26837 for Cy-Woods)
  deleted?: boolean; // Soft delete flag
  deletedAt?: string; // When the user was deleted
  deletedBy?: string; // User ID who deleted this user
}

export interface Message {
  id:string;
  senderId: string;
  content: string;
  timestamp: string;
}

export type SessionStatus = 'available' | 'booked' | 'completed' | 'cancelled';

export type PracticeRoom = 'Room A' | 'Room B' | 'Room C';

export interface Session {
  id: string;
  teamId: string; // Reference to team this session belongs to
  title: string;
  description: string;
  date: string;
  time: string;
  hostId: string | null;
  clientId: string | null;
  hostPartnerId?: string | null;
  clientPartnerId?: string | null;
  status: SessionStatus;
  messages: Message[];
  cancelledAt?: string;
  cancellationReadBy?: string[];
  lastMessageReadBy?: string[];
  isPracticeRound?: boolean;
  debateFormat?: DebateFormat;
  hostStance?: SpeechStance;
  room?: PracticeRoom;
}

export interface Partnership {
  event: string;
  partnerIds: string[];
  partnerNames?: string[];
}

export interface SchoolEntry {
  school: string;
  events: string[];
  partnerships: Partnership[];
}

export interface TournamentEntry {
  id: string;
  name: string;
  events: string[];
  partnerships: Partnership[];
  schoolEntries?: SchoolEntry[]; // For swing tournaments
  dropped?: boolean;
  droppedAt?: string;
}

export type PeriodLeaving = 'All Day' | '2nd' | '3rd' | '4th' | '5th' | '6th' | '7th';

export interface Tournament {
  id: string;
  teamId: string; // Reference to team this tournament belongs to
  name: string;
  date: string;
  webpageUrl?: string;
  scheduleUrl?: string;
  entries: TournamentEntry[];
  registrationCloseDate?: string;
  leaveTime?: string;
  periodLeaving?: PeriodLeaving;
  notes?: string;
  isSwing?: boolean;
  schools?: string[]; // e.g., ["Cy-Fair High School", "Cy-Creek High School"]
  feeSheet?: FeeSheet; // Fee data from Tabroom
  paperwork?: TournamentPaperwork; // Checklist and documents
  isArchived?: boolean; // Mark tournaments from previous seasons as archived
}

export interface FeeSheet {
  entries: FeeSheetEntry[];
  totalAmount: number;
  currency: string;
  extractedAt: string;
  tabroomUrl?: string;
}

export interface FeeSheetEntry {
  category: string; // e.g., "Entry Fees", "Judge Fees", "Late Fees"
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface TournamentPaperwork {
  checklist: ChecklistItem[];
  documents: DocumentAttachment[];
}

export type ChecklistItemType =
  | 'travel-request'
  | 'purchase-order'
  | 'transfer-form'
  | 'payment-received'
  | 'attendance-form'
  | 'travel-card-request'
  | 'hotel-information'
  | 'overnight-forms'
  | 'custom';

export interface ChecklistItem {
  id: string;
  type: ChecklistItemType;
  label: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  required: boolean;
  isOvernightOnly: boolean; // Only show if tournament requires overnight stay
  attachmentIds: string[]; // References to DocumentAttachment ids
  notes?: string;
}

export interface DocumentAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  storagePath: string; // Firebase Storage path
  downloadUrl: string;
  uploadedBy: string;
  uploadedAt: string;
  checklistItemId?: string; // Optional link to checklist item
}

export interface ScrapedTournament {
  name: string;
  url: string;
  date: string;
  registrationCloseDate: string;
}

export type PracticeMode = "extemp" | "impromptu" | "congress" | "informative" | "oratory" | "humorous" | "dramatic" | "duo" | "duet" | "prose" | "poetry";
export type SpeechStance = 'affirmative' | 'negative';

export interface SpeechFeedback {
    id: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
}

export interface SavedSpeech {
    id: string;
    teamId: string; // Reference to team this speech belongs to
    ownerId: string;
    topic: string;
    notes: string;
    prepTime?: number;
    speechTime: number;
    mode: PracticeMode;
    videoUrl: string; // Can be data URL (local) or Firebase Storage URL (if we implement upload)
    storagePath?: string; // Path for Firebase Storage
    date: string;
    sharedWith?: string[];
    stance?: SpeechStance;
    billId?: string;
    feedback?: SpeechFeedback[];
};

export interface CongressBill {
  id: string;
  title: string;
  fullText: string;
}

export interface CongressDocket {
  id: string;
  teamId: string; // Reference to team this docket belongs to
  name: string;
  items: CongressBill[];
}

export interface WrittenSpeech {
  id: string;
  teamId: string; // Reference to team this speech belongs to
  ownerId: string;
  title: string;
  body: string;
  mode: PracticeMode;
  date: string;
  billId?: string;
  stance?: SpeechStance;
  createdAt?: string;
  updatedAt?: string;
  sharedWith?: string[];
  content?: string;
}

export type DebateFormat = "LD" | "PF" | "CX" | "WSD";

export type ContentionOrder = 1 | 2 | 3 | 4 | 5 | 'X';

export interface CaseContention {
  id: string;
  order: ContentionOrder;
  tagline: string;
  claim: string;
  warrant: string;
  impact: string;
}

export interface CaseBlock {
    id: string;
    argument: string;
    response: string;
}

export interface DebateCase {
  id: string;
  teamId: string; // Reference to team this case belongs to
  name: string;
  ownerId: string;
  topicId: string;
  resolution: string;
  type: DebateFormat;
  stance: SpeechStance;
  framework: string;
  contentions: CaseContention[];
  blocks: CaseBlock[];
  isArchived: boolean;
}

export interface Ballot {
  winner: string;
  rfd: string;
  affPoints: string;
  negPoints: string;
  affComments: string;
  negComments: string;
  submitted?: boolean; // True when ballot is final and visible to competitors
}

export interface PracticeRound {
  id: string;
  teamId: string; // Reference to team this round belongs to
  topic: string;
  type: DebateFormat;
  participants: string[];
  judges: string[];
  affTeam?: string[];
  negTeam?: string[];
  ballot?: Ballot;
  flow?: {
    aff?: string; // JSON stringified string[][]
    neg?: string; // JSON stringified string[][]
  };
}

export interface DebateTopic {
  id: string;
  teamId: string; // Reference to team this topic belongs to
  resolution: string;
  type: DebateFormat;
  createdAt: string;
  months?: string;
  isArchived?: boolean;
}

export interface Notification {
  id: string;
  type: 'message' | 'cancellation';
  title: string;
  message: string;
  relatedUrl: string;
  timestamp: string;
  isRead: boolean;
}

export type PlacementType =
  | 'champion'
  | 'finalist'
  | 'semifinalist'
  | 'quarterfinalist'
  | 'octafinalist'
  | 'double-octafinalist'
  | 'triple-octafinalist'
  | 'speaker-award'
  | 'top-speaker'
  | 'preliminary-advancement'
  | 'participated'
  | 'dropped'
  | 'other';

export interface RoundBallot {
  roundName: string; // e.g., "Round 1", "Quarterfinals"
  opponent?: string; // Opponent name/school
  result: 'win' | 'loss' | 'bye'; // Round result
  judge?: string; // Judge name (or list of judges if panel)
  judgeCount?: number; // Number of judges on panel (for elimination rounds)
  ballotsWon?: number; // Number of ballots won (e.g., 2 out of 3)
  judgeDecisions?: ('win' | 'loss')[]; // Individual judge decisions for debate panels (e.g., ['win', 'win', 'loss'])
  judgeRanks?: number[]; // Individual judge ranks for speech panels (e.g., [1, 2, 3])
  cumulativeRank?: number; // Sum of judge ranks for speech (e.g., 6 for ranks [1, 2, 3])
  speakerPoints?: number; // Points earned in this round (sum for team events)
  individualSpeakerPoints?: number[]; // Individual points for each team member (for team events like PF)
  rfd?: string; // Reason for decision (ballot feedback)
  ranks?: string; // For congress/speech events (deprecated - use judgeRanks/cumulativeRank)
}

export interface TournamentResult {
  id: string;
  teamId: string; // Reference to team this result belongs to
  tournamentId: string;
  tournamentName: string;
  studentName?: string; // Student name from Tabroom (for unmatched students)
  userId: string | null; // Can be null if not matched to a user profile yet
  event: string;
  placement: PlacementType;
  placementDetail?: string; // e.g., "1st Place", "3rd Speaker", "7th Place"
  partnerId?: string | null; // For team events
  partnerName?: string;
  preliminaryRecord?: string; // e.g., "4-2" or "3-3"
  eliminationRecord?: string; // e.g., "Won Quarters, Lost Semis"
  preliminaryRounds?: RoundBallot[]; // Individual prelim round ballots
  eliminationRounds?: RoundBallot[]; // Individual elim round ballots
  speakerPoints?: number;
  speakerRank?: number;
  averageSpeakerPoints?: number; // Average speaker points per round
  totalCompetitors?: number;
  breakingCompetitors?: number; // How many competitors broke to elims
  ballots?: RoundBallot[]; // Individual round ballots with RFDs (deprecated - use preliminaryRounds/eliminationRounds)
  notes?: string;
  nsdaId?: string; // NSDA ID from Tabroom for future matching
  date: string;
  createdAt: string;
}
