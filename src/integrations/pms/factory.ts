import { PmsType } from '@prisma/client'
import { prisma } from '../../lib/prisma'
import { decryptCredentials } from '../../shared/utils/encryption'
import { AppFolioClient } from './appfolio/client'
import { YardiClient } from './yardi/client'
import { BuildiumClient } from './buildium/client'

export type PmsClient = AppFolioClient | YardiClient | BuildiumClient

export async function getPmsClient(organizationId: string): Promise<PmsClient | null> {
  const connection = await prisma.pmsConnection.findFirst({
    where: { organizationId, isActive: true },
  })

  if (!connection) return null

  const credentials = decryptCredentials(
    connection.credentials as string | object
  ) as Record<string, string>

  switch (connection.pmsType) {
    case PmsType.APPFOLIO:
      return new AppFolioClient({
        clientId: credentials.clientId ?? '',
        clientSecret: credentials.clientSecret ?? '',
        domain: credentials.domain ?? '',
      })
    case PmsType.YARDI:
      return new YardiClient({
        apiKey: credentials.apiKey ?? '',
        endpoint: credentials.endpoint ?? '',
      })
    case PmsType.BUILDIUM:
      return new BuildiumClient({
        clientId: credentials.clientId ?? '',
        clientSecret: credentials.clientSecret ?? '',
      })
    default:
      throw new Error(`Unsupported PMS type: ${connection.pmsType}`)
  }
}
