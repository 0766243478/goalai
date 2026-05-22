import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Shield, Clock } from 'lucide-react';
import { useToast } from '../components/ui/Toast';
import { GanLogic } from '../lib/gan-logic';
import { supabase, GanUser, Task } from '../lib/supabase';

interface TaskCountdown {
  [key: string]: number;
}

export default function Dashboard() {
  const [user, setUser] = useState<GanUser | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskCountdowns, setTaskCountdowns] = useState<TaskCountdown>({});
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const loadUserData = useCallback(async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        navigate('/login');
        return;
      }

      // Load user profile
      const { data: profile } = await supabase
        .from('gan_users')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (!profile) {
        navigate('/onboarding');
        return;
      }

      setUser(profile);

      // Load user's tasks
      const { data: userTasks } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });

      if (userTasks) setTasks(userTasks);
    } catch (error) {
      showToast("Failed to load dashboard data", "error");
    } finally {
      setIsLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  // Update countdown timers every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTaskCountdowns(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(key => {
          if (updated[key] > 0) updated[key] -= 1;
          else delete updated[key];
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);
  const handleComplete = async (taskId: string) => {
    try {
      const lastCompletedAt = tasks.reduce<Date | null>((latest, task) => {
        if (!task.completed || !task.completed_at) return latest;
        const completedAt = new Date(task.completed_at);
        if (!latest) return completedAt;
        return completedAt > latest ? completedAt : latest;
      }, null);

      if (lastCompletedAt) {
        const { allowed, retryAfter } = GanLogic.canCompleteTask(lastCompletedAt);
        if (!allowed) {
          // Return 429 equivalent - Integrity Window not open
          setTaskCountdowns(prev => ({ ...prev, [taskId]: retryAfter }));
          showToast(`Integrity Window closed. Retry in ${GanLogic.formatTime(retryAfter)}`, "warning");
          return;
        }
      }

      // Complete the task
      const taskIntegrityHash = await GanLogic.generateIntegrityHash({
        taskId,
        completed: true,
        completed_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed: true, 
          completed_at: new Date().toISOString(),
          integrity_hash: taskIntegrityHash
        })
        .eq('id', taskId);

      if (error) throw error;

      // Update trust score
      if (user) {
        const newTrustScore = user.trust_score + 10;
        const userIntegrityHash = await GanLogic.generateIntegrityHash({
          ...user,
          trust_score: newTrustScore,
          updated_at: new Date().toISOString(),
        });

        await supabase
          .from('gan_users')
          .update({ 
            trust_score: newTrustScore,
            integrity_hash: userIntegrityHash
          })
          .eq('id', user.id);
        setUser(prev => prev ? { ...prev, trust_score: newTrustScore } : null);
      }

      // Refresh tasks
      await loadUserData();
      showToast("Task completed! Your Sovereign Score has increased.", "success");

    } catch (error) {
      showToast("An error occurred. Please try again.", "error");
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gan-navy flex items-center justify-center">
        <div className="animate-pulse text-white text-xl">Loading your Genesis Block...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gan-navy">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gan-gold">GoalAI</h1>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Sovereign Score Widget */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 border border-slate-600">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gan-gold/20 rounded-full">
              <Shield className="w-8 h-8 text-gan-gold" />
            </div>
            <div>
              <p className="text-gray-400 text-sm">Sovereign Score</p>
              <p className="text-4xl font-bold text-white">{user?.trust_score || 500}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-gray-400 text-sm">Welcome back,</p>
              <p className="text-xl font-semibold text-white">{user?.full_name}</p>
            </div>
          </div>
          <div className="mt-4 h-2 bg-slate-600 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gan-gold transition-all duration-500"
              style={{ width: `${Math.min((user?.trust_score || 500) / 10, 100)}%` }}
            />
          </div>
        </div>

        {/* Genesis Block Tasks */}
        <section>
          <h2 className="text-xl font-semibold text-white mb-4">Genesis Block Tasks</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {tasks.filter(t => t.is_genesis).map(task => (
              <div 
                key={task.id}
                className={`bg-slate-800 rounded-xl p-6 border ${task.completed ? 'border-green-500/50' : 'border-slate-700'} relative overflow-hidden`}
              >
                {taskCountdowns[task.id] > 0 && (
                  <div className="absolute top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-sm font-medium">
                    <Clock className="inline-block w-4 h-4 mr-1" />
                    {GanLogic.formatTime(taskCountdowns[task.id])}
                  </div>
                )}
                <span className="inline-block px-2 py-1 bg-gan-gold/20 text-gan-gold text-xs font-medium rounded mb-3">
                  Genesis
                </span>
                <h3 className={`text-lg font-semibold mb-4 ${task.completed ? 'text-green-400 line-through' : 'text-white'}`}>
                  {task.title}
                </h3>
                {!task.completed && (
                  <button
                    onClick={() => handleComplete(task.id)}
                    disabled={taskCountdowns[task.id] > 0}
                    className="w-full py-2 bg-gan-gold text-gan-navy font-semibold rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {taskCountdowns[task.id] > 0 ? 'Wait...' : 'Complete Task'}
                  </button>
                )}
                {task.completed && (
                  <div className="text-center text-green-400 font-medium">✓ Completed</div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* All Tasks */}
        {tasks.filter(t => !t.is_genesis).length > 0 && (
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">All Tasks</h2>
            <div className="space-y-3">
              {tasks.filter(t => !t.is_genesis).map(task => (
                <div key={task.id} className={`bg-slate-800 rounded-lg p-4 border ${task.completed ? 'border-green-500/50' : 'border-slate-700'} flex items-center justify-between`}>
                  <span className={task.completed ? 'text-green-400 line-through' : 'text-white'}>{task.title}</span>
                  {!task.completed && (
                    <button
                      onClick={() => handleComplete(task.id)}
                      className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition"
                    >
                      Complete
                    </button>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
