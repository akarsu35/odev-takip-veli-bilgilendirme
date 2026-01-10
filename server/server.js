import 'dotenv/config'
import http from 'http'
import { PrismaClient } from '@prisma/client'

// Ensure Prisma receives DATABASE_URL from process.env
const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL,
})
const PORT = process.env.PORT || 4000

function sendJSON(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(data))
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '', `http://${req.headers.host}`)
  if (req.method === 'OPTIONS') {
    // CORS preflight
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    })
    return res.end()
  }

  // Single-student delete endpoint
  if (url.pathname === '/api/student') {
    if (req.method === 'DELETE') {
      try {
        const id = url.searchParams.get('id')
        if (!id) {
          return sendJSON(res, 400, { error: 'Missing id' })
        }
        // delete submissions for student, then student
        await prisma.submission.deleteMany({ where: { studentId: id } })
        await prisma.student.delete({ where: { id } })
        console.log('DELETE /api/student applied for', id)
        return sendJSON(res, 200, { ok: true })
      } catch (e) {
        console.error('DELETE /api/student failed', e)
        return sendJSON(res, 500, { error: 'Server error' })
      }
    }
  }

  // Single-homework delete endpoint
  if (url.pathname === '/api/homework') {
    if (req.method === 'DELETE') {
      try {
        const id = url.searchParams.get('id')
        if (!id) {
          return sendJSON(res, 400, { error: 'Missing id' })
        }
        // Cascade delete is handled by Prisma schema (onDelete: Cascade)
        await prisma.homework.delete({ where: { id } })
        console.log('DELETE /api/homework applied for', id)
        return sendJSON(res, 200, { ok: true })
      } catch (e) {
        console.error('DELETE /api/homework failed', e)
        return sendJSON(res, 500, { error: 'Server error' })
      }
    }
  }

  // Single-submission delete endpoint
  if (url.pathname === '/api/submission') {
    if (req.method === 'DELETE') {
      try {
        const id = url.searchParams.get('id')
        if (!id) {
          return sendJSON(res, 400, { error: 'Missing id' })
        }
        await prisma.submission.delete({ where: { id } })
        console.log('DELETE /api/submission applied for', id)
        return sendJSON(res, 200, { ok: true })
      } catch (e) {
        console.error('DELETE /api/submission failed', e)
        return sendJSON(res, 500, { error: 'Server error' })
      }
    }
  }

  if (url.pathname === '/api/state') {
    if (req.method === 'GET') {
      try {
        const students = await prisma.student.findMany()
        const homeworks = await prisma.homework.findMany({
          include: { submissions: true },
        })

        const convertedHomeworks = homeworks.map((hw) => ({
          id: hw.id,
          title: hw.title,
          description: hw.description,
          assignedDate: hw.assignedDate.toISOString(),
          dueDate: hw.dueDate.toISOString(),
          targetClasses: hw.targetClasses,
          targetStudentIds: hw.targetStudents,
          submissions: hw.submissions.reduce((acc, sub) => {
            acc[sub.studentId] = sub.status
            return acc
          }, {}),
          notifiedStudents: hw.submissions.reduce((acc, sub) => {
            if (sub.isNotified) acc[sub.studentId] = true
            return acc
          }, {}),
        }))

        return sendJSON(res, 200, {
          students: students.map((s) => ({
            id: s.id,
            name: s.name,
            parentName: s.parentName,
            parentPhone: s.parentPhone,
            className: s.className,
          })),
          homeworks: convertedHomeworks,
        })
      } catch (e) {
        console.error('GET /api/state failed', e)
        return sendJSON(res, 500, { error: 'Server error' })
      }
    }

    if (req.method === 'POST') {
      try {
        let body = ''
        for await (const chunk of req) body += chunk
        const state = JSON.parse(body)

        console.log(
          'POST /api/state received. Students:',
          (state.students || []).length,
          'Homeworks:',
          (state.homeworks || []).length
        )

        // safer sync: avoid one big transaction to prevent timeouts.
        // 1) Upsert students (create or update) and delete removed ones
        const students = state.students || []
        const studentIds = students.map((s) => s.id)

        for (const s of students) {
          try {
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
          } catch (e) {
            console.error('upsert student failed for', s.id, e)
          }
        }

        // Delete students that are no longer present in the state
        try {
          if (studentIds.length > 0) {
            await prisma.student.deleteMany({
              where: { id: { notIn: studentIds } },
            })
          } else {
            // If no students sent, clear all students
            await prisma.student.deleteMany()
          }
        } catch (e) {
          console.error('deleteMany students failed', e)
        }

        // 2) Upsert homeworks and their submissions individually
        for (const hw of state.homeworks || []) {
          try {
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

            // Replace submissions for this homework using upsert (atomic operation)
            // This prevents data loss if createMany fails after delete
            const submissions = Object.entries(hw.submissions || {}).map(
              ([studentId, status]) => ({
                studentId,
                homeworkId: upserted.id,
                status,
                isNotified: hw.notifiedStudents?.[studentId] || false,
              })
            )

            if (submissions.length > 0) {
              try {
                // Use upsert for each submission to maintain data integrity
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
              } catch (e) {
                console.error('submission upsert failed for', upserted.id, e)
              }
            } else {
              // If no submissions, delete existing ones
              try {
                await prisma.submission.deleteMany({
                  where: { homeworkId: upserted.id },
                })
              } catch (e) {
                console.error(
                  'submission deleteMany failed for',
                  upserted.id,
                  e
                )
              }
            }
          } catch (e) {
            console.error('upsert homework failed', e)
          }
        }

        // Delete homeworks that are no longer present
        try {
          const homeworkIds = (state.homeworks || []).map((h) => h.id)
          if (homeworkIds.length > 0) {
            await prisma.homework.deleteMany({
              where: { id: { notIn: homeworkIds } },
            })
          } else {
            await prisma.homework.deleteMany()
          }
        } catch (e) {
          console.error('deleteMany homeworks failed', e)
        }

        console.log('POST /api/state applied to DB')
        return sendJSON(res, 200, { ok: true })
      } catch (e) {
        console.error('POST /api/state failed', e)
        return sendJSON(res, 500, { error: 'Server error' })
      }
    }
  }

  res.writeHead(404)
  res.end()
})

server.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
})
