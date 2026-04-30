import Application from '../models/Application.js';

// @desc    Get all applications for logged-in user
// @route   GET /api/applications
// @access  Private
export const getApplications = async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user.id })
      .sort({ dateApplied: -1 });
    res.status(200).json(applications);
  } catch (error) {
    console.error('Get applications error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get single application by ID
// @route   GET /api/applications/:id
// @access  Private
export const getApplicationById = async (req, res) => {
  try {
    const application = await Application.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });
    
    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }
    
    res.status(200).json(application);
  } catch (error) {
    console.error('Get application error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create new application
// @route   POST /api/applications
// @access  Private
export const createApplication = async (req, res) => {
  try {
    const { 
      companyName, jobRole, status, dateApplied, jobDescription, 
      followUpDate, ctc, location, applicationLink, notes 
    } = req.body;

    if (!companyName || !jobRole || !status || !dateApplied) {
      return res.status(400).json({ message: 'Please fill all required fields' });
    }

    const application = new Application({
      userId: req.user.id,
      companyName,
      jobRole,
      status,
      dateApplied,
      jobDescription,
      followUpDate,
      ctc,
      location,
      applicationLink,
      notes
    });

    const createdApplication = await application.save();
    res.status(201).json(createdApplication);
  } catch (error) {
    console.error('Create application error:', error);
    res.status(400).json({ message: 'Failed to create application', error: error.message });
  }
};

// @desc    Update application
// @route   PUT /api/applications/:id
// @access  Private
export const updateApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    Object.assign(application, req.body);
    const updatedApplication = await application.save();
    res.status(200).json(updatedApplication);
  } catch (error) {
    console.error('Update application error:', error);
    res.status(400).json({ message: 'Failed to update application', error: error.message });
  }
};

// @desc    Delete application
// @route   DELETE /api/applications/:id
// @access  Private
export const deleteApplication = async (req, res) => {
  try {
    const application = await Application.findOne({ 
      _id: req.params.id, 
      userId: req.user.id 
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await application.deleteOne();
    res.status(200).json({ message: 'Application deleted successfully' });
  } catch (error) {
    console.error('Delete application error:', error);
    res.status(500).json({ message: 'Failed to delete application', error: error.message });
  }
};