import React, { useState } from 'react';
import { auth, db, googleProvider } from '../firebase';
import { 
  signInWithPopup, 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserProfile, UserRole } from '../types';
import { LogIn, LogOut, GraduationCap, ShieldCheck, Users, User, Mail, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthProps {
  user: any;
  profile: UserProfile | null;
  loading: boolean;
  variant?: 'header' | 'full';
}

export const Auth: React.FC<AuthProps> = ({ user, profile, loading, variant = 'full' }) => {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('faculty');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const userDoc = await getDoc(doc(db, 'users', result.user.uid));
      
      if (!userDoc.exists()) {
        const newProfile: UserProfile = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          role: result.user.email === '24091a3324@rgmcet.edu.in' ? 'representer' : selectedRole,
        };
        await setDoc(doc(db, 'users', result.user.uid), newProfile);
      }
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setIsSubmitting(true);

    try {
      if (mode === 'signup') {
        const result = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(result.user, { displayName });
        
        const newProfile: UserProfile = {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: displayName,
          role: result.user.email === '24091a3324@rgmcet.edu.in' ? 'representer' : selectedRole,
        };
        await setDoc(doc(db, 'users', result.user.uid), newProfile);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (error: any) {
      let message = error.message;
      if (error.code === 'auth/invalid-credential') {
        message = mode === 'signin' 
          ? "Invalid email or password. Please check your credentials or click 'Sign Up' if you don't have an account."
          : "There was an issue creating your account. Please check your details.";
      } else if (error.code === 'auth/user-not-found') {
        message = "No account found with this email. Please sign up first.";
      } else if (error.code === 'auth/wrong-password') {
        message = "Incorrect password. Please try again.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "An account already exists with this email. Please sign in instead.";
      } else if (error.code === 'auth/weak-password') {
        message = "Password should be at least 6 characters.";
      } else if (error.code === 'auth/invalid-email') {
        message = "Please enter a valid email address.";
      }
      setAuthError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError("Please enter your email address first.");
      return;
    }
    setAuthError(null);
    setAuthSuccess(null);
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setAuthSuccess("Password reset email sent! Please check your inbox.");
    } catch (error: any) {
      setAuthError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return null;

  if (user) {
    const displayRole = user.email === '24091a3324@rgmcet.edu.in' ? 'representer' : (profile?.role || 'User');
    return (
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end">
          <span className="text-sm font-medium">{user.displayName}</span>
          <span className="text-xs text-muted-foreground capitalize">{displayRole}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    );
  }

  if (variant === 'header') return null;

  return (
    <div className="w-full max-w-md mx-auto py-12 px-4">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-slate-900 p-3 rounded-xl mb-4 shadow-lg">
          <GraduationCap className="h-10 w-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900">RGM CET</h1>
        <p className="text-slate-500 font-medium">Podcast Episode Planner</p>
      </div>

      <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-bold">
            {mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </CardTitle>
          <CardDescription>
            {mode === 'signin' 
              ? 'Select your portal to access the planner.' 
              : mode === 'signup' 
                ? 'Join the RGM Podcast planning team.'
                : 'Enter your email to receive a reset link.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {mode !== 'forgot' && (
            <Tabs 
              value={selectedRole} 
              onValueChange={(v) => setSelectedRole(v as UserRole)} 
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 h-20 bg-slate-100/50 p-1">
                <TabsTrigger 
                  value="faculty" 
                  className="flex flex-col gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <Users className="h-4 w-4" />
                  <span className="text-xs">Faculty</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="user" 
                  className="flex flex-col gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <User className="h-4 w-4" />
                  <span className="text-xs">User</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="representer" 
                  className="flex flex-col gap-1 data-[state=active]:bg-white data-[state=active]:shadow-sm"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span className="text-xs">Admin</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          )}

          {mode !== 'forgot' && (
            <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-100">
              <p className="text-xs text-blue-700 leading-relaxed">
                {selectedRole === 'user' && 'User Portal: View-only access to browse episodes and schedules.'}
                {selectedRole === 'faculty' && 'Faculty Portal: Review episodes and update summaries/status.'}
                {selectedRole === 'representer' && 'Admin Portal: Full access to manage episodes, hosts, and guests.'}
              </p>
              {mode === 'signin' && (
                <p className="mt-2 text-[10px] text-blue-600 italic">
                  Note: For existing accounts, your portal is determined by your registered role.
                </p>
              )}
            </div>
          )}

          <form onSubmit={mode === 'forgot' ? handleForgotPassword : handleEmailAuth} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="name" 
                    placeholder="Enter your name" 
                    className="pl-10"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input 
                  id="email" 
                  type="email"
                  placeholder="Enter your college email" 
                  className="pl-10"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            {mode !== 'forgot' && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                {mode === 'signin' && (
                  <div className="flex justify-end">
                    <button 
                      type="button"
                      onClick={() => {
                        setMode('forgot');
                        setAuthError(null);
                        setAuthSuccess(null);
                      }}
                      className="text-xs text-slate-500 hover:text-slate-900 underline underline-offset-2"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}
              </div>
            )}

            {authSuccess && (
              <div className="text-xs text-green-600 bg-green-50 p-3 rounded-lg border border-green-200">
                {authSuccess}
              </div>
            )}

            {authError && (
              <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                <p className="font-semibold mb-1">Authentication Error:</p>
                <p>{authError}</p>
                {authError.includes('operation-not-allowed') && (
                  <p className="mt-2 text-slate-600">
                    Tip: Please enable "Email/Password" in your Firebase Console Authentication settings.
                  </p>
                )}
              </div>
            )}

            <Button type="submit" className="w-full bg-slate-900 hover:bg-slate-800" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : (mode === 'signin' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link')}
            </Button>
          </form>

          {mode === 'forgot' && (
            <Button 
              variant="ghost" 
              className="w-full" 
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setAuthSuccess(null);
              }}
            >
              Back to Sign In
            </Button>
          )}

          {mode !== 'forgot' && (
            <>
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500">Or continue with</span>
                </div>
              </div>

              <Button variant="outline" onClick={handleGoogleLogin} className="w-full gap-2">
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>

              <div className="text-center space-y-2">
                <p className="text-sm text-slate-500">
                  {mode === 'signin' ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => {
                      setMode(mode === 'signin' ? 'signup' : 'signin');
                      setAuthError(null);
                      setAuthSuccess(null);
                    }}
                    className="text-slate-900 font-semibold underline underline-offset-4"
                  >
                    {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                  </button>
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                  Authorized personnel only. Contact IT for access issues.
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
