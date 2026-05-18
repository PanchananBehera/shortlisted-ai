// server/utils/aiUsageLogger.js
import AIUsageLog from '../models/AIUsageLog.js';

export const logAIUsage = async ({
  userId,
  userEmail,
  featureUsed,
  companyName = null,
  jobRole = null,
  applicationId = null,
  success,
  errorMessage = null,
  tokenCount = null,
  responseTime = null,
  req = null // Express request object for IP/user-agent
}) => {
  try {
    await AIUsageLog.create({
      userId,
      userEmail,
      featureUsed,
      companyName,
      jobRole,
      applicationId,
      success,
      errorMessage,
      tokenCount,
      responseTime,
      ipAddress: req?.ip || req?.connection?.remoteAddress,
      userAgent: req?.get('User-Agent')
    });
  } catch (error) {
    // Don't let logging failures break the main feature
    console.error('Failed to log AI usage:', error.message);
  }
};