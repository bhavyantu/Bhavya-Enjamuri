import React, { useState } from 'react';
import { Episode, UserRole } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Download, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../firebase';
import { deleteDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { toast } from 'sonner';

interface EpisodeListProps {
  episodes: Episode[];
  role: UserRole;
  onEdit: (episode: Episode) => void;
}

export const EpisodeList: React.FC<EpisodeListProps> = ({ episodes, role, onEdit }) => {
  const [error, setError] = useState<string | null>(null);
  const canEditAll = role === 'representer';
  const canEditLimited = role === 'faculty';
  const canDelete = role === 'representer';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'recorded': return 'bg-green-500 hover:bg-green-600';
      case 'drafted': return 'bg-blue-500 hover:bg-blue-600';
      default: return 'bg-yellow-500 hover:bg-yellow-600';
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    console.log('Attempting to delete episode:', id);
    if (window.confirm('Are you sure you want to delete this episode?')) {
      const toastId = toast.loading('Deleting episode...');
      try {
        await deleteDoc(doc(db, 'episodes', id));
        console.log('Successfully deleted episode:', id);
        toast.success('Episode deleted successfully', { id: toastId });
      } catch (err: any) {
        console.error('Delete error:', err);
        toast.error('Failed to delete episode', { id: toastId });
        handleFirestoreError(err, OperationType.DELETE, `episodes/${id}`);
      }
    }
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text('RGM College Podcast Planner', 14, 15);
    
    const tableData = episodes.map(ep => [
      ep.topic,
      ep.host,
      ep.guestNames.join(', '),
      ep.guestEmails?.join(', ') || 'N/A',
      ep.assignDate ? format(new Date(ep.assignDate.seconds * 1000), 'MMM dd, yyyy') : 'N/A',
      ep.status.toUpperCase(),
      ep.summary || ''
    ]);

    autoTable(doc, {
      head: [['Topic', 'Host', 'Guests', 'Emails', 'Date', 'Status', 'Summary']],
      body: tableData,
      startY: 25,
    });

    doc.save('podcast-planner.pdf');
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg flex justify-between items-center">
          <span>{error}</span>
          <Button variant="ghost" size="sm" onClick={() => setError(null)} className="h-auto p-1">
            &times;
          </Button>
        </div>
      )}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Podcast Episodes</h2>
        <Button variant="outline" size="sm" onClick={downloadPDF} className="gap-2">
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Topic</TableHead>
              <TableHead>Host</TableHead>
              <TableHead>Guests & Emails</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {episodes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No episodes found.
                </TableCell>
              </TableRow>
            ) : (
              episodes.map((ep) => (
                <TableRow key={ep.id}>
                  <TableCell className="font-medium">{ep.topic}</TableCell>
                  <TableCell>{ep.host}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{ep.guestNames.join(', ')}</span>
                      {ep.guestEmails && ep.guestEmails.length > 0 && (
                        <span className="text-xs text-muted-foreground">{ep.guestEmails.join(', ')}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {ep.assignDate ? format(new Date(ep.assignDate.seconds * 1000), 'MMM dd, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(ep.status)}>
                      {ep.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(canEditAll || canEditLimited) && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit(ep)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button variant="ghost" size="icon" onClick={() => ep.id && handleDelete(ep.id)} className="text-destructive">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
