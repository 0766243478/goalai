import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { useToast } from '../components/ui/Toast';
import { GanLogic } from '../lib/gan-logic';
import { supabase } from '../lib/supabase';

// Fixed Zod schema that allows any string for value_skill (including "sales")
const userSchema = z.object({
  full_name: z.string().min(2, "Full name must be at least 2 characters"),
  north_star: z.string().min(5, "Please enter your north star goal"),
  value_skill: z.string().min(1, "Please select or enter your primary skill")
});

const availableSkills = [
  "programming", "design", "marketing", "sales", "management", 
  "data analysis", "writing", "finance", "engineering", "other"
];

export default function Onboarding() {
  const [formData, setFormData] = useState({
    full_name: '',
    north_star: '',
    value_skill: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    try {
      // Validate with Zod - this was previously failing for "sales" skill due to enum restriction
      const validated = userSchema.parse(formData);
      
      setIsLoading(true);
      
      // Get current user from Supabase auth
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        showToast("Please log in first", "error");
        navigate('/login');
        return;
      }

      // Generate integrity hash for Proof of Integrity
      const integrityHash = await GanLogic.generateIntegrityHash({
        ...validated,
        user_id: user.id,
        timestamp: new Date().toISOString()
      });

      // Save to Supabase
      const { error } = await supabase
        .from('gan_users')
        .insert({
          id: user.id,
          ...validated,
          integrity_hash: integrityHash,
          trust_score: 500 // Default trust score
        });

      if (error) throw error;

      // Create Genesis Block tasks for new user
      const genesisTasks = [
        {
          user_id: user.id,
          title: "Define your first 90-day goal",
          is_genesis: true,
          integrity_hash: await GanLogic.generateIntegrityHash({ task: 'first-goal', user_id: user.id })
        },
        {
          user_id: user.id,
          title: "Schedule your first integrity check",
          is_genesis: true,
          integrity_hash: await GanLogic.generateIntegrityHash({ task: 'integrity-check', user_id: user.id })
        },
        {
          user_id: user.id,
          title: "Connect with your accountability partner",
          is_genesis: true,
          integrity_hash: await GanLogic.generateIntegrityHash({ task: 'accountability', user_id: user.id })
        }
      ];

      await supabase.from('tasks').insert(genesisTasks);
      
      showToast("Profile created successfully! Welcome to GoalAI.", "success");
      navigate('/dashboard'); // Redirect to dashboard after successful save
      
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path[0]) fieldErrors[err.path[0].toString()] = err.message;
        });
        setErrors(fieldErrors);
        showToast("Please fix the errors in your form", "error");
      } else {
        showToast("Unable to save your profile. Please try again.", "error");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="min-h-screen bg-gan-navy flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">GoalAI</h1>
          <p className="text-gray-400">Complete your profile to start your journey</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Full Name</label>
            <input
              type="text"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white focus:ring-2 focus:ring-gan-gold outline-none transition ${errors.full_name ? 'border-red-500' : 'border-slate-600'}`}
              placeholder="Enter your full name"
            />
            {errors.full_name && <p className="mt-1 text-sm text-red-400">{errors.full_name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Your North Star</label>
            <textarea
              name="north_star"
              value={formData.north_star}
              onChange={handleChange}
              rows={3}
              className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white focus:ring-2 focus:ring-gan-gold outline-none transition resize-none ${errors.north_star ? 'border-red-500' : 'border-slate-600'}`}
              placeholder="What is your primary life goal?"
            />
            {errors.north_star && <p className="mt-1 text-sm text-red-400">{errors.north_star}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Primary Skill</label>
            <select
              name="value_skill"
              value={formData.value_skill}
              onChange={handleChange}
              className={`w-full px-4 py-3 bg-slate-700 border rounded-lg text-white focus:ring-2 focus:ring-gan-gold outline-none transition ${errors.value_skill ? 'border-red-500' : 'border-slate-600'}`}
            >
              <option value="">Select your skill</option>
              {availableSkills.map(skill => (
                <option key={skill} value={skill}>{skill.charAt(0).toUpperCase() + skill.slice(1)}</option>
              ))}
            </select>
            {errors.value_skill && <p className="mt-1 text-sm text-red-400">{errors.value_skill}</p>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-gan-gold text-gan-navy font-bold rounded-lg hover:bg-yellow-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : 'Finish Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
