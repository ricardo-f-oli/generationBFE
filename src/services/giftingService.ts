/**
 * Gifting logistics (requirements #41–#48).
 */

import { apiDownload, apiRequest, qs } from './apiClient';
import type {
  AddressCaptureResult,
  AddressFormView,
  BrandOrder,
  DispatchCreationResult,
  GiftingRow,
  GiftingRun,
} from '../types';

// -------------------------------------------------------------------- log

export function fetchGiftingLog(): Promise<GiftingRow[]> {
  return apiRequest<GiftingRow[]>('/gifting/log');
}

// ------------------------------------------------------------------- runs

export function fetchGiftingRuns(): Promise<GiftingRun[]> {
  return apiRequest<GiftingRun[]>('/gifting/runs');
}

export function createGiftingRun(input: {
  name: string;
  campaignId?: string;
  productName?: string;
  mailerText?: string;
}): Promise<GiftingRun> {
  return apiRequest<GiftingRun>('/gifting/runs', { method: 'POST', body: input });
}

/** Requirement #44: nothing ships on this run until the comp slip is signed off. */
export function approveCompSlip(runId: string, mailerText?: string): Promise<GiftingRun> {
  return apiRequest<GiftingRun>(`/gifting/runs/${runId}/approve-comp-slip`, {
    method: 'POST',
    body: { mailerText },
  });
}

export function rejectCompSlip(runId: string): Promise<GiftingRun> {
  return apiRequest<GiftingRun>(`/gifting/runs/${runId}/reject-comp-slip`, { method: 'POST' });
}

// -------------------------------------------------------------- addresses

/** Requirement #41: emails each creator a single-use link to the address form. */
export function requestAddresses(input: {
  creatorIds: string[];
  campaignId?: string;
}): Promise<AddressCaptureResult> {
  return apiRequest<AddressCaptureResult>('/gifting/address-capture', {
    method: 'POST',
    body: input,
  });
}

// ------------------------------------------------------------- dispatches

/** Requirement #45. */
export function createDispatches(input: {
  giftingRunId?: string;
  creatorIds: string[];
  productName?: string;
  sku?: string;
  packagingNotes?: string;
  courier?: string;
  plannedDispatchDate?: string;
  contentDeadline?: string;
}): Promise<DispatchCreationResult> {
  return apiRequest<DispatchCreationResult>('/gifting/dispatches', {
    method: 'POST',
    body: input,
  });
}

/** Requirement #47: RETURNED or DECLINED also excludes the creator from future gifting. */
export function updateDispatchStatus(
  id: string,
  input: { status: string; trackingNumber?: string; returnReason?: string; courier?: string },
): Promise<GiftingRow> {
  return apiRequest<GiftingRow>(`/gifting/dispatches/${id}/status`, {
    method: 'POST',
    body: input,
  });
}

/** Requirement #42. */
export function downloadFulfilmentList(runId?: string): Promise<void> {
  return apiDownload(
    `/gifting/export/fulfilment${qs({ runId })}`,
    'gifting-dispatch-list.xlsx',
  );
}

// ----------------------------------------------------------- brand orders

/** Requirement #43. */
export function fetchBrandOrders(): Promise<BrandOrder[]> {
  return apiRequest<BrandOrder[]>('/gifting/brand-orders');
}

export function createBrandOrder(input: {
  brandContactEmail: string;
  campaignId?: string;
  giftingRunId?: string;
  productName?: string;
  creatorIds: string[];
  notes?: string;
}): Promise<BrandOrder> {
  return apiRequest<BrandOrder>('/gifting/brand-orders', { method: 'POST', body: input });
}

// --------------------------------------------------------------- reminders

/** Requirement #46: the same pass the 10:00 schedule runs, on demand. */
export function runGiftReminders(): Promise<{ sent: number }> {
  return apiRequest<{ sent: number }>('/gifting/reminders/run', { method: 'POST' });
}

// ------------------------------------------------------------------ public

/** No login: the token in the URL is the creator's only credential. */
export function fetchAddressForm(token: string): Promise<AddressFormView> {
  return apiRequest<AddressFormView>(`/public/gifting/address/${token}`, { anonymous: true });
}

export function submitAddress(
  token: string,
  input: {
    recipientName: string;
    street: string;
    street2?: string;
    city: string;
    county?: string;
    postalCode: string;
    country?: string;
    phone?: string;
    gdprConsent: boolean;
  },
): Promise<void> {
  return apiRequest<void>(`/public/gifting/address/${token}`, {
    method: 'POST',
    body: input,
    anonymous: true,
  });
}

export function confirmBrandOrder(token: string): Promise<void> {
  return apiRequest<void>(`/public/gifting/brand-order/${token}/confirm`, {
    method: 'POST',
    anonymous: true,
  });
}
