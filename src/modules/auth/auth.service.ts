import { prisma } from '../../lib/prisma'
import { hashPassword, verifyPassword } from '../../shared/utils/password'
import { hashApiKey, generateApiKey } from '../../shared/utils/apiKey'
import { randomBytes } from 'crypto'
import type { UserRole } from '@prisma/client'

export interface RegisterInput {
  organizationName: string
  organizationSlug: string
  email: string
  password: string
  firstName: string
  lastName: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresIn: number
}

export class AuthService {
  async register(input: RegisterInput, signJwt: (payload: object) => string): Promise<AuthTokens & { user: object }> {
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: input.organizationSlug },
    })
    if (existingOrg) {
      throw new Error('ORGANIZATION_SLUG_EXISTS')
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    })
    if (existingUser) {
      throw new Error('EMAIL_EXISTS')
    }

    const passwordHash = await hashPassword(input.password)

    const [organization, user] = await prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: input.organizationName,
          slug: input.organizationSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          plan: 'STARTER',
          unitCount: 0,
        },
      })
      const usr = await tx.user.create({
        data: {
          organizationId: org.id,
          email: input.email.toLowerCase(),
          passwordHash,
          firstName: input.firstName,
          lastName: input.lastName,
          role: 'OWNER' as UserRole,
        },
      })
      return [org, usr]
    })

    const tokens = await this.createSession(user.id, organization.id, user.role, signJwt)

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: organization.id,
        organizationName: organization.name,
      },
    }
  }

  async login(input: LoginInput, signJwt: (payload: object) => string): Promise<AuthTokens & { user: object }> {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
      include: { organization: true },
    })
    if (!user || !user.isActive) {
      throw new Error('INVALID_CREDENTIALS')
    }

    const valid = await verifyPassword(input.password, user.passwordHash)
    if (!valid) {
      throw new Error('INVALID_CREDENTIALS')
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const tokens = await this.createSession(user.id, user.organizationId, user.role, signJwt)

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organization.id,
        organizationName: user.organization.name,
      },
    }
  }

  async refresh(
    refreshToken: string,
    signJwt: (payload: object) => string
  ): Promise<AuthTokens> {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { organization: true } } },
    })
    if (!session || session.expiresAt < new Date()) {
      throw new Error('INVALID_REFRESH_TOKEN')
    }
    if (!session.user.isActive) {
      await prisma.session.delete({ where: { id: session.id } })
      throw new Error('INVALID_REFRESH_TOKEN')
    }

    const tokens = await this.createSession(
      session.user.id,
      session.user.organizationId,
      session.user.role,
      signJwt
    )
    await prisma.session.delete({ where: { id: session.id } })
    return tokens
  }

  async logout(refreshToken: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { refreshToken },
    })
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new Error('USER_NOT_FOUND')
    const valid = await verifyPassword(currentPassword, user.passwordHash)
    if (!valid) throw new Error('INVALID_CURRENT_PASSWORD')
    const passwordHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    })
  }

  async updateProfile(
    userId: string,
    input: { firstName?: string; lastName?: string; phone?: string | null; avatarUrl?: string | null }
  ): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.firstName != null && { firstName: input.firstName }),
        ...(input.lastName != null && { lastName: input.lastName }),
        ...(input.phone !== undefined && { phone: input.phone }),
        ...(input.avatarUrl !== undefined && { avatarUrl: input.avatarUrl }),
      },
    })
  }

  async listApiKeys(organizationId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId, isActive: true },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        expiresAt: true,
        scopes: true,
        createdAt: true,
      },
    })
  }

  async createApiKey(organizationId: string, name: string, scopes: string[] = ['*']) {
    const rawKey = generateApiKey()
    const keyHash = hashApiKey(rawKey)
    const expiresAt = new Date()
    expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    await prisma.apiKey.create({
      data: {
        organizationId,
        name,
        keyHash,
        scopes,
        expiresAt,
      },
    })
    return { rawKey, name, expiresAt } // rawKey only shown once
  }

  async deleteApiKey(organizationId: string, id: string): Promise<boolean> {
    const result = await prisma.apiKey.updateMany({
      where: { id, organizationId },
      data: { isActive: false },
    })
    return result.count > 0
  }

  async invite(organizationId: string, inviterId: string, email: string, role: UserRole = 'COORDINATOR') {
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
    if (existingUser) throw new Error('EMAIL_ALREADY_REGISTERED')
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    const inv = await prisma.invite.create({
      data: {
        organizationId,
        email: email.toLowerCase(),
        role,
        token,
        inviterId,
        expiresAt,
      },
    })
    return { id: inv.id, email: inv.email, role: inv.role, token, expiresAt }
  }

  async acceptInvite(token: string, password: string, firstName: string, lastName: string, signJwt: (p: object) => string) {
    const inv = await prisma.invite.findUnique({
      where: { token },
      include: { organization: true },
    })
    if (!inv || inv.acceptedAt || inv.expiresAt < new Date()) {
      throw new Error('INVALID_OR_EXPIRED_INVITE')
    }
    const existingUser = await prisma.user.findUnique({ where: { email: inv.email } })
    if (existingUser) throw new Error('EMAIL_ALREADY_REGISTERED')
    const passwordHash = await hashPassword(password)
    const [user] = await prisma.$transaction([
      prisma.user.create({
        data: {
          organizationId: inv.organizationId,
          email: inv.email,
          passwordHash,
          firstName,
          lastName,
          role: inv.role,
        },
      }),
      prisma.invite.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date() },
      }),
    ])
    const tokens = await this.createSession(user.id, user.organizationId, user.role, signJwt)
    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: inv.organization.id,
        organizationName: inv.organization.name,
      },
    }
  }

  private async createSession(
    userId: string,
    organizationId: string,
    role: string,
    signJwt: (payload: object) => string
  ): Promise<AuthTokens> {
    const refreshToken = randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 30) // 30 days

    await prisma.session.create({
      data: {
        userId,
        refreshToken,
        expiresAt,
      },
    })

    const accessToken = signJwt({
      sub: userId,
      organizationId,
      role,
    })

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 min in seconds
    }
  }
}
