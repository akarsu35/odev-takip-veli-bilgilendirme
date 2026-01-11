import getPrisma from '../services/prisma'

export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  // Check database configuration
  if (!process.env.DATABASE_URL) {
    console.error('API Error: DATABASE_URL is not defined.')
    return res.status(500).json({
      error:
        'Veritabanı bağlantısı yapılandırılmamış (DATABASE_URL eksik). Lütfen Vercel ayarlarından DATABASE_URL değişkenini kontrol edin.',
    })
  }

  if (req.method === 'GET') {
    try {
      const p = getPrisma()

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

      return res.status(200).json({
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
      return res.status(500).json({
        error: `Veritabanı hatası: ${e.message || 'Veriler çekilemedi.'}`,
      })
    }
  }

  if (req.method === 'POST') {
    try {
      const p = getPrisma()
      const state = req.body

      const students = state.students || []
      const studentIds = students.map((s: any) => s.id)

      for (const s of students) {
        await p.student.upsert({
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
        await p.student.deleteMany({
          where: { id: { notIn: studentIds } },
        })
      } else {
        await p.student.deleteMany()
      }

      for (const hw of state.homeworks || []) {
        const upserted = await p.homework.upsert({
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
            await p.submission.upsert({
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
          await p.submission.deleteMany({
            where: { homeworkId: upserted.id },
          })
        }
      }

      const homeworkIds = (state.homeworks || []).map((h: any) => h.id)
      if (homeworkIds.length > 0) {
        await p.homework.deleteMany({
          where: { id: { notIn: homeworkIds } },
        })
      } else {
        await p.homework.deleteMany()
      }

      return res.status(200).json({ ok: true })
    } catch (e: any) {
      console.error('POST /api/state failed', e)
      return res.status(500).json({
        error: `Veritabanı hatası: ${e.message || 'Kayıt başarısız.'}`,
      })
    }
  }

  return res.status(404).end()
}
