import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { trainingMaxService } from '../../services/trainingMaxService.js';
import { workoutService } from '../../services/workoutService.js';

const profileFields = {
  weight: '',
  age: '',
  gender: '',
  fitnessGoal: '',
  activityLevel: '',
};

const numberFields = new Set(['weight', 'age']);
const poundsPerKilogram = 2.2046226218;
const liftLabels = {
  squat: 'Squat',
  bench: 'Bench',
  deadlift: 'Deadlift',
  overhead_press: 'Overhead Press',
};

const splitHeight = (totalInches) => {
  const height = Number(totalInches || 0);

  if (!height) {
    return { feet: '', inches: '' };
  }

  return {
    feet: String(Math.floor(height / 12)),
    inches: String(height % 12),
  };
};

const formatHeight = ({ feet, inches }) => {
  if (feet === '' && inches === '') {
    return 'Not set';
  }

  return `${feet || 0}'${inches || 0}"`;
};

const poundsToDisplayWeight = (weight, unit) => {
  const pounds = Number(weight || 0);

  if (!pounds) {
    return '';
  }

  if (unit === 'kg') {
    return String(Math.round((pounds / poundsPerKilogram) * 10) / 10);
  }

  return String(pounds);
};

const displayWeightToPounds = (weight, unit) => {
  const value = Number(weight);

  if (!value) {
    return 0;
  }

  if (unit === 'kg') {
    return Math.round(value * poundsPerKilogram);
  }

  return value;
};

function Profile() {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState(profileFields);
  const [heightFields, setHeightFields] = useState({ feet: '', inches: '' });
  const [weightUnit, setWeightUnit] = useState('lb');
  const [summary, setSummary] = useState({
    trainingMaxes: [],
    currentWeek: 1,
    workoutsCompleted: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }

    setFormData(
      Object.keys(profileFields).reduce((fields, field) => {
        fields[field] = field === 'weight' ? poundsToDisplayWeight(user[field], weightUnit) : user[field] ?? '';
        return fields;
      }, {}),
    );

    setHeightFields(splitHeight(user.height));
  }, [user]);

  useEffect(() => {
    const loadStrengthSummary = async () => {
      setSummaryLoading(true);

      try {
        const [trainingMaxResponse, workoutResponse] = await Promise.all([
          trainingMaxService.getTrainingMaxes(),
          workoutService.getWorkouts(),
        ]);
        const trainingMaxes = trainingMaxResponse.data || [];
        const workouts = workoutResponse.data || [];

        setSummary({
          trainingMaxes,
          currentWeek: trainingMaxes[0]?.currentWeek || 1,
          workoutsCompleted: workouts.filter((workout) => workout.status === 'completed').length,
        });
      } catch (err) {
        setSummary({
          trainingMaxes: [],
          currentWeek: 1,
          workoutsCompleted: 0,
        });
      } finally {
        setSummaryLoading(false);
      }
    };

    loadStrengthSummary();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleHeightChange = (event) => {
    const { name, value } = event.target;
    setHeightFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleWeightUnitChange = (event) => {
    const nextUnit = event.target.value;
    const pounds = displayWeightToPounds(formData.weight, weightUnit);

    setWeightUnit(nextUnit);
    setFormData((current) => ({
      ...current,
      weight: poundsToDisplayWeight(pounds, nextUnit),
    }));
  };

  const validateMeasurements = () => {
    const validationErrors = [];
    const hasHeight = heightFields.feet !== '' || heightFields.inches !== '';
    const feet = Number(heightFields.feet);
    const inches = Number(heightFields.inches || 0);
    const weight = Number(formData.weight);

    if (formData.weight !== '' && (!Number.isFinite(weight) || weight <= 0)) {
      validationErrors.push('Weight must be a positive number.');
    }

    if (hasHeight) {
      if (!Number.isInteger(feet) || feet < 3 || feet > 8) {
        validationErrors.push('Feet must be a whole number from 3 through 8.');
      }

      if (!Number.isInteger(inches) || inches < 0 || inches > 11) {
        validationErrors.push('Inches must be a whole number from 0 through 11.');
      }
    }

    return validationErrors;
  };

  const buildProfilePayload = () => {
    const payload = Object.entries(formData).reduce((profilePayload, [key, value]) => {
      if (value === '') {
        profilePayload[key] = numberFields.has(key) ? 0 : '';
        return profilePayload;
      }

      profilePayload[key] = numberFields.has(key) ? Number(value) : value;
      return profilePayload;
    }, {});

    payload.weight = displayWeightToPounds(formData.weight, weightUnit);
    payload.height =
      heightFields.feet === '' && heightFields.inches === ''
        ? 0
        : Number(heightFields.feet) * 12 + Number(heightFields.inches || 0);

    return payload;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const validationErrors = validateMeasurements();

    if (validationErrors.length > 0) {
      setError(validationErrors.join(' '));
      return;
    }

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
    <section className="page-stack">
      <div className="page-header">
        <p className="eyebrow">Account</p>
        <h1 className="page-title">Profile</h1>
        <p className="page-copy">
          Keep personal details simple and strength-focused.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="quiet-card">
        <h2 className="section-title">Personal & Fitness Details</h2>

        {error && <p className="mt-4 status-error">{error}</p>}
        {success && <p className="mt-4 status-success">{success}</p>}

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm font-medium text-stone-300">First name</p>
            <p className="mt-1 rounded-md border border-[#2a2f32] bg-[#191d1f] px-3 py-2 text-sm text-stone-200">
              {user?.firstName || 'Not set'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-300">Last name</p>
            <p className="mt-1 rounded-md border border-[#2a2f32] bg-[#191d1f] px-3 py-2 text-sm text-stone-200">
              {user?.lastName || 'Not set'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-300">Username</p>
            <p className="mt-1 rounded-md border border-[#2a2f32] bg-[#191d1f] px-3 py-2 text-sm text-stone-200">
              {user?.username || 'Not set'}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-stone-300">Email</p>
            <p className="mt-1 rounded-md border border-[#2a2f32] bg-[#191d1f] px-3 py-2 text-sm text-stone-200">
              {user?.email || 'Not set'}
            </p>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Age</span>
            <input
              type="number"
              name="age"
              min="0"
              value={formData.age}
              onChange={handleChange}
              className="form-field"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Gender</span>
            <select
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className="form-field"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non-binary">Non-binary</option>
              <option value="prefer-not-to-say">Prefer not to say</option>
              <option value="other">Other</option>
            </select>
          </label>

          <fieldset className="block">
            <legend className="text-sm font-medium text-stone-300">Height</legend>
            <p className="mt-1 text-xs text-stone-500">Enter feet and inches</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <label>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">Feet</span>
                <input
                  type="number"
                  name="feet"
                  min="3"
                  max="8"
                  step="1"
                  placeholder="5"
                  value={heightFields.feet}
                  onChange={handleHeightChange}
                  className="form-field"
                />
              </label>
              <label>
                <span className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">Inches</span>
                <input
                  type="number"
                  name="inches"
                  min="0"
                  max="11"
                  step="1"
                  placeholder="3"
                  value={heightFields.inches}
                  onChange={handleHeightChange}
                  className="form-field"
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-stone-500">Current: {formatHeight(heightFields)}</p>
          </fieldset>

          <fieldset className="block">
            <legend className="text-sm font-medium text-stone-300">Weight</legend>
            <p className="mt-1 text-xs text-stone-500">Choose lb or kg</p>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <input
                  type="number"
                  name="weight"
                  min="0"
                  step="0.1"
                  placeholder="175"
                  value={formData.weight}
                  onChange={handleChange}
                  className="form-field pr-14"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#d6b94c]">
                  {weightUnit}
                </span>
              </div>
              <select
                value={weightUnit}
                onChange={handleWeightUnitChange}
                className="form-field sm:w-24"
                aria-label="Weight unit"
              >
                <option value="lb">lb</option>
                <option value="kg">kg</option>
              </select>
            </div>
          </fieldset>

          <label className="block">
            <span className="text-sm font-medium text-stone-300">Fitness goal</span>
            <select
              name="fitnessGoal"
              value={formData.fitnessGoal}
              onChange={handleChange}
              className="form-field"
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
            <span className="text-sm font-medium text-stone-300">Activity level</span>
            <select
              name="activityLevel"
              value={formData.activityLevel}
              onChange={handleChange}
              className="form-field"
            >
              <option value="">Select level</option>
              <option value="sedentary">Sedentary</option>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="active">Active</option>
              <option value="very-active">Very active</option>
            </select>
          </label>

        </div>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary mt-6"
        >
          {submitting ? 'Saving...' : 'Save Profile'}
        </button>
      </form>

      <section className="quiet-card">
        <h2 className="section-title">Strength Summary</h2>

        {summaryLoading ? (
          <p className="empty-state mt-5">Loading strength summary...</p>
        ) : (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {Object.entries(liftLabels).map(([liftName, label]) => {
              const trainingMax = summary.trainingMaxes.find((item) => item.liftName === liftName);

              return (
                <div key={liftName} className="metric-panel">
                  <p className="text-sm text-stone-500">{label} TM</p>
                  <p className="mt-2 text-2xl font-semibold text-stone-50">{trainingMax?.trainingMax || 0} lb</p>
                </div>
              );
            })}
            <div className="metric-panel">
              <p className="text-sm text-stone-500">Current program week</p>
              <p className="mt-2 text-2xl font-semibold text-stone-50">{summary.currentWeek}</p>
            </div>
            <div className="metric-panel">
              <p className="text-sm text-stone-500">Workouts completed</p>
              <p className="mt-2 text-2xl font-semibold text-stone-50">{summary.workoutsCompleted}</p>
            </div>
          </div>
        )}
      </section>
    </section>
  );
}

export default Profile;
