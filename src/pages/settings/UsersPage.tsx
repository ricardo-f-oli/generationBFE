import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Page, PageHeader, AsyncBoundary, ui } from '../../components/common/PageShell';
import { Button } from '../../components/common/Button';
import { Input, Select } from '../../components/common/Input';
import { Modal } from '../../components/common/Modal';
import { Tag } from '../../components/common/Tag';
import { useToast } from '../../components/common/Toast';
import { useAuth } from '../../context/AuthContext';
import {
  createUser,
  fetchRoles,
  fetchUsers,
  sendPasswordReset,
  unlockUser,
  updateUser,
} from '../../services/adminService';
import { ApiError } from '../../services/apiClient';
import type { ManagedUser, Role } from '../../types';

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Admin',
  DIRECTOR: 'Director',
  ACCOUNT_MANAGER: 'Account manager',
  ACCOUNT_EXECUTIVE: 'Account executive',
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: 'Everything, including user management and settings.',
  DIRECTOR: 'Everything except user management. Signs off client reports.',
  ACCOUNT_MANAGER: 'Runs campaigns, outreach and gifting day to day.',
  ACCOUNT_EXECUTIVE: 'Same as an account manager, without deleting campaigns.',
};

/**
 * Requirement #35: user management.
 *
 * Two rules the backend enforces and this screen explains up front: you cannot lock yourself out
 * of your own brand, and a brand always keeps at least one active admin.
 */
export const UsersPage: React.FC = () => {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);

  const users = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers(0, 50) });
  const roles = useQuery({ queryKey: ['roles'], queryFn: fetchRoles });

  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'That did not work');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['users'] });

  const changeRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateUser(id, { role }),
    onSuccess: () => {
      invalidate();
      toast.success('Role updated');
    },
    onError,
  });

  const toggleActive = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => updateUser(id, { active }),
    onSuccess: () => {
      invalidate();
      toast.success('Access updated');
    },
    onError,
  });

  const unlock = useMutation({
    mutationFn: (id: string) => unlockUser(id),
    onSuccess: () => {
      invalidate();
      toast.success('Account unlocked');
    },
    onError,
  });

  const resend = useMutation({
    mutationFn: (id: string) => sendPasswordReset(id),
    onSuccess: () => toast.success('Set-password email sent'),
    onError,
  });

  return (
    <Page>
      <PageHeader
        title="Users and roles"
        subtitle="Who can sign in to this brand, and what they can do."
        actions={<Button onClick={() => setInviteOpen(true)}>Invite someone</Button>}
      />

      <AsyncBoundary
        isLoading={users.isLoading}
        error={users.error}
        onRetry={() => users.refetch()}
        loadingLabel="Loading users"
      >
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Last signed in</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.data?.items.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUser?.id}
                  roles={roles.data ?? []}
                  onRoleChange={(role) => changeRole.mutate({ id: user.id, role })}
                  onToggleActive={() =>
                    toggleActive.mutate({ id: user.id, active: !user.active })
                  }
                  onUnlock={() => unlock.mutate(user.id)}
                  onResend={() => resend.mutate(user.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </AsyncBoundary>

      <section className={ui.panel} style={{ marginTop: 'var(--space-5)' }}>
        <h2 className={ui.sectionLabel}>What the roles mean</h2>
        <dl style={{ margin: 0, display: 'grid', gap: 'var(--space-3)' }}>
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <div key={role}>
              <dt style={{ fontWeight: 'var(--weight-bold)' }}>{ROLE_LABELS[role]}</dt>
              <dd className={ui.cellMuted} style={{ margin: 0 }}>
                {ROLE_DESCRIPTIONS[role]}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {inviteOpen && (
        <InviteModal
          roles={roles.data ?? []}
          onClose={() => setInviteOpen(false)}
          onInvited={() => {
            setInviteOpen(false);
            invalidate();
            toast.success('Invitation sent — they set their own password from the email');
          }}
        />
      )}
    </Page>
  );
};

const UserRow: React.FC<{
  user: ManagedUser;
  isSelf: boolean;
  roles: Role[];
  onRoleChange: (role: Role) => void;
  onToggleActive: () => void;
  onUnlock: () => void;
  onResend: () => void;
}> = ({ user, isSelf, roles, onRoleChange, onToggleActive, onUnlock, onResend }) => (
  <tr>
    <td className={ui.cellStrong}>
      {user.name ?? '—'}
      {isSelf && <span className={ui.cellMuted}> (you)</span>}
    </td>
    <td className={ui.cellMuted}>{user.email}</td>
    <td>
      <Select
        value={user.role}
        aria-label={`Role for ${user.email}`}
        disabled={isSelf}
        onChange={(event) => onRoleChange(event.target.value as Role)}
      >
        {roles.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role] ?? role}
          </option>
        ))}
      </Select>
    </td>
    <td className={ui.cellMuted}>
      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
    </td>
    <td>
      {user.locked ? (
        <Tag tone="brand">Locked out</Tag>
      ) : user.active ? (
        <Tag tone="lime">Active</Tag>
      ) : (
        <Tag tone="neutral">No access</Tag>
      )}
    </td>
    <td>
      <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
        {user.locked && (
          <Button size="sm" variant="secondary" onClick={onUnlock}>
            Unlock
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onResend}>
          Send reset
        </Button>
        {!isSelf && (
          <Button
            size="sm"
            variant={user.active ? 'danger' : 'secondary'}
            onClick={onToggleActive}
          >
            {user.active ? 'Remove access' : 'Restore access'}
          </Button>
        )}
      </div>
    </td>
  </tr>
);

const InviteModal: React.FC<{
  roles: Role[];
  onClose: () => void;
  onInvited: () => void;
}> = ({ roles, onClose, onInvited }) => {
  const toast = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('ACCOUNT_MANAGER');

  const mutation = useMutation({
    mutationFn: () => createUser({ name, email, role }),
    onSuccess: onInvited,
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'Could not invite them'),
  });

  return (
    <Modal
      title="Invite someone"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!email.trim() || !name.trim() || mutation.isPending}
          >
            Send invitation
          </Button>
        </>
      }
    >
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        They get an email with a link to set their own password. Nobody, including you, ever sees
        it.
      </p>
      <Input label="Name" value={name} onChange={(event) => setName(event.target.value)} />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <Select
        label="Role"
        value={role}
        onChange={(event) => setRole(event.target.value as Role)}
      >
        {roles.map((option) => (
          <option key={option} value={option}>
            {ROLE_LABELS[option] ?? option}
          </option>
        ))}
      </Select>
      <p className={ui.cellMuted} style={{ marginTop: 0 }}>
        {ROLE_DESCRIPTIONS[role]}
      </p>
    </Modal>
  );
};
