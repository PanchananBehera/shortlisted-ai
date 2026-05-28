// src/controllers/errorReportController.js
// ✅ Handles error report submission and admin queries
import ErrorReport from '../models/ErrorReport.js';
import { sendAlert } from '../utils/alerts.js'; // Optional: Slack/email alerts

// 🎯 POST /api/reports/error - Submit a new error report
export const submitErrorReport = async (req, res) => {
  try {
    const { type, message, context = {}, userId, userEmail } = req.body;
    
    // ✅ Validate required fields
    if (!type || !message) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: type and message'
      });
    }
    
    // ✅ Sanitize context: only allow known safe fields
    const safeContext = {};
    const allowedContextFields = [
      'fileSize', 'fileType', 'targetRole', 'hasJobDescription', 
      'includePhoto', 'fileName', 'statusCode', 'timestamp', 
      'path', 'userAgent'
    ];
    
    for (const field of allowedContextFields) {
      if (context[field] !== undefined) {
        safeContext[field] = context[field];
      }
    }
    
    // ✅ Prepare report data
    const reportData = {
      type,
      message,
      context: safeContext,
      user: {
        _id: userId || null,
        email: userEmail || null
      }
    };
    
    // ✅ Upsert (deduplicate) the report
    const report = await ErrorReport.upsertReport(reportData);
    
    // 🚨 Send alert for critical errors (async, don't block response)
    if (report.severity === 'critical' && report.count === 1) {
      // First occurrence of a critical error: alert the team
      sendAlert({
        channel: '#engineering-alerts', // Slack channel
        title: `🔴 Critical Error Reported: ${report.type}`,
        message: report.message,
        details: {
          severity: report.severityBadge,
          user: report.user.email || 'Anonymous',
          path: report.context?.path,
          fingerprint: report.fingerprint,
          // Link to admin dashboard
          dashboardUrl: `${process.env.ADMIN_DASHBOARD_URL}/errors/${report._id}`
        }
      }).catch(err => console.error('Failed to send alert:', err));
    }
    
    // ✅ Respond quickly - don't expose internal IDs
    return res.status(201).json({
      success: true,
      message: 'Error report received. Thank you for helping us improve!',
      reportId: report._id // Optional: for debugging
    });
    
  } catch (error) {
    console.error('Error submitting report:', error);
    
    // ✅ Never fail the user experience - still return success
    // Log internally for ops team
    console.error('🚨 ErrorReport submission failed:', {
      error: error.message,
      body: req.body,
      user: req.user?._id
    });
    
    return res.status(200).json({
      success: true,
      message: 'Thanks for your feedback!',
      note: 'Report queued for processing'
    });
  }
};

// 🔐 GET /api/admin/reports/errors - Admin: List error reports
export const getErrorReports = async (req, res) => {
  try {
    // ✅ Admin auth middleware should protect this route
    const { 
      page = 1, 
      limit = 20, 
      status, 
      severity, 
      type, 
      search,
      startDate,
      endDate
    } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;
    if (type) filter.type = type;
    
    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }
    
    // Text search across message and context
    if (search) {
      filter.$or = [
        { message: { $regex: search, $options: 'i' } },
        { 'context.fileName': { $regex: search, $options: 'i' } },
        { 'context.targetRole': { $regex: search, $options: 'i' } }
      ];
    }
    
    // Execute query with pagination
    const reports = await ErrorReport.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .select('-__v') // Exclude version key
      .lean();
    
    // Get total count for pagination
    const total = await ErrorReport.countDocuments(filter);
    
    return res.json({
      success: true,
      data: {
        reports,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
    
  } catch (error) {
    console.error('Error fetching reports:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch error reports'
    });
  }
};

// 🔐 PATCH /api/admin/reports/errors/:id - Admin: Update report status
export const updateErrorReport = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, resolution } = req.body;
    
    const update = {};
    if (status) update.status = status;
    if (resolution) update.resolution = resolution;
    
    const report = await ErrorReport.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).select('-__v');
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Error report not found'
      });
    }
    
    return res.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Error updating report:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update error report'
    });
  }
};

// 📊 GET /api/admin/reports/errors/stats - Admin: Dashboard stats
export const getErrorReportStats = async (req, res) => {
  try {
    const now = new Date();
    const last24h = new Date(now - 24 * 60 * 60 * 1000);
    const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);
    
    // Aggregate stats
    const [total, new24h, bySeverity, byType, topErrors] = await Promise.all([
      // Total reports
      ErrorReport.countDocuments(),
      
      // New in last 24h
      ErrorReport.countDocuments({ createdAt: { $gte: last24h } }),
      
      // By severity
      ErrorReport.aggregate([
        { $group: { _id: '$severity', count: { $sum: '$count' } } }
      ]),
      
      // By type
      ErrorReport.aggregate([
        { $group: { _id: '$type', count: { $sum: '$count' } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      // Top fingerprints (most frequent errors)
      ErrorReport.aggregate([
        { $match: { createdAt: { $gte: last7d } } },
        { $group: { 
            _id: '$fingerprint', 
            count: { $sum: '$count' },
            type: { $first: '$type' },
            message: { $first: '$message' }
        }},
        { $sort: { count: -1 } },
        { $limit: 5 }
      ])
    ]);
    
    return res.json({
      success: true,
      data: {
        total,
        new24h,
        bySeverity: bySeverity.reduce((acc, cur) => ({ ...acc, [cur._id]: cur.count }), {}),
        byType: byType,
        topErrors: topErrors.map(e => ({
          fingerprint: e._id,
          type: e.type,
          message: e.message,
          count: e.count
        }))
      }
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch error report statistics'
    });
  }
};