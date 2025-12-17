import { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import '@xterm/xterm/css/xterm.css'

interface TerminalPanelProps {
  terminalId: string
}

export function TerminalPanel({ terminalId }: TerminalPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create terminal instance
    const terminal = new Terminal({
      theme: {
        background: '#1e1e1e',
        foreground: '#cccccc',
        cursor: '#ffffff',
        cursorAccent: '#000000',
        selectionBackground: '#264f78',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5'
      },
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      cursorBlink: true,
      scrollback: 10000,
      convertEol: true
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(containerRef.current)
    fitAddon.fit()

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Handle terminal input
    terminal.onData((data) => {
      window.electronAPI.pty.write(terminalId, data)
    })

    // Handle copy with Ctrl+Shift+C or selection
    terminal.attachCustomKeyEventHandler((event) => {
      // Ctrl+Shift+C for copy
      if (event.ctrlKey && event.shiftKey && event.key === 'C') {
        const selection = terminal.getSelection()
        if (selection) {
          navigator.clipboard.writeText(selection)
        }
        return false
      }
      // Ctrl+Shift+V for paste
      if (event.ctrlKey && event.shiftKey && event.key === 'V') {
        navigator.clipboard.readText().then((text) => {
          window.electronAPI.pty.write(terminalId, text)
        })
        return false
      }
      return true
    })

    // Right-click context menu for copy/paste
    containerRef.current.addEventListener('contextmenu', async (e) => {
      e.preventDefault()
      const selection = terminal.getSelection()
      if (selection) {
        await navigator.clipboard.writeText(selection)
      } else {
        const text = await navigator.clipboard.readText()
        if (text) {
          window.electronAPI.pty.write(terminalId, text)
        }
      }
    })

    // Handle terminal output
    const unsubscribeOutput = window.electronAPI.pty.onOutput((id, data) => {
      if (id === terminalId) {
        terminal.write(data)
      }
    })

    // Handle terminal exit
    const unsubscribeExit = window.electronAPI.pty.onExit((id, exitCode) => {
      if (id === terminalId) {
        terminal.write(`\r\n\x1b[90m[Process exited with code ${exitCode}]\x1b[0m\r\n`)
      }
    })

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
      const { cols, rows } = terminal
      window.electronAPI.pty.resize(terminalId, cols, rows)
    })
    resizeObserver.observe(containerRef.current)

    // Initial resize
    setTimeout(() => {
      fitAddon.fit()
      const { cols, rows } = terminal
      window.electronAPI.pty.resize(terminalId, cols, rows)
    }, 100)

    return () => {
      unsubscribeOutput()
      unsubscribeExit()
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [terminalId])

  return <div ref={containerRef} className="terminal-panel" />
}
