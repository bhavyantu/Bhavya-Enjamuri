import React, { useState } from 'react';
import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, updateDoc, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Episode, EpisodeStatus } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

import { handleFirestoreError, OperationType } from '../lib/firestore-errors';

interface EpisodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingEpisode?: Episode | null;
  canEditAll: boolean;
  canEditLimited: boolean;
}

export const EpisodeForm: React.FC<EpisodeFormProps> = ({ 
  open, 
  onOpenChange, 
  editingEpisode,
  canEditAll,
  canEditLimited
}) => {
  const [topic, setTopic] = useState(editingEpisode?.topic || '');
  const [host, setHost] = useState(editingEpisode?.host || '');
  const [guestNames, setGuestNames] = useState(editingEpisode?.guestNames.join(', ') || '');
  const [guestEmails, setGuestEmails] = useState(editingEpisode?.guestEmails?.join(', ') || '');
  const [assignDate, setAssignDate] = useState(
    editingEpisode?.assignDate 
      ? new Date(editingEpisode.assignDate.seconds * 1000).toISOString().split('T')[0] 
      : ''
  );
  const [status, setStatus] = useState<EpisodeStatus>(editingEpisode?.status || 'pending');
  const [summary, setSummary] = useState(editingEpisode?.summary || '');
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const validateEmails = (emails: string[]) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emails.every(email => emailRegex.test(email.trim()));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const emails = guestEmails.split(',').map(s => s.trim()).filter(s => s !== '');
    if (emails.length > 0 && !validateEmails(emails)) {
      setEmailError('One or more guest emails are invalid.');
      return;
    }
    setEmailError(null);
    setLoading(true);

    try {
      const episodeData = {
        topic,
        host,
        guestNames: guestNames.split(',').map(s => s.trim()).filter(s => s !== ''),
        guestEmails: emails,
        assignDate: assignDate ? new Date(assignDate) : null,
        status,
        summary,
      };

      setFormError(null);
      if (editingEpisode?.id) {
        const docRef = doc(db, 'episodes', editingEpisode.id);
        try {
          // Both Admin and Faculty can now edit all fields
          await updateDoc(docRef, episodeData);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `episodes/${editingEpisode.id}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'episodes'), {
            ...episodeData,
            createdBy: auth.currentUser.uid,
            createdAt: serverTimestamp(),
          });
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, 'episodes');
        }
      }
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving episode:', error);
      setFormError(error.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{editingEpisode ? 'Edit Episode' : 'Add New Episode'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="topic">Topic</Label>
            <Input 
              id="topic" 
              value={topic} 
              onChange={(e) => setTopic(e.target.value)} 
              disabled={!canEditAll && !canEditLimited}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="host">Host</Label>
            <Input 
              id="host" 
              value={host} 
              onChange={(e) => setHost(e.target.value)} 
              disabled={!canEditAll && !canEditLimited}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guests">Guests (comma separated)</Label>
            <Input 
              id="guests" 
              value={guestNames} 
              onChange={(e) => setGuestNames(e.target.value)} 
              disabled={!canEditAll && !canEditLimited}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guestEmails">Guest Emails (comma separated)</Label>
            <Input 
              id="guestEmails" 
              type="text"
              value={guestEmails} 
              onChange={(e) => {
                setGuestEmails(e.target.value);
                if (emailError) setEmailError(null);
              }} 
              disabled={!canEditAll && !canEditLimited}
              placeholder="guest@example.com, another@example.com"
              className={emailError ? 'border-destructive' : ''}
            />
            {emailError && <p className="text-xs text-destructive">{emailError}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Assign Date</Label>
            <Input 
              id="date" 
              type="date" 
              value={assignDate} 
              onChange={(e) => setAssignDate(e.target.value)} 
              disabled={!canEditAll && !canEditLimited}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={status} onValueChange={(v: EpisodeStatus) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="drafted">Drafted</SelectItem>
                <SelectItem value="recorded">Recorded</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea 
              id="summary" 
              value={summary} 
              onChange={(e) => setSummary(e.target.value)} 
              placeholder="Enter episode summary..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter className="flex flex-col gap-4">
            {formError && (
              <div className="w-full p-3 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="font-semibold mb-1">Save Failed:</p>
                <p className="break-all">{formError}</p>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full sm:w-auto">
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
