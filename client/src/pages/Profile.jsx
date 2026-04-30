import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext'; // Adjust path if needed
import api from '../utils/axios';

const Profile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
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
    // ✅ FIX: Centered container with max-width
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-8">
      
      {/* ✅ HEADER BANNER & AVATAR SECTION */}
      <div className="relative">
        {/* Green Gradient Banner */}
        <div className="h-40 md:h-48 bg-gradient-to-r from-brand-500 to-emerald-400 rounded-3xl shadow-lg w-full"></div>
        
        {/* Avatar & Name Container (Overlaps Banner) */}
        <div className="absolute -bottom-12 md:-bottom-16 left-6 md:left-10 flex flex-col md:flex-row items-center md:items-end gap-4">
          
          {/* Avatar Circle */}
          <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white p-1.5 shadow-xl border-4 border-white z-10">
            <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-3xl md:text-4xl font-bold text-brand-600 overflow-hidden">
              {profileData.name?.charAt(0).toUpperCase() || 'U'}
            </div>
          </div>

          {/* Name & Title */}
          <div className="mb-2 text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">{profileData.name || 'User Name'}</h1>
            <p className="text-gray-500 font-medium">B.Tech CSE Student • Placement Ready</p>
          </div>
        </div>

        {/* Edit Button (Top Right of Banner area) */}
        <div className="absolute top-4 right-4">
          <button
            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
            className={`px-5 py-2 rounded-full font-medium transition-all shadow-md flex items-center gap-2 ${
              isEditing
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-white text-brand-600 hover:bg-brand-50'
            }`}
          >
            {isEditing ? '💾 Save' : '✏️ Edit Profile'}
          </button>
        </div>
      </div>

      {/* ✅ SPACER for Overlap */}
      <div className="h-16 md:h-20"></div>

      {/* ✅ GRID LAYOUT FOR CARDS */}
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
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-400 text-sm transition-all"
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {profileData.skills.length > 0 ? (
                profileData.skills.map((skill, i) => (
                  <span key={i} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-sm font-medium border border-brand-100">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-gray-400 text-sm italic">No skills added yet</span>
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
            className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-400 text-sm resize-none transition-all"
          />
        ) : (
          <p className="text-gray-600 leading-relaxed text-sm">
            {profileData.bio || "No summary added yet. Click 'Edit Profile' to add one."}
          </p>
        )}
      </Card>
    </div>
  );
};

const Card = ({ title, children }) => (
  <div className="bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>
    {children}
  </div>
);

const InfoField = ({ label, value, isEditing, name, onChange, type = "text", placeholder = "" }) => (
  <div>
    <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
    {isEditing ? (
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-brand-400 text-sm transition-all"
      />
    ) : (
      <p className="text-gray-800 font-medium text-sm break-all">
        {value || <span className="text-gray-400 font-normal italic">Not provided</span>}
      </p>
    )}
  </div>
);

export default Profile;