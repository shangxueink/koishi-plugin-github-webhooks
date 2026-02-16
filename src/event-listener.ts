import { Context, Element, h } from 'koishi'
import { PluginConfig, RepositoryConfig } from '.'
import { sendEventMessage, buildMsgChain } from './utils'
import { Subscribers, TABLES_SUBSCRIBERS } from './database'

/**
 * 设置事件监听器，监听 adapter-github 派发的事件
 */
export function setupEventListeners(ctx: Context, config: PluginConfig) {
  // 监听所有 GitHub 事件
  (ctx as any).on('github/event', async (eventData: any) => {
    const { owner, repo, type, payload } = eventData;
    const repoFullName = `${owner}/${repo}`;

    // 检查仓库是否在配置中
    const repoConfig = config.repositories.find(item => item.repo === repoFullName);

    // 如果仓库不在配置中，忽略该事件
    if (!repoConfig) {
      return;
    }

    // 检查是否启用 Watch 事件
    if (type === 'WatchEvent' && !repoConfig.enableWatch) {
      return;
    }

    // 查询当前仓库的所有订阅项
    let subscriptions = await ctx.database.get(TABLES_SUBSCRIBERS, { repo: repoFullName }) as Subscribers[];

    // 根据用户自定义的事件类型进行过滤
    subscriptions = subscriptions.filter(sub => {
      if (!sub.events || sub.events === 'all') return true;
      const allowedEvents = sub.events.split(',').map(e => e.trim());

      // 将 GitHub 事件类型转换为 webhook 事件名称
      const eventName = convertEventTypeToWebhookName(type);

      if (allowedEvents.includes(eventName)) {
        return true;
      } else {
        // 如果配置了未知事件推送，则允许未知事件
        return repoConfig.enableUnknownEvent;
      }
    });

    if (!subscriptions.length) {
      return;
    }

    // 构造 webhook 格式的 payload 用于消息构建
    const webhookPayload = convertEventDataToWebhookPayload(eventData);
    const eventName = convertEventTypeToWebhookName(type);

    // 构造消息链
    const msgChain = buildMsgChain(ctx, eventName, webhookPayload, repoConfig);

    // 如果消息链为空，则不推送
    if (msgChain && msgChain.length) {
      sendEventMessage(ctx, subscriptions, msgChain);
    }
  });
}

/**
 * 将 GitHub Events API 的事件类型转换为 Webhook 事件名称
 */
function convertEventTypeToWebhookName(eventType: string): string {
  const mapping: Record<string, string> = {
    'IssuesEvent': 'issues',
    'IssueCommentEvent': 'issue_comment',
    'PullRequestEvent': 'pull_request',
    'PullRequestReviewCommentEvent': 'pull_request_review_comment',
    'DiscussionEvent': 'discussion',
    'DiscussionCommentEvent': 'discussion_comment',
    'WorkflowRunEvent': 'workflow_run',
    'WorkflowJobEvent': 'workflow_job',
    'WatchEvent': 'watch',
    'ForkEvent': 'fork',
    'PushEvent': 'push',
    'ReleaseEvent': 'release',
  };
  return mapping[eventType] || eventType.toLowerCase();
}

/**
 * 将 adapter-github 的事件数据转换为 webhook payload 格式
 */
function convertEventDataToWebhookPayload(eventData: any): any {
  const { owner, repo, payload, actor, type } = eventData;

  // 构造基础的 repository 对象
  const repository = {
    full_name: `${owner}/${repo}`,
    name: repo,
    owner: {
      login: owner,
    },
    html_url: `https://github.com/${owner}/${repo}`,
    stargazers_count: 0, // 这个信息在事件中可能没有
  };

  // 构造 sender 对象
  const sender = actor ? {
    login: actor.login,
    avatar_url: actor.avatar_url,
  } : null;

  // 根据事件类型构造不同的 payload
  const webhookPayload: any = {
    repository,
    sender,
    action: payload.action,
  };

  // 根据事件类型添加特定字段
  switch (type) {
    case 'IssuesEvent':
      webhookPayload.issue = payload.issue;
      break;
    case 'IssueCommentEvent':
      webhookPayload.issue = payload.issue;
      webhookPayload.comment = payload.comment;
      break;
    case 'PullRequestEvent':
      webhookPayload.pull_request = payload.pull_request;
      break;
    case 'PullRequestReviewCommentEvent':
      webhookPayload.pull_request = payload.pull_request;
      webhookPayload.comment = payload.comment;
      break;
    case 'DiscussionEvent':
      webhookPayload.discussion = payload.discussion;
      break;
    case 'DiscussionCommentEvent':
      webhookPayload.discussion = payload.discussion;
      webhookPayload.comment = payload.comment;
      break;
    case 'WorkflowRunEvent':
      webhookPayload.workflow_run = payload.workflow_run;
      webhookPayload.workflow = payload.workflow;
      break;
    case 'WorkflowJobEvent':
      webhookPayload.workflow_job = payload.workflow_job;
      break;
    case 'ForkEvent':
      webhookPayload.forkee = payload.forkee;
      break;
    case 'PushEvent':
      webhookPayload.ref = payload.ref;
      webhookPayload.before = payload.before;
      webhookPayload.after = payload.after;
      webhookPayload.commits = payload.commits;
      webhookPayload.head_commit = payload.headCommit;
      webhookPayload.pusher = actor;
      break;
    case 'ReleaseEvent':
      webhookPayload.release = payload.release;
      break;
    case 'WatchEvent':
      // Watch 事件（star）
      webhookPayload.action = payload.action || 'started';
      break;
  }

  return webhookPayload;
}
