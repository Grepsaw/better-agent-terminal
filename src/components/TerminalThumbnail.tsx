import { useEffect, useState } from 'react'
import type { TerminalInstance } from '../types'

interface TerminalThumbnailProps {
  terminal: TerminalInstance
  isActive: boolean
  onClick: () => void
}

export function TerminalThumbnail({ terminal, isActive, onClick }: TerminalThumbnailProps) {
  const [preview, setPreview] = useState<string>('')
  const isClaudeCode = terminal.type === 'claude-code'

  useEffect(() => {
    // Listen for terminal output to update preview
    const unsubscribe = window.electronAPI.pty.onOutput((id, data) => {
      if (id === terminal.id) {
        // Keep last few lines for preview
        setPreview(prev => {
          const combined = prev + data
          const lines = combined.split('\n').slice(-6)
          return lines.join('\n')
        })
      }
    })

    return unsubscribe
  }, [terminal.id])

  return (
    <div
      className={`thumbnail ${isActive ? 'active' : ''} ${isClaudeCode ? 'claude-code' : ''}`}
      onClick={onClick}
    >
      <div className="thumbnail-header">
        <div className={`thumbnail-title ${isClaudeCode ? 'claude-code' : ''}`}>
          {isClaudeCode && <span>✦</span>}
          <span>{terminal.title}</span>
        </div>
      </div>
      <div className="thumbnail-preview">
        {preview || '$ _'}
      </div>
    </div>
  )
}
