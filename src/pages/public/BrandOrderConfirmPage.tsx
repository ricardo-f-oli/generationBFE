import React from 'react';
import { useParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/common/Button';
import { confirmBrandOrder } from '../../services/giftingService';
import { ApiError } from '../../services/apiClient';
import styles from '../gifting/Gifting.module.css';
import publicStyles from './PublicPages.module.css';

/**
 * Requirement #43: the brand contact confirming they have shipped.
 *
 * Deliberately a button rather than an auto-confirm on page load — email clients prefetch links,
 * and a prefetch must not tell us product has gone out when it has not.
 */
export const BrandOrderConfirmPage: React.FC = () => {
  const { token = '' } = useParams();

  const mutation = useMutation({
    mutationFn: () => confirmBrandOrder(token),
  });

  if (mutation.isSuccess) {
    return (
      <div className={styles.publicForm}>
        <h1 className={publicStyles.display}>Thank you</h1>
        <p>
          We have marked the order as dispatched. Nothing else is needed from you — you can close
          this page.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.publicForm}>
      <h1 className={publicStyles.display}>Confirm dispatch</h1>
      <p>
        Please confirm once the product has left you. We will mark everything on this order as
        dispatched and start tracking coverage against it.
      </p>

      {mutation.isError && (
        <div className={publicStyles.error}>
          {mutation.error instanceof ApiError
            ? mutation.error.message
            : 'Something went wrong. Please try again.'}
        </div>
      )}

      <Button fullWidth onClick={() => mutation.mutate()} disabled={mutation.isPending}>
        {mutation.isPending ? 'Confirming…' : 'Yes, this has been sent'}
      </Button>
    </div>
  );
};
