import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, isDemoConfig } from './data/firebase';
import {
  subscribeToUserSets,
  subscribeToCustomExercises,
  addWorkoutSet,
  updateWorkoutSet,
  deleteWorkoutSet,
  deleteExerciseSetsFromDate,
  createCustomExercise,
} from './data/workoutService';
import {
  subscribeUserProfile,
  subscribeBodyweightLog,
  updateUserProfile,
} from './data/profileService';
import { logoutUser, deleteAccountAndAllData, getStoredDemoUser } from './data/authService';
import type { SetItem, CustomExercise, UserProfile, BodyweightLogEntry } from './types';
import { getTodayString } from './utils/dateUtils';

import { Header } from './components/Header';
import { Navigation } from './components/Navigation';
import type { TabType } from './components/Navigation';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CalendarView } from './components/CalendarView';
import { WorkoutLogView } from './components/WorkoutLogView';
import { PRTab } from './components/PRTab';
import { ProfileModal } from './components/ProfileModal';
import { AuthScreen } from './components/AuthScreen';
import { Toast } from './components/Toast';
import type { ToastMessage } from './components/Toast';

export function App() {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // App Data State
  const [allSets, setAllSets] = useState<SetItem[]>([]);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [bodyweightLogs, setBodyweightLogs] = useState<BodyweightLogEntry[]>([]);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('workout');
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const showToast = (type: 'error' | 'success', text: string, onRetry?: () => void) => {
    setToast({ id: String(Date.now()), type, text, onRetry });
  };

  // Auth State Listener
  useEffect(() => {
    const checkDemoUser = () => {
      const demoUser = getStoredDemoUser();
      if (demoUser) {
        setCurrentUser({ uid: demoUser.uid, email: demoUser.email } as any);
        setIsAuthLoading(false);
        return true;
      }
      return false;
    };

    if (isDemoConfig) {
      checkDemoUser();

      const handleDemoChange = () => {
        const hasUser = checkDemoUser();
        if (!hasUser) setCurrentUser(null);
      };

      window.addEventListener('demo-auth-changed', handleDemoChange);
      setIsAuthLoading(false);
      return () => window.removeEventListener('demo-auth-changed', handleDemoChange);
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time Firestore / Local Data Listeners
  useEffect(() => {
    if (!currentUser) return;
    const uid = currentUser.uid;

    const unsubSets = subscribeToUserSets(
      uid,
      (sets) => setAllSets(sets),
      () => showToast('error', 'Failed to sync workout sets.')
    );

    const unsubCustom = subscribeToCustomExercises(uid, (custom) =>
      setCustomExercises(custom)
    );

    const unsubProfile = subscribeUserProfile(uid, (prof) => setProfile(prof));

    const unsubBwLogs = subscribeBodyweightLog(uid, (logs) => setBodyweightLogs(logs));

    return () => {
      unsubSets();
      unsubCustom();
      unsubProfile();
      unsubBwLogs();
    };
  }, [currentUser]);

  // If Auth is checking user session state
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-300 flex items-center justify-center font-bold text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Loading Steel Balls...</span>
        </div>
      </div>
    );
  }

  // Requirement 3: If logged out, show ONLY the login screen
  if (!currentUser) {
    return (
      <>
        <OfflineIndicator />
        <Toast toast={toast} onClose={() => setToast(null)} />
        <AuthScreen
          onError={(msg) => showToast('error', msg)}
          onSuccess={(msg) => showToast('success', msg)}
        />
      </>
    );
  }

  const userProfile = profile || {
    height: 175,
    bodyweight: 75,
    age: 25,
    gender: 'other',
    unit: 'kg',
  };

  // Handlers for Workout Operations
  const handleAddSet = async (
    exerciseId: string,
    exerciseName: string,
    isBodyweight: boolean,
    weight: number,
    reps: number,
    isPR: boolean
  ) => {
    try {
      await addWorkoutSet(currentUser.uid, {
        date: selectedDate,
        exerciseId,
        exerciseName,
        isBodyweight,
        weight,
        reps,
        bodyweightAtTime: userProfile.bodyweight || 0,
        isPR,
        createdAt: Date.now(),
      });
    } catch {
      showToast('error', 'Failed to add set. Click to retry.', () =>
        handleAddSet(exerciseId, exerciseName, isBodyweight, weight, reps, isPR)
      );
    }
  };

  const handleUpdateSet = async (setId: string, updates: Partial<SetItem>) => {
    try {
      await updateWorkoutSet(currentUser.uid, setId, updates);
    } catch {
      showToast('error', 'Failed to update set.');
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await deleteWorkoutSet(currentUser.uid, setId);
    } catch {
      showToast('error', 'Failed to delete set.');
    }
  };

  const handleDeleteExerciseFromDate = async (exerciseId: string) => {
    try {
      await deleteExerciseSetsFromDate(currentUser.uid, exerciseId, selectedDate);
      showToast('success', 'Exercise removed from date.');
    } catch {
      showToast('error', 'Failed to delete exercise sets.');
    }
  };

  const handleAddCustomExercise = async (name: string, isBodyweight: boolean) => {
    return await createCustomExercise(currentUser.uid, name, isBodyweight);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    await updateUserProfile(currentUser.uid, updates, userProfile);
    showToast('success', 'Profile updated!');
  };

  const handleLogout = async () => {
    await logoutUser();
    setIsProfileOpen(false);
    showToast('success', 'Logged out successfully.');
  };

  const handleDeleteAccount = async (reauthPassword?: string) => {
    await deleteAccountAndAllData(reauthPassword);
    setIsProfileOpen(false);
    showToast('success', 'Account and data reset.');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-['Outfit',sans-serif]">
      {/* Offline Alert Indicator */}
      <OfflineIndicator />

      {/* Toast Notifications */}
      <Toast toast={toast} onClose={() => setToast(null)} />

      {/* Top Header */}
      <Header
        profile={userProfile}
        userEmail={currentUser.email}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      {/* Main Tab Content View */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 pb-20">
        {activeTab === 'calendar' && (
          <CalendarView
            allSets={allSets}
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => setSelectedDate(dateStr)}
            onNavigateToWorkout={() => setActiveTab('workout')}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutLogView
            selectedDate={selectedDate}
            onSelectDate={(dateStr) => setSelectedDate(dateStr)}
            allSets={allSets}
            customExercises={customExercises}
            userProfile={userProfile}
            onAddSet={handleAddSet}
            onUpdateSet={handleUpdateSet}
            onDeleteSet={handleDeleteSet}
            onDeleteExerciseFromDate={handleDeleteExerciseFromDate}
            onAddCustomExercise={handleAddCustomExercise}
            onError={(msg) => showToast('error', msg)}
          />
        )}

        {activeTab === 'prs' && (
          <PRTab
            allSets={allSets}
            userProfile={userProfile}
            customExercises={customExercises}
            bodyweightLogs={bodyweightLogs}
            onAddSet={async (setData) => {
              await addWorkoutSet(currentUser.uid, setData);
            }}
            onUpdateSet={handleUpdateSet}
            onDeleteSet={handleDeleteSet}
            onAddCustomExercise={handleAddCustomExercise}
            onError={(msg) => showToast('error', msg)}
            onSuccess={(msg) => showToast('success', msg)}
          />
        )}
      </main>

      {/* Bottom Navigation */}
      <Navigation activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab)} />

      {/* Profile Modal (Opened via Header Profile Icon) */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        userEmail={currentUser.email}
        profile={userProfile}
        bodyweightLogs={bodyweightLogs}
        onUpdateProfile={handleUpdateProfile}
        onLogout={handleLogout}
        onDeleteAccount={handleDeleteAccount}
        onError={(msg) => showToast('error', msg)}
      />
    </div>
  );
}

export default App;
