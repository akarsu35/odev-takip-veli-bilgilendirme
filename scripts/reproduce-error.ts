import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Attempting to fetch messages...')
  try {
    const messages = await prisma.sentMessage.findMany({
      include: {
        student: {
          select: {
            name: true,
            className: true,
            parentName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    console.log(
      'Successfully fetched messages:',
      JSON.stringify(messages, null, 2),
    )
  } catch (error) {
    console.error('Error fetching messages:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
