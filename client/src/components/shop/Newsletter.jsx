import { useState } from 'react';
import { toast } from 'sonner';
import { Button, Input } from '@/components/ui/index.jsx';
import { api } from '@/api/endpoints.js';

export function NewsletterForm() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.newsletter(email); toast.success('You are subscribed. Welcome!'); setEmail(''); } catch (err) { toast.error(err.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={submit} className="flex gap-2" aria-label="Newsletter signup">
      <label htmlFor="nl-email" className="sr-only">Email address</label>
      <Input id="nl-email" type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
      <Button type="submit" loading={busy} className="shrink-0">Join</Button>
    </form>
  );
}
