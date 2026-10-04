import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { getUserFacingError } from '../../utils/apiError';

const profileFields = {
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  weight: '',
  age: '',
  gender: '',
  fitnessGoal: '',
  activityLevel: '',
};

const numberFields = new Set(['weight', 'age']);
const poundsPerKilogram = 2.2046226218;

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

  const handleChange = (event) => {
    const { name, value } = event.target;
    setError('');
    setSuccess('');
    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleHeightChange = (event) => {
    const { name, value } = event.target;
    setError('');
    setSuccess('');
    setHeightFields((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleWeightUnitChange = (event) => {
    const nextUnit = event.target.value;
    const pounds = displayWeightToPounds(formData.weight, weightUnit);

    setError('');
    setSuccess('');
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
    const age = Number(formData.age);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      validationErrors.push('First and last name are required.');
    }

    if (formData.username.trim().length < 3 || formData.username.trim().length > 30) {
      validationErrors.push('Username must be between 3 and 30 characters.');
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email.trim())) {
      validationErrors.push('Enter a valid email address.');
    }

    if (formData.age !== '' && (!Number.isInteger(age) || age < 0)) {
      validationErrors.push('Age must be a non-negative whole number.');
    }

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

      profilePayload[key] = numberFields.has(key) ? Number(value) : value.trim();
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
      setError(getUserFacingError(err, 'Unable to update profile.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="page-stack mx-auto max-w-3xl">
      <div className="page-header">
        <p className="eyebrow">Account</p>
        <h1 className="page-title">Profile</h1>
        <p className="page-copy">Manage your account and training preferences.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && <p role="alert" className="status-error">{error}</p>}
        {success && <p role="status" className="status-success">{success}</p>}

        <section aria-labelledby="profile-personal" className="border-b border-[#D2CFC7] pb-8">
          <h2 id="profile-personal" className="section-title">Personal</h2>
          <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">First name</span>
              <input name="firstName" autoComplete="given-name" required value={formData.firstName} onChange={handleChange} className="form-field" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Last name</span>
              <input name="lastName" autoComplete="family-name" required value={formData.lastName} onChange={handleChange} className="form-field" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Username</span>
              <input name="username" autoComplete="username" required minLength="3" maxLength="30" value={formData.username} onChange={handleChange} className="form-field" />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Email</span>
              <input type="email" name="email" autoComplete="email" required value={formData.email} onChange={handleChange} className="form-field" />
            </label>
          </div>
        </section>

        <section aria-labelledby="profile-body" className="border-b border-[#D2CFC7] pb-8">
          <h2 id="profile-body" className="section-title">Body</h2>
          <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Age</span>
              <input
                type="number"
                name="age"
                min="0"
                step="1"
                value={formData.age}
                onChange={handleChange}
                className="form-field"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium">Gender</span>
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
              <legend className="text-sm font-medium">Height</legend>
              <p className="mt-1 text-xs text-[#4F534E]">Enter feet and inches</p>
              <div className="mt-2 grid grid-cols-2 gap-3">
                <label>
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#4F534E]">Feet</span>
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
                  <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#4F534E]">Inches</span>
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
              <p className="mt-2 text-xs text-[#4F534E]">Current: {formatHeight(heightFields)}</p>
            </fieldset>

            <fieldset className="block">
              <legend className="text-sm font-medium">Weight</legend>
              <p className="mt-1 text-xs text-[#4F534E]">Choose lb or kg</p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <input
                    type="number"
                    name="weight"
                    aria-label="Weight"
                    min="0"
                    step="0.1"
                    placeholder="175"
                    value={formData.weight}
                    onChange={handleChange}
                    className="form-field pr-14"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#2f4f46]">
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
          </div>
        </section>

        <section aria-labelledby="profile-preferences">
          <h2 id="profile-preferences" className="section-title">Training Preferences</h2>
          <div className="mt-5 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium">Fitness goal</span>
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
              <span className="text-sm font-medium">Activity level</span>
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
        </section>

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary"
        >
          {submitting ? 'Saving...' : 'Save changes'}
        </button>
      </form>
    </section>
  );
}

export default Profile;
