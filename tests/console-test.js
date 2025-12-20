/**
 * Console Test Mode
 * 直接在控制台連線終端機，可以看到 PTY 的輸出並進行互動
 *
 * 使用方式:
 *   node tests/console-test.js
 *   node tests/console-test.js [工作目錄路徑]
 */

const { spawn } = require('child_process')
const readline = require('readline')
const fs = require('fs')
const path = require('path')

// 嘗試載入 node-pty
let pty = null
let ptyAvailable = false

// 注意: node-pty 可能是為 Electron 編譯的，在純 Node.js 環境下可能無法使用
// 這個測試腳本預設使用 child_process，除非設定 USE_PTY=1
if (process.env.USE_PTY === '1') {
  try {
    pty = require('node-pty')
    if (pty && typeof pty.spawn === 'function') {
      ptyAvailable = true
      console.log('[Console Test] node-pty 已載入（需要 rebuild 才能在 Node.js 使用）')
    }
  } catch (e) {
    console.log('[Console Test] node-pty 不可用，使用 child_process 替代')
  }
} else {
  console.log('[Console Test] 使用 child_process 模式（設定 USE_PTY=1 嘗試使用 node-pty）')
}

function getDefaultShell() {
  if (process.platform === 'win32') {
    const pwshPaths = [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe',
      (process.env.LOCALAPPDATA || '') + '\\Microsoft\\WindowsApps\\pwsh.exe'
    ]
    for (const p of pwshPaths) {
      if (fs.existsSync(p)) {
        return p
      }
    }
    return 'powershell.exe'
  } else if (process.platform === 'darwin') {
    return process.env.SHELL || '/bin/zsh'
  } else {
    if (process.env.SHELL) {
      return process.env.SHELL
    } else if (fs.existsSync('/bin/bash')) {
      return '/bin/bash'
    } else {
      return '/bin/sh'
    }
  }
}

class ConsoleTerminal {
  constructor() {
    this.usePty = ptyAvailable
    this.process = null
    this.rl = null
  }

  start(cwd = process.cwd()) {
    const shell = getDefaultShell()
    let args = []

    if (shell.includes('powershell') || shell.includes('pwsh')) {
      args = ['-ExecutionPolicy', 'Bypass', '-NoLogo']
    }

    console.log(`\n[Console Test] 啟動終端機`)
    console.log(`[Console Test] Shell: ${shell}`)
    console.log(`[Console Test] 工作目錄: ${cwd}`)
    console.log(`[Console Test] 模式: ${this.usePty ? 'node-pty' : 'child_process'}`)
    console.log(`[Console Test] 輸入 'exit' 或按 Ctrl+C 離開`)
    console.log('─'.repeat(60))

    const envWithUtf8 = {
      ...process.env,
      LANG: 'en_US.UTF-8',
      LC_ALL: 'en_US.UTF-8',
      PYTHONIOENCODING: 'utf-8',
      PYTHONUTF8: '1'
    }

    if (this.usePty && pty) {
      this.startWithPty(shell, args, cwd, envWithUtf8)
    } else {
      this.startWithChildProcess(shell, args, cwd, envWithUtf8)
    }

    this.setupInput()
  }

  startWithPty(shell, args, cwd, env) {
    this.process = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: process.stdout.columns || 120,
      rows: process.stdout.rows || 30,
      cwd,
      env
    })

    this.process.onData((data) => {
      process.stdout.write(data)
    })

    this.process.onExit(({ exitCode }) => {
      console.log(`\n[Console Test] 終端機已退出，退出碼: ${exitCode}`)
      process.exit(exitCode)
    })

    // 監聽終端機大小變化
    process.stdout.on('resize', () => {
      if (this.process && this.usePty) {
        this.process.resize(process.stdout.columns, process.stdout.rows)
      }
    })
  }

  startWithChildProcess(shell, args, cwd, env) {
    let shellArgs = [...args]
    if (shell.includes('powershell') || shell.includes('pwsh')) {
      shellArgs.push(
        '-NoExit',
        '-Command',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8'
      )
    }

    this.process = spawn(shell, shellArgs, {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false
    })

    this.process.stdout.on('data', (data) => {
      process.stdout.write(data.toString())
    })

    this.process.stderr.on('data', (data) => {
      process.stderr.write(data.toString())
    })

    this.process.on('exit', (exitCode) => {
      console.log(`\n[Console Test] 終端機已退出，退出碼: ${exitCode ?? 0}`)
      process.exit(exitCode ?? 0)
    })

    this.process.on('error', (error) => {
      console.error(`[Console Test] 錯誤: ${error.message}`)
    })
  }

  setupInput() {
    if (this.usePty && pty) {
      // PTY 模式：直接傳送原始輸入
      if (process.stdin.isTTY) {
        process.stdin.setRawMode(true)
      }
      process.stdin.resume()
      process.stdin.on('data', (data) => {
        // Ctrl+C 處理
        if (data.length === 1 && data[0] === 3) {
          this.process.write('\x03')
        } else {
          this.process.write(data.toString())
        }
      })
    } else {
      // child_process 模式：使用 readline
      this.rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false
      })

      this.rl.on('line', (line) => {
        this.process.stdin.write(line + '\n')
      })

      this.rl.on('close', () => {
        this.process.stdin.end()
      })
    }
  }

  write(data) {
    if (this.usePty) {
      this.process.write(data)
    } else {
      this.process.stdin.write(data)
    }
  }

  kill() {
    if (this.process) {
      this.process.kill()
    }
  }
}

// 主程式
const terminal = new ConsoleTerminal()

// 處理 Ctrl+C
process.on('SIGINT', () => {
  console.log('\n[Console Test] 收到 SIGINT，正在關閉...')
  terminal.kill()
  process.exit(0)
})

// 啟動終端機
const cwd = process.argv[2] || process.cwd()
terminal.start(cwd)
