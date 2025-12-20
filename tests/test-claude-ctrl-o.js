/**
 * 測試 Claude 的 Ctrl+O 思考過程顯示功能
 */

const { create } = require('./console-controller')
const path = require('path')

async function main() {
  const testWorkspace = path.join(__dirname, 'testworkspace')

  console.log('='.repeat(60))
  console.log('測試 Claude Ctrl+O 思考過程顯示')
  console.log('='.repeat(60))
  console.log(`工作目錄: ${testWorkspace}`)
  console.log('')

  const term = create({ cwd: testWorkspace })

  // 監聽輸出
  term.on('output', (text) => {
    process.stdout.write(text)
  })

  try {
    console.log('[Test] 啟動終端機...')
    await term.start()
    await term.wait(1000)

    console.log('\n[Test] 啟動 claude...')
    term.sendLine('claude')

    // 等待 claude 啟動
    console.log('[Test] 等待 claude 啟動...')
    await term.wait(3000)

    console.log('\n[Test] 發送問題: 請印出九九乘法表')
    term.sendLine('請印出九九乘法表')

    // 等待回應
    console.log('[Test] 等待 claude 回應...')
    await term.wait(15000)

    // 清除緩衝區以便觀察 Ctrl+O 的輸出
    const beforeCtrlO = term.getOutput()
    term.clearOutput()

    console.log('\n[Test] 發送 Ctrl+O 查看思考過程...')
    term.sendCtrl('o')

    // 等待思考過程顯示
    await term.wait(3000)

    const afterCtrlO = term.getOutput()

    console.log('\n' + '='.repeat(60))
    console.log('Ctrl+O 後的輸出:')
    console.log('='.repeat(60))
    console.log(afterCtrlO || '(空白 - 沒有輸出)')
    console.log('='.repeat(60))

    if (afterCtrlO && afterCtrlO.trim().length > 0) {
      console.log('\n[結果] ✅ Ctrl+O 有輸出內容')
    } else {
      console.log('\n[結果] ❌ Ctrl+O 輸出為空白')
    }

    // 退出 claude
    console.log('\n[Test] 發送 /exit 退出 claude...')
    term.sendLine('/exit')
    await term.wait(2000)

  } catch (error) {
    console.error('\n[Error]', error.message)
  } finally {
    console.log('\n[Test] 關閉終端機...')
    term.close()
    console.log('[Test] 測試完成')
  }
}

main().catch(console.error)
