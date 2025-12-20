import { useState, useRef, useEffect, useCallback } from 'react'
import type { Workspace } from '../types'
import { PRESET_ROLES } from '../types'
import { ActivityIndicator } from './ActivityIndicator'

interface SidebarProps {
  width: number
  workspaces: Workspace[]
  archivedWorkspaces: Workspace[]
  activeWorkspaceId: string | null
  onSelectWorkspace: (id: string) => void
  onAddWorkspace: () => void
  onRemoveWorkspace: (id: string) => void
  onRenameWorkspace: (id: string, alias: string) => void
  onSetWorkspaceRole: (id: string, role: string) => void
  onArchiveWorkspace: (id: string) => void
  onUnarchiveWorkspace: (id: string) => void
  onReorderWorkspaces: (workspaceIds: string[]) => void
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
  archivedWorkspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onAddWorkspace,
  onRemoveWorkspace,
  onRenameWorkspace,
  onSetWorkspaceRole,
  onArchiveWorkspace,
  onUnarchiveWorkspace,
  onReorderWorkspaces,
  onOpenSettings,
  onOpenAbout
}: SidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [roleMenuId, setRoleMenuId] = useState<string | null>(null)
  const [customRoleInput, setCustomRoleInput] = useState('')
  const [archivedExpanded, setArchivedExpanded] = useState(true)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragPosition, setDragPosition] = useState<'before' | 'after' | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspaceId: string; isArchived: boolean } | null>(null)
  const [archivedHeight, setArchivedHeight] = useState(() => {
    const saved = localStorage.getItem('archivedSectionHeight')
    return saved ? parseInt(saved, 10) : 150
  })
  const [isResizingArchived, setIsResizingArchived] = useState(false)
  const archivedResizeRef = useRef<{ startY: number; startHeight: number } | null>(null)
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

  // Archived section resize handlers
  const handleArchivedResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizingArchived(true)
    archivedResizeRef.current = { startY: e.clientY, startHeight: archivedHeight }
  }, [archivedHeight])

  useEffect(() => {
    if (!isResizingArchived) return

    let currentHeight = archivedHeight

    const handleMouseMove = (e: MouseEvent) => {
      if (!archivedResizeRef.current) return
      const delta = archivedResizeRef.current.startY - e.clientY
      currentHeight = Math.min(400, Math.max(80, archivedResizeRef.current.startHeight + delta))
      setArchivedHeight(currentHeight)
    }

    const handleMouseUp = () => {
      setIsResizingArchived(false)
      archivedResizeRef.current = null
      localStorage.setItem('archivedSectionHeight', currentHeight.toString())
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingArchived, archivedHeight])

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

  // Context menu handler
  const handleContextMenu = useCallback((e: React.MouseEvent, workspaceId: string, isArchived: boolean) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY, workspaceId, isArchived })
  }, [])

  // Drag and drop handlers
  const handleDragStart = useCallback((e: React.DragEvent, workspaceId: string) => {
    setDraggedId(workspaceId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', workspaceId)
    // Add drag styling after a short delay to avoid flickering
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

  const renderWorkspaceItem = (workspace: Workspace, isArchived: boolean = false) => (
    <div
      key={workspace.id}
      className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''} ${isArchived ? 'archived' : ''} ${dragOverId === workspace.id ? `drag-over-${dragPosition}` : ''}`}
      onClick={() => onSelectWorkspace(workspace.id)}
      onContextMenu={(e) => handleContextMenu(e, workspace.id, isArchived)}
      draggable={!isArchived}
      onDragStart={(e) => handleDragStart(e, workspace.id)}
      onDragEnd={handleDragEnd}
      onDragOver={(e) => handleDragOver(e, workspace.id)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, workspace.id)}
    >
      <div className="workspace-item-content">
        {!isArchived && (
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
        )}
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
                  {workspace.role || '+'}
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
          {!isArchived && (
            <ActivityIndicator
              workspaceId={workspace.id}
              size="small"
            />
          )}
          <button
            className="remove-btn"
            onClick={(e) => {
              e.stopPropagation()
              onRemoveWorkspace(workspace.id)
            }}
          >
            x
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <aside className={`sidebar ${isResizingArchived ? 'resizing-archived' : ''}`} style={{ width }}>
      <div className="sidebar-header">Workspaces</div>
      <div className="workspace-list">
<<<<<<< HEAD
        {workspaces.map(workspace => (
          <div
            key={workspace.id}
            className={`workspace-item ${workspace.id === activeWorkspaceId ? 'active' : ''}`}
            onClick={() => onSelectWorkspace(workspace.id)}
          >
            <div className="workspace-item-content">
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
            </div>
          </div>
        )
        )}
=======
        {workspaces.map(workspace => renderWorkspaceItem(workspace, false))}
>>>>>>> origin/main
      </div>

      {archivedWorkspaces.length > 0 && (
        <>
          <div
            className="archived-resizer"
            onMouseDown={handleArchivedResizeStart}
          />
          <div className="archived-section" style={{ height: archivedHeight }}>
            <div
              className="archived-header"
              onClick={() => setArchivedExpanded(!archivedExpanded)}
            >
              <span className={`archived-chevron ${archivedExpanded ? 'expanded' : ''}`}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </span>
              <span>Archived ({archivedWorkspaces.length})</span>
            </div>
            {archivedExpanded && (
              <div className="archived-list">
                {archivedWorkspaces.map(workspace => renderWorkspaceItem(workspace, true))}
              </div>
            )}
          </div>
        </>
      )}

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
          {contextMenu.isArchived ? (
            <div
              className="context-menu-item"
              onClick={() => {
                onUnarchiveWorkspace(contextMenu.workspaceId)
                setContextMenu(null)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Unarchive
            </div>
          ) : (
            <div
              className="context-menu-item"
              onClick={() => {
                onArchiveWorkspace(contextMenu.workspaceId)
                setContextMenu(null)
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="4" width="20" height="5" rx="1" />
                <path d="M4 9v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9" />
                <path d="M10 13h4" />
              </svg>
              Archive
            </div>
          )}
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
            Delete
          </div>
        </div>
      )}
    </aside>
  )
}
