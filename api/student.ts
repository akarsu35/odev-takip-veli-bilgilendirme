import getPrisma from '../services/prisma'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method === 'DELETE') {
    try {
      const { id } = req.query
      if (!id) {
        return res.status(400).json({ error: 'Missing id' })
      }
      const prisma = getPrisma()
      await prisma.submission.deleteMany({ where: { studentId: id } })
      await prisma.student.delete({ where: { id } })
      return res.status(200).json({ ok: true })
    } catch (e) {
      console.error('DELETE /api/student failed', e)
      return res.status(500).json({ error: 'Server error' })
    }
  }

  return res.status(404).end()
}
