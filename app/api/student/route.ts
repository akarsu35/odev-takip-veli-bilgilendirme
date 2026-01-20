import { NextResponse } from 'next/server'
import getPrisma from '@/services/prisma'

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const p = getPrisma()
  try {
    await p.submission.deleteMany({ where: { studentId: id } })
    await p.student.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('DELETE /api/student failed', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
