import { Context } from 'koishi'
import { TABLES_SUBSCRIBERS } from '../database'
import { EVENT_CONFIG, SUPPORTED_EVENTS } from '../utils'

/**
 * 交互式选择事件类型
 * @param session 会话对象
 * @returns 选择的事件列表，如果选择全部则返回 'all'
 */
async function promptEventSelection(session: any): Promise<string> {
  // 构建事件列表
  const eventList = ['0. 全部事件'];
  SUPPORTED_EVENTS.forEach((eventKey, index) => {
    const [emoji, desc] = EVENT_CONFIG[eventKey];
    eventList.push(`${index + 1}. ${emoji} ${desc} (${eventKey})`);
  });

  const message = [
    '请选择要订阅的事件：',
    ...eventList,
    '',
    '如需订阅多个指定事件，请使用【数字+空格/全角逗号/半角逗号+数字】的形式',
    '例如：【1 2 3】或【1,2,3】或【1，2，3】',
    '直接回复 0 或不输入（30秒超时）则订阅全部事件'
  ].join('\n');

  await session.send(message);

  // 等待用户输入
  const userInput = await session.prompt(30000);

  // 超时或未输入，默认订阅全部
  if (!userInput || userInput.trim() === '' || userInput.trim() === '0') {
    return 'all';
  }

  // 解析用户输入
  const selectedIndices = userInput
    .split(/[\s,，]+/)
    .map(s => s.trim())
    .filter(s => s !== '')
    .map(s => parseInt(s))
    .filter(n => !isNaN(n) && n > 0 && n <= SUPPORTED_EVENTS.length);

  if (selectedIndices.length === 0) {
    await session.send('未识别到有效的事件选择，默认订阅全部事件');
    return 'all';
  }

  // 转换为事件名称
  const selectedEvents = selectedIndices.map(i => SUPPORTED_EVENTS[i - 1]);
  return selectedEvents.join(',');
}

export function subscribeCommand(ctx: Context) {
  ctx.command('github.sub <owner:string> <repo:string>', '订阅指定 GitHub 仓库事件推送')
    .alias('github.仓库订阅')
    .usage('例如：github.sub owner repo')
    .example('github.sub koishijs koishi')
    .action(async ({ session }, owner?: string, repo?: string) => {
      // 检查参数
      if (!owner || !repo) {
        await session.send('请提供仓库所有者和仓库名称\n使用方法：github.sub owner repo\n例如：github.sub koishijs koishi');
        return;
      }

      // 确定订阅目标、平台和类型
      const target = session.guildId || session.userId || session.channelId;
      if (!target) {
        await session.send('无法识别订阅目标，请在群聊、私聊或频道中使用此命令。');
        return;
      }

      const platform = session.platform;
      const type = session.guildId ? 'group' : (session.userId ? 'user' : 'channel');
      const repoFullName = `${owner}/${repo}`;
      const selfId = session.selfId;
      const channelId = session.channelId;

      // 检查订阅是否已存在
      const exists = await ctx.database.get(TABLES_SUBSCRIBERS, { platform, target, repo: repoFullName });
      if (exists.length) {
        await session.send(`当前已订阅仓库 ${repoFullName}\n如需修改订阅事件，请使用 github.reset 命令`);
        return;
      }

      // 交互式选择事件
      const events = await promptEventSelection(session);

      // 创建订阅
      await ctx.database.create(TABLES_SUBSCRIBERS, {
        platform,
        target,
        repo: repoFullName,
        type,
        events,
        selfId,
        channelId
      });

      const eventDesc = events === 'all' ? '全部事件' : events.split(',').map(e => {
        const [emoji, desc] = EVENT_CONFIG[e] || ['', e];
        return `${emoji}${desc}`;
      }).join('、');

      await session.send(`✅ 订阅成功！\n仓库：${repoFullName}\n事件：${eventDesc}`);
    });
}
