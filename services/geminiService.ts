function fallbackParentMessage(
  studentName: string,
  homeworkTitle: string,
  status: string,
) {
  const statusText =
    status === 'MISSING' ? 'yapılmadığını' : 'bazı bölümlerin eksik kaldığını'
  const detailText =
    status === 'MISSING'
      ? 'ödevin tamamlanması'
      : 'eksik kısımların tamamlanması'
  return `Sayın Velimiz, ${studentName}'in "${homeworkTitle}" isimli ödevini kontrol ettiğimde ${statusText} fark ettim. Konunun tam olarak pekişmesi ve öğrenme sürecinin aksamaması adına ${detailText} konusunda ${studentName}'e destek olmanızı rica ederim. İlginiz için teşekkürler, iyi günler dilerim.`
}

export async function generateParentMessage(
  studentName: string,
  homeworkTitle: string,
  status: string,
) {
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
      data.text || fallbackParentMessage(studentName, homeworkTitle, status)
    )
  } catch (error) {
    console.error('AI call failed, using fallback', error)
    return fallbackParentMessage(studentName, homeworkTitle, status)
  }
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
