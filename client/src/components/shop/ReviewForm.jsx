import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Star } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/endpoints.js';
import { useAuth } from '@/store/authStore.js';
import { Button, Field, Input, Textarea } from '@/components/ui/index.jsx';

const schema = z.object({ rating: z.number().min(1, 'Choose a rating').max(5), title: z.string().max(120).optional(), comment: z.string().min(10, 'Please write at least 10 characters').max(2000) });

export function ReviewForm({ productId }) {
  const user = useAuth((s) => s.user); const qc = useQueryClient(); const [done, setDone] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm({ resolver: zodResolver(schema), defaultValues: { rating: 0 } });
  const rating = watch('rating');
  if (done) return <p role="status" className="rounded-2xl border border-line bg-surface p-4 text-sm">Thank you! Your review will appear once our team has approved it.</p>;
  if (!user) return <p className="text-sm text-muted"><Link to="/login" className="text-accent underline">Sign in</Link> to review a product you have purchased.</p>;
  const submit = async (v) => {
    try { await api.reviews.create({ productId, ...v }); setDone(true); qc.invalidateQueries({ queryKey: ['reviews'] }); }
    catch (e) { toast.error(e.message); }
  };
  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-4 rounded-2xl border border-line bg-surface p-5" noValidate>
      <h3 className="text-2xl">Write a review</h3>
      <fieldset><legend className="mb-1 text-sm font-medium">Your rating</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Rating">{[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setValue('rating', n, { shouldValidate: true })} className="grid size-11 place-items-center">
            <Star className={n <= rating ? 'size-7 fill-gold-400 text-gold-400' : 'size-7 text-line'} /></button>))}</div>
        {errors.rating && <p role="alert" className="text-xs text-[var(--danger)]">{errors.rating.message}</p>}</fieldset>
      <Field label="Title (optional)">{(id) => <Input id={id} {...register('title')} />}</Field>
      <Field label="Your review" error={errors.comment?.message}>{(id, err) => <Textarea id={id} aria-describedby={err} {...register('comment')} />}</Field>
      <p className="text-xs text-muted">Only customers who bought this product can review it.</p>
      <Button type="submit" loading={isSubmitting}>Submit review</Button>
    </form>
  );
}
