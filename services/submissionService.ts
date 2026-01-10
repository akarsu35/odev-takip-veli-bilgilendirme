import prismaDefault from './prisma'
import type { PrismaClient } from '@prisma/client'
import { HomeworkStatus } from '../types'

type CreateSubmissionInput = {
  studentId: string
  homeworkId: string
  status: HomeworkStatus
  isNotified?: boolean
}

export async function createSubmission(
  data: CreateSubmissionInput,
  db: PrismaClient = prismaDefault
) {
  return db.submission.create({ data })
}

export async function getSubmissionById(
  id: string,
  db: PrismaClient = prismaDefault
) {
  return db.submission.findUnique({ where: { id } })
}

export async function getSubmissions(
  filter?: { studentId?: string; homeworkId?: string },
  db: PrismaClient = prismaDefault
) {
  const where: any = {}
  if (filter?.studentId) where.studentId = filter.studentId
  if (filter?.homeworkId) where.homeworkId = filter.homeworkId
  return db.submission.findMany({ where })
}

export async function updateSubmission(
  id: string,
  data: Partial<{ status: HomeworkStatus; isNotified: boolean }>,
  db: PrismaClient = prismaDefault
) {
  return db.submission.update({ where: { id }, data })
}

export async function deleteSubmission(
  id: string,
  db: PrismaClient = prismaDefault
) {
  return db.submission.delete({ where: { id } })
}

export default {
  createSubmission,
  getSubmissionById,
  getSubmissions,
  updateSubmission,
  deleteSubmission,
}
