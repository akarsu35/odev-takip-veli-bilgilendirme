// Hata ayıklama için geliştirilmiş error logging

import { NextResponse } from 'next/server'
import { getPrisma } from '@/services/prisma'
import { createClient } from '@/utils/supabase/server'

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const p = await getPrisma()
  try {
    const students = await p.student.findMany({
      where: { userId: user.id },
    })
    const homeworks = await p.homework.findMany({
      where: { userId: user.id },
      include: { submissions: true },
    })

    const convertedHomeworks = homeworks.map((hw: any) => ({
      id: hw.id,
      title: hw.title,
      description: hw.description,
      assignedDate: hw.assignedDate.toISOString(),
      dueDate: hw.dueDate.toISOString(),
      targetClasses: hw.targetClasses,
      targetStudentIds: hw.targetStudents,
      submissions: hw.submissions.reduce((acc: any, sub: any) => {
        acc[sub.studentId] = sub.status
        return acc
      }, {}),
      notifiedStudents: hw.submissions.reduce((acc: any, sub: any) => {
        if (sub.isNotified) acc[sub.studentId] = true
        return acc
      }, {}),
    }))

    return NextResponse.json({
      students: students.map((s: any) => ({
        id: s.id,
        name: s.name,
        parentName: s.parentName,
        parentPhone: s.parentPhone,
        className: s.className,
      })),
      homeworks: convertedHomeworks,
    })
  } catch (e: any) {
    console.error('GET /api/state failed', e)
    return NextResponse.json(
      { error: `Veritabanı hatası: ${e.message || 'Veriler çekilemedi.'}` },
      { status: 500 },
    )
  }
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let state
  try {
    state = await req.json()
  } catch (parseError: any) {
    console.error('POST /api/state - JSON parse error:', parseError)
    return NextResponse.json(
      { error: `JSON parse hatası: ${parseError.message}` },
      { status: 400 },
    )
  }

  // CRITICAL: Prevent accidental data deletion
  // If the incoming state is empty or missing required fields, reject it
  if (!state || typeof state !== 'object') {
    console.error('POST /api/state - Invalid state object:', state)
    return NextResponse.json(
      { error: 'Geçersiz veri formatı' },
      { status: 400 },
    )
  }

  // Allow empty arrays, but log a warning for safety
  const students = state.students || []
  const homeworks = state.homeworks || []

  if (students.length === 0 && homeworks.length === 0) {
    console.warn(
      'POST /api/state - Received empty state, this will delete all data!',
    )
    // Still allow it, but make it very obvious in logs
  }

  const p = await getPrisma()
  try {
    console.log(`Saving state for user ${user.id}:`, {
      studentCount: students.length,
      homeworkCount: (state.homeworks || []).length,
    })

    const startTime = Date.now()

    // Transaction for atomic update
    await p.$transaction(
      async (tx) => {
        // 1. Sync Students
        const existingStudents = await tx.student.findMany({
          where: { userId: user.id },
          select: { id: true },
        })
        const existingStudentIds = existingStudents.map((s) => s.id)
        const incomingStudentIds = students.map((s: any) => s.id)

        // Delete students not in incoming list
        const studentsToDelete = existingStudentIds.filter(
          (id) => !incomingStudentIds.includes(id),
        )
        if (studentsToDelete.length > 0) {
          console.log(`Deleting ${studentsToDelete.length} students`)
          await tx.student.deleteMany({
            where: {
              id: { in: studentsToDelete },
              userId: user.id,
            },
          })
        }

        // Upsert students
        await Promise.all(
          students.map((s: any) =>
            tx.student.upsert({
              where: { id: s.id },
              create: {
                id: s.id,
                userId: user.id,
                name: s.name,
                parentName: s.parentName,
                parentPhone: s.parentPhone,
                className: s.className,
              },
              update: {
                name: s.name,
                parentName: s.parentName,
                parentPhone: s.parentPhone,
                className: s.className,
              },
            }),
          ),
        )

        // 2. Sync Homeworks
        const existingHomeworks = await tx.homework.findMany({
          where: { userId: user.id },
          select: { id: true },
        })
        const existingHomeworkIds = existingHomeworks.map((h) => h.id)
        const incomingHomeworkIds = (state.homeworks || []).map(
          (h: any) => h.id,
        )

        const homeworksToDelete = existingHomeworkIds.filter(
          (id) => !incomingHomeworkIds.includes(id),
        )
        if (homeworksToDelete.length > 0) {
          console.log(`Deleting ${homeworksToDelete.length} homeworks`)
          await tx.homework.deleteMany({
            where: {
              id: { in: homeworksToDelete },
              userId: user.id,
            },
          })
        }

        for (const hw of state.homeworks || []) {
          try {
            const upserted = await tx.homework.upsert({
              where: { id: hw.id },
              create: {
                id: hw.id,
                userId: user.id,
                title: hw.title,
                description: hw.description,
                assignedDate: new Date(hw.assignedDate),
                dueDate: new Date(hw.dueDate),
                targetClasses: hw.targetClasses || [],
                targetStudents: hw.targetStudentIds || [],
              },
              update: {
                title: hw.title,
                description: hw.description,
                assignedDate: new Date(hw.assignedDate),
                dueDate: new Date(hw.dueDate),
                targetClasses: hw.targetClasses || [],
                targetStudents: hw.targetStudentIds || [],
              },
            })

            // Clear existing submissions for this homework
            await tx.submission.deleteMany({
              where: { homeworkId: upserted.id },
            })

            const submissions = Object.entries(hw.submissions || {}).map(
              ([studentId, status]) => ({
                studentId,
                homeworkId: upserted.id,
                status: status as string,
                isNotified: hw.notifiedStudents?.[studentId] || false,
              }),
            )

            if (submissions.length > 0) {
              await tx.submission.createMany({
                data: submissions,
              })
            }
          } catch (hwError: any) {
            console.error(`Error saving homework ${hw.id}:`, hwError)
            throw new Error(
              `Ödev kaydedilemedi (${hw.title}): ${hwError.message}`,
            )
          }
        }
      },
      {
        timeout: 60000,
      },
    )

    const duration = Date.now() - startTime
    console.log(`State saved successfully in ${duration}ms`)
    return NextResponse.json({ ok: true, duration })
  } catch (e: any) {
    console.error('POST /api/state failed:', e)
    return NextResponse.json(
      { error: 'Veritabanı işlemi sırasında bir hata oluştu.' },
      { status: 500 },
    )
  }
}
