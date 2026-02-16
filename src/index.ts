import { Context, Schema } from 'koishi'
import { applyDatabase } from './database'
import { applyCommands } from './commands'
import { setupEventListeners } from './event-listener'

export const name = 'github-webhooks'
export const inject = { required: ['database'] }

/**
 * 仓库配置
 */
export interface RepositoryConfig {
  repo: string
  enableWatch: boolean
  enableUnknownEvent: boolean
}

/**
 * 插件配置
 */
export interface PluginConfig {
  repositories: RepositoryConfig[]
}

/**
 * 插件配置
 */
export const Config: Schema<PluginConfig> = Schema.object({
  repositories: Schema.array(
    Schema.object({
      repo: Schema.string()
        .required()
        .description(`仓库全名，例如 owner/repo`),

      enableWatch: Schema.boolean()
        .default(false)
        .description('是否启用 Watch 事件推送'),

      enableUnknownEvent: Schema.boolean()
        .default(false)
        .description('是否推送未知事件消息'),
    })
  ).description(`监听的仓库列表<br>-> 本插件依赖 adapter-github 适配器接收事件<br>-> 请先安装并配置 adapter-github`).default([]),
})

export function apply(ctx: Context, config: PluginConfig) {
  // 初始化数据库
  applyDatabase(ctx);

  // 注册指令
  applyCommands(ctx, config)

  // 监听 adapter-github 的事件
  setupEventListeners(ctx, config)
}
