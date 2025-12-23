import { useState, useRef, useEffect, useCallback } from 'react'
import type { Workspace } from '../types'
import { PRESET_ROLES } from '../types'
import { ActivityIndicator } from './ActivityIndicator'

interface SidebarProps {
  width: number
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (id: string) => void
  onAddWorkspace: () => void
  onRemoveWorkspace: (id: string) => void
  onRenameWorkspace: (id: string, alias: string) => void
  onSetWorkspaceRole: (id: string, role: string) => void
  onReorderWorkspaces: (workspaceIds: string[]) => void
  onOpenEnvVars: (workspaceId: string) => void
  onOpenSettings: () => void
  onOpenAbout: () => void
}

function getRoleColor(role?: string): string {
  if (!role) return 'transparent'
  const preset = PRESET_ROLES.find(r => r.name.toLowerCase() === role.toLowerCase() || r.id === role.toLowerCase())
  return preset?.color || '#dfdbc3'
}

export function Sidebar({
  width,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  onRenameWorkspace,
  onSetWorkspaceRole,
  onReorderWorkspaces,
  onOpenEnvVars,
  onOpenSettings,
  onOpenAbout
}: Readonly<SidebarProps>) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null)
  const [customRoleInput, setCustomRoleInput] = useState('')
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string } | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const roleMenuRef = useRef<HTMLDivElement>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingId])

  // Close role menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(e.target as Node)) {
        setRoleMenuId(null)
        setCustomRoleInput('')
      }
    }
    if (roleMenuId) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [roleMenuId])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, workspaceId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId })
  }, [])

  const handleRoleClick = (workspaceId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setRoleMenuId(roleMenuId === workspaceId ? null : workspaceId)
    setCustomRoleInput('')
  }

  const handleSelectRole = (workspaceId: string, role: string) => {
    if (role === 'custom') {
      // Show custom input instead
      return
    }
    onSetWorkspaceRole(workspaceId, role)
    setRoleMenuId(null)
  }

  const handleCustomRoleSubmit = (workspaceId: string) => {
    if (customRoleInput.trim()) {
      onSetWorkspaceRole(workspaceId, customRoleInput.trim())
    }
    setRoleMenuId(null)
    setCustomRoleInput('')
  }

  const handleDoubleClick = (workspace: Workspace, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(workspace.id)
    setEditValue(workspace.alias || workspace.name)
  }

  const handleRenameSubmit = (id: string) => {
    onRenameWorkspace(id, editValue)
    setEditingId(null)
  }

  const handleKeyDown = (id: string, e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameSubmit(id)
    } else if (e.key === 'Escape') {
      setEditingId(null)
    }
  }

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, workspaceId: string) => {
    setDraggedId(workspaceId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', workspaceId)
    requestAnimationFrame(() => {
      const target = e.target as HTMLElement
      target.classList.add('dragging')
    })
  }, [])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.classList.remove('dragging')
    setDraggedId(null)
    setDragOverId(null)
    setDragPosition(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, workspaceId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'

    if (draggedId === workspaceId) return

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const midY = rect.top + rect.height / 2
    const position = e.clientY < midY ? 'before' : 'after'

    setDragOverId(workspaceId)
    setDragPosition(position)
  }, [draggedId])

  const handleDragLeave = useCallback(() => {
    setDragOverId(null)
    setDragPosition(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault()

    if (!draggedId || draggedId === targetId) {
      setDraggedId(null)
      setDragOverId(null)
      setDragPosition(null)
      return
    }

    const currentOrder = workspaces.map(w => w.id)
    const draggedIndex = currentOrder.indexOf(draggedId)
    const targetIndex = currentOrder.indexOf(targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    // Remove dragged item
    currentOrder.splice(draggedIndex, 1)

    // Calculate new index
    let newIndex = currentOrder.indexOf(targetId)
    if (dragPosition === 'after') {
      newIndex += 1
    }

    // Insert at new position
    currentOrder.splice(newIndex, 0, draggedId)

    onReorderWorkspaces(currentOrder)

    setDraggedId(null)
    setDragOverId(null)
    setDragPosition(null)
  }, [draggedId, dragPosition, workspaces, onReorderWorkspaces])

  return (
    <aside className="sidebar" style={{ width }}>
      <div className="sidebar-header">Workspaces</div>
      <div className="workspace-list">
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''} ${dragOverId === workspace.id ? `drag-over-${dragPosition}` : ''}`}
            onClick={() => onSelectWorkspace(workspace.id)}
            onContextMenu={(e) => handleContextMenu(e, workspace.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, workspace.id)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, workspace.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, workspace.id)}
          >
            <div className="workspace-item-content">
              <div className="drag-handle" title="Drag to reorder">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="6" r="2"/>
                  <circle cx="15" cy="6" r="2"/>
                  <circle cx="9" cy="12" r="2"/>
                  <circle cx="15" cy="12" r="2"/>
                  <circle cx="9" cy="18" r="2"/>
                  <circle cx="15" cy="18" r="2"/>
                </svg>
              </div>
              <div
                className="workspace-item-info"
                onDoubleClick={(e) => handleDoubleClick(workspace, e)}
              >
                {editingId === workspace.id ? (
                  <input
                    ref={inputRef}
                    type="text"
                    className="workspace-rename-input"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleRenameSubmit(workspace.id)}
                    onKeyDown={(e) => handleKeyDown(workspace.id, e)}
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <div className="workspace-name-row">
                      <span className="workspace-alias">{workspace.alias || workspace.name}</span>
                      <span
                        className="workspace-role-badge"
                        style={{
                          backgroundColor: getRoleColor(workspace.role),
                          opacity: workspace.role ? 1 : 0.3
                        }}
                        onClick={(e) => handleRoleClick(workspace.id, e)}
                        title={workspace.role || 'Click to set role'}
                      >
                        {workspace.role || '＋'}
                      </span>
                    </div>
                    <span className="workspace-folder">{workspace.name}</span>
                  </>
                )}
              </div>
              {roleMenuId === workspace.id && (
                <div className="role-selector-menu" ref={roleMenuRef} onClick={(e) => e.stopPropagation()}>
                  <div className="role-menu-title">Select Role</div>
                  {PRESET_ROLES.filter(r => r.id !== 'custom').map(role => (
                    <div
                      key={role.id}
                      className={`role-menu-item ${workspace.role === role.name ? 'selected' : ''}`}
                      onClick={() => handleSelectRole(workspace.id, role.name)}
                    >
                      <span className="role-color-dot" style={{ backgroundColor: role.color }} />
                      {role.name}
                    </div>
                  ))}
                  <div className="role-menu-divider" />
                  <div className="role-menu-custom">
                    <input
                      type="text"
                      placeholder="Custom role..."
                      value={customRoleInput}
                      onChange={(e) => setCustomRoleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCustomRoleSubmit(workspace.id)
                        if (e.key === 'Escape') setRoleMenuId(null)
                      }}
                      autoFocus
                    />
                    <button onClick={() => handleCustomRoleSubmit(workspace.id)}>OK</button>
                  </div>
                  {workspace.role && (
                    <>
                      <div className="role-menu-divider" />
                      <div
                        className="role-menu-item role-menu-clear"
                        onClick={() => handleSelectRole(workspace.id, '')}
                      >
                        Clear Role
                      </div>
                    </>
                  )}
                </div>
              )}
              <div className="workspace-item-actions">
                <ActivityIndicator
                  workspaceId={workspace.id}
                  size="small"
                />
              </div>
            </div>
          </div>
        )
        )}
      </div>
      <div className="sidebar-footer">
        <button className="add-workspace-btn" onClick={onAddWorkspace}>
          + Add Workspace
        </button>
        <div className="sidebar-footer-buttons">
          <button className="settings-btn" onClick={onOpenSettings}>
            Settings
          </button>
          <button className="settings-btn" onClick={onOpenAbout}>
            About
          </button>
        </div>
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="workspace-context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div
            className="context-menu-item"
            onClick={() => {
              onOpenEnvVars(contextMenu.workspaceId)
              setContextMenu(null)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Environment Variables
          </div>
          <div className="context-menu-divider" />
          <div
            className="context-menu-item danger"
            onClick={() => {
              onRemoveWorkspace(contextMenu.workspaceId)
              setContextMenu(null)
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            Close Workspace
          </div>
        </div>
      )}
    </aside>
  )
}
