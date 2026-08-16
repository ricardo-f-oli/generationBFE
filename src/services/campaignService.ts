import { apiRequest, apiRequestPaged, qs } from './apiClient';
import type {
  Board,
  Campaign,
  CampaignCard,
  CampaignStatus,
  CampaignType,
  CardComment,
  Paged,
  PaymentStatus,
  SavedView,
  ShortlistDetail,
  ShortlistSummary,
} from '../types';

// -------------------------------------------------------------- campaigns

export function fetchCampaigns(status?: CampaignStatus, page = 0, size = 50): Promise<Paged<Campaign>> {
  return apiRequestPaged<Campaign>(`/campaigns${qs({ status, page, size })}`);
}

export function fetchCampaign(id: string): Promise<Campaign> {
  return apiRequest<Campaign>(`/campaigns/${id}`);
}

export function createCampaign(input: {
  name: string;
  campaignType: CampaignType;
  startDate?: string;
  endDate?: string;
}): Promise<Campaign> {
  return apiRequest<Campaign>('/campaigns', { method: 'POST', body: input });
}

export function updateCampaign(id: string, input: Partial<Campaign>): Promise<Campaign> {
  return apiRequest<Campaign>(`/campaigns/${id}`, { method: 'PATCH', body: input });
}

export function archiveCampaign(id: string): Promise<void> {
  return apiRequest<void>(`/campaigns/${id}/archive`, { method: 'PATCH' });
}

export function unarchiveCampaign(id: string): Promise<void> {
  return apiRequest<void>(`/campaigns/${id}/unarchive`, { method: 'PATCH' });
}

export function deleteCampaign(id: string): Promise<void> {
  return apiRequest<void>(`/campaigns/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------------ board

export function createBoard(campaignId: string, name: string) {
  return apiRequest<{ id: string; campaignId: string; brandId: string; name: string }>(
    `/campaigns/${campaignId}/boards`,
    { method: 'POST', body: { name } },
  );
}

/** `filter` maps to the saved-view presets: my-cards | blocked | awaiting-approval | due-this-week */
export function fetchBoard(boardId: string, filter?: string): Promise<Board> {
  return apiRequest<Board>(`/boards/${boardId}${qs({ filter })}`);
}

/**
 * Resolves the board for a campaign, creating it on first access. The frontend used to have to
 * guess whether a board existed, which raced with the campaign list and could create duplicates.
 */
export function fetchBoardForCampaign(campaignId: string, filter?: string): Promise<Board> {
  return apiRequest<Board>(`/campaigns/${campaignId}/board${qs({ filter })}`);
}

// ---------------------------------------------------------------- columns

export function addColumn(boardId: string, input: {
  name: string;
  requiresDirectorApproval?: boolean;
  requiresClientApproval?: boolean;
  triggersEmail?: boolean;
}) {
  return apiRequest(`/boards/${boardId}/columns`, {
    method: 'POST',
    body: {
      name: input.name,
      requiresDirectorApproval: input.requiresDirectorApproval ?? false,
      requiresClientApproval: input.requiresClientApproval ?? false,
      triggersEmail: input.triggersEmail ?? false,
      triggerTemplateId: null,
    },
  });
}

export function updateColumn(columnId: string, input: {
  name: string;
  requiresDirectorApproval: boolean;
  requiresClientApproval: boolean;
  triggersEmail: boolean;
}) {
  return apiRequest(`/columns/${columnId}`, {
    method: 'PATCH',
    body: { ...input, triggerTemplateId: null },
  });
}

export function reorderColumns(boardId: string, columnIds: string[]): Promise<void> {
  return apiRequest<void>(`/boards/${boardId}/columns/reorder`, {
    method: 'PUT',
    body: { columnIds },
  });
}

export function deleteColumn(columnId: string): Promise<void> {
  return apiRequest<void>(`/columns/${columnId}`, { method: 'DELETE' });
}

// ------------------------------------------------------------------ cards

export function createCard(boardId: string, input: {
  columnId: string;
  creatorId: string;
  campaignId: string;
  deliverables?: string[];
  feeAmount?: number;
  feeCurrency?: string;
  deadline?: string;
  notes?: string;
}): Promise<CampaignCard> {
  return apiRequest<CampaignCard>(`/boards/${boardId}/cards`, { method: 'POST', body: input });
}

/** `position` is optional — omit it to append to the end of the target stage. */
export function moveCard(cardId: string, targetColumnId: string, position?: number) {
  return apiRequest<CampaignCard>(`/cards/${cardId}/move`, {
    method: 'PATCH',
    body: { targetColumnId, position },
  });
}

export function updateCard(cardId: string, input: Partial<CampaignCard>): Promise<CampaignCard> {
  return apiRequest<CampaignCard>(`/cards/${cardId}`, { method: 'PATCH', body: input });
}

export function approveCard(cardId: string, approved: boolean): Promise<CampaignCard> {
  return apiRequest<CampaignCard>(`/cards/${cardId}/approval`, {
    method: 'POST',
    body: { approved },
  });
}

export function updatePaymentStatus(cardId: string, status: PaymentStatus): Promise<CampaignCard> {
  return apiRequest<CampaignCard>(`/cards/${cardId}/payment-status`, {
    method: 'PATCH',
    body: { status },
  });
}

export function deleteCard(cardId: string): Promise<void> {
  return apiRequest<void>(`/cards/${cardId}`, { method: 'DELETE' });
}

export function bulkMoveCards(boardId: string, cardIds: string[], targetColumnId: string) {
  return apiRequest<{ moved: number; rejected: Array<{ cardId: string; reason: string }> }>(
    `/boards/${boardId}/cards/bulk-move`,
    { method: 'POST', body: { cardIds, targetColumnId } },
  );
}

// --------------------------------------------------------------- comments

export function fetchComments(cardId: string): Promise<CardComment[]> {
  return apiRequest<CardComment[]>(`/cards/${cardId}/comments`);
}

export function addComment(cardId: string, body: string, authorName?: string) {
  return apiRequest<CardComment>(`/cards/${cardId}/comments`, {
    method: 'POST',
    body: { body, authorName },
  });
}

export function deleteComment(commentId: string): Promise<void> {
  return apiRequest<void>(`/comments/${commentId}`, { method: 'DELETE' });
}

// ------------------------------------------------------------ saved views

export function fetchSavedViews(): Promise<SavedView[]> {
  return apiRequest<SavedView[]>('/saved-views');
}

export function createSavedView(input: {
  name: string;
  scope?: string;
  filter: Record<string, unknown>;
  shared?: boolean;
}): Promise<SavedView> {
  return apiRequest<SavedView>('/saved-views', {
    method: 'POST',
    body: { scope: 'BOARD', shared: false, ...input },
  });
}

export function deleteSavedView(id: string): Promise<void> {
  return apiRequest<void>(`/saved-views/${id}`, { method: 'DELETE' });
}

// -------------------------------------------------------------- shortlists

export function fetchShortlists(): Promise<ShortlistSummary[]> {
  return apiRequest<ShortlistSummary[]>('/shortlists');
}

export function fetchShortlist(id: string): Promise<ShortlistDetail> {
  return apiRequest<ShortlistDetail>(`/shortlists/${id}`);
}

export function createShortlist(input: {
  name: string;
  visibility?: 'TEAM' | 'PRIVATE';
  campaignId?: string;
  creatorIds?: string[];
}): Promise<ShortlistDetail> {
  return apiRequest<ShortlistDetail>('/shortlists', { method: 'POST', body: input });
}

export function updateShortlist(id: string, input: { name?: string; visibility?: string }) {
  return apiRequest<ShortlistDetail>(`/shortlists/${id}`, { method: 'PATCH', body: input });
}

export function addCreatorsToShortlist(id: string, creatorIds: string[]): Promise<ShortlistDetail> {
  return apiRequest<ShortlistDetail>(`/shortlists/${id}/creators`, {
    method: 'POST',
    body: { creatorIds },
  });
}

export function removeCreatorFromShortlist(id: string, creatorId: string): Promise<void> {
  return apiRequest<void>(`/shortlists/${id}/creators/${creatorId}`, { method: 'DELETE' });
}

export function deleteShortlist(id: string): Promise<void> {
  return apiRequest<void>(`/shortlists/${id}`, { method: 'DELETE' });
}

export interface PromotionResult {
  shortlistId: string;
  campaignId: string;
  boardId: string;
  targetColumn: string;
  promotedCount: number;
  alreadyOnBoard: number;
}

export function promoteShortlist(id: string, campaignId: string): Promise<PromotionResult> {
  return apiRequest<PromotionResult>(`/shortlists/${id}/promote-to-campaign`, {
    method: 'POST',
    body: { campaignId },
  });
}
