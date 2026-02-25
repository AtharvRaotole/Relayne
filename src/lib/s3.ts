import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env'

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY)

export async function uploadFile(params: {
  bucket: string
  path: string
  file: Buffer
  contentType: string
}): Promise<string> {
  const { data, error } = await supabase.storage
    .from(params.bucket)
    .upload(params.path, params.file, {
      contentType: params.contentType,
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)

  const { data: urlData } = supabase.storage
    .from(params.bucket)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}
