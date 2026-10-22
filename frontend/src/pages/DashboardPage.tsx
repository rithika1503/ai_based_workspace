import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, LogOut, FolderOpen, Users } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';
import type { Workspace } from '../types';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.get('/workspaces').then((r) => r.data.workspaces as Workspace[]),
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => api.post('/workspaces', { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] });
      setShowCreate(false);
      setNewName('');
      toast.success('Workspace created');
    },
    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create workspace'),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="bg-surface-raised border-b border-surface-border px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-accent-light rounded flex items-center justify-center">
            <span className="text-accent font-bold text-sm">W</span>
          </div>
          <span className="font-medium text-sm text-ink">AI Workspace</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-muted">{user?.name}</span>
          <button
            id="logout-btn"
            onClick={handleLogout}
            className="btn-ghost btn-sm"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Heading */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-ink">Your workspaces</h1>
            <p className="text-sm text-ink-muted mt-0.5">Select a workspace to get started</p>
          </div>
          <button
            id="create-workspace-btn"
            className="btn-primary"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={15} />
            New workspace
          </button>
        </div>

        {/* Workspace list */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => (
              <div key={i} className="card p-5 animate-pulse h-24 bg-surface-border" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {data.map((ws) => (
              <button
                key={ws.id}
                id={`workspace-${ws.id}`}
                onClick={() => navigate(`/workspace/${ws.id}`)}
                className="card p-5 text-left hover:border-accent/40 transition-colors group w-full"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-pastel-blue rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen size={16} className="text-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-ink">{ws.name}</p>
                      <p className="text-xs text-ink-soft mt-0.5">{ws._count?.projects ?? 0} projects</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-ink-soft">
                    <Users size={12} />
                    <span className="text-xs">{ws.members.length}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="card p-10 text-center">
            <div className="w-12 h-12 bg-pastel-blue rounded-xl flex items-center justify-center mx-auto mb-3">
              <FolderOpen size={20} className="text-blue-400" />
            </div>
            <p className="text-sm font-medium text-ink">No workspaces yet</p>
            <p className="text-xs text-ink-muted mt-1">Create one to start organizing your work</p>
          </div>
        )}
      </main>

      {/* Create workspace modal */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-base font-semibold text-ink">New workspace</h2>
              <button onClick={() => setShowCreate(false)} className="btn-ghost btn-sm p-1">✕</button>
            </div>
            <div className="modal-body">
              <label className="label">Workspace name</label>
              <input
                id="workspace-name-input"
                className="input"
                placeholder="e.g. Acme Inc"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && newName.trim() && createMutation.mutate(newName.trim())}
              />
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              <button
                id="create-workspace-confirm"
                className="btn-primary"
                disabled={!newName.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate(newName.trim())}
              >
                {createMutation.isPending ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
