import { useEffect, useCallback, useState } from 'react'
import type { Workspace, TerminalInstance } from '../types'
import { workspaceStore } from '../stores/workspace-store'
import { TerminalPanel } from './TerminalPanel'
import { ThumbnailBar } from './ThumbnailBar'
import { CloseConfirmDialog } from './CloseConfirmDialog'

interface WorkspaceViewProps {
  workspace: Workspace
  terminals: TerminalInstance[]
  focusedTerminalId: string | null
}

export function WorkspaceView({ workspace, terminals, focusedTerminalId }: WorkspaceViewProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null)

  const claudeCode = terminals.find(t => t.type === 'claude-code')
  const regularTerminals = terminals.filter(t => t.type === 'terminal')

  const focusedTerminal = terminals.find(t => t.id === focusedTerminalId)
  const isClaudeCodeFocused = focusedTerminal?.type === 'claude-code'

  // Initialize Claude Code terminal when workspace loads
  useEffect(() => {
    if (!claudeCode) {
      const terminal = workspaceStore.addTerminal(workspace.id, 'claude-code')
      window.electronAPI.pty.create({
        id: terminal.id,
        cwd: workspace.folderPath,
        type: 'claude-code'
      })
    }
  }, [workspace.id, claudeCode])

  // Auto-create first terminal if none exists
  useEffect(() => {
    if (regularTerminals.length === 0 && claudeCode) {
      const terminal = workspaceStore.addTerminal(workspace.id, 'terminal')
      window.electronAPI.pty.create({
        id: terminal.id,
        cwd: workspace.folderPath,
        type: 'terminal'
      })
    }
  }, [workspace.id, regularTerminals.length, claudeCode])

  // Set default focus
  useEffect(() => {
    if (!focusedTerminalId && claudeCode) {
      workspaceStore.setFocusedTerminal(claudeCode.id)
    }
  }, [focusedTerminalId, claudeCode])

  const handleAddTerminal = useCallback(() => {
    const terminal = workspaceStore.addTerminal(workspace.id, 'terminal')
    window.electronAPI.pty.create({
      id: terminal.id,
      cwd: workspace.folderPath,
      type: 'terminal'
    })
  }, [workspace.id, workspace.folderPath])

  const handleCloseTerminal = useCallback((id: string) => {
    const terminal = terminals.find(t => t.id === id)
    if (terminal?.type === 'claude-code') {
      setShowCloseConfirm(id)
    } else {
      window.electronAPI.pty.kill(id)
      workspaceStore.removeTerminal(id)
    }
  }, [terminals])

  const handleConfirmClose = useCallback(() => {
    if (showCloseConfirm) {
      window.electronAPI.pty.kill(showCloseConfirm)
      workspaceStore.removeTerminal(showCloseConfirm)
      setShowCloseConfirm(null)
    }
  }, [showCloseConfirm])

  const handleRestart = useCallback(async (id: string) => {
    const terminal = terminals.find(t => t.id === id)
    if (terminal) {
      const cwd = await window.electronAPI.pty.getCwd(id) || terminal.cwd
      await window.electronAPI.pty.restart(id, cwd)
      workspaceStore.updateTerminalCwd(id, cwd)
    }
  }, [terminals])

  const handleFocus = useCallback((id: string) => {
    workspaceStore.setFocusedTerminal(id)
  }, [])

  // Determine what to show in thumbnail bar
  const mainTerminal = focusedTerminal || claudeCode
  const thumbnailTerminals = isClaudeCodeFocused
    ? regularTerminals
    : (claudeCode ? [claudeCode] : [])

  return (
    <div className="workspace-view">
      {/* Render ALL terminals, show/hide with CSS - keeps processes running */}
      <div className="terminals-container">
        {terminals.map(terminal => (
          <div
            key={terminal.id}
            className={`terminal-wrapper ${terminal.id === mainTerminal?.id ? 'active' : 'hidden'}`}
          >
            <div className="main-panel">
              <div className="main-panel-header">
                <div className={`main-panel-title ${terminal.type === 'claude-code' ? 'claude-code' : ''}`}>
                  {terminal.type === 'claude-code' && <span>✦</span>}
                  <span>{terminal.title}</span>
                </div>
                <div className="main-panel-actions">
                  <button
                    className="action-btn"
                    onClick={() => handleRestart(terminal.id)}
                    title="Restart terminal"
                  >
                    ⟳
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => handleCloseTerminal(terminal.id)}
                    title="Close terminal"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="main-panel-content">
                <TerminalPanel terminalId={terminal.id} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ThumbnailBar
        terminals={thumbnailTerminals}
        focusedTerminalId={focusedTerminalId}
        onFocus={handleFocus}
        onAddTerminal={isClaudeCodeFocused ? handleAddTerminal : undefined}
        showAddButton={isClaudeCodeFocused}
      />

      {showCloseConfirm && (
        <CloseConfirmDialog
          onConfirm={handleConfirmClose}
          onCancel={() => setShowCloseConfirm(null)}
        />
      )}
    </div>
  )
}
