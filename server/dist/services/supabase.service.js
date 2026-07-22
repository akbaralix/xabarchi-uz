"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.uploadImageToSupabase = uploadImageToSupabase;
const supabase_js_1 = require("@supabase/supabase-js");
const index_js_1 = require("../config/index.js");
exports.supabase = index_js_1.config.supabase.url && index_js_1.config.supabase.anonKey
    ? (0, supabase_js_1.createClient)(index_js_1.config.supabase.url, index_js_1.config.supabase.anonKey)
    : null;
/**
 * Uploads a base64 image or buffer to Supabase Storage bucket 'xabarchi-media'
 */
async function uploadImageToSupabase(fileBuffer, fileName, mimeType = 'image/jpeg') {
    try {
        if (!exports.supabase) {
            console.warn('[Supabase Upload] Supabase credentials missing, returning fallback image URL.');
            return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
        }
        const bucketName = 'xabarchi-media';
        const filePath = `uploads/${Date.now()}_${fileName}`;
        const { data, error } = await exports.supabase.storage
            .from(bucketName)
            .upload(filePath, fileBuffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (error) {
            console.warn('[Supabase Upload Warning] Supabase storage error or unconfigured credentials:', error.message);
            return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
        }
        const { data: publicUrlData } = exports.supabase.storage.from(bucketName).getPublicUrl(filePath);
        return publicUrlData.publicUrl;
    }
    catch (err) {
        console.error('[Supabase Upload Exception]:', err);
        return 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop&q=80';
    }
}
