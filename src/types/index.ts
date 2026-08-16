/**
 * Types mirroring the backend DTOs exactly.
 *
 * Q-F2: the previous shapes were invented for the mock data and matched nothing the API
 * returned, so `creator.platforms.includes(...)` threw against the real backend.
 */

// ---------------------------------------------------------------- envelope

export interface ApiMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: ApiMeta;
}

// ------------------------------------------------------------------- auth

export type Role = 'ADMIN' | 'DIRECTOR' | 'ACCOUNT_MANAGER' | 'ACCOUNT_EXECUTIVE';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  brandId: string;
}

// --------------------------------------------------------------- creators

export interface BrandEngagement {
  brandId: string;
  brandName: string | null;
  status: 'PROSPECT' | 'CONTACTED' | 'WORKED_WITH' | 'BLOCKED';
  lastEngagedAt: string | null;
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  email: string | null;
  phone: string | null;
  primaryPlatform: string;
  platforms: string[];
  tiktokHandle: string | null;
  youtubeHandle: string | null;
  followersCount: number;
  followersDisplay: string;
  followerBand: string;
  erPercentage: number;
  location: string | null;
  niche: string | null;
  bio: string | null;
  portfolioUrl: string | null;
  ukAudiencePct: number | null;
  audienceAgeBand: string | null;
  audienceGenderSplit: string | null;
  qualityBand: string | null;
  optInStatus: string;
  tags: string[];
  brandEngagements: BrandEngagement[];
  workedWithOtherBrand: boolean;
  suppressed: boolean;
  lastContact: string | null;
  createdAt: string;
}

export interface CreatorNote {
  id: string;
  creatorId: string;
  authorId: string | null;
  authorName: string | null;
  noteText: string;
  confidential: boolean;
  revisionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface StyleTag {
  id: string;
  name: string;
  category: string;
  creatorCount: number;
}

export interface AttributeDefinition {
  id: string;
  key: string;
  label: string;
  type: string;
  options: string[] | null;
  required: boolean;
  displayOrder: number;
}

export interface CreatorFilters {
  niches: string[];
  locations: string[];
  platforms: string[];
  followerBands: string[];
  tags: StyleTag[];
  totalCreators: number;
}

export interface CreatorSearchParams {
  query?: string;
  platform?: string;
  location?: string;
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
  minEr?: number;
  minUkAudience?: number;
  optInStatus?: string;
  tagId?: string;
  page?: number;
  size?: number;
  sort?: string;
  direction?: 'asc' | 'desc';
}

// -------------------------------------------------------------- shortlists

export interface ShortlistSummary {
  id: string;
  name: string;
  visibility: 'TEAM' | 'PRIVATE';
  campaignId: string | null;
  creatorCount: number;
  createdAt: string;
}

export interface ShortlistDetail {
  id: string;
  name: string;
  visibility: 'TEAM' | 'PRIVATE';
  campaignId: string | null;
  creatorIds: string[];
  createdAt: string;
}

// --------------------------------------------------------------- campaigns

export type CampaignType = 'SEEDING' | 'PAID' | 'GIFTING' | 'EVENT';
export type CampaignStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'ARCHIVED';
export type PaymentStatus = 'UNPAID' | 'TO_PAY' | 'PAID';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Campaign {
  id: string;
  brandId: string;
  name: string;
  campaignType: CampaignType;
  status: CampaignStatus;
  startDate: string | null;
  endDate: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignCard {
  id: string;
  boardId: string;
  columnId: string;
  brandId: string;
  creatorId: string;
  creatorHandle: string | null;
  campaignId: string;
  position: number;
  briefId: string | null;
  assigneeId: string | null;
  blocked: boolean;
  deliverables: string[] | null;
  feeAmount: number | null;
  feeCurrency: string | null;
  deadline: string | null;
  paymentStatus: PaymentStatus;
  contentDraftUrls: string[] | null;
  approvalStatus: ApprovalStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string | null;
}

export interface BoardColumn {
  id: string;
  name: string;
  displayOrder: number;
  requiresDirectorApproval: boolean;
  requiresClientApproval: boolean;
  triggersEmail: boolean;
  triggerTemplateId: string | null;
  cards: CampaignCard[];
}

export interface Board {
  id: string;
  campaignId: string;
  brandId: string;
  name: string;
  columns: BoardColumn[];
}

export interface CardComment {
  id: string;
  cardId: string;
  authorId: string | null;
  authorName: string | null;
  body: string;
  createdAt: string;
}

export interface SavedView {
  id: string;
  name: string;
  scope: string;
  filter: Record<string, unknown>;
  shared: boolean;
}

// ------------------------------------------------------------------ briefs

export type ToneOfVoice = 'FORMAL' | 'CONVERSATIONAL' | 'PLAYFUL' | 'EDITORIAL' | 'INSPIRATIONAL';
export type BriefStatus = 'DRAFT' | 'GENERATED' | 'APPROVED' | 'SHARED';

export interface Brief {
  id: string;
  brandId: string;
  campaignName: string;
  campaignGoal: string | null;
  keyMessages: string | null;
  deliverables: string[] | null;
  budgetMin: number | null;
  budgetMax: number | null;
  timelineStart: string | null;
  timelineEnd: string | null;
  toneOfVoice: ToneOfVoice | null;
  additionalNotes: string | null;
  aiGeneratedContent: string | null;
  status: BriefStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractClause {
  id: string;
  clauseType: string;
  content: string;
  displayOrder: number;
  active: boolean;
}

// ---------------------------------------------------------------- outreach

export type RecipientStatus =
  | 'NOT_SENT' | 'SENT' | 'FAILED' | 'OPENED' | 'REPLIED'
  | 'DECLINED' | 'NO_RESPONSE' | 'BOUNCED' | 'UNSUBSCRIBED';

export type OutreachType = 'INITIAL_OUTREACH' | 'GIFTING_CONFIRMATION' | 'FOLLOW_UP' | 'RE_ENGAGEMENT';

export interface OutreachTemplate {
  id: string;
  name: string;
  type: OutreachType;
  brandId: string | null;
  subjectTemplate: string;
  bodyTemplate: string;
  aiGenerated: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface OutreachCampaign {
  id: string;
  brandId: string;
  campaignId: string | null;
  templateId: string | null;
  subject: string;
  body: string;
  status: 'DRAFT' | 'SCHEDULED' | 'SENDING' | 'SENT' | 'PARTIALLY_FAILED';
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
}

export interface OutreachRecipient {
  id: string;
  creatorId: string;
  creatorHandle: string | null;
  creatorFirstName: string | null;
  status: RecipientStatus;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
}

export interface ResolvedPreview {
  resolvedSubject: string;
  resolvedBody: string;
  resolvedTokens: Record<string, string>;
}

// ---------------------------------------------------------------- coverage

export interface CoverageItem {
  id: string;
  campaignId: string | null;
  creatorId: string | null;
  creatorHandle: string;
  platform: string;
  postType: string;
  url: string | null;
  views: number;
  likes: number;
  comments: number;
  er: number;
  standardizedName: string;
  unsolicited: boolean;
  postedAt: string;
}

export interface DigestSettings {
  id: string;
  brandId: string;
  enabled: boolean;
  sendTime: string;
  recipientEmail: string | null;
}

// ----------------------------------------------------------------- gifting

export interface GiftingRow {
  id: string;
  creatorId: string;
  handle: string;
  addressStatus: 'CAPTURED' | 'PENDING';
  gdprConsent: boolean;
  productName: string | null;
  courier: string | null;
  trackingNumber: string | null;
  status: string;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnReason: string | null;
}

// --------------------------------------------------------------- marketing

export interface WaitlistEntry {
  id: string;
  email: string;
  name: string | null;
  handle: string | null;
  primaryPlatform: string | null;
  niche: string | null;
  status: 'PENDING' | 'CONFIRMED' | 'CONVERTED' | 'REJECTED';
  createdAt: string;
  convertedAt: string | null;
}

export interface WaitlistStats {
  pending: number;
  confirmed: number;
  converted: number;
  total: number;
}

// -------------------------------------------------------------- suppression

export interface Suppression {
  id: string;
  creatorId: string | null;
  email: string | null;
  handle: string | null;
  reason: string;
  source: string;
  optedOutAt: string;
}

// ------------------------------------------------------- registration form

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
