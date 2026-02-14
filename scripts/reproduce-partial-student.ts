import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Attempting to create a message with partial student data...')
  try {
    const studentId = '00000000-0000-0000-0000-000000000000' // non-existent
    const student = {
      id: studentId,
      name: 'Partial Student',
      // Missing parentName, parentPhone, className to test fallback
    }

    // Mocking the API logic since we can't call API directly
    console.log('Upserting student...')
    await prisma.student.upsert({
      where: { id: studentId },
      create: {
        id: studentId,
        userId: 'legacy_user', // Mocking user.id
        name: student.name || 'Unknown',
        parentName: (student as any).parentName || 'Unknown',
        parentPhone: (student as any).parentPhone || '',
        className: (student as any).className || 'Unknown',
      },
      update: {
        name: student.name,
      },
    })
    console.log('Student upserted successfully')

    const message = await prisma.sentMessage.create({
      data: {
        studentId,
        content: 'Test message for partial student',
        type: 'HOMEWORK',
      },
    })
    console.log(
      'Successfully created message:',
      JSON.stringify(message, null, 2),
    )

    // Cleanup
    await prisma.sentMessage.delete({ where: { id: message.id } })
    await prisma.student.delete({ where: { id: studentId } })
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
