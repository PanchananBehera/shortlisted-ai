// src/pages/Profile.jsx
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/axios';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.fullName || user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    college: user?.college || '',
    degree: user?.degree || '',
    graduationYear: user?.graduationYear || '',
    skills: user?.skills || [],
    github: user?.github || '',
    linkedin: user?.linkedin || '',
    bio: user?.bio || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSkillsChange = (e) => {
    const skills = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
    setProfileData(prev => ({ ...prev, skills }));
  };

  const handleSave = async () => {
    try {
      const res = await api.put('/user/profile', profileData);
      console.log('Profile saved:', res.data);
      setIsEditing(false);
      alert('Profile updated successfully! ✅');
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to save changes. Please try again.');
    }
  };

  return (
    <div className="max-w-5xl mx-auto py-12 px-4 space-y-8 bg-[#fafaf8] dark:bg-slate-950 min-h-screen transition-colors duration-300">
      
      {/* HEADER BANNER & AVATAR SECTION */}
      <div className="relative">
        {/* Green Gradient Banner - Anthropic Style */}
        <div className="h-40 md:h-48 bg-gradient-to-r from-green-500 to-emerald-400 dark:from-green-600 dark:to-emerald-500 rounded-3xl shadow-lg w-full transition-colors"></div>
        
        {/* Avatar & Name Container (Overlaps Banner) */}
        <div className="absolute -bottom-12 md:-bottom-16 left-6 md:left-10 flex flex-col md:flex-row items-center md:items-end gap-4">
          
          {/* Avatar Circle */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white dark:bg-slate-900 p-1.5 shadow-xl border-4 border-white dark:border-slate-900 z-10 transition-colors">
            <div className="w-full h-full rounded-full bg-gray-50 dark:bg-slate-800 flex items-center justify-center text-3xl md:text-4xl font-bold text-green-600 dark:text-green-400 overflow-hidden transition-colors">
              {profileData.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          {/* Name & Title */}
          <div className="mb-2 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900 dark:text-white transition-colors">{profileData.name || 'User Name'}</h1>
            <p className="text-gray-600 dark:text-gray-400 font-medium transition-colors">B.Tech CSE Student • Placement Ready</p>
          </div>
        </div>

        {/* Edit Button (Top Right of Banner area) */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`px-5 py-2 rounded-full font-medium transition-all shadow-md flex items-center gap-2 ${
              isEditing
                ? 'bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-500'
                : 'bg-white dark:bg-slate-900 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-slate-800 border border-gray-200/50 dark:border-slate-700'
            } transition-colors`}
          >
            {isEditing ? '💾 Save' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {/* SPACER for Overlap */}
      <div className="h-16 md:h-20"></div>

      {/* GRID LAYOUT FOR CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Contact Info */}
        <Card title="📞 Contact Information">
          <div className="space-y-4">
            <InfoField label="Email" value={profileData.email} isEditing={isEditing} name="email" onChange={handleChange} type="email" />
            <InfoField label="Phone" value={profileData.phone} isEditing={isEditing} name="phone" onChange={handleChange} type="tel" />
            <InfoField label="Location" value={profileData.location} isEditing={isEditing} name="location" onChange={handleChange} />
          </div>
        </Card>

        {/* Education */}
        <Card title="🎓 Education">
          <div className="space-y-4">
            <InfoField label="College/University" value={profileData.college} isEditing={isEditing} name="college" onChange={handleChange} />
            <div className="grid grid-cols-2 gap-4">
              <InfoField label="Degree" value={profileData.degree} isEditing={isEditing} name="degree" onChange={handleChange} />
              <InfoField label="Grad Year" value={profileData.graduationYear} isEditing={isEditing} name="graduationYear" onChange={handleChange} type="number" />
            </div>
          </div>
        </Card>

        {/* Skills */}
        <Card title="🛠️ Skills & Technologies">
          {isEditing ? (
            <input
              name="skills"
              value={profileData.skills.join(', ')}
              onChange={handleSkillsChange}
              placeholder="React, Node.js, MongoDB, DSA..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all transition-colors"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profileData.skills.length > 0 ? (
                profileData.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm font-medium border border-green-100 dark:border-green-800 transition-colors">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-gray-500 dark:text-gray-400 text-sm italic transition-colors">No skills added yet</span>
              )}
            </div>
          )}
        </Card>

        {/* Social */}
        <Card title="🔗 Social & Portfolio">
          <div className="space-y-4">
            <InfoField label="GitHub" value={profileData.github} isEditing={isEditing} name="github" onChange={handleChange} placeholder="https://github.com/username" />
            <InfoField label="LinkedIn" value={profileData.linkedin} isEditing={isEditing} name="linkedin" onChange={handleChange} placeholder="https://linkedin.com/in/username" />
          </div>
        </Card>
      </div>

      {/* Full Width Bio Card */}
      <Card title="📝 Professional Summary">
        {isEditing ? (
          <textarea
            name="bio"
            value={profileData.bio}
            onChange={handleChange}
            rows="3"
            placeholder="Brief summary about your goals..."
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 resize-none transition-all transition-colors"
          />
        ) : (
          <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm transition-colors">
            {profileData.bio || <span className="text-gray-500 dark:text-gray-400 font-normal italic transition-colors">No summary added yet. Click 'Edit Profile' to add one.</span>}
          </p>
        )}
      </Card>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-slate-900 p-5 md:p-6 rounded-2xl shadow-sm border border-gray-200/50 dark:border-slate-800 hover:shadow-md transition-all transition-colors">
    <h2 className="text-lg font-serif font-semibold text-gray-900 dark:text-white mb-4 transition-colors">{title}</h2>
    {children}
  </div>
);

const InfoField = ({ label, value, isEditing, name, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5 transition-colors">{label}</label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-xl border border-gray-200/50 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all transition-colors"
      />
    ) : (
      <p className="text-gray-900 dark:text-white font-medium text-sm break-all transition-colors">
        {value || <span className="text-gray-500 dark:text-gray-400 font-normal italic transition-colors">Not provided</span>}
      </p>
    )}
  </div>
);

export default Profile;