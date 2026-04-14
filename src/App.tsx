import React, { useEffect, useState } from 'react';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, onSnapshot, query, orderBy, getDocFromCache, getDocFromServer, updateDoc } from 'firebase/firestore';
import { UserProfile, Episode } from './types';
import { Auth } from './components/Auth';
import { EpisodeList } from './components/EpisodeList';
import { EpisodeForm } from './components/EpisodeForm';
import { Button } from '@/components/ui/button';
import { PlusCircle, Mic2, LayoutDashboard, RefreshCw } from 'lucide-react';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ErrorBoundary } from './components/ErrorBoundary';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEpisode, setEditingEpisode] = useState<Episode | null>(null);
  const [connError, setConnError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Re-triggering the query can sometimes help if the listener is stale
      const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'));
      // We don't need to do much else as onSnapshot is already listening
      setTimeout(() => setRefreshing(false), 800);
    } catch (error) {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('the client is offline')) {
          setConnError("Firebase connection error: The client is offline. Please check your configuration.");
        }
      }
    }
    testConnection();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userDoc = await getDoc(doc(db, 'users', u.uid));
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          if (u.email === '24091a3324@rgmcet.edu.in' && data.role !== 'representer') {
            data.role = 'representer';
            // Sync to Firestore
            updateDoc(doc(db, 'users', u.uid), { role: 'representer' }).catch(console.error);
          }
          setProfile(data);
        } else if (u.email === '24091a3324@rgmcet.edu.in') {
          setProfile({
            uid: u.uid,
            email: u.email,
            displayName: u.displayName || 'Admin',
            role: 'representer'
          });
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) {
      setEpisodes([]);
      return;
    }

    const q = query(collection(db, 'episodes'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Episode));
      setEpisodes(eps);
    });

    return () => unsubscribe();
  }, [user]);

  const handleEdit = (episode: Episode) => {
    setEditingEpisode(episode);
    setFormOpen(true);
  };

  const handleAdd = () => {
    setEditingEpisode(null);
    setFormOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <Mic2 className="h-12 w-12 text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Loading RGM Podcast Planner...</p>
        </div>
      </div>
    );
  }

  const canEditAll = profile?.role === 'representer' || user?.email === '24091a3324@rgmcet.edu.in';
  const canEditLimited = profile?.role === 'faculty';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Navigation */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary p-1.5 rounded-lg">
              <Mic2 className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">RGM Podcast Planner</h1>
          </div>
          <Auth user={user} profile={profile} loading={loading} variant="header" />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {connError && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm">
            {connError}
          </div>
        )}
        {!user ? (
          <Auth user={user} profile={profile} loading={loading} variant="full" />
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Dashboard</h2>
                <p className="text-muted-foreground">
                  Welcome back, {user.displayName} 
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 capitalize border border-slate-200">
                    {profile?.role || 'User'} Portal
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={handleRefresh} 
                  disabled={refreshing}
                  className={refreshing ? 'animate-spin' : ''}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                {canEditAll && (
                  <Button onClick={handleAdd} className="gap-2">
                    <PlusCircle className="h-4 w-4" />
                    New Episode
                  </Button>
                )}
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md">
                <TabsTrigger value="all" className="gap-2">
                  <LayoutDashboard className="h-4 w-4" />
                  Episode List
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2">
                  Summary View
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-6">
                <EpisodeList 
                  episodes={episodes} 
                  role={profile?.role || 'user'} 
                  onEdit={handleEdit} 
                />
              </TabsContent>
              
              <TabsContent value="summary" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {episodes.map((ep) => (
                    <Card key={ep.id} className="flex flex-col">
                      <CardHeader>
                        <div className="flex justify-between items-start gap-2">
                          <CardTitle className="text-lg">{ep.topic}</CardTitle>
                          <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-100 border capitalize">
                            {ep.status}
                          </span>
                        </div>
                        <CardDescription>Host: {ep.host}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex-1">
                        <div className="space-y-4">
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Guests</h4>
                            <p className="text-sm text-muted-foreground">
                              {ep.guestNames.length > 0 ? ep.guestNames.join(', ') : 'No guests listed'}
                            </p>
                            {ep.guestEmails && ep.guestEmails.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1 italic">
                                {ep.guestEmails.join(', ')}
                              </p>
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-semibold mb-1">Summary</h4>
                            <p className="text-sm text-muted-foreground line-clamp-4">
                              {ep.summary || 'No summary provided yet.'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {episodes.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No episodes to summarize.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>

      {profile && (
        <EpisodeForm 
          open={formOpen} 
          onOpenChange={setFormOpen} 
          editingEpisode={editingEpisode}
          canEditAll={canEditAll}
          canEditLimited={canEditLimited}
        />
      )}
      
      <footer className="mt-auto py-8 border-t bg-white">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} RGM College of Engineering and Technology. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
