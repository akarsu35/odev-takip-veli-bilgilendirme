function fallbackParentMessage(
  studentName: string,
  homeworkTitle: string,
  status: string,
  schoolName?: string,
  teacherStatus?: string,
  userName?: string,
  isRenotify?: boolean,
): string {
  const signature =
    schoolName || teacherStatus || userName
      ? `\n\n${schoolName || ''}-${teacherStatus || ''}-${userName || ''}`
      : ''

  // Tamam (DONE) durumu için teşekkür mesajı
  if (status === 'DONE') {
    return `Sayın Velimiz, ${studentName}'in "${homeworkTitle}" isimli ödevini kontrol ettiğimde ödevini eksiksiz ve özenli bir şekilde tamamladığını gördüm. Gösterdiği gayret ve sorumluluk bilinci için ${studentName}'i tebrik ederim. Desteğiniz için teşekkürler, iyi günler dilerim.${signature}`
  }

  // Gelmedi (ABSENT) durumu için özel mesaj
  if (status === 'ABSENT') {
    return `Sayın Velimiz, bugünkü dersimize ${studentName} gelmediği için "${homeworkTitle}" konulu ödevini kontrol edemedim. Öğrencimizin ödevini en kısa sürede ulaştırması dileğiyle, İlginiz için teşekkürler, iyi günler dilerim.${signature}`
  }

  // Getirmedi (NOT_BROUGHT) durumu için özel mesaj
  if (status === 'NOT_BROUGHT') {
    return `Sayın Velimiz, ${studentName} bugünkü dersimize geldi ancak "${homeworkTitle}" konulu ödevini yanında getirmediği için kontrol edemedim. Ödevlerin zamanında ve düzenli olarak takip edilmesi öğrenme sürecinin devamlılığı açısından büyük önem taşımaktadır. ${studentName}'in ödevini en kısa sürede getirmesi konusunda desteğinizi rica ederim. İlginiz için teşekkürler, iyi günler dilerim.${signature}`
  }

  const detailText =
    status === 'MISSING'
      ? 'ödevin tamamlanması'
      : 'eksik kısımların tamamlanması'

  const statusText =
    status === 'MISSING' ? 'yapılmadığını' : 'bazı bölümlerin eksik kaldığını'

  // Tekrar bildirim için özel mesaj
  if (isRenotify) {
    return `Sayın Velimiz, daha önce bildirdiğimiz "${homeworkTitle}" ödevi halen ${statusText}. Konunun tam olarak pekişmesi ve öğrenme sürecinin aksamaması adına ${detailText} konusunda ${studentName}'e destek olmanızı rica ederim. İlginiz için teşekkürler, iyi günler dilerim.${signature}`
  }

  // Normal durum mesajları
  return `Sayın Velimiz, ${studentName}'in "${homeworkTitle}" isimli ödevini kontrol ettiğimde ${statusText} fark ettim. Konunun tam olarak pekişmesi ve öğrenme sürecinin aksamaması adına ${detailText} konusunda ${studentName}'e destek olmanızı rica ederim. İlginiz için teşekkürler, iyi günler dilerim.${signature}`
}

export function generateHomeworkAssignmentMessage(
  studentName: string,
  homeworkTitle: string,
  homeworkDescription: string,
  assignedDate: string,
  dueDate: string,
  schoolName?: string,
  teacherStatus?: string,
  userName?: string,
): string {
  const signature =
    schoolName || teacherStatus || userName
      ? `\n\n${schoolName || ''}-${teacherStatus || ''}-${userName || ''}`
      : ''

  // Format dates in Turkish locale
  const formattedAssignedDate = new Date(assignedDate).toLocaleDateString(
    'tr-TR',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  )

  const formattedDueDate = new Date(dueDate).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  let message = `Sayın Velimiz,\n\n${formattedAssignedDate} tarihinde "${homeworkTitle}" konulu ödev verilmiştir.\n\n`

  if (homeworkDescription) {
    message += `📝 Ödev Detayları:\n${homeworkDescription}\n\n`
  }

  message += `📅 Kontrol Tarihi: ${formattedDueDate}\n\n`
  message += `${studentName}'in ödevini özenle ve eksiksiz yapması konusunda desteğinizi rica ediyorum. Ödevlerimiz konuların pekişmesi için büyük önem taşımaktadır.\n\n`
  message += `İlginiz için teşekkürler, iyi günler dilerim.${signature}`

  return message
}

export async function generateParentMessage(
  studentName: string,
  homeworkTitle: string,
  status: string,
  schoolName?: string,
  teacherStatus?: string,
  userName?: string,
  isRenotify?: boolean,
) {
  // AI feature disabled - using fallback message directly
  // To enable: Add GEMINI_API_KEY to .env and uncomment the code below
  return fallbackParentMessage(
    studentName,
    homeworkTitle,
    status,
    schoolName,
    teacherStatus,
    userName,
    isRenotify,
  )

  /* AI Feature (requires GEMINI_API_KEY in .env):
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generateParentMessage',
        studentName,
        homeworkTitle,
        status,
      }),
    })
    if (!res.ok) throw new Error('AI API failed')
    const data = await res.json()
    return (
      data.text ||
      fallbackParentMessage(
        studentName,
        homeworkTitle,
        status,
        schoolName,
        teacherStatus,
        userName,
      )
    )
  } catch (error) {
    console.error('AI call failed, using fallback', error)
    return fallbackParentMessage(
      studentName,
      homeworkTitle,
      status,
      schoolName,
      teacherStatus,
      userName,
    )
  }
  */
}

export async function suggestHomeworkDescription(title: string) {
  try {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'suggestHomeworkDescription', title }),
    })
    if (!res.ok) throw new Error('AI API failed')
    const data = await res.json()
    return data.text || ''
  } catch (error) {
    console.error('AI suggestion failed', error)
    return ''
  }
}
