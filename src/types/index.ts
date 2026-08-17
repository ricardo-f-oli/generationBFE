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

// Must match com.generationb.briefs.ToneOfVoice exactly — the frontend previously listed
// FORMAL/CONVERSATIONAL/PLAYFUL/EDITORIAL, none of which the backend accepts, so every
// brief saved with a tone other than INSPIRATIONAL was rejected with a 400.
export type ToneOfVoice = 'PROFESSIONAL' | 'CASUAL' | 'INSPIRATIONAL' | 'WITTY' | 'BOLD';
// Must match com.generationb.briefs.BriefStatus — there is no APPROVED state on a brief.
export type BriefStatus = 'DRAFT' | 'GENERATED' | 'SHARED';

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
  /** SHORT or LONG — derived from the post type on write (requirement #49). */
  contentForm: string | null;
  url: string | null;
  caption: string | null;
  views: number;
  likes: number;
  comments: number;
  shares: number | null;
  saves: number | null;
  /** Null means "no data source supplies this", not zero. */
  impressions: number | null;
  er: number;
  standardizedName: string;
  unsolicited: boolean;
  source: string;
  postedAt: string;
}

export interface ClipResult {
  captured: number;
  duplicates: number;
  items: CoverageItem[];
}

export interface DigestSettings {
  enabled: boolean;
  sendTime: string;
  recipientEmail: string | null;
  clippingNamePattern: string;
  includeUnsolicited: boolean;
  lastSentAt: string | null;
}

// ----------------------------------------------------------------- gifting

export type DispatchStatus =
  | 'READY_TO_DISPATCH'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'DECLINED';

export interface GiftingRow {
  id: string;
  giftingRunId: string | null;
  creatorId: string;
  handle: string;
  creatorName: string | null;
  productName: string | null;
  sku: string | null;
  courier: string | null;
  trackingNumber: string | null;
  status: DispatchStatus;
  addressStatus: 'CAPTURED' | 'PENDING';
  gdprConsent: boolean;
  plannedDispatchDate: string | null;
  contentDeadline: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  returnReason: string | null;
  reminderWeekSentAt: string | null;
  reminder48hSentAt: string | null;
}

export interface GiftingRun {
  id: string;
  name: string;
  campaignId: string | null;
  productName: string | null;
  mailerText: string | null;
  compSlipStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy: string | null;
  approvedAt: string | null;
  dispatchCount: number;
  createdAt: string;
}

export interface DispatchCreationResult {
  created: number;
  skippedNoAddress: number;
  skippedExcluded: number;
  skippedDuplicate: number;
  warnings: string[];
  dispatches: GiftingRow[];
}

export interface AddressCaptureResult {
  emailsSent: number;
  skipped: number;
  warnings: string[];
}

export interface AddressFormView {
  creatorName: string;
  brandName: string;
  alreadyCaptured: boolean;
}

export interface BrandOrder {
  id: string;
  campaignId: string | null;
  giftingRunId: string | null;
  brandContactEmail: string;
  productName: string | null;
  recipientCount: number;
  notes: string | null;
  status: 'REQUESTED' | 'CONFIRMED' | 'REJECTED';
  confirmedAt: string | null;
  rejectedReason: string | null;
  createdAt: string;
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

// --------------------------------------------------------------- reporting

export type ReportType = 'MONTHLY_SEEDING' | 'CAMPAIGN_WRAP' | 'MAILER_CONVERSION';
// Must match com.generationb.reporting.ReportCadence and the reports.cadence check
// constraint. CAMPAIGN is stored; "at campaign end" is the label, not the value.
export type ReportCadence = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'CAMPAIGN' | 'AD_HOC';
export type ReportStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT';

/**
 * Requirement #49. A null metric means "no data source supplies this" — never render it as 0,
 * or the client reads an absence as a result. `notes` explains each gap in plain English.
 */
export interface ReportMetrics {
  posts: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  estimatedReach: number;
  impressions: number | null;
  averageEngagementRate: number | null;
  engagementRateVsTarget: number | null;
  followerGrowth: number | null;
  followerGrowthPct: number | null;
  shortFormPosts: number;
  longFormPosts: number;
  unsolicitedPosts: number;
  qualityBands: Record<string, number>;
  conversionRate: number | null;
  reconciliation: Reconciliation | null;
  creatorBreakdown: ReportCreatorRow[];
  topPosts: ReportTopPost[];
  notes: string[];
}

/** Requirement #15: who we sent to versus who actually posted. */
export interface Reconciliation {
  sentTo: number;
  posted: number;
  notPosted: number;
  postRate: number | null;
  outstanding: Array<{ creatorId: string; handle: string; insightStatus: string }>;
}

export interface ReportCreatorRow {
  creatorId: string;
  handle: string;
  posts: number;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
  followerGrowth: number | null;
  qualityBand: string | null;
  insightStatus: string | null;
}

export interface ReportTopPost {
  handle: string;
  platform: string;
  postType: string;
  url: string | null;
  views: number;
  engagementRate: number | null;
}

export interface Report {
  id: string;
  brandId: string;
  campaignId: string | null;
  templateId: string | null;
  name: string;
  reportType: ReportType;
  cadence: ReportCadence;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  metrics: ReportMetrics | null;
  submittedBy: string | null;
  submittedAt: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  sentAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ReportTemplate {
  id: string;
  name: string;
  reportType: ReportType;
  sections: string[];
  includeAffiliate: boolean;
  isDefault: boolean;
}

/** Requirement #52. */
export interface InsightRequest {
  id: string;
  creatorId: string;
  handle: string;
  status: 'PENDING' | 'CHASED' | 'RECEIVED';
  chaseCount: number;
  lastChasedAt: string | null;
}

/** Requirement #55. */
export interface KpiTarget {
  campaignId: string;
  minFollowers: number | null;
  maxFollowers: number | null;
  minEr: number | null;
  minUkAudience: number | null;
  targetReach: number | null;
  preferredPlatform: string | null;
  preferredNiche: string | null;
}

export interface KpiMatch {
  creatorId: string;
  handle: string;
  score: number;
  band: 'STRONG' | 'PARTIAL' | 'WEAK' | 'UNSET';
  criteria: Array<{ label: string; met: boolean; detail: string }>;
}

// ------------------------------------------------------------- follow-ups

/** Requirement #33. */
export interface FollowUpSuggestion {
  id: string;
  recipientId: string;
  creatorHandle: string;
  creatorFirstName: string | null;
  draftSubject: string | null;
  draftBody: string | null;
  status: 'SUGGESTED' | 'SENT' | 'DISMISSED';
  createdAt: string;
}

// ------------------------------------------------------------------ admin

/** Requirement #35. */
export interface ManagedUser {
  id: string;
  name: string | null;
  email: string;
  username: string | null;
  role: Role;
  active: boolean;
  locked: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Requirement #36. */
export interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  changedBy: string | null;
  changedByName: string;
  timestamp: string;
  previousValue: string | null;
  newValue: string | null;
}
