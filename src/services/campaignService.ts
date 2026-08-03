import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_KANBAN_CARDS } from '../mocks/mockData';
import { KanbanCard, BriefFormData } from '../types';

let kanbanMemoryStore = [...INITIAL_KANBAN_CARDS];

export async function fetchKanbanCards(campaignName?: string): Promise<KanbanCard[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/campaigns/kanban?campaign=<campaignName>
    const cards = campaignName
      ? kanbanMemoryStore.filter((c) => c.brand === (campaignName.startsWith('Mediheal') ? 'Mediheal' : 'Katie Loxton'))
      : kanbanMemoryStore;
    return simulateDelay([...cards]);
  }
  return apiRequest<KanbanCard[]>(`/campaigns/kanban?campaign=${encodeURIComponent(campaignName || '')}`);
}

export async function updateKanbanCardPayment(cardId: string, isPaid: boolean): Promise<KanbanCard> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to PATCH /api/campaigns/kanban/:cardId/payment
    const cardIndex = kanbanMemoryStore.findIndex((c) => c.id === cardId);
    if (cardIndex !== -1) {
      kanbanMemoryStore[cardIndex] = {
        ...kanbanMemoryStore[cardIndex],
        payment: isPaid ? 'PAID' : 'TO PAY',
      };
      return simulateDelay({ ...kanbanMemoryStore[cardIndex] });
    }
    throw new Error('Card not found');
  }
  return apiRequest<KanbanCard>(`/campaigns/kanban/${cardId}/payment`, {
    method: 'PATCH',
    body: JSON.stringify({ isPaid }),
  });
}

export async function generateCampaignBrief(formData: BriefFormData): Promise<{ success: boolean; briefId: string }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/briefs/generate
    return simulateDelay({ success: true, briefId: `brief-${Date.now()}` }, 600);
  }
  return apiRequest<{ success: boolean; briefId: string }>('/briefs/generate', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}
