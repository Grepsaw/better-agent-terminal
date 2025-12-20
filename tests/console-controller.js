/**
 * Console Controller
 * 可程式化控制的終端機，支援自動化測試
 *
 * 使用方式:
 *   const controller = require('./console-controller')
 *   const term = controller.create({ cwd: './testworkspace' })
 *   await term.send('claude\n')
 *   await term.wait(1000)
 *   await term.send('請印出九九乘法表\n')
 *   await term.sendCtrl('o')  // Ctrl+O
 *   const output = term.getOutput()
 *   term.close()
 */

const { spawn } = require('child_process')
const fs = require('fs')
const EventEmitter = require('events')

class ConsoleController extends EventEmitter {
  constructor(options = {}) {
    super()
    this.cwd = options.cwd || process.cwd()
    this.shell = options.shell || this.getDefaultShell()
    this.process = null
    this.outputBuffer = ''
    this.outputLines = []
    this.isRunning = false
  }

  getDefaultShell() {
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
      return process.env.SHELL || '/bin/bash'
    }
  }

  start() {
    return new Promise((resolve, reject) => {
      let args = []
      if (this.shell.includes('powershell') || this.shell.includes('pwsh')) {
        args = ['-ExecutionPolicy', 'Bypass', '-NoLogo', '-NoExit']
      }

      const env = {
        ...process.env,
        LANG: 'en_US.UTF-8',
        LC_ALL: 'en_US.UTF-8',
        PYTHONIOENCODING: 'utf-8',
        PYTHONUTF8: '1',
        TERM: 'xterm-256color'
      }

      this.process = spawn(this.shell, args, {
        cwd: this.cwd,
        env,
        stdio: ['pipe', 'pipe', 'pipe']
      })

      this.isRunning = true

      this.process.stdout.on('data', (data) => {
        const text = data.toString()
        this.outputBuffer += text
        this.outputLines.push({ type: 'stdout', text, time: Date.now() })
        this.emit('stdout', text)
        this.emit('output', text)
      })

      this.process.stderr.on('data', (data) => {
        const text = data.toString()
        this.outputBuffer += text
        this.outputLines.push({ type: 'stderr', text, time: Date.now() })
        this.emit('stderr', text)
        this.emit('output', text)
      })

      this.process.on('exit', (code) => {
        this.isRunning = false
        this.emit('exit', code)
      })

      this.process.on('error', (err) => {
        this.isRunning = false
        this.emit('error', err)
        reject(err)
      })

      // 等待 shell 啟動
      setTimeout(() => resolve(this), 500)
    })
  }

  /**
   * 發送文字到終端機
   */
  send(text) {
    if (this.process && this.process.stdin) {
      this.process.stdin.write(text)
    }
    return this
  }

  /**
   * 發送一行指令（自動加換行）
   */
  sendLine(command) {
    return this.send(command + '\n')
  }

  /**
   * 發送控制字符 (a-z)
   * 例如: sendCtrl('c') 發送 Ctrl+C, sendCtrl('o') 發送 Ctrl+O
   */
  sendCtrl(char) {
    const code = char.toLowerCase().charCodeAt(0) - 96 // 'a' = 1, 'b' = 2, ...
    if (code >= 1 && code <= 26) {
      this.send(String.fromCharCode(code))
    }
    return this
  }

  /**
   * 發送 Enter 鍵
   */
  sendEnter() {
    return this.send('\n')
  }

  /**
   * 發送 Escape 鍵
   */
  sendEscape() {
    return this.send('\x1b')
  }

  /**
   * 等待指定毫秒
   */
  wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 等待輸出包含指定文字
   */
  waitFor(text, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const check = () => {
        if (this.outputBuffer.includes(text)) {
          resolve(this.outputBuffer)
          return
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for: ${text}`))
          return
        }
        setTimeout(check, 100)
      }

      check()
    })
  }

  /**
   * 等待輸出匹配正則表達式
   */
  waitForMatch(regex, timeout = 30000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now()

      const check = () => {
        const match = this.outputBuffer.match(regex)
        if (match) {
          resolve(match)
          return
        }
        if (Date.now() - startTime > timeout) {
          reject(new Error(`Timeout waiting for pattern: ${regex}`))
          return
        }
        setTimeout(check, 100)
      }

      check()
    })
  }

  /**
   * 取得所有輸出
   */
  getOutput() {
    return this.outputBuffer
  }

  /**
   * 取得輸出行列表
   */
  getOutputLines() {
    return this.outputLines
  }

  /**
   * 清除輸出緩衝區
   */
  clearOutput() {
    this.outputBuffer = ''
    this.outputLines = []
    return this
  }

  /**
   * 關閉終端機
   */
  close() {
    if (this.process) {
      this.process.kill()
      this.isRunning = false
    }
  }
}

/**
 * 建立控制器
 */
function create(options = {}) {
  return new ConsoleController(options)
}

module.exports = {
  ConsoleController,
  create
}
