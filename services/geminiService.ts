// The `@google/genai` library must NOT run in the browser because it
// requires a secret API key. We dynamically import and use it only when
// running server-side (Node). In the browser we return safe, local
// fallback strings so the UI continues to work.

import type { GoogleGenAI } from '@google/genai'

let aiClient: InstanceType<typeof GoogleGenAI> | null = null

async function getAiClient() {
  if (aiClient) return aiClient
  // Only load the library on the server
  if (typeof window !== 'undefined') return null
  try {
    const mod = await import('@google/genai')
    const GoogleGenAI = (mod as any).GoogleGenAI as typeof GoogleGenAI
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY
    if (!key) return null
    // @ts-ignore
    aiClient = new GoogleGenAI({ apiKey: key })
    return aiClient
  } catch (e) {
    console.warn('Failed to initialize GoogleGenAI:', e)
    return null
  }
}

function fallbackParentMessage(
  studentName: string,
  homeworkTitle: string,
  status: string
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
  status: string
) {
  const prompt = `Öğrenci: ${studentName}, Ödev: "${homeworkTitle}", Durum: ${status}. Aşağıdaki taslağa benzer, nazik ve profesyonel bir WhatsApp mesajı oluştur. Sadece mesaj metnini döndür.`

  const ai = await getAiClient()
  if (!ai) {
    // no server-side AI available, return safe fallback
    return fallbackParentMessage(studentName, homeworkTitle, status)
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    })
    return (
      (response as any).text ||
      fallbackParentMessage(studentName, homeworkTitle, status)
    )
  } catch (error) {
    console.error('Gemini message generation failed', error)
    return fallbackParentMessage(studentName, homeworkTitle, status)
  }
}

export async function suggestHomeworkDescription(title: string) {
  const prompt = `${title} konusuyla ilgili ortaokul seviyesinde kısa bir ödev açıklaması yaz.`
  const ai = await getAiClient()
  if (!ai) return `${title} ile ilgili kısa bir ödev: ...` // simple fallback
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    })
    return (response as any).text || ''
  } catch (error) {
    console.error('Gemini suggestion failed', error)
    return ''
  }
}
