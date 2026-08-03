export interface Creator {
  id: string;
  handle: string;
  platforms: ('instagram' | 'tiktok' | 'youtube')[];
  followers: number;
  followersDisplay: string;
  er: number;
  location: string;
  niche: string;
  lastContact: string;
  tags: string[];
}

export interface KpiCardData {
  label: string;
  value: string;
  tint: 'white' | 'grey' | 'peach' | 'lime';
}

export interface ActivityItem {
  id: string;
  text: string;
  time: string;
}

export interface PendingAction {
  id: string;
  title: string;
  subtitle: string;
  actionLabel: string;
  targetScreen: string;
}

export interface KanbanCard {
  id: string;
  col: string;
  handle: string;
  deliverable: string;
  deadline: string;
  payment: 'PAID' | 'TO PAY';
  rate: string;
  brand: string;
  approvalStatus?: string;
  comments?: { author: string; text: string }[];
}

export interface BriefFormData {
  brand: string;
  name: string;
  goal: string;
  messages: string;
  deliverables: Record<string, boolean>;
  budgetMin: string;
  budgetMax: string;
  timelineStart: string;
  timelineEnd: string;
  tone: string;
  clauses: { id: string; label: string }[];
  notes: string;
}

export interface OutreachRecipient {
  id: string;
  handle: string;
  status: 'Opened' | 'Sent' | 'Not sent' | 'Replied';
  tone: 'brand' | 'lime' | 'peach' | 'neutral';
}

export interface CoverageRow {
  id: string;
  handle: string;
  platform: string;
  postType: string;
  date: string;
  views: string;
  likes: string;
  comments: string;
  er: string;
  coverageName: string;
  status: 'posted' | 'not-posted' | 'no-response';
}

export interface GiftingRow {
  id: string;
  handle: string;
  addressStatus: string;
  addressBg: string;
  gdpr: string;
  product: string;
  courier: string;
  tracking: string;
  delivery: string;
  deliveryBg: string;
  compSlip: 'Approved' | 'Pending review';
}

export interface ReportCreatorBreakdown {
  id: string;
  handle: string;
  posts: number;
  reach: string;
  er: string;
  band: string;
  status: 'Received' | 'Pending' | 'Chased';
  statusBg: string;
}

export interface UserRole {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Director' | 'Account Manager' | 'Account Executive' | 'View only';
  brands: string;
  lastActive: string;
}

export interface Integration {
  id: string;
  name: string;
  status: string;
  statusBg: string;
  description: string;
  action: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  entity: string;
  detail: string;
  previousValue: string;
  fullDetail: string;
}

export interface CreatorRegistrationPayload {
  fullName: string;
  instagram: string;
  platform: string;
  niche: string;
  email: string;
  tiktok?: string;
  youtube?: string;
  followerBand?: string;
  er?: string;
  tags?: string[];
  bio?: string;
  portfolio?: string;
  consentGiven: boolean;
}
