import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { generateCampaignBrief } from '../services/campaignService';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import styles from './BriefBuilderPage.module.css';

export const BriefBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const [briefBrand, setBriefBrand] = useState('Mediheal');
  const [briefName, setBriefName] = useState('');
  const [briefGoal, setBriefGoal] = useState('');
  const [briefMessages, setBriefMessages] = useState('');
  const [deliverables, setDeliverables] = useState<Record<string, boolean>>({
    Reel: true,
    Story: true,
    TikTok: false,
    YouTube: false,
    Blog: false,
    UGC: false,
  });
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [timelineStart, setTimelineStart] = useState('');
  const [timelineEnd, setTimelineEnd] = useState('');
  const [tone, setTone] = useState('Conversational');
  const [briefNotes, setBriefNotes] = useState('');
  const [clauseLibraryOpen, setClauseLibraryOpen] = useState(false);
  const [clauses, setClauses] = useState([
    { id: 'noncompete', label: 'Non-compete' },
    { id: 'payment', label: 'Payment terms' },
    { id: 'window', label: 'Deliverable window' },
    { id: 'saleperiod', label: 'Sale-period clause' },
    { id: 'legal', label: 'Legal disclaimer' },
  ]);
  const [dragClauseId, setDragClauseId] = useState<string | null>(null);
  const [briefGenerated, setBriefGenerated] = useState(false);

  const deliverableKeys = ['Reel', 'Story', 'TikTok', 'YouTube', 'Blog', 'UGC'];
  const toneOptions = ['Formal', 'Conversational', 'Playful', 'Editorial'];

  const generateBriefMutation = useMutation({
    mutationFn: generateCampaignBrief,
    onSuccess: () => {
      setBriefGenerated(true);
    },
  });

  const toggleDeliverable = (key: string) => {
    setDeliverables((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const removeClause = (id: string) => {
    setClauses((prev) => prev.filter((c) => c.id !== id));
  };

  const handleDrop = (targetId: string) => {
    if (!dragClauseId || dragClauseId === targetId) return;
    const list = [...clauses];
    const fromIdx = list.findIndex((c) => c.id === dragClauseId);
    const toIdx = list.findIndex((c) => c.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    setClauses(list);
    setDragClauseId(null);
  };

  const handleGenerate = () => {
    generateBriefMutation.mutate({
      brand: briefBrand,
      name: briefName,
      goal: briefGoal,
      messages: briefMessages,
      deliverables,
      budgetMin,
      budgetMax,
      timelineStart,
      timelineEnd,
      tone,
      clauses,
      notes: briefNotes,
    });
  };

  return (
    <div className={styles.pageRoot}>
      <div className={styles.formWrapper}>
        <div
          onClick={() => navigate('/campaigns')}
          className={styles.backLink}
        >
          ← back to campaign board
        </div>

        <div className={styles.pageHeading}>brief builder</div>

        {/* Brand Dropdown */}
        <label className={styles.fieldColumn}>
          <span className={styles.fieldLabel}>
            Brand
          </span>
          <select
            value={briefBrand}
            onChange={(e) => setBriefBrand(e.target.value)}
            className={styles.brandSelect}
          >
            <option value="Mediheal">Mediheal</option>
            <option value="Katie Loxton">Katie Loxton</option>
            <option value="Joma">Joma</option>
          </select>
        </label>

        <Input
          label="Campaign name"
          value={briefName}
          onChange={(e) => setBriefName(e.target.value)}
          placeholder="e.g. Mediheal Spring Seeding"
        />

        <label className={styles.fieldColumn}>
          <span className={styles.fieldLabel}>
            Campaign goal
          </span>
          <textarea
            value={briefGoal}
            onChange={(e) => setBriefGoal(e.target.value)}
            rows={3}
            className={styles.textareaField}
          />
        </label>

        <label className={styles.fieldColumn}>
          <span className={styles.fieldLabel}>
            Key messages
          </span>
          <textarea
            value={briefMessages}
            onChange={(e) => setBriefMessages(e.target.value)}
            rows={3}
            className={styles.textareaField}
          />
        </label>

        {/* Deliverables Pills */}
        <div className={styles.fieldSection}>
          <span className={styles.fieldLabel}>
            Deliverables
          </span>
          <div className={styles.deliverablesRow}>
            {deliverableKeys.map((key) => {
              const active = deliverables[key];
              return (
                <div
                  key={key}
                  onClick={() => toggleDeliverable(key)}
                  className={`${styles.deliverablePill} ${active ? styles.deliverablePillActive : ''}`}
                >
                  {key}
                </div>
              );
            })}
          </div>
        </div>

        {/* Budget Range */}
        <div className={styles.fieldSection}>
          <span className={styles.fieldLabel}>
            Budget range
          </span>
          <div className={styles.budgetRow}>
            <div className={styles.budgetInputWrap}>
              <span className={styles.currencySymbol}>£</span>
              <input
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                placeholder="Min"
                className={styles.budgetInput}
              />
            </div>
            <div className={styles.budgetInputWrap}>
              <span className={styles.currencySymbol}>£</span>
              <input
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                placeholder="Max"
                className={styles.budgetInput}
              />
            </div>
          </div>
        </div>

        {/* Timeline Dates */}
        <div className={styles.fieldSection}>
          <span className={styles.fieldLabel}>
            Timeline
          </span>
          <div className={styles.timelineRow}>
            <input
              type="date"
              value={timelineStart}
              onChange={(e) => setTimelineStart(e.target.value)}
              className={styles.dateInput}
            />
            <input
              type="date"
              value={timelineEnd}
              onChange={(e) => setTimelineEnd(e.target.value)}
              className={styles.dateInput}
            />
          </div>
        </div>

        {/* Tone Options */}
        <div className={styles.fieldSection}>
          <span className={styles.fieldLabel}>
            Tone of voice
          </span>
          <div className={styles.toneOptionsRow}>
            {toneOptions.map((t) => (
              <label key={t} className={styles.toneOptionLabel}>
                <input
                  type="radio"
                  name="tone"
                  value={t}
                  checked={tone === t}
                  onChange={() => setTone(t)}
                />
                {t}
              </label>
            ))}
          </div>
        </div>

        {/* Additional Notes */}
        <label className={styles.fieldColumn}>
          <span className={styles.fieldLabel}>
            Additional notes
          </span>
          <textarea
            value={briefNotes}
            onChange={(e) => setBriefNotes(e.target.value)}
            rows={3}
            className={styles.textareaField}
          />
        </label>

        {/* Clause Library Accordion */}
        <div className={styles.clauseLibraryBox}>
          <div
            onClick={() => setClauseLibraryOpen(!clauseLibraryOpen)}
            className={styles.clauseLibraryHeader}
          >
            <span>Add contract clauses</span>
            <span>{clauseLibraryOpen ? '−' : '+'}</span>
          </div>

          {clauseLibraryOpen && (
            <div className={styles.clauseListBox}>
              {clauses.map((cl) => (
                <div
                  key={cl.id}
                  draggable
                  onDragStart={() => setDragClauseId(cl.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(cl.id)}
                  className={styles.clauseItem}
                >
                  <span className={styles.clauseGripIcon}>⠿</span>
                  <span className={styles.clauseLabel}>{cl.label}</span>
                  <span
                    onClick={() => removeClause(cl.id)}
                    className={styles.clauseRemoveBtn}
                  >
                    ×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className={styles.submitActionsRow}>
          <Button variant="secondary" fullWidth>Save draft</Button>
        </div>

        <Button variant="primary" fullWidth onClick={handleGenerate} disabled={generateBriefMutation.isPending}>
          {generateBriefMutation.isPending ? 'Generating...' : 'Generate Brief'}
        </Button>

        <div className={styles.helperText}>
          AI will draft from your inputs — review before sharing.
        </div>

        {briefGenerated && (
          <div className={styles.successMessage}>
            Brief generated.
          </div>
        )}
      </div>
    </div>
  );
};
