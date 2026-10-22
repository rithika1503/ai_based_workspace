import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ArrowLeft, LayoutGrid, UserPlus } from 'lucide-react';
import api from '../services/api';
import type { Workspace, Project } from '../types';
import toast from 'react-hot-toast';

export default function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => api.get(`/workspaces/${workspaceId}`).then((r) => r.data.workspace as Workspace),
    enabled: !!workspaceId,
  });

  const { data: projects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () =>
      api.get(`/projects?workspaceId=${workspaceId}`).then((r) => r.data.projects as Project[]),
    enabled: !!workspaceId,
  });

  const createProject = useMutation({
    mutationFn: () =>
      api.post('/projects', { name: projectName, description: projectDesc, workspaceId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects', workspaceId] });
      setShowCreateProject(false);
      setProjectName('');
      setProjectDesc('');
      toast.success('Project created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  const inviteMember = useMutation({
    mutationFn: () =>
      api.post(`/workspaces/${workspaceId}/invite`, { email: inviteEmail, role: inviteRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      setShowInvite(false);
      setInviteEmail('');
      toast.success('Member invited');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed'),
  });

  if (isLoading) return <div className="min-h-screen bg-surface flex items-center justify-center"><p className="text-ink-muted text-sm">Loading…</p></div>;

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-surface-raised border-b border-surface-border px-6 py-3 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="btn-ghost btn-sm p-1">
          <ArrowLeft size={16} />
        </button>
        <div className="w-7 h-7 bg-accent-light rounded flex items-center justify-center">
          <span className="text-accent font-bold text-sm">W</span>
        </div>
        <span className="font-medium text-sm text-ink">{workspace?.name}</span>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-3 gap-8">
        {/* Projects section */}
        <section className="col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Projects</h2>
            <button
              id="create-project-btn"
              className="btn-primary btn-sm"
              onClick={() => setShowCreateProject(true)}
            >
              <Plus size={13} /> New project
            </button>
          </div>

          {projects && projects.length > 0 ? (
            <div className="space-y-2">
              {projects.map((p) => (
                <button
                  key={p.id}
                  id={`project-${p.id}`}
                  onClick={() => navigate(`/workspace/${workspaceId}/project/${p.id}/board`)}
                  className="card p-4 flex items-center justify-between w-full text-left hover:border-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-pastel-purple rounded-lg flex items-center justify-center">
                      <LayoutGrid size={14} className="text-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-ink">{p.name}</p>
                      {p.description && <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{p.description}</p>}
                    </div>
                  </div>
                  <span className="text-xs text-ink-soft">{p._count?.tasks ?? 0} tasks</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <p className="text-sm text-ink-muted">No projects yet. Create your first one.</p>
            </div>
          )}
        </section>

        {/* Members section */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-ink uppercase tracking-wide">Members</h2>
            <button
              id="invite-btn"
              className="btn-ghost btn-sm"
              onClick={() => setShowInvite(true)}
            >
              <UserPlus size={13} />
            </button>
          </div>
          <div className="card divide-y divide-surface-border">
            {workspace?.members.map((m) => (
              <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-pastel-blue flex items-center justify-center text-xs font-medium text-blue-600">
                    {m.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-ink">{m.user.name}</p>
                    <p className="text-xs text-ink-soft">{m.user.email}</p>
                  </div>
                </div>
                <span className="badge badge-blue text-[10px]">{m.role}</span>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Create project modal */}
      {showCreateProject && (
        <div className="modal-backdrop" onClick={() => setShowCreateProject(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-base font-semibold text-ink">New project</h2>
              <button onClick={() => setShowCreateProject(false)} className="btn-ghost btn-sm p-1">✕</button>
            </div>
            <div className="modal-body">
              <div>
                <label className="label">Project name</label>
                <input id="project-name" className="input" placeholder="e.g. Mobile App" value={projectName} onChange={(e) => setProjectName(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Description <span className="text-ink-soft">(optional)</span></label>
                <textarea id="project-desc" className="input resize-none" rows={2} placeholder="What is this project about?" value={projectDesc} onChange={(e) => setProjectDesc(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCreateProject(false)}>Cancel</button>
              <button
                id="create-project-confirm"
                className="btn-primary"
                disabled={!projectName.trim() || createProject.isPending}
                onClick={() => createProject.mutate()}
              >
                {createProject.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-base font-semibold text-ink">Invite member</h2>
              <button onClick={() => setShowInvite(false)} className="btn-ghost btn-sm p-1">✕</button>
            </div>
            <div className="modal-body">
              <div>
                <label className="label">Email</label>
                <input id="invite-email" className="input" type="email" placeholder="teammate@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} autoFocus />
              </div>
              <div>
                <label className="label">Role</label>
                <select id="invite-role" className="input" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="VIEWER">Viewer</option>
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowInvite(false)}>Cancel</button>
              <button
                id="invite-confirm"
                className="btn-primary"
                disabled={!inviteEmail.trim() || inviteMember.isPending}
                onClick={() => inviteMember.mutate()}
              >
                {inviteMember.isPending ? 'Inviting…' : 'Invite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
