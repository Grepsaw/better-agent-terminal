import { useEffect, useCallback, useState } from 'react'
import type { Workspace, TerminalInstance, EnvVariable } from '../types'
import { workspaceStore } from '../stores/workspace-store'
import { settingsStore } from '../stores/settings-store'
import { TerminalPanel } from './TerminalPanel'
import { ThumbnailBar } from './ThumbnailBar'
import { CloseConfirmDialog } from './CloseConfirmDialog'
import { ActivityIndicator } from './ActivityIndicator'
import { AgentPresetId, getAgentPreset } from '../types/agent-presets'

interface WorkspaceViewProps {
  workspace: Workspace
  terminals: TerminalInstance[]
  focusedTerminalId: string | null
  isActive: boolean
}

// Helper to get shell path from settings
async function getShellFromSettings(): Promise<string | undefined> {
  const settings = settingsStore.getSettings()
  if (settings.shell === 'custom' && settings.customShellPath) {
    return settings.customShellPath
  }
  return window.electronAPI.settings.getShellPath(settings.shell)
}

// Helper to merge environment variables
function mergeEnvVars(global: EnvVariable[] = [], workspace: EnvVariable[] = []): Record<string, string> {
  const result: Record<string, string> = {}
  // Add global vars first
  for (const env of global) {
    if (env.enabled && env.key) {
      result[env.key] = env.value
    }
  }
  // Workspace vars override global
  for (const env of workspace) {
    if (env.enabled && env.key) {
      result[env.key] = env.value
    }
  }
  return result
}

export function WorkspaceView({ workspace, terminals, focusedTerminalId, isActive }: WorkspaceViewProps) {
  const [showCloseConfirm, setShowCloseConfirm] = useState<string | null>(null)

<<<<<<< HEAD
  // Find agent terminal (any terminal with an agentPreset that's not 'none')
  const agentTerminal = terminals.find(t => t.agentPreset && t.agentPreset !== 'none')
  const regularTerminals = terminals.filter(t => !t.agentPreset || t.agentPreset === 'none')

  const focusedTerminal = terminals.find(t => t.id === focusedTerminalId)
  const isAgentFocused = focusedTerminal?.agentPreset && focusedTerminal.agentPreset !== 'none'

  // Initialize agent terminal when workspace loads
  useEffect(() => {
    if (!agentTerminal) {
      const createAgent = async () => {
        const defaultAgent = workspace.defaultAgent || settingsStore.getSettings().defaultAgent || 'claude-code'
        const terminal = workspaceStore.addTerminal(workspace.id, defaultAgent as AgentPresetId)
=======
  const codeAgent = terminals.find(t => t.type === 'code-agent')
  const regularTerminals = terminals.filter(t => t.type === 'terminal')

  const focusedTerminal = terminals.find(t => t.id === focusedTerminalId)
  const isCodeAgentFocused = focusedTerminal?.type === 'code-agent'

  // Initialize Code Agent terminal when workspace loads
  useEffect(() => {
    if (!codeAgent) {
      const createClaudeCode = async () => {
        const terminal = workspaceStore.addTerminal(workspace.id, 'code-agent')
        const shell = await getShellFromSettings()
        window.electronAPI.pty.create({
          id: terminal.id,
          cwd: workspace.folderPath,
          type: 'code-agent',
          shell
        })
      }
      createClaudeCode()
    }
  }, [workspace.id, codeAgent])

  // Auto-create first terminal if none exists
  useEffect(() => {
    if (regularTerminals.length === 0 && codeAgent) {
      const createTerminal = async () => {
        const terminal = workspaceStore.addTerminal(workspace.id, 'terminal')
>>>>>>> origin/main
        const shell = await getShellFromSettings()
        const settings = settingsStore.getSettings()
        const customEnv = mergeEnvVars(settings.globalEnvVars, workspace.envVars)
        window.electronAPI.pty.create({
          id: terminal.id,
          cwd: workspace.folderPath,
          type: 'terminal',
          agentPreset: defaultAgent as AgentPresetId,
          shell,
          customEnv
        })
      }
      createAgent()
    }
  }, [workspace.id, agentTerminal, workspace.defaultAgent, workspace.folderPath, workspace.envVars])

  // Auto-create first regular terminal if none exists
  useEffect(() => {
    if (regularTerminals.length === 0 && agentTerminal) {
      const createTerminal = async () => {
        const terminal = workspaceStore.addTerminal(workspace.id)
        const shell = await getShellFromSettings()
        const settings = settingsStore.getSettings()
        const customEnv = mergeEnvVars(settings.globalEnvVars, workspace.envVars)
        window.electronAPI.pty.create({
          id: terminal.id,
          cwd: workspace.folderPath,
          type: 'terminal',
          shell,
          customEnv
        })
      }
      createTerminal()
    }
<<<<<<< HEAD
  }, [workspace.id, regularTerminals.length, agentTerminal, workspace.folderPath, workspace.envVars])

  // Set default focus - only for active workspace
  useEffect(() => {
    if (isActive && !focusedTerminalId && agentTerminal) {
      workspaceStore.setFocusedTerminal(agentTerminal.id)
    }
  }, [isActive, focusedTerminalId, agentTerminal])
=======
  }, [workspace.id, regularTerminals.length, codeAgent])

  // Set default focus - only for active workspace
  useEffect(() => {
    if (isActive && !focusedTerminalId && codeAgent) {
      workspaceStore.setFocusedTerminal(codeAgent.id)
    }
  }, [isActive, focusedTerminalId, codeAgent])
>>>>>>> origin/main

  const handleAddTerminal = useCallback(async () => {
    const terminal = workspaceStore.addTerminal(workspace.id)
    const shell = await getShellFromSettings()
    const settings = settingsStore.getSettings()
    const customEnv = mergeEnvVars(settings.globalEnvVars, workspace.envVars)
    window.electronAPI.pty.create({
      id: terminal.id,
      cwd: workspace.folderPath,
      type: 'terminal',
      shell,
      customEnv
    })
  }, [workspace.id, workspace.folderPath, workspace.envVars])

  const handleCloseTerminal = useCallback((id: string) => {
    const terminal = terminals.find(t => t.id === id)
<<<<<<< HEAD
    // Show confirm for agent terminals
    if (terminal?.agentPreset && terminal.agentPreset !== 'none') {
=======
    if (terminal?.type === 'code-agent') {
>>>>>>> origin/main
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
      const shell = await getShellFromSettings()
      await window.electronAPI.pty.restart(id, cwd, shell)
      workspaceStore.updateTerminalCwd(id, cwd)
    }
  }, [terminals])

  const handleFocus = useCallback((id: string) => {
    workspaceStore.setFocusedTerminal(id)
  }, [])

  // Determine what to show in thumbnail bar
<<<<<<< HEAD
  const mainTerminal = focusedTerminal || agentTerminal
  const thumbnailTerminals = isAgentFocused
    ? regularTerminals
    : (agentTerminal ? [agentTerminal] : [])
=======
  const mainTerminal = focusedTerminal || codeAgent
  const thumbnailTerminals = isCodeAgentFocused
    ? regularTerminals
    : (codeAgent ? [codeAgent] : [])
>>>>>>> origin/main

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
<<<<<<< HEAD
                <div className={`main-panel-title ${terminal.agentPreset && terminal.agentPreset !== 'none' ? 'agent-terminal' : ''}`}
                  style={terminal.agentPreset ? { '--agent-color': getAgentPreset(terminal.agentPreset)?.color } as React.CSSProperties : undefined}>
                  {terminal.agentPreset && terminal.agentPreset !== 'none' && (
                    <span>{getAgentPreset(terminal.agentPreset)?.icon}</span>
                  )}
=======
                <div className={`main-panel-title ${terminal.type === 'code-agent' ? 'code-agent' : ''}`}>
                  {terminal.type === 'code-agent' && <span>✦</span>}
>>>>>>> origin/main
                  <span>{terminal.title}</span>
                </div>
                <div className="main-panel-actions">
                  <ActivityIndicator
                    terminalId={terminal.id}
                    size="small"
                  />
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
                <TerminalPanel
                  terminalId={terminal.id}
                  isActive={terminal.id === mainTerminal?.id}
                  terminalType={terminal.type}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <ThumbnailBar
        terminals={thumbnailTerminals}
        focusedTerminalId={focusedTerminalId}
        onFocus={handleFocus}
<<<<<<< HEAD
        onAddTerminal={isAgentFocused ? handleAddTerminal : undefined}
        showAddButton={!!isAgentFocused}
=======
        onAddTerminal={isCodeAgentFocused ? handleAddTerminal : undefined}
        showAddButton={isCodeAgentFocused}
>>>>>>> origin/main
      />

      {
        showCloseConfirm && (
          <CloseConfirmDialog
            onConfirm={handleConfirmClose}
            onCancel={() => setShowCloseConfirm(null)}
          />
        )
      }
    </div >
  )
}
