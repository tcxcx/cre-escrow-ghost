/**
 * Communication service credentials (Resend, Slack).
 */

import { resolve } from './core';

export function getResendApiKey(): string | undefined {
  return resolve('RESEND_API_KEY');
}

export function getResendAudienceId(): string | undefined {
  return resolve('RESEND_AUDIENCE_ID');
}

export function getSlackWebhookUrl(): string | undefined {
  return resolve('SLACK_WEBHOOK_URL');
}

export function getSlackSalesWebhookUrl(): string | undefined {
  return resolve('SLACK_SALES_WEBHOOK_URL');
}

export function getSlackErrorWebhookUrl(): string | undefined {
  return resolve('SLACK_ERROR_WEBHOOK_URL');
}

export function getSlackMinionWebhookUrl(): string | undefined {
  return resolve('SLACK_MINION_WEBHOOK_URL');
}

export function getGithubPat(): string | undefined {
  return resolve('GITHUB_PAT');
}

export function getSlackClientSecret(): string | undefined {
  return resolve('SLACK_CLIENT_SECRET');
}

export function getSlackSigningSecret(): string | undefined {
  return resolve('SLACK_SIGNING_SECRET');
}

export function getSalesTeamEmails(): string | undefined {
  return resolve('SALES_TEAM_EMAILS');
}

export function getPostmarkWebhookToken(): string | undefined {
  return resolve('POSTMARK_WEBHOOK_TOKEN');
}
