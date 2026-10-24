import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { hashPassword, verifyPassword } from '../lib/security.js'

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function authRoutes(app: FastifyInstance) {
  app.post('/auth/register', async (request, reply) => {
    const body = z.object({
      fullName: z.string().min(2),
      businessName: z.string().min(2),
      email: z.string().trim().email(),
      password: z.string().min(8),
    }).parse(request.body)

    const normalizedEmail = normalizeEmail(body.email)

    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
    if (existing) {
      return reply.code(409).send({ message: 'Email already registered' })
    }

    const tenant = await prisma.tenant.create({
      data: { name: body.businessName, slug: `${body.businessName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}` },
    })

    const user = await prisma.user.create({
      data: {
        fullName: body.fullName,
        email: normalizedEmail,
        passwordHash: hashPassword(body.password),
        tenantId: tenant.id,
      },
    })

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      businessName: tenant.name,
      fullName: user.fullName,
    })

    return reply.code(201).send({
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        businessName: tenant.name,
      },
    })
  })

  app.post('/auth/login', async (request, reply) => {
    const body = z.object({
      email: z.string().trim().email(),
      password: z.string().min(8),
    }).parse(request.body)

    const normalizedEmail = normalizeEmail(body.email)

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { tenant: true },
    })

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      return reply.code(401).send({ message: 'Invalid credentials' })
    }

    const token = app.jwt.sign({
      sub: user.id,
      email: user.email,
      businessName: user.tenant.name,
      fullName: user.fullName,
    })

    return {
      token,
      user: {
        email: user.email,
        fullName: user.fullName,
        businessName: user.tenant.name,
      },
    }
  })
}
