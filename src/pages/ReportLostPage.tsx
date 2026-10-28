import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Search, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { itemSchema, ItemFormData } from '../lib/validators';
import { itemsService } from '../services/itemsService';
import { useAuth } from '../context/AuthContext';
import { ITEM_CATEGORIES, CAMPUS_LOCATIONS } from '../types/database';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ImageUpload } from '../components/ui/ImageUpload';
import { Alert } from '../components/ui/EmptyState';

export const ReportLostPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      itemName: '',
      category: '',
      description: '',
      location: '',
      incidentDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    if (!user) {
      setServerError('You must be logged in to report a lost item.');
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      await itemsService.createItem({
        owner_id: user.id,
        item_type: 'lost',
        item_name: data.itemName,
        category: data.category,
        description: data.description,
        location: data.location,
        incident_date: data.incidentDate,
        image_path: imageUrl,
        status: 'open',
      });

      // Navigate to dashboard tab for lost items
      navigate('/dashboard?tab=lost');
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit lost item report.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to listings</span>
      </button>

      {/* Card Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shadow-xs">
            <Search className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Report a Lost Belonging
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Broadcast your lost item so fellow students and staff can assist if found
            </p>
          </div>
        </div>

        {serverError && (
          <Alert variant="error" className="mb-6">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Item Name */}
          <Input
            label="Item Name / Title"
            placeholder="e.g. Blue HP Pavilion Laptop Charger with taped cable"
            required
            error={errors.itemName?.message}
            {...register('itemName')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category */}
            <Select
              label="Category"
              required
              options={['', ...ITEM_CATEGORIES]}
              error={errors.category?.message}
              {...register('category')}
            />

            {/* Last Seen Location */}
            <Select
              label="Last Seen Campus Location"
              required
              options={['', ...CAMPUS_LOCATIONS]}
              error={errors.location?.message}
              {...register('location')}
            />
          </div>

          {/* Incident Date */}
          <Input
            type="date"
            label="Date Lost"
            required
            error={errors.incidentDate?.message}
            {...register('incidentDate')}
          />

          {/* Description */}
          <Textarea
            label="Description & Distinguishing Features"
            placeholder="Mention any recognizable details like stickers, color shades, brand models, marks, or attached keychains (min 10 characters)..."
            rows={4}
            required
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Optional Photograph */}
          <ImageUpload
            label="Optional Photograph or Reference Image"
            value={imageUrl}
            onChange={setImageUrl}
            userId={user?.id}
            helperText="Upload a photo if you have one, or reference image of similar model"
          />

          {/* Action buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/dashboard')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              className="px-6"
            >
              <span>Submit Lost Report</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
