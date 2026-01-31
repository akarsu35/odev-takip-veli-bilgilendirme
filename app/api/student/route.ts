import { NextResponse } from 'next/server'
import { getPrisma } from '@/services/prisma'
import { createClient } from '@/utils/supabase/server'

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

  const p = getPrisma()
  try {
    // Ensure the student belongs to the user
    const student = await p.student.findUnique({
      where: { id },
      select: { userId: true },
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    if (student.userId !== user.id && student.userId !== 'legacy_user') {
      // Allow legacy_user for now if needed, or stick to strict ownership.
      // Let's be strict: if it has a userId, it must match.
      // If it was created before auth, we might have issues.
      // But since we defaulted to "legacy_user", we might want to check that too?
      // Actually, if we want to "claim" legacy data, we'd need a migration script.
      // For now, STRICT OWNERSHIP.
      if (student.userId !== 'legacy_user') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Since we are deleting, we should ideally restrict to ONLY the owner.
    // If userId IS legacy_user, should we allow ANY logged in user to delete it?
    // Probably NOT. It implies shared data.
    // I'll stick to: Must be owned by user.
    // BUT! I just added "legacy_user" as default. EXISTING students don't have this field unless I ran a migration?
    // Prisma `db push` adds the column. Existing rows get the default value ("legacy_user").
    // So all existing students are "legacy_user".
    // If I block "legacy_user", then NO ONE can delete old students.
    // If I allow "legacy_user", ANY ONE can delete old students.
    // Compromise: Update `GET /api/state` to RETURN "legacy_user" items to EVERYONE?
    // OR create a mechanism to "claim" them.
    //
    // Best Approach for now:
    // When a user logs in, they see their Empty dashboard.
    // The "legacy" data is effectively orphaned unless I assign it to someone.
    // Given the user asked for "different users for different students",
    // starting FRESH for each new user is likely the intended behavior.
    // So, I should only allow deleting if student.userId === user.id.
    // Legacy data will just sit there (or be visible if I allowed it in GET, but I filtered GET by `userId: user.id`).
    // So GET returns nothing for new users.
    // Thus, `deleteStudent` will only be called for students CREATED by the user (which will have the correct userId).
    // So strict check is fine.

    if (student.userId !== user.id) {
      // However, if the student IS legacy_user, and I (new user) don't see it (because GET filters), I can't click delete.
      // So this check is safe.
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
