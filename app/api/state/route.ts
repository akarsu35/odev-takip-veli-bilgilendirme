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

  // Validations
  const students = state.students
  if (!students || !Array.isArray(students)) {
    return NextResponse.json(
      { error: 'Geçersiz veri formatı: students array olmalı' },
      { status: 400 },
    )
  }

  const homeworks = state.homeworks || []

  // ... (warnings for empty state)

  const p = await getPrisma()
  try {
    const startTime = Date.now()

    // 1. Sync Students (Transaction A)
    await p.$transaction(
      async (tx) => {
        // We do NOT touch AuthUser as it is not in the schema (UserProfile exists but is separate)

        const existingStudents = await tx.student.findMany({
          where: { userId: user.id },
          select: { id: true },
        })
        const existingStudentIds = existingStudents.map((s) => s.id)
        const incomingStudentIds = students.map((s: any) => s.id)

        // Delete students
        const studentsToDelete = existingStudentIds.filter(
          (id) => !incomingStudentIds.includes(id),
        )
        if (studentsToDelete.length > 0) {
          await tx.student.deleteMany({
            where: {
              id: { in: studentsToDelete },
              userId: user.id,
            },
          })
        }

        // Upsert students
        for (const s of students) {
          await tx.student.upsert({
            where: { id: s.id },
            update: {
              name: s.name,
              // Schema has parentName, parentPhone, className.
              // Frontend might have 'grade'/'schoolNumber' but schema doesn't support them yet.
              // We map available frontend fields to schema fields.
              parentName: s.parentName || '',
              parentPhone: s.parentPhone || '',
              className: s.className || s.grade || '', // Fallback
            },
            create: {
              id: s.id,
              userId: user.id,
              name: s.name,
              parentName: s.parentName || '',
              parentPhone: s.parentPhone || '',
              className: s.className || s.grade || '',
            },
          })
        }
      },
      {
        maxWait: 5000,
        timeout: 20000,
      },
    )

    // 2. Sync Homeworks (Structure)
    const existingHomeworks = await p.homework.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const existingHomeworkIds = existingHomeworks.map((h) => h.id)
    const incomingHomeworkIds = homeworks.map((h: any) => h.id)

    const homeworksToDelete = existingHomeworkIds.filter(
      (id) => !incomingHomeworkIds.includes(id),
    )
    if (homeworksToDelete.length > 0) {
      await p.homework.deleteMany({
        where: {
          id: { in: homeworksToDelete },
          userId: user.id,
        },
      })
    }

    // 3. Sync Each Homework
    const errors: any[] = []

    for (const hw of homeworks) {
      try {
        await p.$transaction(
          async (tx) => {
            // Upsert Homework
            // Schema has 'title', 'description', 'subject', 'assignedDate', 'dueDate'
            await tx.homework.upsert({
              where: { id: hw.id },
              update: {
                title: hw.title,
                description: hw.description || hw.content || '', // Map content to description
                subject: hw.subject || 'GENEL',
                assignedDate: new Date(
                  hw.date || hw.assignedDate || Date.now(),
                ), // Handle naming differences
                dueDate: new Date(hw.dueDate || Date.now()),
                targetClasses: hw.targetClasses || [],
                targetStudents: hw.targetStudentIds || hw.targetStudents || [], // Map fields
              },
              create: {
                id: hw.id,
                userId: user.id,
                title: hw.title,
                description: hw.description || hw.content || '',
                subject: hw.subject || 'GENEL',
                assignedDate: new Date(
                  hw.date || hw.assignedDate || Date.now(),
                ),
                dueDate: new Date(hw.dueDate || Date.now()),
                targetClasses: hw.targetClasses || [],
                targetStudents: hw.targetStudentIds || hw.targetStudents || [],
              },
            })

            // Process Submissions
            if (hw.submissions) {
              const subPromises = Object.entries(hw.submissions).map(
                ([studentId, status]) =>
                  tx.submission.upsert({
                    where: {
                      // Schema: @@unique([studentId, homeworkId]) -> studentId_homeworkId
                      studentId_homeworkId: {
                        studentId: studentId,
                        homeworkId: hw.id,
                      },
                    },
                    update: {
                      status: status as string,
                      // isNotified might be in 'notifiedStudents' map in frontend state
                      isNotified: hw.notifiedStudents?.[studentId] || false,
                    },
                    create: {
                      homeworkId: hw.id,
                      studentId: studentId,
                      status: status as string,
                      isNotified: hw.notifiedStudents?.[studentId] || false,
                    },
                  }),
              )
              await Promise.all(subPromises)
            }
          },
          {
            maxWait: 5000,
            timeout: 15000,
          },
        )
      } catch (hwError) {
        console.error(`Error syncing homework ${hw.id}:`, hwError)
        errors.push({ id: hw.id, error: hwError })
      }
    }

    if (errors.length > 0) {
      console.error('Save state executed with errors:', errors)
      return NextResponse.json(
        { ok: false, errors, duration: Date.now() - startTime },
        { status: 207 },
      )
    }

    const duration = Date.now() - startTime
    console.log(`State saved successfully in ${duration}ms`)
    return NextResponse.json({ ok: true, duration })
  } catch (e: any) {
    console.error('POST /api/state failed DETAIL:', e)
    return NextResponse.json(
      { error: `Veritabanı hatası: ${e.message}`, details: e.toString() },
      { status: 500 },
    )
  }
}
