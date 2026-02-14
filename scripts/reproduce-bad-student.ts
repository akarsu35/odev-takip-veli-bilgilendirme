import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Attempting to create a message for non-existent student...')
  try {
    const message = await prisma.sentMessage.create({
      data: {
        studentId: '00000000-0000-0000-0000-000000000000', // invalid UUID
        content: 'Test message for bad student',
        type: 'HOMEWORK',
      },
    })
    console.log(
      'Successfully created message:',
      JSON.stringify(message, null, 2),
    )
  } catch (error) {
    console.error('Expected error:', (error as Error).message)
  } finally {
    await prisma.$disconnect()
  }
}

main()
