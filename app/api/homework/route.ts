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

  let body
  try {
    body = await req.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const {
    id,
    title,
    description,
    assignedDate,
    dueDate,
    targetClasses,
    targetStudents,
  } = body

  if (!id || !title || !assignedDate || !dueDate) {
    return NextResponse.json(
      { error: 'Missing required fields' },
      { status: 400 },
    )
  }

  try {
    const p = await getPrisma()

    const homework = await p.homework.create({
      data: {
        id,
        userId: user.id,
        title,
        description,
        assignedDate: new Date(assignedDate),
        dueDate: new Date(dueDate),
        targetClasses: targetClasses || [],
        targetStudents: targetStudents || [],
      },
    })

    console.log(`Created homework ${id} for user ${user.id}`)

    return NextResponse.json({ success: true, homework })
  } catch (error: any) {
    console.error('Error creating homework:', error)
    return NextResponse.json(
      { error: 'Failed to create homework' },
      { status: 500 },
    )
  }
}

export async function PUT(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      id,
      title,
      description,
      assignedDate,
      dueDate,
      targetClasses,
      targetStudents,
    } = body

    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const p = await getPrisma()

    // Verify ownership
    const existing = await p.homework.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const homework = await p.homework.update({
      where: { id },
      data: {
        title,
        description,
        assignedDate: assignedDate ? new Date(assignedDate) : undefined,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        targetClasses,
        targetStudents,
      },
    })

    return NextResponse.json({ success: true, homework })
  } catch (error: any) {
    console.error('PUT /api/homework failed', error)
    return NextResponse.json(
      { error: 'Failed to update homework' },
      { status: 500 },
    )
  }
}

export async function DELETE(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const p = await getPrisma()
  try {
    const existing = await p.homework.findUnique({ where: { id } })
    if (!existing || existing.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    await p.homework.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    console.error('DELETE /api/homework failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
