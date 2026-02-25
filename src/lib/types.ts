

export type UserRole = 'admin' | 'varsity' | 'novice';

export interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: UserRole;
  avatarUrl: string;
  approved: boolean;
  studentId?: string;
  nsdaId?: string; // NSDA membership ID for matching tabroom results
  tabroomEmail?: string; // Tabroom.com login email
  tabroomPassword?: string; // Tabroom.com password (should be encrypted in production)
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
  name: string;
  items: CongressBill[];
}

export interface WrittenSpeech {
  id: string;
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
  | 'speaker-award'
  | 'top-speaker'
  | 'preliminary-advancement'
  | 'participated'
  | 'other';

export interface TournamentResult {
  id: string;
  tournamentId: string;
  tournamentName: string;
  userId: string;
  event: string;
  placement: PlacementType;
  placementDetail?: string; // e.g., "1st Place", "3rd Speaker", "7th Place"
  partnerId?: string; // For team events
  partnerName?: string;
  preliminaryRecord?: string; // e.g., "4-2" or "3-3"
  speakerPoints?: number;
  speakerRank?: number;
  totalCompetitors?: number;
  breakingCompetitors?: number; // How many competitors broke to elims
  notes?: string;
  date: string;
  createdAt: string;
}
