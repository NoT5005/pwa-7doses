'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { User as SupabaseUser } from '@supabase/supabase-js';
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
import {
  getCurrentPracticeSummary,
  getActivePracticeSummaries,
  getAllPracticeSummaries,
} from '../services/practice';
import {
  finalizePracticeSession,
  pausePracticeSession,
  resumePracticeSession,
} from '../services/timer';

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
  isDemoMode: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  hasLocalUnsyncedData: boolean;

  // Auth, Sync & Profile
  signInWithGoogle: () => Promise<void>;
  enterDemoMode: () => void;
  signOut: () => Promise<void>;
  syncData: () => Promise<void>;
  importLocalDataToCloud: () => Promise<number>;
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

  // Sessions & Timer Controls
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
  pauseTimer: () => Promise<PracticeSession | null>;
  resumeTimer: () => Promise<PracticeSession | null>;
  stopTimer: (resultNote?: string) => Promise<PracticeSession | null>;
  cancelTimer: () => Promise<boolean>;
  updateTimerChimeIndex: (newChimeIndex: number) => Promise<void>;
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
  DEMO_MODE: '7doses_demo_mode',
  CLOUD_CACHE_PREFIX: '7doses_cloud_cache_',
  MIGRATED_PREFIX: '7doses_migrated_to_',
};

const DEFAULT_USER_ID = 'demo-practitioner-uuid-001';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [hasLocalUnsyncedData, setHasLocalUnsyncedData] = useState(false);

  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [practiceSteps, setPracticeSteps] = useState<PracticeStep[]>(
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

  const activeSupabaseUserRef = useRef<SupabaseUser | null>(null);
  const isSyncingRef = useRef(false);

  const checkLocalUnsyncedSessions = useCallback((cloudUserId: string) => {
    if (typeof window === 'undefined') return;
    try {
      const alreadyMigrated = localStorage.getItem(`${STORAGE_KEYS.MIGRATED_PREFIX}${cloudUserId}`);
      if (alreadyMigrated === 'true') {
        setHasLocalUnsyncedData(false);
        return;
      }
      const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!rawSessions) {
        setHasLocalUnsyncedData(false);
        return;
      }
      const parsed: PracticeSession[] = JSON.parse(rawSessions);
      const completedLocal = parsed.filter(
        (s) => s.session_status === 'completed' && s.user_id === DEFAULT_USER_ID
      );
      setHasLocalUnsyncedData(completedLocal.length > 0);
    } catch {
      setHasLocalUnsyncedData(false);
    }
  }, []);

  const loadLocalData = useCallback(() => {
    if (typeof window === 'undefined') return;

    const savedProfile = localStorage.getItem(STORAGE_KEYS.PROFILE);
    const savedSummaries = localStorage.getItem(STORAGE_KEYS.SUMMARIES);
    const savedSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    const savedRunning = localStorage.getItem(STORAGE_KEYS.RUNNING_SESSION);

    const activeUser = { id: DEFAULT_USER_ID, email: 'practitioner@7doses.app' };
    setIsDemoMode(true);
    setUser(activeUser);

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch {
        setProfile({
          id: 'profile-1',
          user_id: activeUser.id,
          practitioner_name: 'ผู้ปฏิบัติธรรม',
          email: activeUser.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    } else {
      setProfile({
        id: 'profile-1',
        user_id: activeUser.id,
        practitioner_name: 'ผู้ปฏิบัติธรรม',
        email: activeUser.email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    if (savedSummaries) {
      try {
        const parsed: PracticeSummary[] = JSON.parse(savedSummaries);
        const withSteps = parsed.map((item) => ({
          ...item,
          step: MASTER_PRACTICE_STEPS.find((s) => s.id === item.practice_step_id)
            ? {
                ...MASTER_PRACTICE_STEPS.find((s) => s.id === item.practice_step_id)!,
                created_at: '2026-01-01T00:00:00Z',
              }
            : undefined,
        }));
        setPracticeSummaries(withSteps);
      } catch {
        setPracticeSummaries([]);
      }
    } else {
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
        step: {
          ...MASTER_PRACTICE_STEPS[0],
          created_at: '2026-01-01T00:00:00Z',
        },
      };
      setPracticeSummaries([initialSummary]);
    }

    if (savedSessions) {
      try {
        setPracticeSessions(JSON.parse(savedSessions));
      } catch {
        setPracticeSessions([]);
      }
    } else {
      setPracticeSessions([]);
    }

    if (savedSettings) {
      try {
        setEffortSettings(JSON.parse(savedSettings));
      } catch {
        // keep default
      }
    }

    if (savedRunning) {
      try {
        setRunningSession(JSON.parse(savedRunning));
      } catch {
        setRunningSession(null);
      }
    } else {
      setRunningSession(null);
    }
  }, []);

  const loadSupabaseData = useCallback(
    async (authUser: SupabaseUser) => {
      if (!supabase || isSyncingRef.current) return;
      isSyncingRef.current = true;
      setIsSyncing(true);

      const userId = authUser.id;
      const userEmail = authUser.email || null;
      const defaultName =
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        'ผู้ปฏิบัติธรรม';

      try {
        // 1. Load Master Practice Steps from DB so IDs match exact DB primary keys
        const { data: stepsData } = await supabase
          .from('practice_steps')
          .select('*')
          .eq('active', true)
          .order('step_order', { ascending: true });

        const resolvedSteps: PracticeStep[] =
          stepsData && stepsData.length > 0
            ? stepsData
            : MASTER_PRACTICE_STEPS.map((s) => ({
                ...s,
                created_at: '2026-01-01T00:00:00Z',
              }));
        setPracticeSteps(resolvedSteps);

        // 2. Load or auto-provision Profile (critical for FK constraints on summaries & sessions)
        let { data: profData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!profData) {
          const { data: createdProf } = await supabase
            .from('profiles')
            .upsert(
              {
                user_id: userId,
                practitioner_name: defaultName,
                email: userEmail,
              },
              { onConflict: 'user_id' }
            )
            .select('*')
            .single();
          profData = createdProf;
        } else if (userEmail && profData.email !== userEmail) {
          // Keep email updated cleanly
          await supabase
            .from('profiles')
            .update({ email: userEmail })
            .eq('user_id', userId);
          profData = { ...profData, email: userEmail };
        }

        if (profData) {
          setProfile(profData);
        } else {
          setProfile({
            id: userId,
            user_id: userId,
            practitioner_name: defaultName,
            email: userEmail,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }

        // 3. Load or auto-provision Effort Settings
        let { data: settingsData } = await supabase
          .from('effort_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (!settingsData) {
          const { data: createdSettings } = await supabase
            .from('effort_settings')
            .upsert(
              {
                user_id: userId,
                ...DEFAULT_EFFORT_SETTINGS,
              },
              { onConflict: 'user_id' }
            )
            .select('*')
            .single();
          settingsData = createdSettings;
        }

        if (settingsData) {
          setEffortSettings(settingsData);
        }

        // 4. Load or auto-provision Practice Summaries
        let { data: summariesData } = await supabase
          .from('practice_summaries')
          .select('*, step:practice_steps(*)')
          .eq('user_id', userId)
          .order('id', { ascending: false });

        if (!summariesData || summariesData.length === 0) {
          const step1 = resolvedSteps.find((s) => s.step_order === 1) || resolvedSteps[0];
          if (step1) {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: createdSummary } = await supabase
              .from('practice_summaries')
              .upsert(
                {
                  user_id: userId,
                  practice_step_id: step1.id,
                  round_number: 1,
                  carried_duration_minutes: 0,
                  start_date: todayStr,
                  status: 'active',
                },
                { onConflict: 'user_id,practice_step_id,round_number' }
              )
              .select('*, step:practice_steps(*)')
              .single();

            if (createdSummary) {
              summariesData = [createdSummary];
            }
          }
        }

        if (summariesData) {
          setPracticeSummaries(summariesData);
        }

        // 5. Load Practice Sessions
        const { data: sessionsData } = await supabase
          .from('practice_sessions')
          .select('*, summary:practice_summaries(*, step:practice_steps(*))')
          .eq('user_id', userId)
          .order('practice_date', { ascending: false })
          .order('id', { ascending: false });

        if (sessionsData) {
          setPracticeSessions(sessionsData);
          const running = sessionsData.find((s) => s.session_status === 'running') || null;
          setRunningSession(running);
        }

        // Save isolated per-user cloud read cache for offline viewing
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(
              `${STORAGE_KEYS.CLOUD_CACHE_PREFIX}${userId}`,
              JSON.stringify({
                profile: profData,
                summaries: summariesData || [],
                sessions: sessionsData || [],
                settings: settingsData,
                cachedAt: new Date().toISOString(),
              })
            );
          } catch {
            // ignore storage quota errors
          }
        }

        checkLocalUnsyncedSessions(userId);
        setLastSyncedAt(new Date().toISOString());
      } catch (err) {
        console.error('Error syncing Supabase data:', err);
        // Load isolated cloud cache if temporarily offline
        if (typeof window !== 'undefined') {
          const cached = localStorage.getItem(`${STORAGE_KEYS.CLOUD_CACHE_PREFIX}${userId}`);
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed.profile) setProfile(parsed.profile);
              if (parsed.summaries) setPracticeSummaries(parsed.summaries);
              if (parsed.sessions) {
                setPracticeSessions(parsed.sessions);
                setRunningSession(
                  parsed.sessions.find((s: PracticeSession) => s.session_status === 'running') ||
                    null
                );
              }
              if (parsed.settings) setEffortSettings(parsed.settings);
            } catch {
              // ignore corrupt cache
            }
          }
        }
      } finally {
        isSyncingRef.current = false;
        setIsSyncing(false);
      }
    },
    [checkLocalUnsyncedSessions]
  );

  // Initialize Auth & Subscribe to Auth State Changes
  useEffect(() => {
    let mounted = true;

    async function init() {
      if (!isSupabaseConfigured || !supabase) {
        loadLocalData();
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        // Exchange PKCE code if present in URL
        if (typeof window !== 'undefined') {
          const url = new URL(window.location.href);
          const code = url.searchParams.get('code');
          if (code) {
            await supabase.auth.exchangeCodeForSession(code);
            url.searchParams.delete('code');
            window.history.replaceState({}, '', url.pathname + url.search);
          }
        }

        // Get current session (also parses #access_token=... hash if present)
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // Clean OAuth hash fragment after session extraction
        if (
          typeof window !== 'undefined' &&
          window.location.hash &&
          window.location.hash.includes('access_token=')
        ) {
          window.history.replaceState(
            {},
            '',
            window.location.pathname + window.location.search
          );
        }

        if (session?.user) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
          }
          activeSupabaseUserRef.current = session.user;
          if (mounted) {
            setIsDemoMode(false);
            setUser({ id: session.user.id, email: session.user.email });
          }
          await loadSupabaseData(session.user);
        } else {
          // Only enter Demo Mode if the user explicitly chose Demo Mode
          const demoChosen =
            typeof window !== 'undefined' &&
            localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';

          if (demoChosen) {
            loadLocalData();
          } else if (mounted) {
            setIsDemoMode(false);
            setUser(null);
            setProfile(null);
            setPracticeSummaries([]);
            setPracticeSessions([]);
            setRunningSession(null);
          }
        }
      } catch (err) {
        console.error('Auth initialization error:', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    init();

    if (!isSupabaseConfigured || !supabase) {
      return () => {
        mounted = false;
      };
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        const previousId = activeSupabaseUserRef.current?.id;
        activeSupabaseUserRef.current = session.user;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
        }
        setIsDemoMode(false);
        setUser({ id: session.user.id, email: session.user.email });

        if (event === 'SIGNED_IN' || previousId !== session.user.id) {
          await loadSupabaseData(session.user);
        }
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        activeSupabaseUserRef.current = null;
        const demoChosen =
          typeof window !== 'undefined' &&
          localStorage.getItem(STORAGE_KEYS.DEMO_MODE) === 'true';
        if (!demoChosen) {
          setIsDemoMode(false);
          setUser(null);
          setProfile(null);
          setPracticeSummaries([]);
          setPracticeSessions([]);
          setRunningSession(null);
        }
        setIsLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadLocalData, loadSupabaseData]);

  // Realtime Postgres Sync + Auto-Refresh on Window Focus / Visibility Change
  useEffect(() => {
    const client = supabase;
    if (!isSupabaseConfigured || !client || isDemoMode || !user?.id) return;

    const userId = user.id;
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerSync = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (activeSupabaseUserRef.current) {
          loadSupabaseData(activeSupabaseUserRef.current);
        }
      }, 400);
    };

    const channel = client
      .channel(`7doses-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `user_id=eq.${userId}` },
        triggerSync
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practice_summaries',
          filter: `user_id=eq.${userId}`,
        },
        triggerSync
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'practice_sessions',
          filter: `user_id=eq.${userId}`,
        },
        triggerSync
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'effort_settings',
          filter: `user_id=eq.${userId}`,
        },
        triggerSync
      )
      .subscribe();

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' && activeSupabaseUserRef.current) {
        loadSupabaseData(activeSupabaseUserRef.current);
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      client.removeChannel(channel);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [user?.id, isDemoMode, loadSupabaseData]);

  // Save to LocalStorage ONLY when in Demo/Offline Mode so Cloud never contaminates Local Demo keys
  useEffect(() => {
    if (typeof window !== 'undefined' && isDemoMode && profile) {
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
  }, [isDemoMode, profile, practiceSummaries, practiceSessions, effortSettings, runningSession]);

  // Auth & Sync Actions
  const signInWithGoogle = async () => {
    if (isSupabaseConfigured && supabase) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
      }
      // Redirect to root origin so it always matches Supabase Site URL without path mismatch
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });
    } else {
      enterDemoMode();
    }
  };

  const enterDemoMode = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.DEMO_MODE, 'true');
    }
    loadLocalData();
  }, [loadLocalData]);

  const signOut = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.DEMO_MODE);
    }
    activeSupabaseUserRef.current = null;
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setIsDemoMode(false);
    setUser(null);
    setProfile(null);
    setPracticeSummaries([]);
    setPracticeSessions([]);
    setRunningSession(null);
  };

  const syncData = useCallback(async () => {
    if (isSupabaseConfigured && supabase && activeSupabaseUserRef.current && !isDemoMode) {
      await loadSupabaseData(activeSupabaseUserRef.current);
    }
  }, [isDemoMode, loadSupabaseData]);

  /**
   * Import any meditation sessions recorded previously on this device in Demo Mode
   * into the logged-in user's Google/Supabase account.
   */
  const importLocalDataToCloud = useCallback(async (): Promise<number> => {
    if (
      typeof window === 'undefined' ||
      !isSupabaseConfigured ||
      !supabase ||
      !user ||
      isDemoMode ||
      !activeSupabaseUserRef.current
    ) {
      return 0;
    }

    try {
      const rawSummaries = localStorage.getItem(STORAGE_KEYS.SUMMARIES);
      const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (!rawSessions) return 0;

      const localSummaries: PracticeSummary[] = rawSummaries ? JSON.parse(rawSummaries) : [];
      const localSessions: PracticeSession[] = JSON.parse(rawSessions);
      const completedSessions = localSessions.filter(
        (s) => s.session_status === 'completed' && s.user_id === DEFAULT_USER_ID
      );

      if (completedSessions.length === 0) {
        localStorage.setItem(`${STORAGE_KEYS.MIGRATED_PREFIX}${user.id}`, 'true');
        setHasLocalUnsyncedData(false);
        return 0;
      }

      // Map local summary ID -> cloud summary ID
      const summaryIdMap = new Map<number, number>();

      for (const ls of localSummaries) {
        const matchedStep =
          practiceSteps.find((st) => st.step_order === (ls.step?.step_order || ls.practice_step_id)) ||
          practiceSteps[0];
        if (!matchedStep) continue;

        const { data: cloudSummary } = await supabase
          .from('practice_summaries')
          .upsert(
            {
              user_id: user.id,
              practice_step_id: matchedStep.id,
              round_number: ls.round_number || 1,
              carried_duration_minutes: ls.carried_duration_minutes || 0,
              start_date: ls.start_date || null,
              end_date: ls.end_date || null,
              status: ls.status || 'active',
            },
            { onConflict: 'user_id,practice_step_id,round_number' }
          )
          .select('id')
          .single();

        if (cloudSummary) {
          summaryIdMap.set(ls.id, cloudSummary.id);
        }
      }

      // Fallback summary ID if session pointed to an unmapped summary
      const fallbackSummaryId =
        practiceSummaries[0]?.id || Array.from(summaryIdMap.values())[0];

      if (!fallbackSummaryId) return 0;

      const rowsToInsert = completedSessions.map((s) => ({
        user_id: user.id,
        practice_summary_id: summaryIdMap.get(s.practice_summary_id) || fallbackSummaryId,
        practice_date: s.practice_date,
        started_at: s.started_at || null,
        ended_at: s.ended_at || null,
        duration_seconds: Math.max(0, s.duration_seconds || 0),
        result_note: s.result_note || null,
        source: s.source || 'manual',
        timer_mode: s.timer_mode || null,
        planned_duration_seconds: s.planned_duration_seconds || null,
        session_status: 'completed' as const,
      }));

      const { error } = await supabase.from('practice_sessions').insert(rowsToInsert);
      if (error) {
        console.error('Failed to migrate local sessions:', error);
        return 0;
      }

      localStorage.setItem(`${STORAGE_KEYS.MIGRATED_PREFIX}${user.id}`, 'true');
      setHasLocalUnsyncedData(false);
      await loadSupabaseData(activeSupabaseUserRef.current);
      return rowsToInsert.length;
    } catch (err) {
      console.error('Import local data error:', err);
      return 0;
    }
  }, [user, isDemoMode, practiceSteps, practiceSummaries, loadSupabaseData]);

  const updateProfileName = async (name: string): Promise<boolean> => {
    if (!profile) return false;
    const trimmed = name.trim();
    const updated = {
      ...profile,
      practitioner_name: trimmed,
      updated_at: new Date().toISOString(),
    };
    setProfile(updated);

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('profiles')
        .update({ practitioner_name: trimmed, updated_at: updated.updated_at })
        .eq('user_id', user.id);
      if (error) {
        console.error('Failed updating profile name:', error);
        return false;
      }
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

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { data: inserted, error } = await supabase
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

      if (error || !inserted) {
        console.error('Error creating summary in Supabase:', error);
        return null;
      }

      setPracticeSummaries((prev) => [inserted, ...prev.filter((s) => s.id !== inserted.id)]);
      return inserted;
    }

    const newId =
      practiceSummaries.length > 0
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
    return newSummary;
  };

  const updatePracticeSummary = async (
    id: number,
    data: Partial<PracticeSummary>
  ): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    // Strip joined relation field before sending to DB
    const { step: _step, ...dbFields } = data;
    void _step;

    setPracticeSummaries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updated_at: nowIso } : s))
    );

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('practice_summaries')
        .update({ ...dbFields, updated_at: nowIso })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error updating summary:', error);
        return false;
      }
    }
    return true;
  };

  const deletePracticeSummary = async (id: number): Promise<boolean> => {
    setPracticeSummaries((prev) => prev.filter((s) => s.id !== id));
    setPracticeSessions((prev) => prev.filter((s) => s.practice_summary_id !== id));

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('practice_summaries')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error deleting summary:', error);
        return false;
      }
    }
    return true;
  };

  // Sessions & Timer CRUD
  const createManualSession = async (data: {
    practice_summary_id: number;
    practice_date: string;
    duration_minutes: number;
    result_note?: string;
  }): Promise<PracticeSession | null> => {
    const userId = user?.id || DEFAULT_USER_ID;
    const summary = practiceSummaries.find((s) => s.id === data.practice_summary_id);

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { data: inserted, error } = await supabase
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

      if (error || !inserted) {
        console.error('Error creating manual session:', error);
        return null;
      }

      setPracticeSessions((prev) => [inserted, ...prev.filter((s) => s.id !== inserted.id)]);
      return inserted;
    }

    const newId =
      practiceSessions.length > 0
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

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { data: inserted, error } = await supabase
        .from('practice_sessions')
        .insert({
          user_id: userId,
          practice_summary_id,
          practice_date: todayStr,
          started_at: now.toISOString(),
          duration_seconds: 0,
          source: 'timer',
          timer_mode: mode,
          planned_duration_seconds: plannedSeconds,
          target_end_at: targetEndAt,
          session_status: 'running',
          last_chime_index: 0,
        })
        .select('*, summary:practice_summaries(*, step:practice_steps(*))')
        .single();

      if (!error && inserted) {
        setRunningSession(inserted);
        setPracticeSessions((prev) => [inserted, ...prev.filter((s) => s.id !== inserted.id)]);
        return inserted;
      }
      console.error('Error starting timer in Supabase, using temporary local session:', error);
    }

    const newId =
      practiceSessions.length > 0
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
    return newSession;
  };

  const pauseTimer = async (): Promise<PracticeSession | null> => {
    if (!runningSession) return null;

    const paused = pausePracticeSession(runningSession);
    setRunningSession(paused);
    setPracticeSessions((prev) => prev.map((s) => (s.id === paused.id ? paused : s)));

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('practice_sessions')
        .update({
          duration_seconds: paused.duration_seconds,
          started_at: null,
          target_end_at: null,
          updated_at: paused.updated_at,
        })
        .eq('id', paused.id)
        .eq('user_id', user.id);
    }

    return paused;
  };

  const resumeTimer = async (): Promise<PracticeSession | null> => {
    if (!runningSession) return null;

    const resumed = resumePracticeSession(runningSession);
    setRunningSession(resumed);
    setPracticeSessions((prev) => prev.map((s) => (s.id === resumed.id ? resumed : s)));

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('practice_sessions')
        .update({
          started_at: resumed.started_at,
          target_end_at: resumed.target_end_at,
          updated_at: resumed.updated_at,
        })
        .eq('id', resumed.id)
        .eq('user_id', user.id);
    }

    return resumed;
  };

  const updateTimerChimeIndex = async (newChimeIndex: number): Promise<void> => {
    if (!runningSession) return;
    const updated: PracticeSession = {
      ...runningSession,
      last_chime_index: newChimeIndex,
      updated_at: new Date().toISOString(),
    };
    setRunningSession(updated);
    setPracticeSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('practice_sessions')
        .update({ last_chime_index: newChimeIndex })
        .eq('id', updated.id)
        .eq('user_id', user.id);
    }
  };

  const stopTimer = async (resultNote?: string): Promise<PracticeSession | null> => {
    if (!runningSession) return null;

    const finalized = finalizePracticeSession(runningSession, resultNote);

    setPracticeSessions((prev) =>
      prev.map((s) => (s.id === finalized.id ? finalized : s))
    );
    setRunningSession(null);

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('practice_sessions')
        .update({
          started_at: finalized.started_at,
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

  const cancelTimer = async (): Promise<boolean> => {
    if (!runningSession) return false;
    const targetId = runningSession.id;
    setRunningSession(null);
    setPracticeSessions((prev) => prev.filter((s) => s.id !== targetId));

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', targetId)
        .eq('user_id', user.id);
    }
    return true;
  };

  const updateSession = async (
    id: number,
    data: Partial<PracticeSession>
  ): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const { summary: _summary, ...dbFields } = data;
    void _summary;

    setPracticeSessions((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data, updated_at: nowIso } : s))
    );

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('practice_sessions')
        .update({ ...dbFields, updated_at: nowIso })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error updating session:', error);
        return false;
      }
    }
    return true;
  };

  const deleteSession = async (id: number): Promise<boolean> => {
    setPracticeSessions((prev) => prev.filter((s) => s.id !== id));

    if (runningSession && runningSession.id === id) {
      setRunningSession(null);
    }

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('practice_sessions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) {
        console.error('Error deleting session:', error);
        return false;
      }
    }
    return true;
  };

  // Effort Settings
  const updateEffortSettings = async (data: Partial<EffortSettings>): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const updated = { ...effortSettings, ...data, updated_at: nowIso };
    setEffortSettings(updated);

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      const { error } = await supabase
        .from('effort_settings')
        .update({ ...data, updated_at: nowIso })
        .eq('user_id', user.id);
      if (error) {
        console.error('Error updating effort settings:', error);
        return false;
      }
    }
    return true;
  };

  const resetEffortSettings = async (): Promise<boolean> => {
    const nowIso = new Date().toISOString();
    const reset = {
      ...effortSettings,
      ...DEFAULT_EFFORT_SETTINGS,
      updated_at: nowIso,
    };
    setEffortSettings(reset);

    if (isSupabaseConfigured && supabase && user && !isDemoMode) {
      await supabase
        .from('effort_settings')
        .update({ ...DEFAULT_EFFORT_SETTINGS, updated_at: nowIso })
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
        isDemoMode,
        isSyncing,
        lastSyncedAt,
        hasLocalUnsyncedData,
        signInWithGoogle,
        enterDemoMode,
        signOut,
        syncData,
        importLocalDataToCloud,
        updateProfileName,
        createPracticeSummary,
        updatePracticeSummary,
        deletePracticeSummary,
        createManualSession,
        startTimer,
        pauseTimer,
        resumeTimer,
        stopTimer,
        cancelTimer,
        updateTimerChimeIndex,
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
