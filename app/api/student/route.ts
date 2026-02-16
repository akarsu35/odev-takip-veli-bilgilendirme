import { NextResponse } from 'next/server'
import { getPrisma } from '@/services/prisma'
import { createClient } from '@/utils/supabase/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, parentName, parentPhone, className, grade } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const p = await getPrisma()
    const student = await p.student.create({
      data: {
        id, // Optional, if provided (e.g. from frontend UUID)
        userId: user.id,
        name,
        parentName: parentName || '',
        parentPhone: parentPhone || '',
        className: className || grade || '',
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error: any) {
    console.error('POST /api/student failed', error)
    return NextResponse.json(
      { error: 'Failed to create student' },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, name, parentName, parentPhone, className, grade } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 })
    }

    const p = await getPrisma()

    // Verify ownership
    const existing = await p.student.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json(
        { error: 'Student not found or unauthorized' },
        { status: 404 },
      )
    }

    const student = await p.student.update({
      where: { id },
      data: {
        name,
        parentName,
        parentPhone,
        className: className || grade,
      },
    })

    return NextResponse.json({ success: true, student })
  } catch (error: any) {
    console.error('PUT /api/student failed', error)
    return NextResponse.json(
      { error: 'Failed to update student' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const p = await getPrisma()
  try {
    // Ensure the student belongs to the user
    const student = await p.student.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    // Allow deletion if:
    // 1. Student belongs to the current user, OR
    // 2. Student is a legacy_user (migrated from old system)
    if (student.userId !== user.id && student.userId !== 'legacy_user') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await p.submission.deleteMany({ where: { studentId: id } })
    await p.student.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/student failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
