import { USE_MOCK_DATA, simulateDelay, apiRequest } from './apiClient';
import { INITIAL_CREATORS } from '../mocks/mockData';
import { Creator, CreatorRegistrationPayload } from '../types';

let creatorsMemoryStore = [...INITIAL_CREATORS];

export async function fetchCreators(): Promise<Creator[]> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/creators
    return simulateDelay([...creatorsMemoryStore]);
  }
  return apiRequest<Creator[]>('/creators');
}

export async function fetchCreatorById(id: string): Promise<Creator | undefined> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to GET /api/creators/:id
    const creator = creatorsMemoryStore.find((c) => c.id === id);
    return simulateDelay(creator);
  }
  return apiRequest<Creator>(`/creators/${id}`);
}

export async function registerCreator(payload: CreatorRegistrationPayload): Promise<{ success: boolean; id: string }> {
  if (USE_MOCK_DATA) {
    // TODO: replace mock with real API call to POST /api/creators/register
    const newId = `cr-${Date.now()}`;
    const newCreator: Creator = {
      id: newId,
      handle: payload.instagram || payload.fullName.toLowerCase().replace(/\s+/g, ''),
      platforms: [payload.platform.toLowerCase() as 'instagram' | 'tiktok' | 'youtube'],
      followers: 10000,
      followersDisplay: '10K',
      er: parseFloat(payload.er || '3.5'),
      location: payload.niche || 'UK',
      niche: payload.niche || 'General',
      lastContact: 'Just registered',
      tags: payload.tags || ['community'],
    };
    creatorsMemoryStore.push(newCreator);
    return simulateDelay({ success: true, id: newId }, 500);
  }
  return apiRequest<{ success: boolean; id: string }>('/creators/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
