import { createClient } from '@supabase/supabase-js';
import { config } from '../config/index.js';

export const supabase =
  config.supabase.url && config.supabase.anonKey
    ? createClient(config.supabase.url, config.supabase.anonKey)
    : null;

/**
 * Uploads a base64 image or buffer to Supabase Storage bucket 'xabarchi-media'
 */
export async function uploadImageToSupabase(fileBuffer: Buffer | ArrayBuffer, fileName: string, mimeType: string = 'image/jpeg'): Promise<string> {
  try {
    if (!supabase) {
      console.warn('[Supabase Upload] Supabase credentials missing, returning fallback image URL.');
      return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
    }

    const bucketName = 'xabarchi-media';
    const filePath = `uploads/${Date.now()}_${fileName}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      console.warn('[Supabase Upload Warning] Supabase storage error or unconfigured credentials:', error.message);
      return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
    }

    const { data: publicUrlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);
    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('[Supabase Upload Exception]:', err);
    return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
  }
}
