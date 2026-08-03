import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOutreachRecipients, sendOutreachMessage } from '../services/outreachService';
import { Button } from '../components/common/Button';
import { Avatar } from '../components/common/Avatar';
import { Tag } from '../components/common/Tag';
import styles from './OutreachPage.module.css';

export const OutreachPage: React.FC = () => {
  const [template, setTemplate] = useState('Initial outreach');
  const [subject, setSubject] = useState("Let's work together with Mediheal");
  const [body, setBody] = useState("Hi {first_name}, we'd love to work with you on {brand}...");
  const [recipientSearch, setRecipientSearch] = useState('');
  const [outreachSent, setOutreachSent] = useState(false);

  const queryClient = useQueryClient();

  const { data: recipients = [], isLoading } = useQuery({
    queryKey: ['outreach-recipients'],
    queryFn: fetchOutreachRecipients,
  });

  const sendMutation = useMutation({
    mutationFn: sendOutreachMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-recipients'] });
      setOutreachSent(true);
      setTimeout(() => setOutreachSent(false), 2500);
    },
  });

  const mergeTokens = ['{first_name}', '{handle}', '{brand}', '{last_worked_with}', '{product}'];

  const insertToken = (token: string) => {
    setBody((prev) => `${prev} ${token}`);
  };

  const handleSendNow = () => {
    sendMutation.mutate({
      template,
      subject,
      body,
      recipientIds: recipients.map((r) => r.id),
    });
  };

  const filteredRecipients = recipients.filter((r) =>
    r.handle.toLowerCase().includes(recipientSearch.toLowerCase())
  );

  if (isLoading) {
    return <div className={styles.loadingState}>Loading outreach composer...</div>;
  }

  return (
    <div className={styles.root}>
      <div className={styles.mainRow}>
        {/* Left Composer */}
        <div className={styles.composerPane}>
          <div className={styles.pageTitle}>outreach composer</div>

          <select
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className={styles.templateSelect}
          >
            <option>Initial outreach</option>
            <option>Gifting confirmation</option>
            <option>Follow-up</option>
            <option>Re-engagement</option>
          </select>

          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject line"
            className={styles.subjectInput}
          />

          {/* Merge Tokens */}
          <div className={styles.mergeTokensRow}>
            {mergeTokens.map((t) => (
              <div key={t} onClick={() => insertToken(t)} className={styles.mergeToken}>
                {t}
              </div>
            ))}
          </div>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={10}
            className={styles.bodyTextarea}
          />

          {/* Live Email Preview */}
          <div>
            <div className={`${styles.sectionLabel} ${styles.sectionLabelSpaced}`}>preview</div>
            <div className={styles.previewBox}>
              Hi Sophia, we'd love to work with you on Mediheal on our new spring campaign.
            </div>
          </div>
        </div>

        {/* Right Recipient List */}
        <div className={styles.recipientsPane}>
          <div className={styles.sectionLabel}>recipients</div>

          <input
            value={recipientSearch}
            onChange={(e) => setRecipientSearch(e.target.value)}
            placeholder="Search and add creators"
            className={styles.recipientSearchInput}
          />

          <div className={styles.recipientList}>
            {filteredRecipients.map((r) => (
              <div key={r.id} className={styles.recipientRow}>
                <Avatar name={r.handle} size={32} />
                <div className={styles.recipientHandle}>{r.handle}</div>
                <Tag tone={r.tone}>{r.status}</Tag>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Action Footer */}
      <div className={styles.actionFooter}>
        <div className={styles.footerText}>Sending to {recipients.length} creators</div>
        <div className={styles.footerButtons}>
          <Button variant="secondary">Schedule send</Button>
          <Button variant="primary" onClick={handleSendNow} disabled={sendMutation.isPending}>
            {sendMutation.isPending ? 'Sending...' : 'Send now'}
          </Button>
        </div>
      </div>

      {/* Toast Notification */}
      {outreachSent && (
        <div className={styles.toast}>Message sent to {recipients.length} creators.</div>
      )}
    </div>
  );
};
