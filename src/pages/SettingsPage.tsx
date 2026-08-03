import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchUsers, inviteUser, fetchIntegrations, fetchAuditLogs } from '../services/settingsService';
import { UserRole, Integration, AuditLogEntry } from '../types';
import { Button } from '../components/common/Button';
import { Dialog } from '../components/common/Dialog';
import { Input } from '../components/common/Input';
import styles from './SettingsPage.module.css';

export const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('Users & roles');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole['role']>('Account Manager');
  const [expandedAuditId, setExpandedAuditId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const usersQuery = useQuery<UserRole[]>({
    queryKey: ['settings-users'],
    queryFn: fetchUsers,
  });
  const integrationsQuery = useQuery<Integration[]>({
    queryKey: ['settings-integrations'],
    queryFn: fetchIntegrations,
  });
  const auditQuery = useQuery<AuditLogEntry[]>({
    queryKey: ['settings-audit-log'],
    queryFn: fetchAuditLogs,
  });

  const users: UserRole[] = usersQuery.data ?? [];
  const integrations: Integration[] = integrationsQuery.data ?? [];
  const auditLogs: AuditLogEntry[] = auditQuery.data ?? [];

  const loading = usersQuery.isLoading || integrationsQuery.isLoading || auditQuery.isLoading;

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: UserRole['role'] }) => inviteUser(email, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
    },
  });

  const settingsTabList = ['General', 'Users & roles', 'Brands', 'Integrations', 'GDPR & data', 'Audit log'];

  const handleSendInvite = async () => {
    if (!inviteEmail) return;
    await inviteMutation.mutateAsync({ email: inviteEmail, role: inviteRole });
    setInviteEmail('');
    setInviteModalOpen(false);
  };

  const handleRoleChange = (userId: string, newRole: UserRole['role']) => {
    queryClient.setQueryData<UserRole[]>(['settings-users'], (old) =>
      old ? old.map((u) => (u.id === userId ? { ...u, role: newRole } : u)) : old
    );
  };

  if (loading) {
    return <div className={styles.loadingText}>Loading settings...</div>;
  }

  return (
    <div className={styles.page}>
      {/* Left Sub-tabs Sidebar */}
      <div className={styles.sidebar}>
        {settingsTabList.map((t) => {
          const isActive = activeTab === t;
          return (
            <div
              key={t}
              onClick={() => setActiveTab(t)}
              className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}
            >
              {t}
            </div>
          );
        })}
      </div>

      {/* Right Tab Content */}
      <div className={styles.content}>
        {/* Tab 1: Users & Roles */}
        {activeTab === 'Users & roles' && (
          <>
            <div className={styles.sectionHeaderRow}>
              <div className={styles.sectionTitle}>users & roles</div>
              <Button variant="primary" onClick={() => setInviteModalOpen(true)}>
                Invite user
              </Button>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr className={styles.tableHeaderRow}>
                    <th className={styles.th}>Name</th>
                    <th className={styles.th}>Email</th>
                    <th className={styles.th}>Role</th>
                    <th className={styles.th}>Brands access</th>
                    <th className={styles.th}>Last active</th>
                    <th className={styles.th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={styles.tr}>
                      <td className={styles.tdBold}>{u.name}</td>
                      <td className={styles.tdMuted}>{u.email}</td>
                      <td className={styles.td}>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole['role'])}
                          className={styles.roleSelect}
                        >
                          <option>Admin</option>
                          <option>Director</option>
                          <option>Account Manager</option>
                          <option>Account Executive</option>
                          <option>View only</option>
                        </select>
                      </td>
                      <td className={styles.td}>{u.brands}</td>
                      <td className={styles.tdMuted}>{u.lastActive}</td>
                      <td className={styles.tdRemove}>Remove</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Tab 2: Integrations */}
        {activeTab === 'Integrations' && (
          <>
            <div className={styles.sectionTitle}>integrations</div>
            <div className={styles.integrationsGrid}>
              {integrations.map((ig) => (
                <div key={ig.id} className={styles.integrationCard}>
                  <div className={styles.integrationCardTop}>
                    <div className={styles.integrationIcon} />
                    <span className={styles.integrationStatusPill} style={{ backgroundColor: ig.statusBg }}>
                      {ig.status}
                    </span>
                  </div>
                  <div className={styles.integrationName}>{ig.name}</div>
                  <div className={styles.integrationDesc}>{ig.description}</div>
                  <Button variant="secondary" size="sm">
                    {ig.action}
                  </Button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Tab 3: GDPR & Data */}
        {activeTab === 'GDPR & data' && (
          <>
            <div className={styles.sectionTitle}>gdpr & data</div>
            <div className={styles.gdprGrid}>
              {/* Consent Records */}
              <div className={styles.gdprColumn}>
                <div className={styles.panelLabel}>
                  consent records
                </div>
                <input placeholder="Search creators" className={styles.gdprSearchInput} />
                <div className={styles.gdprListBox}>
                  {['@sophiabeauty', '@marcuslifts', '@ellafashion'].map((handle) => (
                    <div key={handle} className={styles.consentRow}>
                      <div>
                        <div className={styles.consentHandle}>{handle}</div>
                        <div className={styles.consentMeta}>Legitimate interest · 12 Jun 2026</div>
                      </div>
                      <span className={styles.eraseLink}>Request erasure</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suppression List */}
              <div className={styles.gdprColumn}>
                <div className={styles.sectionHeaderRow}>
                  <div className={styles.panelLabel}>
                    suppression list
                  </div>
                  <Button variant="secondary" size="sm">Export suppression list</Button>
                </div>
                <input placeholder="Search suppressed contacts" className={styles.gdprSearchInput} />
                <div className={styles.gdprListBox}>
                  {[
                    { handle: '@jamieoptout', date: '3 Jul 2026', reason: 'Unsubscribed' },
                    { handle: '@rileyoptout', date: '28 Jun 2026', reason: 'GDPR erasure request' },
                  ].map((sup) => (
                    <div key={sup.handle} className={styles.suppressionRow}>
                      <div className={styles.suppressionHandle}>{sup.handle}</div>
                      <div className={styles.suppressionMeta}>{sup.date} · {sup.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Tab 4: Audit Log */}
        {activeTab === 'Audit log' && (
          <>
            <div className={styles.sectionHeaderRow}>
              <div className={styles.sectionTitle}>audit log</div>
              <Button variant="secondary">Export audit log (CSV)</Button>
            </div>

            <div className={styles.auditListBox}>
              {auditLogs.map((ar) => {
                const isExpanded = expandedAuditId === ar.id;
                return (
                  <div key={ar.id}>
                    <div
                      onClick={() => setExpandedAuditId(isExpanded ? null : ar.id)}
                      className={styles.auditRow}
                    >
                      <span className={styles.auditTimestamp}>{ar.timestamp}</span>
                      <span className={styles.auditUser}>{ar.user}</span>
                      <span>{ar.action}</span>
                      <span>{ar.entity}</span>
                      <span>{ar.detail}</span>
                      <span className={styles.auditPreviousValue}>{ar.previousValue}</span>
                      <span>{isExpanded ? '▲' : '▼'}</span>
                    </div>

                    {isExpanded && (
                      <div className={styles.auditDetailPanel}>
                        {ar.fullDetail}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Fallback Tabs: General & Brands */}
        {(activeTab === 'General' || activeTab === 'Brands') && (
          <>
            <div className={styles.sectionTitle}>{activeTab}</div>
            <div className={styles.fallbackBox}>
              No additional settings configured yet for {activeTab}.
            </div>
          </>
        )}
      </div>

      {/* Invite User Modal */}
      {inviteModalOpen && (
        <div
          onClick={() => setInviteModalOpen(false)}
          className={styles.modalOverlay}
        >
          <Dialog title="Invite user" onClose={() => setInviteModalOpen(false)}>
            <div className={styles.modalForm}>
              <Input
                label="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="name@btheagency.com"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole['role'])}
                className={styles.modalSelect}
              >
                <option>Admin</option>
                <option>Director</option>
                <option>Account Manager</option>
                <option>Account Executive</option>
                <option>View only</option>
              </select>
              <Button variant="primary" fullWidth onClick={handleSendInvite}>
                Send invite
              </Button>
            </div>
          </Dialog>
        </div>
      )}
    </div>
  );
};
