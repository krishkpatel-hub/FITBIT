import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';

const profileFields = {
  height: '',
  weight: '',
  age: '',
  gender: '',
  fitnessGoal: '',
  activityLevel: '',
  targetCalories: '',
  targetProtein: '',
  targetCarbs: '',
  targetFats: '',
};

const numberFields = new Set([
  'height',
  'weight',
  'age',
  'targetCalories',
  'targetProtein',
  'targetCarbs',
  'targetFats',
]);

function Profile() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState(profileFields);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData(
      Object.keys(profileFields).reduce((fields, field) => {
        fields[field] = user[field] ?? '';
        return fields;
      }, {}),
    );
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const buildProfilePayload = () =>
    Object.entries(formData).reduce((payload, [key, value]) => {
      if (value === '') {
        payload[key] = numberFields.has(key) ? 0 : '';
        return payload;
      }

      payload[key] = numberFields.has(key) ? Number(value) : value;
      return payload;
    }, {});

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await updateProfile(buildProfilePayload());
      setSuccess('Profile updated successfully.');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-50">Profile</h1>
        <p className="mt-2 text-slate-400">
          {user?.firstName} {user?.lastName} · {user?.email}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="rounded-lg border border-slate-800 bg-slate-900/80 p-6">
        <h2 className="text-xl font-semibold text-slate-50">Fitness Details</h2>

        {error && <p className="mt-4 rounded-md bg-red-950/40 px-3 py-2 text-sm text-red-300">{error}</p>}
        {success && <p className="mt-4 rounded-md bg-emerald-950/40 px-3 py-2 text-sm text-emerald-300">{success}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-300">Age</span>
            <input
              type="number"
              name="age"
              min="0"
              value={formData.age}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Gender</span>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Height</span>
            <input
              type="number"
              name="height"
              min="0"
              value={formData.height}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Weight</span>
            <input
              type="number"
              name="weight"
              min="0"
              value={formData.weight}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Fitness goal</span>
            <select
              name="fitnessGoal"
              value={formData.fitnessGoal}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select goal</option>
              <option value="lose-weight">Lose weight</option>
              <option value="build-muscle">Build muscle</option>
              <option value="maintain">Maintain</option>
              <option value="increase-strength">Increase strength</option>
              <option value="improve-endurance">Improve endurance</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Activity level</span>
            <select
              name="activityLevel"
              value={formData.activityLevel}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="">Select level</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very-active">Very active</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Target calories</span>
            <input
              type="number"
              name="targetCalories"
              min="0"
              value={formData.targetCalories}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Target protein</span>
            <input
              type="number"
              name="targetProtein"
              min="0"
              value={formData.targetProtein}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Target carbs</span>
            <input
              type="number"
              name="targetCarbs"
              min="0"
              value={formData.targetCarbs}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-300">Target fats</span>
            <input
              type="number"
              name="targetFats"
              min="0"
              value={formData.targetFats}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-slate-700 px-3 py-2 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
            />
          </label>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 rounded-md bg-emerald-500 px-4 py-2 font-medium text-slate-950 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-900"
        >
          {submitting ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </section>
  );
}

export default Profile;
