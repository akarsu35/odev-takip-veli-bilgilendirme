import { NextResponse } from 'next/server'
import prisma from '@/services/prisma'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error('Auth error in POST /api/messages:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { studentId, content, type, student } = body

    if (!studentId || !content) {
      return NextResponse.json(
        { error: 'Student ID and content are required' },
        { status: 400 },
      )
    }

    // If student details are provided, ensure student exists
    if (student) {
      try {
        await prisma.student.upsert({
          where: { id: studentId },
          create: {
            id: studentId,
            userId: user.id,
            name: student.name || 'Unknown',
            parentName: student.parentName || 'Unknown',
            parentPhone: student.parentPhone || '',
            className: student.className || 'Unknown',
          },
          update: {
            // Update details if they changed
            name: student.name,
            parentName: student.parentName,
            parentPhone: student.parentPhone,
            className: student.className,
          },
        })
      } catch (upsertError) {
        console.error('Failed to upsert student:', upsertError)
        return NextResponse.json(
          {
            error: `Failed to sync student data: ${(upsertError as Error).message}`,
          },
          { status: 500 },
        )
      }
    }

    const message = await prisma.sentMessage.create({
      data: {
        studentId,
        content,
        type: type || 'WHATSAPP',
      },
    })

    return NextResponse.json(message)
  } catch (error) {
    console.error('Error saving message:', error)
    return NextResponse.json(
      { error: `Failed to save message: ${(error as Error).message}` },
      { status: 500 },
    )
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const messages = await prisma.sentMessage.findMany({
      where: {
        student: {
          userId: user.id,
        },
      },
      include: {
        student: {
          select: {
            id: true,
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

    return NextResponse.json(messages)
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 },
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const studentId = searchParams.get('studentId')
    const all = searchParams.get('all') === 'true'
    const type = searchParams.get('type')

    const p = prisma

    // Ensure we only delete messages belonging to the user's students
    const userFilter = {
      student: {
        userId: user.id,
      },
    }

    if (id) {
      // Delete single message - verify ownership
      await p.sentMessage.deleteMany({
        where: {
          id,
          ...userFilter,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (studentId) {
      // Delete all messages for a student - verify ownership
      await p.sentMessage.deleteMany({
        where: {
          studentId,
          ...userFilter,
        },
      })
      return NextResponse.json({ success: true })
    }

    if (all) {
      // Delete all messages (optionally filtered by type) - verify ownership
      const where: any = {
        ...userFilter,
      }
      if (type && type !== 'ALL') {
        where.type = type
      }

      await p.sentMessage.deleteMany({
        where,
      })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json(
      { error: 'Invalid delete request' },
      { status: 400 },
    )
  } catch (error) {
    console.error('Error deleting messages:', error)
    return NextResponse.json(
      { error: 'Failed to delete messages' },
      { status: 500 },
    )
  }
}
