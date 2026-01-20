import { NextResponse } from 'next/server'
import getPrisma from '@/services/prisma'

export async function GET() {
  const p = getPrisma()
  try {
    const students = await p.student.findMany()
    const homeworks = await p.homework.findMany({
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
  const p = getPrisma()
  try {
    const state = await req.json()
    const students = state.students || []
    const studentIds = students.map((s: any) => s.id)

    // Transaction for atomic update
    await p.$transaction(async (tx) => {
      for (const s of students) {
        await tx.student.upsert({
          where: { id: s.id },
          create: {
            id: s.id,
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
        })
      }

      if (studentIds.length > 0) {
        await tx.student.deleteMany({
          where: { id: { notIn: studentIds } },
        })
      } else {
        await tx.student.deleteMany()
      }

      for (const hw of state.homeworks || []) {
        const upserted = await tx.homework.upsert({
          where: { id: hw.id },
          create: {
            id: hw.id,
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

        const submissions = Object.entries(hw.submissions || {}).map(
          ([studentId, status]) => ({
            studentId,
            homeworkId: upserted.id,
            status: status as string,
            isNotified: hw.notifiedStudents?.[studentId] || false,
          }),
        )

        if (submissions.length > 0) {
          for (const sub of submissions) {
            await tx.submission.upsert({
              where: {
                studentId_homeworkId: {
                  studentId: sub.studentId,
                  homeworkId: sub.homeworkId,
                },
              },
              create: sub,
              update: {
                status: sub.status,
                isNotified: sub.isNotified,
              },
            })
          }
        } else {
          await tx.submission.deleteMany({
            where: { homeworkId: upserted.id },
          })
        }
      }

      const homeworkIds = (state.homeworks || []).map((h: any) => h.id)
      if (homeworkIds.length > 0) {
        await tx.homework.deleteMany({
          where: { id: { notIn: homeworkIds } },
        })
      } else {
        await tx.homework.deleteMany()
      }
    })

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('POST /api/state failed', e)
    return NextResponse.json(
      { error: `Veritabanı hatası: ${e.message || 'Kayıt başarısız.'}` },
      { status: 500 },
    )
  }
}
