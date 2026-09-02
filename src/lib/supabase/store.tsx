'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  Profile,
  PracticeStep,
  PracticeSummary,
  PracticeSession,
  EffortSettings,
  MASTER_PRACTICE_STEPS,
  DEFAULT_EFFORT_SETTINGS,
} from '@/types';
import { supabase, isSupabaseConfigured } from './client';
import { getCurrentPracticeSummary, getActivePracticeSummaries, getAllPracticeSummaries } from '../services/practice';
import { finalizePracticeSession } from '../services/timer';

interface StoreContextType {
  user: { id: string; email?: string } | null;
  profile: Profile | null;
  practiceSteps: PracticeStep[];
  practiceSummaries: PracticeSummary[];
  practiceSessions: PracticeSession[];
  effortSettings: EffortSettings;
  currentSummary: PracticeSummary | null;
  activeSummaries: PracticeSummary[];
  allSummaries: PracticeSummary[];
  runningSession: PracticeSession | null;
  isLoading: boolean;
  isOnlineBackend: boolean;
  
  // Auth & Profile
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileName: (name: string) => Promise<boolean>;
  
  // Summaries
  createPracticeSummary: (data: {
    practice_step_id: number;
    round_number: number;
    carried_duration_minutes?: number;
    start_date?: string | null;
    end_date?: string | null;
    status?: 'active' | 'paused' | 'completed';
  }) => Promise<PracticeSummary | null>;
  updatePracticeSummary: (
    id: number,
    data: Partial<PracticeSummary>
  ) => Promise<boolean>;
  deletePracticeSummary: (id: number) => Promise<boolean>;

  // Sessions
  createManualSession: (data: {
    practice_summary_id: number;
    practice_date: string;
    duration_minutes: number;
    result_note?: string;
  }) => Promise<PracticeSession | null>;
  startTimer: (
    practice_summary_id: number,
    mode: 'count_up' | 'count_down',
    plannedMinutes?: number
  ) => Promise<PracticeSession | null>;
  stopTimer: (resultNote?: string) => Promise<PracticeSession | null>;
  updateSession: (id: number, data: Partial<PracticeSession>) => Promise<boolean>;
  deleteSession: (id: number) => Promise<boolean>;

  // Settings
  updateEffortSettings: (data: Partial<EffortSettings>) => Promise<boolean>;
  resetEffortSettings: () => Promise<boolean>;
}

const StoreContext = createContext<StoreContextType | null>(null);

const STORAGE_KEYS = {
  PROFILE: '7doses_profile',
  SUMMARIES: '7doses_summaries',
  SESSIONS: '7doses_sessions',
  SETTINGS: '7doses_effort_settings',
  RUNNING_SESSION: '7doses_running_session',
  DEMO_USER: '7doses_demo_user',
};

const DEFAULT_USER_ID = 'demo-practitioner-uuid-001';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practiceSteps] = useState<PracticeStep[]>(
    MASTER_PRACTICE_STEPS.map((s) => ({
      ...s,
      created_at: '2026-01-01T00:00:00Z',
    }))
  );
  const [practiceSummaries, setPracticeSummaries] = useState<PracticeSummary[]>([]);
  const [practiceSessions, setPracticeSessions] = useState<PracticeSession[]>([]);
  const [effortSettings, setEffortSettings] = useState<EffortSettings>({
    id: 1,
    user_id: DEFAULT_USER_ID,
    ...DEFAULT_EFFORT_SETTINGS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [runningSession, setRunningSession] = useState<PracticeSession | null>(null);

  // Initialize data on mount
  useEffect(() => {
    async function init() {
      try {
        if (isSupabaseConfigured && supabase) {
          const { data: authData } = await supabase.auth.getUser();
          if (authData?.user) {
            setUser({ id: authData.user.id, email: authData.user.email });
            await loadSupabaseData(authData.user.id);
            setIsLoading(false);
            return;
          }
        }

        // Fallback to Local/Demo mode
        loadLocalData();
      } catch (err) {
        console.error('Initialization error, fallback to local store', err);
        loadLocalData();
      } finally {
        setIsLoading(false);
      }
    }

    init();
  }, []);

  // Save to LocalStorage whenever state changes (for local/offline mode)
  useEffect(() => {
    if (typeof window !== 'undefined' && profile) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
      localStorage.setItem(STORAGE_KEYS.SUMMARIES, JSON.stringify(practiceSummaries));
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(practiceSessions));
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(effortSettings));
      if (runningSession) {
        localStorage.setItem(STORAGE_KEYS.RUNNING_SESSION, JSON.stringify(runningSession));
      } else {
        localStorage.removeItem(STORAGE_KEYS.RUNNING_SESSION);
      }
    }
  }, [profile, practiceSummaries, practiceSessions, effortSettings, runningSession]);

  const loadLocalData = () => {
    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const savedSummaries = localStorage.getItem(STORAGE_KEYS.SUMMARIES);
    const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedRunning = localStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);

    const activeUser = { id: DEFAULT_USER_ID, email: 'practitioner@7doses.app' };
    setUser(activeUser);

    if (savedProfile) {
      setProfile(JSON.parse(savedProfile));
    } else {
      const defaultProfile: Profile = {
        id: 'profile-1',
        user_id: activeUser.id,
        practitioner_name: 'ผู้ปฏิบัติธรรม',
        email: activeUser.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setProfile(defaultProfile);
    }

    if (savedSummaries) {
      const parsed: PracticeSummary[] = JSON.parse(savedSummaries);
      // Map step references
      const withSteps = parsed.map((item) => ({
        ...item,
        step: practiceSteps.find((s) => s.id === item.practice_step_id),
      }));
      setPracticeSummaries(withSteps);
    } else {
      // Default: Step 1 Round 1
      const initialSummary: PracticeSummary = {
        id: 101,
        user_id: activeUser.id,
        practice_step_id: 1,
        round_number: 1,
        carried_duration_minutes: 0,
        start_date: new Date().toISOString().split('T')[0],
        end_date: null,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        step: practiceSteps[0],
      };
      setPracticeSummaries([initialSummary]);
    }

    if (savedSessions) {
      setPracticeSessions(JSON.parse(savedSessions));
    }

    if (savedSettings) {
      setEffortSettings(JSON.parse(savedSettings));
    }

    if (savedRunning) {
      setRunningSession(JSON.parse(savedRunning));
    }
  };

  const loadSupabaseData = async (userId: string) => {
    if (!supabase) return;

    // Load profile
    const { data: profData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profData) {
      setProfile(profData);
    }

    // Load summaries with steps
    const { data: summariesData } = await supabase
      .from('practice_summaries')
      .select('*, step:practice_steps(*)')
      .eq('user_id', userId)
      .order('id', { ascending: false });

    if (summariesData) {
      setPracticeSummaries(summariesData);
    }

    // Load sessions
    const { data: sessionsData } = await supabase
      .from('practice_sessions')
      .select('*, summary:practice_summaries(*, step:practice_steps(*))')
      .eq('user_id', userId)
      .order('practice_date', { ascending: false })
      .order('id', { ascending: false });

    if (sessionsData) {
      setPracticeSessions(sessionsData);
      const running = sessionsData.find((s) => s.session_status === 'running');
      if (running) {
        setRunningSession(running);
      }
    }

    // Load settings
    const { data: settingsData } = await supabase
      .from('effort_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (settingsData) {
      setEffortSettings(settingsData);
    }
  };

  // Auth methods
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
    } else {
      // Local demo sign in
      loadLocalData();
    }
  };

  const signOut = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
  };

  const updateProfileName = async (name: string): Promise<boolean> => {
    if (!profile) return false;
    const updated = { ...profile, practitioner_name: name.trim(), updated_at: new Date().toISOString() };
    setProfile(updated);

    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('profiles').update({ practitioner_name: name.trim() }).eq('user_id', user.id);
    }
    return true;
  };

  // Summaries CRUD
  const createPracticeSummary = async (data: {
    practice_step_id: number;
    round_number: number;
    carried_duration_minutes?: number;
    start_date?: string | null;
    end_date?: string | null;
    status?: 'active' | 'paused' | 'completed';
  }): Promise<PracticeSummary | null> => {
    const userId = user?.id || DEFAULT_USER_ID;
    const step = practiceSteps.find((s) => s.id === data.practice_step_id);

    const newId = practiceSummaries.length > 0
      ? Math.max(...practiceSummaries.map((s) => Number(s.id))) + 1
      : 101;

    const newSummary: PracticeSummary = {
      id: newId,
      user_id: userId,
      practice_step_id: data.practice_step_id,
      round_number: data.round_number,
      carried_duration_minutes: data.carried_duration_minutes || 0,
      start_date: data.start_date || new Date().toISOString().split('T')[0],
      end_date: data.end_date || null,
      status: data.status || 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      step,
    };

    setPracticeSummaries((prev) => [newSummary, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      const { data: inserted } = await supabase
        .from('practice_summaries')
        .insert({
          user_id: userId,
          practice_step_id: data.practice_step_id,
          round_number: data.round_number,
          carried_duration_minutes: data.carried_duration_minutes || 0,
          start_date: data.start_date || null,
          end_date: data.end_date || null,
          status: data.status || 'active',
        })
        .select('*, step:practice_steps(*)')
        .single();

      if (inserted) {
        setPracticeSummaries((prev) =>
          prev.map((s) => (s.id === newId ? inserted : s))
        );
        return inserted;
      }
    }

    return newSummary;
  };

  const updatePracticeSummary = async (
    id: number,
    data: Partial<PracticeSummary>
  ): Promise<boolean> => {
    setPracticeSummaries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s))
    );

    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from('practice_summaries')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
    }
    return true;
  };

  const deletePracticeSummary = async (id: number): Promise<boolean> => {
    setPracticeSummaries((prev) => prev.filter((s) => s.id !== id));
    setPracticeSessions((prev) => prev.filter((s) => s.practice_summary_id !== id));

    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('practice_summaries').delete().eq('id', id).eq('user_id', user.id);
    }
    return true;
  };

  // Sessions CRUD
  const createManualSession = async (data: {
    practice_summary_id: number;
    practice_date: string;
    duration_minutes: number;
    result_note?: string;
  }): Promise<PracticeSession | null> => {
    const userId = user?.id || DEFAULT_USER_ID;
    const summary = practiceSummaries.find((s) => s.id === data.practice_summary_id);

    const newId = practiceSessions.length > 0
      ? Math.max(...practiceSessions.map((s) => Number(s.id))) + 1
      : 1;

    const newSession: PracticeSession = {
      id: newId,
      user_id: userId,
      practice_summary_id: data.practice_summary_id,
      practice_date: data.practice_date,
      started_at: null,
      ended_at: null,
      duration_seconds: Math.max(0, data.duration_minutes * 60),
      result_note: data.result_note?.trim() || null,
      source: 'manual',
      timer_mode: null,
      planned_duration_seconds: null,
      target_end_at: null,
      session_status: 'completed',
      last_chime_index: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      summary,
    };

    setPracticeSessions((prev) => [newSession, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      const { data: inserted } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          practice_summary_id: data.practice_summary_id,
          practice_date: data.practice_date,
          duration_seconds: Math.max(0, data.duration_minutes * 60),
          result_note: data.result_note?.trim() || null,
          source: 'manual',
          session_status: 'completed',
        })
        .select('*, summary:practice_summaries(*, step:practice_steps(*))')
        .single();

      if (inserted) {
        setPracticeSessions((prev) =>
          prev.map((s) => (s.id === newId ? inserted : s))
        );
        return inserted;
      }
    }

    return newSession;
  };

  const startTimer = async (
    practice_summary_id: number,
    mode: 'count_up' | 'count_down',
    plannedMinutes: number = 30
  ): Promise<PracticeSession | null> => {
    const userId = user?.id || DEFAULT_USER_ID;
    const summary = practiceSummaries.find((s) => s.id === practice_summary_id);
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const plannedSeconds = mode === 'count_down' ? Math.max(60, plannedMinutes * 60) : null;
    const targetEndAt = plannedSeconds
      ? new Date(now.getTime() + plannedSeconds * 1000).toISOString()
      : null;

    const newId = practiceSessions.length > 0
      ? Math.max(...practiceSessions.map((s) => Number(s.id))) + 1
      : 1;

    const newSession: PracticeSession = {
      id: newId,
      user_id: userId,
      practice_summary_id,
      practice_date: todayStr,
      started_at: now.toISOString(),
      ended_at: null,
      duration_seconds: 0,
      result_note: null,
      source: 'timer',
      timer_mode: mode,
      planned_duration_seconds: plannedSeconds,
      target_end_at: targetEndAt,
      session_status: 'running',
      last_chime_index: 0,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      summary,
    };

    setRunningSession(newSession);
    setPracticeSessions((prev) => [newSession, ...prev]);

    if (isSupabaseConfigured && supabase && user) {
      const { data: inserted } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          practice_summary_id,
          practice_date: todayStr,
          started_at: now.toISOString(),
          source: 'timer',
          timer_mode: mode,
          planned_duration_seconds: plannedSeconds,
          target_end_at: targetEndAt,
          session_status: 'running',
          last_chime_index: 0,
        })
        .select('*, summary:practice_summaries(*, step:practice_steps(*))')
        .single();

      if (inserted) {
        setRunningSession(inserted);
        setPracticeSessions((prev) =>
          prev.map((s) => (s.id === newId ? inserted : s))
        );
        return inserted;
      }
    }

    return newSession;
  };

  const stopTimer = async (resultNote?: string): Promise<PracticeSession | null> => {
    if (!runningSession) return null;

    const finalized = finalizePracticeSession(runningSession, resultNote);

    setPracticeSessions((prev) =>
      prev.map((s) => (s.id === finalized.id ? finalized : s))
    );
    setRunningSession(null);

    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from('practice_sessions')
        .update({
          ended_at: finalized.ended_at,
          duration_seconds: finalized.duration_seconds,
          result_note: finalized.result_note,
          session_status: 'completed',
          updated_at: finalized.updated_at,
        })
        .eq('id', finalized.id)
        .eq('user_id', user.id);
    }

    return finalized;
  };

  const updateSession = async (
    id: number,
    data: Partial<PracticeSession>
  ): Promise<boolean> => {
    setPracticeSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updated_at: new Date().toISOString() } : s))
    );

    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from('practice_sessions')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', user.id);
    }
    return true;
  };

  const deleteSession = async (id: number): Promise<boolean> => {
    setPracticeSessions((prev) => prev.filter((s) => s.id !== id));

    if (runningSession && runningSession.id === id) {
      setRunningSession(null);
    }

    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('practice_sessions').delete().eq('id', id).eq('user_id', user.id);
    }
    return true;
  };

  // Settings
  const updateEffortSettings = async (data: Partial<EffortSettings>): Promise<boolean> => {
    const updated = { ...effortSettings, ...data, updated_at: new Date().toISOString() };
    setEffortSettings(updated);

    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from('effort_settings')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
    return true;
  };

  const resetEffortSettings = async (): Promise<boolean> => {
    const reset = {
      ...effortSettings,
      ...DEFAULT_EFFORT_SETTINGS,
      updated_at: new Date().toISOString(),
    };
    setEffortSettings(reset);

    if (isSupabaseConfigured && supabase && user) {
      await supabase
        .from('effort_settings')
        .update({ ...DEFAULT_EFFORT_SETTINGS, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
    return true;
  };

  // Derived memoized values
  const currentSummary = useMemo(
    () => getCurrentPracticeSummary(practiceSummaries),
    [practiceSummaries]
  );

  const activeSummaries = useMemo(
    () => getActivePracticeSummaries(practiceSummaries),
    [practiceSummaries]
  );

  const allSummaries = useMemo(
    () => getAllPracticeSummaries(practiceSummaries),
    [practiceSummaries]
  );

  return (
    <StoreContext.Provider
      value={{
        user,
        profile,
        practiceSteps,
        practiceSummaries,
        practiceSessions,
        effortSettings,
        currentSummary,
        activeSummaries,
        allSummaries,
        runningSession,
        isLoading,
        isOnlineBackend: isSupabaseConfigured,
        signInWithGoogle,
        signOut,
        updateProfileName,
        createPracticeSummary,
        updatePracticeSummary,
        deletePracticeSummary,
        createManualSession,
        startTimer,
        stopTimer,
        updateSession,
        deleteSession,
        updateEffortSettings,
        resetEffortSettings,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
