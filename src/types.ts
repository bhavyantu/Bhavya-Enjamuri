export type UserRole = 'user' | 'faculty' | 'representer';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName: string;
}

export type EpisodeStatus = 'pending' | 'drafted' | 'recorded';

export interface Episode {
  id?: string;
  topic: string;
  host: string;
  guestNames: string[];
  guestEmails: string[];
  assignDate: any; // Firestore Timestamp
  status: EpisodeStatus;
  summary: string;
  createdBy: string;
  createdAt: any; // Firestore Timestamp
}
