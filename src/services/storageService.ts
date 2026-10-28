import { supabase, isSupabaseConfigured } from '../lib/supabase';

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

export interface UploadResult {
  url: string;
  error?: string;
}

export const storageService = {
  validateImage(file: File): { valid: boolean; error?: string } {
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        valid: false,
        error: 'Invalid file format. Please upload a JPG, PNG, or WebP image.',
      };
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: 'File size exceeds 5MB limit. Please choose a smaller image.',
      };
    }

    return { valid: true };
  },

  async uploadItemImage(file: File, userId: string): Promise<UploadResult> {
    const validation = this.validateImage(file);
    if (!validation.valid) {
      return { url: '', error: validation.error };
    }

    // If Supabase is configured, upload to storage bucket
    if (isSupabaseConfigured()) {
      try {
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg';
        const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('item-images')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('Supabase storage upload error:', uploadError);
          return { url: '', error: uploadError.message };
        }

        const { data } = supabase.storage.from('item-images').getPublicUrl(fileName);
        return { url: data.publicUrl };
      } catch (err: any) {
        return { url: '', error: err.message || 'Image upload failed' };
      }
    }

    // Fallback in local/mock mode: Convert to data URL for storage and instant preview
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve({ url: reader.result as string });
      };
      reader.onerror = () => {
        resolve({ url: '', error: 'Failed to read local image file.' });
      };
      reader.readAsDataURL(file);
    });
  },
};
