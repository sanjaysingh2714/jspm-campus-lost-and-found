import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PlusCircle, ArrowLeft, ShieldCheck } from 'lucide-react';
import { itemSchema, ItemFormData } from '../lib/validators';
import { itemsService } from '../services/itemsService';
import { useAuth } from '../context/AuthContext';
import { ITEM_CATEGORIES, CAMPUS_LOCATIONS } from '../types/database';
import { Input, Textarea, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ImageUpload } from '../components/ui/ImageUpload';
import { Alert } from '../components/ui/EmptyState';

export const ReportFoundPage: React.FC = () => {
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
      setServerError('You must be logged in to report a found item.');
      return;
    }

    setServerError(null);
    setIsSubmitting(true);

    try {
      await itemsService.createItem({
        owner_id: user.id,
        item_type: 'found',
        item_name: data.itemName,
        category: data.category,
        description: data.description,
        location: data.location,
        incident_date: data.incidentDate,
        image_path: imageUrl,
        status: 'open',
      });

      // Navigate to dashboard tab for found items
      navigate('/dashboard?tab=found');
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit found item listing.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-900 mb-6 transition"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Back to listings</span>
      </button>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center shadow-xs">
            <PlusCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Report a Found Belonging
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Help reconnect an item found on campus with its rightful student owner
            </p>
          </div>
        </div>

        {serverError && (
          <Alert variant="error" className="mb-6">
            {serverError}
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <Input
            label="Item Name / Title"
            placeholder="e.g. Boat Airdopes Wireless Earbuds (White Case)"
            required
            error={errors.itemName?.message}
            {...register('itemName')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Category"
              required
              options={['', ...ITEM_CATEGORIES]}
              error={errors.category?.message}
              {...register('category')}
            />

            <Select
              label="Campus Location Where Found"
              required
              options={['', ...CAMPUS_LOCATIONS]}
              error={errors.location?.message}
              {...register('location')}
            />
          </div>

          <Input
            type="date"
            label="Date Found"
            required
            error={errors.incidentDate?.message}
            {...register('incidentDate')}
          />

          <Textarea
            label="Description & General Condition"
            placeholder="Describe the item condition and where exactly it was picked up. Avoid disclosing private secrets (like full passcode or exact cash amount) so claimants can prove ownership."
            rows={4}
            required
            error={errors.description?.message}
            {...register('description')}
          />

          {/* Photograph Upload */}
          <ImageUpload
            label="Photograph of Found Item"
            value={imageUrl}
            onChange={setImageUrl}
            userId={user?.id}
            helperText="Clear photo of the item helps genuine owners identify it quickly (JPG, PNG, WebP)"
          />

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
              variant="accent"
              isLoading={isSubmitting}
              className="px-6 font-bold"
            >
              <span>Publish Found Item</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
