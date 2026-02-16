import { NextResponse } from 'next/server'
import { getPrisma } from '@/services/prisma'
import { createClient } from '@/utils/supabase/server'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: homeworkId } = await params

  let body
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { studentId, status, isNotified } = body

  if (!studentId || !status) {
    return NextResponse.json(
      { error: 'Missing studentId or status' },
      { status: 400 },
    )
  }

  try {
    const p = await getPrisma()

    // Ensure the homework belongs to the user
    const homework = await p.homework.findUnique({
      where: { id: homeworkId },
    })

    if (!homework || homework.userId !== user.id) {
      return NextResponse.json(
        { error: 'Homework not found or unauthorized' },
        { status: 404 },
      )
    }

    // Upsert the submission
    const submission = await p.submission.upsert({
      where: {
        studentId_homeworkId: {
          studentId,
          homeworkId,
        },
      },
      create: {
        homeworkId,
        studentId,
        status,
        isNotified: isNotified || false,
      },
      update: {
        status,
        isNotified: isNotified !== undefined ? isNotified : undefined,
      },
    })

    console.log(
      `Updated submission for homework ${homeworkId}, student ${studentId}: ${status}`,
    )

    return NextResponse.json({ success: true, submission })
  } catch (error: any) {
    console.error('Error updating submission:', error)
    return NextResponse.json(
      { error: 'Failed to update submission' },
      { status: 500 },
    )
  }
}
