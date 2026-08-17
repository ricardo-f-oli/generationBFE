import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { Input } from '../../components/common/Input';
import { Spinner } from '../../components/common/Spinner';
import { fetchAddressForm, submitAddress } from '../../services/giftingService';
import { ApiError } from '../../services/apiClient';
import styles from '../gifting/Gifting.module.css';
import publicStyles from './PublicPages.module.css';

/**
 * Requirement #41: the creator-facing address form.
 *
 * No login: the token in the URL is the only credential, it is single-use, and it expires. The
 * consent tick is a hard requirement — the backend rejects a submission without it, because an
 * address we hold without consent is a GDPR problem, not a convenience.
 */
export const AddressCapturePage: React.FC = () => {
  const { token = '' } = useParams();
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    recipientName: '',
    street: '',
    street2: '',
    city: '',
    county: '',
    postalCode: '',
    phone: '',
  });
  const [consent, setConsent] = useState(false);

  const view = useQuery({
    queryKey: ['address-form', token],
    queryFn: () => fetchAddressForm(token),
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: () => submitAddress(token, { ...form, gdprConsent: consent }),
    onSuccess: () => setSubmitted(true),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'),
  });

  if (view.isLoading) {
    return <Spinner fullPage label="Loading" />;
  }

  if (view.error) {
    return (
      <div className={styles.publicForm}>
        <h1 className={publicStyles.display}>This link is no longer valid</h1>
        <p>
          It may have already been used, or it may have expired. Reply to the email we sent and we
          will send a fresh one.
        </p>
      </div>
    );
  }

  if (submitted || view.data?.alreadyCaptured) {
    return (
      <div className={styles.publicForm}>
        <h1 className={publicStyles.display}>Thank you</h1>
        <p>
          We have your address and will let you know when your parcel is on its way. You can close
          this page.
        </p>
      </div>
    );
  }

  const complete =
    form.recipientName.trim() &&
    form.street.trim() &&
    form.city.trim() &&
    form.postalCode.trim() &&
    consent;

  return (
    <div className={styles.publicForm}>
      <h1 className={publicStyles.display}>Where should we send it?</h1>
      <p>
        Hi {view.data?.creatorName}, we have something on the way for you. Let us know where to
        send it and we will get it out.
      </p>

      {error && <div className={publicStyles.error}>{error}</div>}

      <Input
        label="Your name"
        value={form.recipientName}
        onChange={(event) => setForm({ ...form, recipientName: event.target.value })}
      />
      <Input
        label="Address line 1"
        value={form.street}
        onChange={(event) => setForm({ ...form, street: event.target.value })}
      />
      <Input
        label="Address line 2"
        hint="Optional"
        value={form.street2}
        onChange={(event) => setForm({ ...form, street2: event.target.value })}
      />

      <div className={styles.formGrid}>
        <Input
          label="Town or city"
          value={form.city}
          onChange={(event) => setForm({ ...form, city: event.target.value })}
        />
        <Input
          label="County"
          hint="Optional"
          value={form.county}
          onChange={(event) => setForm({ ...form, county: event.target.value })}
        />
        <Input
          label="Postcode"
          value={form.postalCode}
          onChange={(event) => setForm({ ...form, postalCode: event.target.value })}
        />
        <Input
          label="Phone"
          hint="For the courier only"
          value={form.phone}
          onChange={(event) => setForm({ ...form, phone: event.target.value })}
        />
      </div>

      <label className={styles.consentRow}>
        <input
          type="checkbox"
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
        />
        <span>
          I am happy for {view.data?.brandName} to store this address so they can send me
          products. I can ask them to delete it at any time.
        </span>
      </label>

      <Button
        fullWidth
        onClick={() => mutation.mutate()}
        disabled={!complete || mutation.isPending}
      >
        {mutation.isPending ? 'Sending…' : 'Send my address'}
      </Button>
    </div>
  );
};
