import { FastifyPluginAsync } from 'fastify'
import { sendgridWebhookRoute } from './sendgrid.webhook'
import { twilioWebhookRoute } from './twilio.webhook'

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  await app.register(sendgridWebhookRoute, { prefix: '/sendgrid' })
  await app.register(twilioWebhookRoute, { prefix: '/twilio' })
}
