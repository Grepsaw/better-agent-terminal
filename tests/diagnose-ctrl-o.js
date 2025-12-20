/**
 * Claude Code Ctrl+O 診斷工具
 *
 * 診斷 Ctrl+O 思考過程顯示功能是否正常運作
 *
 * 使用方式:
 *   npx electron tests/diagnose-ctrl-o.js
 *   npx electron tests/diagnose-ctrl-o.js --quick     # 快速測試
 *   npx electron tests/diagnose-ctrl-o.js --verbose   # 詳細輸出
 */

const { app } = require('electron')
const path = require('path')
const fs = require('fs')

// 解析命令列參數
const args = process.argv.slice(2)
const QUICK_MODE = args.includes('--quick')
const VERBOSE = args.includes('--verbose')

// 配置
const CONFIG = {
  testQuestion: '請印出九九乘法表',
  waitForClaude: QUICK_MODE ? 30000 : 90000,
  waitAfterResponse: QUICK_MODE ? 3000 : 5000,
  waitAfterCtrlO: 5000,
  termCols: 120,
  termRows: 30
}

// 診斷結果
const diagnosis = {
  timestamp: new Date().toISOString(),
  environment: {},
  tests: [],
  ctrlOResult: null,
  recommendations: []
}

function log(msg, level = 'info') {
  const prefix = {
    info: '  ',
    success: '✓ ',
    warning: '⚠ ',
    error: '✗ ',
    step: '→ '
  }[level] || '  '
  console.log(prefix + msg)
}

function logVerbose(msg) {
  if (VERBOSE) console.log('    ' + msg)
}

app.whenReady().then(async () => {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║         Claude Code Ctrl+O 診斷工具                          ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')

  // 步驟 1: 環境檢查
  console.log('【1/5】環境檢查')
  console.log('─'.repeat(50))
  await checkEnvironment()
  console.log('')

  // 步驟 2: 載入 node-pty
  console.log('【2/5】PTY 模組檢查')
  console.log('─'.repeat(50))
  const pty = await checkPty()
  if (!pty) {
    printDiagnosis()
    app.quit()
    return
  }
  console.log('')

  // 步驟 3: 啟動終端機和 Claude
  console.log('【3/5】啟動 Claude Code')
  console.log('─'.repeat(50))
  const term = await startTerminal(pty)
  if (!term) {
    printDiagnosis()
    app.quit()
    return
  }
  console.log('')

  // 步驟 4: 發送測試問題
  console.log('【4/5】測試 Claude 回應')
  console.log('─'.repeat(50))
  const responseOk = await testClaudeResponse(term)
  console.log('')

  // 步驟 5: 測試 Ctrl+O
  console.log('【5/5】測試 Ctrl+O 思考過程')
  console.log('─'.repeat(50))
  await testCtrlO(term)
  console.log('')

  // 清理
  await cleanup(term)

  // 輸出診斷結果
  printDiagnosis()

  // 儲存診斷報告
  saveDiagnosisReport()

  app.quit()
})

async function checkEnvironment() {
  diagnosis.environment = {
    platform: process.platform,
    nodeVersion: process.versions.node,
    electronVersion: process.versions.electron,
    term: process.env.TERM || '(未設定)',
    shell: getDefaultShell(),
    cwd: process.cwd()
  }

  log(`平台: ${diagnosis.environment.platform}`, 'info')
  log(`Node.js: ${diagnosis.environment.nodeVersion}`, 'info')
  log(`Electron: ${diagnosis.environment.electronVersion}`, 'info')
  log(`TERM: ${diagnosis.environment.term}`, 'info')
  log(`Shell: ${diagnosis.environment.shell}`, 'info')

  diagnosis.tests.push({
    name: '環境檢查',
    passed: true,
    details: diagnosis.environment
  })
}

async function checkPty() {
  let pty = null
  try {
    pty = require('node-pty')
    if (pty && typeof pty.spawn === 'function') {
      log('node-pty 已載入', 'success')
      diagnosis.tests.push({
        name: 'node-pty 載入',
        passed: true
      })
      return pty
    }
  } catch (e) {
    log('node-pty 載入失敗: ' + e.message, 'error')
    diagnosis.tests.push({
      name: 'node-pty 載入',
      passed: false,
      error: e.message
    })
    diagnosis.recommendations.push('需要為 Electron 重新編譯 node-pty: npx @electron/rebuild -m node_modules/node-pty')
    return null
  }
}

async function startTerminal(pty) {
  const shell = getDefaultShell()
  const args = getShellArgs(shell)
  const testWorkspace = path.join(__dirname, 'testworkspace')

  // 確保測試目錄存在
  if (!fs.existsSync(testWorkspace)) {
    fs.mkdirSync(testWorkspace, { recursive: true })
  }

  log(`啟動終端機: ${shell}`, 'step')
  logVerbose(`工作目錄: ${testWorkspace}`)
  logVerbose(`終端機大小: ${CONFIG.termCols}x${CONFIG.termRows}`)

  try {
    const term = {
      pty: pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: CONFIG.termCols,
        rows: CONFIG.termRows,
        cwd: testWorkspace,
        env: {
          ...process.env,
          // UTF-8 encoding
          LANG: 'en_US.UTF-8',
          LC_ALL: 'en_US.UTF-8',
          // Terminal capabilities - let Claude know we are a real PTY
          TERM: 'xterm-256color',
          COLORTERM: 'truecolor',
          TERM_PROGRAM: 'better-terminal',
          TERM_PROGRAM_VERSION: '1.0',
          FORCE_COLOR: '3',
          CI: ''
        }
      }),
      output: '',
      rawChunks: []
    }

    term.pty.onData((data) => {
      term.output += data
      term.rawChunks.push({
        time: Date.now(),
        data: data,
        length: data.length
      })
    })

    await sleep(2000)
    log('終端機已啟動', 'success')

    // 啟動 claude
    log('啟動 claude...', 'step')
    term.pty.write('claude\r')
    await sleep(8000)

    // 檢查 claude 是否啟動
    if (term.output.includes('Claude Code')) {
      log('Claude Code 已啟動', 'success')
      diagnosis.tests.push({
        name: 'Claude Code 啟動',
        passed: true
      })
      return term
    } else {
      log('Claude Code 啟動失敗', 'error')
      diagnosis.tests.push({
        name: 'Claude Code 啟動',
        passed: false,
        details: '未偵測到 Claude Code 介面'
      })
      diagnosis.recommendations.push('確認 claude 命令可用: claude --version')
      return null
    }
  } catch (e) {
    log('終端機啟動失敗: ' + e.message, 'error')
    diagnosis.tests.push({
      name: '終端機啟動',
      passed: false,
      error: e.message
    })
    return null
  }
}

async function testClaudeResponse(term) {
  const outputBefore = term.output.length

  log(`發送問題: "${CONFIG.testQuestion}"`, 'step')
  term.pty.write(CONFIG.testQuestion)
  await sleep(500)
  term.pty.write('\r')

  log('等待 Claude 回應...', 'step')

  let waited = 0
  let found = false
  while (waited < CONFIG.waitForClaude) {
    await sleep(5000)
    waited += 5000

    const newOutput = term.output.substring(outputBefore)
    const hasResponse = newOutput.includes('81') ||
                       newOutput.includes('1x1') ||
                       newOutput.includes('1×1') ||
                       newOutput.length > 5000

    logVerbose(`${waited/1000}s: 新增 ${newOutput.length} bytes`)

    if (hasResponse) {
      log(`收到回應 (${waited/1000}s, ${newOutput.length} bytes)`, 'success')
      found = true
      await sleep(CONFIG.waitAfterResponse)
      break
    }
  }

  if (!found) {
    log('等待回應超時', 'warning')
    diagnosis.tests.push({
      name: 'Claude 回應',
      passed: false,
      details: '等待回應超時'
    })
    diagnosis.recommendations.push('確認網路連線正常')
    diagnosis.recommendations.push('確認 Claude API 可用')
    return false
  }

  diagnosis.tests.push({
    name: 'Claude 回應',
    passed: true,
    details: `收到 ${term.output.length - outputBefore} bytes 回應`
  })
  return true
}

async function testCtrlO(term) {
  const outputBefore = term.output.length
  term.rawChunks = [] // 清空以追蹤新輸出

  log('發送 Ctrl+O...', 'step')
  const ctrlO = String.fromCharCode(15)
  term.pty.write(ctrlO)

  await sleep(CONFIG.waitAfterCtrlO)

  const ctrlOOutput = term.output.substring(outputBefore)
  const newChunks = term.rawChunks.length

  log(`收到 ${ctrlOOutput.length} bytes, ${newChunks} chunks`, 'info')

  // 分析輸出
  const analysis = analyzeCtrlOOutput(ctrlOOutput)
  diagnosis.ctrlOResult = analysis

  if (analysis.hasThinking) {
    log('思考過程顯示正常', 'success')
    diagnosis.tests.push({
      name: 'Ctrl+O 思考過程',
      passed: true,
      details: analysis
    })
  } else if (analysis.hasToggleMessage) {
    log('Ctrl+O 有回應，但思考內容為空', 'warning')
    diagnosis.tests.push({
      name: 'Ctrl+O 思考過程',
      passed: false,
      details: '有 toggle 訊息但無思考內容'
    })
    diagnosis.recommendations.push('思考過程可能沒有被記錄')
    diagnosis.recommendations.push('確認使用的模型支援 extended thinking')
  } else {
    log('Ctrl+O 沒有回應', 'error')
    diagnosis.tests.push({
      name: 'Ctrl+O 思考過程',
      passed: false,
      details: 'Ctrl+O 沒有任何回應'
    })
    diagnosis.recommendations.push('檢查終端機環境設定')
    diagnosis.recommendations.push('確認使用真正的 PTY (node-pty)')
  }

  // 儲存原始輸出供分析
  const logFile = path.join(__dirname, 'ctrl-o-diagnosis.json')
  fs.writeFileSync(logFile, JSON.stringify({
    ctrlOOutput,
    analysis,
    rawChunks: term.rawChunks.slice(-20)
  }, null, 2))
  logVerbose(`原始資料已儲存: ${logFile}`)
}

function analyzeCtrlOOutput(output) {
  // 清理 ANSI codes
  const cleaned = output
    .replace(/\x1b\[[0-9;]*[A-Za-z]/g, '')
    .replace(/\x1b\][^\x07]*\x07/g, '')
    .replace(/[\x00-\x1f]/g, ' ')
    .trim()

  // 檢查各種標記
  const hasToggleMessage = output.includes('Showing detailed transcript') ||
                          output.includes('ctrl+o to toggle')
  const hasThinking = cleaned.includes('Thinking') ||
                     cleaned.includes('thinking') ||
                     cleaned.includes('∴')
  const hasContent = cleaned.length > 500

  // 分析 ANSI 命令
  const ansiPattern = /\x1b\[([0-9;]*)?([A-Za-z])/g
  const commands = {}
  let match
  while ((match = ansiPattern.exec(output)) !== null) {
    const cmd = match[2]
    commands[cmd] = (commands[cmd] || 0) + 1
  }

  return {
    hasToggleMessage,
    hasThinking,
    hasContent,
    cleanedLength: cleaned.length,
    ansiCommands: commands,
    thinkingExcerpt: hasThinking ? extractThinking(cleaned) : null
  }
}

function extractThinking(text) {
  // 嘗試提取思考過程的片段
  const thinkingStart = text.indexOf('Thinking')
  if (thinkingStart === -1) return null

  const excerpt = text.substring(thinkingStart, thinkingStart + 500)
  return excerpt.trim()
}

async function cleanup(term) {
  if (term && term.pty) {
    log('清理中...', 'step')
    term.pty.write('\x1b') // Escape
    await sleep(300)
    term.pty.write('/exit\r')
    await sleep(2000)
    term.pty.write('exit\r')
    await sleep(1000)
    term.pty.kill()
  }
}

function printDiagnosis() {
  console.log('')
  console.log('╔══════════════════════════════════════════════════════════════╗')
  console.log('║                     診斷結果                                 ║')
  console.log('╚══════════════════════════════════════════════════════════════╝')
  console.log('')

  // 測試結果摘要
  const passed = diagnosis.tests.filter(t => t.passed).length
  const total = diagnosis.tests.length

  console.log(`測試結果: ${passed}/${total} 通過`)
  console.log('')

  for (const test of diagnosis.tests) {
    const icon = test.passed ? '✓' : '✗'
    const status = test.passed ? '通過' : '失敗'
    console.log(`  ${icon} ${test.name}: ${status}`)
    if (!test.passed && test.details) {
      console.log(`      ${typeof test.details === 'string' ? test.details : JSON.stringify(test.details)}`)
    }
  }

  // Ctrl+O 分析
  if (diagnosis.ctrlOResult) {
    console.log('')
    console.log('Ctrl+O 分析:')
    console.log(`  Toggle 訊息: ${diagnosis.ctrlOResult.hasToggleMessage ? '有' : '無'}`)
    console.log(`  思考內容: ${diagnosis.ctrlOResult.hasThinking ? '有' : '無'}`)
    console.log(`  輸出長度: ${diagnosis.ctrlOResult.cleanedLength} 字元`)

    if (diagnosis.ctrlOResult.thinkingExcerpt) {
      console.log('')
      console.log('思考過程摘錄:')
      console.log('─'.repeat(50))
      console.log(diagnosis.ctrlOResult.thinkingExcerpt.substring(0, 300))
      console.log('─'.repeat(50))
    }
  }

  // 建議
  if (diagnosis.recommendations.length > 0) {
    console.log('')
    console.log('建議:')
    for (const rec of diagnosis.recommendations) {
      console.log(`  → ${rec}`)
    }
  }

  // 最終結論
  console.log('')
  const allPassed = diagnosis.tests.every(t => t.passed)
  if (allPassed) {
    console.log('結論: ✓ Ctrl+O 功能正常運作')
  } else if (diagnosis.ctrlOResult?.hasToggleMessage) {
    console.log('結論: ⚠ Ctrl+O 有回應但思考內容為空')
  } else {
    console.log('結論: ✗ Ctrl+O 功能異常')
  }
  console.log('')
}

function saveDiagnosisReport() {
  const reportPath = path.join(__dirname, 'diagnosis-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(diagnosis, null, 2))
  console.log(`診斷報告已儲存: ${reportPath}`)
}

// 輔助函數
function getDefaultShell() {
  if (process.platform === 'win32') {
    const pwshPaths = [
      'C:\\Program Files\\PowerShell\\7\\pwsh.exe',
      'C:\\Program Files (x86)\\PowerShell\\7\\pwsh.exe'
    ]
    for (const p of pwshPaths) {
      if (fs.existsSync(p)) return p
    }
    return 'powershell.exe'
  }
  return process.env.SHELL || '/bin/bash'
}

function getShellArgs(shell) {
  if (shell.includes('pwsh') || shell.includes('powershell')) {
    return ['-ExecutionPolicy', 'Bypass', '-NoLogo']
  }
  return []
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}
