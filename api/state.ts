import { prisma } from '../services/prisma'

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'GET') {
    try {
      const students = await prisma.student.findMany()
      const homeworks = await prisma.homework.findMany({
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

      return res.status(200).json({
        students: students.map((s: any) => ({
          id: s.id,
          name: s.name,
          parentName: s.parentName,
          parentPhone: s.parentPhone,
          className: s.className,
        })),
        homeworks: convertedHomeworks,
        _debug: {
          hasDbUrl: !!process.env.DATABASE_URL,
          dbUrlStart: process.env.DATABASE_URL
            ? process.env.DATABASE_URL.substring(0, 15) + '...'
            : 'NOT_SET',
          nodeEnv: process.env.NODE_ENV,
        },
      })
    } catch (e) {
      console.error('GET /api/state failed', e)
      return res.status(500).json({ error: 'Server error' })
    }
  }

  if (req.method === 'POST') {
    try {
      const state = req.body
      console.log('POST /api/state received')

      const students = state.students || []
      const studentIds = students.map((s: any) => s.id)

      for (const s of students) {
        await prisma.student.upsert({
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
        await prisma.student.deleteMany({
          where: { id: { notIn: studentIds } },
        })
      } else {
        await prisma.student.deleteMany()
      }

      for (const hw of state.homeworks || []) {
        const upserted = await prisma.homework.upsert({
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
          })
        )

        if (submissions.length > 0) {
          for (const sub of submissions) {
            await prisma.submission.upsert({
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
          await prisma.submission.deleteMany({
            where: { homeworkId: upserted.id },
          })
        }
      }

      const homeworkIds = (state.homeworks || []).map((h: any) => h.id)
      if (homeworkIds.length > 0) {
        await prisma.homework.deleteMany({
          where: { id: { notIn: homeworkIds } },
        })
      } else {
        await prisma.homework.deleteMany()
      }

      return res.status(200).json({ ok: true })
    } catch (e) {
      console.error('POST /api/state failed', e)
      return res.status(500).json({ error: 'Server error' })
    }
  }

  return res.status(404).end()
}
