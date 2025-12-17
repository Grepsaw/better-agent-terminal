import type { Workspace } from '../types'

interface SidebarProps {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (id: string) => void
  onAddWorkspace: () => void
  onRemoveWorkspace: (id: string) => void
}

export function Sidebar({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace
}: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">Workspaces</div>
      <div className="workspace-list">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
            onClick={() => onSelectWorkspace(workspace.id)}
          >
            <span>{workspace.name}</span>
            <button
              className="remove-btn"
              onClick={(e) => {
                e.stopPropagation()
                onRemoveWorkspace(workspace.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
        <button className="add-workspace-btn" onClick={onAddWorkspace}>
          + Add Workspace
        </button>
      </div>
    </aside>
  )
}
