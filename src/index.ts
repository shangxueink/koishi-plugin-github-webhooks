import { Context, Schema } from 'koishi'
import { applyDatabase } from './database'
import { applyCommands } from './commands'
import { setupEventListeners } from './event-listener'

export const name = 'github-webhooks'
export const inject = { required: ['database'] }
export const usage = `
---
本插件无需配置，请使用交互式命令进行订阅管理

-> 依赖 adapter-github 适配器接收事件,请先安装并配置 adapter-github

开启本插件后，在对应群组交互指令，即可进行订阅管理

---`

export interface PluginConfig { }

export const Config: Schema<PluginConfig> = Schema.object({}).description('')

export function apply(ctx: Context, config: PluginConfig) {
  // 初始化数据库
  applyDatabase(ctx);

  // 注册指令
  applyCommands(ctx)

  // 监听 adapter-github 的事件
  setupEventListeners(ctx)
}
