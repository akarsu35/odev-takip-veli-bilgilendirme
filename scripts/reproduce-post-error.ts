import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // 1. Get a student
    const student = await prisma.student.findFirst()
    if (!student) {
      console.error('No students found to test message creation')
      return
    }
    console.log('Found student:', student.id, student.name)

    // 2. Create a message
    console.log('Attempting to create a message...')
    const message = await prisma.sentMessage.create({
      data: {
        studentId: student.id,
        content: 'Test message from reproduction script',
        type: 'HOMEWORK',
      },
    })
    console.log(
      'Successfully created message:',
      JSON.stringify(message, null, 2),
    )
  } catch (error) {
    console.error('Error in reproduction script:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
