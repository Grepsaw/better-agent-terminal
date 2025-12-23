import type { TerminalInstance } from '../types'
import { TerminalThumbnail } from './TerminalThumbnail'
import { getAgentPreset } from '../types/agent-presets'

interface ThumbnailBarProps {
  terminals: TerminalInstance[]
  focusedTerminalId: string | null
  onFocus: (id: string) => void
  onAddTerminal?: () => void
  showAddButton: boolean
  height?: number
  collapsed?: boolean
  onCollapse?: () => void
}

export function ThumbnailBar({
  terminals,
  focusedTerminalId,
  onFocus,
  onAddTerminal,
  showAddButton,
  height,
  collapsed = false,
  onCollapse
}: ThumbnailBarProps) {
  // Check if these are agent terminals or regular terminals
  const firstTerminal = terminals[0]
  const isAgentList = firstTerminal?.agentPreset && firstTerminal.agentPreset !== 'none'
  const label = isAgentList
    ? (getAgentPreset(firstTerminal.agentPreset!)?.name || 'Agent')
    : 'Terminals'

  // Collapsed state - show icon bar
  if (collapsed) {
    return (
      <div
        className="collapsed-bar collapsed-bar-bottom"
        onClick={onCollapse}
        title="Expand Thumbnails"
      >
        <div className="collapsed-bar-icon">🖼️</div>
        <span className="collapsed-bar-label">{label}</span>
      </div>
    )
  }

  const style = height ? { height: `${height}px`, flex: 'none' } : undefined

  return (
    <div className="thumbnail-bar" style={style}>
      <div className="thumbnail-bar-header">
        <span>{label}</span>
        <div className="thumbnail-bar-actions">
          {onAddTerminal && (
            <button className="thumbnail-add-btn" onClick={onAddTerminal} title="Add Terminal">
              +
            </button>
          )}
          {onCollapse && (
            <button className="thumbnail-collapse-btn" onClick={onCollapse} title="Collapse Panel">
              ▼
            </button>
          )}
        </div>
      </div>
      <div className="thumbnail-list">
        {terminals.map(terminal => (
          <TerminalThumbnail
            key={terminal.id}
            terminal={terminal}
            isActive={terminal.id === focusedTerminalId}
            onClick={() => onFocus(terminal.id)}
          />
        ))}
      </div>
    </div>
  )
}
