import { useEffect, useState, useCallback } from 'react'
import { workspaceStore } from './stores/workspace-store'
import { Sidebar } from './components/Sidebar'
import { WorkspaceView } from './components/WorkspaceView'
import type { AppState } from './types'

export default function App() {
  const [state, setState] = useState<AppState>(workspaceStore.getState())

  useEffect(() => {
    const unsubscribe = workspaceStore.subscribe(() => {
      setState(workspaceStore.getState())
    })

    // Load saved workspaces on startup
    workspaceStore.load()

    return unsubscribe
  }, [])

  const handleAddWorkspace = useCallback(async () => {
    const folderPath = await window.electronAPI.dialog.selectFolder()
    if (folderPath) {
      const name = folderPath.split(/[/\\]/).pop() || 'Workspace'
      workspaceStore.addWorkspace(name, folderPath)
      workspaceStore.save()
    }
  }, [])

  const activeWorkspace = state.workspaces.find(w => w.id === state.activeWorkspaceId)

  return (
    <div className="app">
      <Sidebar
        workspaces={state.workspaces}
        activeWorkspaceId={state.activeWorkspaceId}
        onSelectWorkspace={(id) => workspaceStore.setActiveWorkspace(id)}
        onAddWorkspace={handleAddWorkspace}
        onRemoveWorkspace={(id) => {
          workspaceStore.removeWorkspace(id)
          workspaceStore.save()
        }}
      />
      <main className="main-content">
        {activeWorkspace ? (
          <WorkspaceView
            workspace={activeWorkspace}
            terminals={workspaceStore.getWorkspaceTerminals(activeWorkspace.id)}
            focusedTerminalId={state.focusedTerminalId}
          />
        ) : (
          <div className="empty-state">
            <h2>Welcome to Better Agent Terminal</h2>
            <p>Click "+ Add Workspace" to get started</p>
          </div>
        )}
      </main>
    </div>
  )
}
