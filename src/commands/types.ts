import { Context } from 'koishi'

const EVENT_CONFIG = {
  star: ['⭐', 'Star 事件'],
  push: ['🚀', '代码推送'],
  workflow_run: ['⚙️', '工作流'],
  issues: ['📝', 'Issue 操作'],
  pull_request: ['🔀', 'PR 操作'],
  release: ['🏷️', '版本发布'],
  issue_comment: ['💬', 'Issue 评论'],
  fork: ['⑂', '仓库 Fork'],
  watch: ['👀', '仓库关注']
} as const

const SUPPORTED_EVENTS = Object.keys(EVENT_CONFIG)

export function typesCommand(ctx: Context) {
  ctx.command('wh-types', '支持的事件类型')
    .alias('github事件')
    .action(({ session }) => {
      const content = SUPPORTED_EVENTS.map(type => {
        const [emoji, desc] = EVENT_CONFIG[type]
        return `${emoji} ${type.padEnd(12)} ${desc}`
      }).join('\n')

      session.send([
        '📋 支持的事件类型列表',
        '══════════════════════',
        content,
        '══════════════════════',
        '注：事件类型名为接收 webhook 时使用的标识'
      ].join('\n'))
    })
}
