// ===== backend/src/app-simple.js =====
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper function to generate correct Job ID
const generateJobId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2); // 25 (2025)
  const month = (now.getMonth() + 1).toString().padStart(2, '0'); // 07 (July)
  const day = now.getDate().toString().padStart(2, '0'); // 13
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${random}`;
};

// Mock data with proper timestamps
let jobs = [
  {
    jobId: generateJobId(),
    customerName: "สมชาย ใจดี",
    customerPhone: "0812345678",
    deviceModel: "iPhone 14 Pro",
    problemDescription: "หน้าจอแตก",
    status: "RECEIVED_AT_DROP",
    queueNumber: 1,
    priority: "NORMAL",
    createdAt: new Date(),
    updatedAt: new Date(),
    dropAppId: "drop_app_001",
    history: [{
      status: 'NEW_QUEUE',
      updatedBy: 'system',
      updatedByName: 'System',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      note: 'สร้างงานใหม่',
      location: 'ONLINE'
    }, {
      status: 'RECEIVED_AT_DROP',
      updatedBy: 'drop001',
      updatedByName: 'Drop-APP Staff',
      timestamp: new Date(),
      note: 'รับเครื่องจากลูกค้าแล้ว',
      location: 'DROP_APP'
    }]
  }
];

// Counter for queue numbers (reset daily)
let dailyCounter = jobs.length;
let lastResetDate = new Date().toDateString();

// Function to get next queue number (resets daily)
const getNextQueueNumber = () => {
  const today = new Date().toDateString();
  
  // Reset counter if it's a new day
  if (today !== lastResetDate) {
    dailyCounter = 0;
    lastResetDate = today;
    // In real app, we would also clear old jobs or move to history
  }
  
  dailyCounter++;
  return dailyCounter;
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Repair Tracking API is running!',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5001
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Repair Tracking API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      jobs: '/api/jobs',
      stats: '/api/jobs/stats/summary',
      queue: '/api/jobs/queue/current'
    }
  });
});

// Get all jobs with filtering
app.get('/api/jobs', (req, res) => {
  try {
    const { status, limit = 20 } = req.query;
    
    let filteredJobs = jobs;
    
    // Filter by status if provided
    if (status && status !== '' && status !== 'all') {
      filteredJobs = jobs.filter(job => job.status === status);
    }
    
    // Apply limit
    const limitedJobs = filteredJobs.slice(0, parseInt(limit));
    
    res.json({
      success: true,
      data: limitedJobs,
      pagination: {
        page: 1,
        limit: parseInt(limit),
        total: filteredJobs.length,
        totalPages: Math.ceil(filteredJobs.length / parseInt(limit))
      },
      filter: {
        status: status || 'all',
        applied: status ? true : false
      }
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล'
    });
  }
});

// Create new job
app.post('/api/jobs', (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deviceModel,
      deviceSerial,
      problemDescription,
      problemCategory,
      priority = 'NORMAL',
      dropAppId,
      source = 'ONLINE'
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !deviceModel || !problemDescription) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    const jobId = generateJobId();
    const queueNumber = getNextQueueNumber();
    const now = new Date();

    const newJob = {
      jobId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      deviceModel,
      deviceSerial: deviceSerial || null,
      problemDescription,
      problemCategory: problemCategory || 'OTHER',
      status: "NEW_QUEUE",
      priority,
      queueNumber,
      createdAt: now,
      updatedAt: now,
      dropAppId: dropAppId || 'drop_app_001',
      estimatedCost: 0,
      actualCost: 0,
      source,
      history: [{
        status: 'NEW_QUEUE',
        updatedBy: 'system',
        updatedByName: 'System',
        timestamp: now,
        note: 'สร้างงานใหม่จากการลงทะเบียนออนไลน์',
        location: source
      }]
    };

    jobs.push(newJob);

    console.log(`✅ Created job: ${newJob.jobId} for ${customerName} (Queue: ${queueNumber})`);

    res.status(201).json({
      success: true,
      message: 'สร้างงานซ่อมเรียบร้อย',
      data: {
        jobId: newJob.jobId,
        queueNumber: newJob.queueNumber,
        customerName: newJob.customerName
      }
    });
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างงาน'
    });
  }
});

// Update job status
app.put('/api/jobs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, updatedBy = 'system', updatedByName = 'System User' } = req.body;

    const jobIndex = jobs.findIndex(j => j.jobId === id);
    if (jobIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบงานที่ต้องการ'
      });
    }

    const job = jobs[jobIndex];
    const oldStatus = job.status;
    const now = new Date();
    
    // Update job
    job.status = status;
    job.updatedAt = now;

    // Add to history
    if (!job.history) job.history = [];
    job.history.push({
      status,
      updatedBy,
      updatedByName,
      timestamp: now,
      note: note || `เปลี่ยนสถานะจาก ${oldStatus} เป็น ${status}`,
      location: 'API'
    });

    console.log(`✅ Updated job ${id}: ${oldStatus} → ${status}`);

    res.json({
      success: true,
      message: 'อัพเดตสถานะเรียบร้อย',
      data: {
        jobId: job.jobId,
        oldStatus,
        newStatus: status,
        updatedAt: now
      }
    });
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดต'
    });
  }
});

// Get job by ID
app.get('/api/jobs/:id', (req, res) => {
  const { id } = req.params;
  const job = jobs.find(j => j.jobId === id);
  
  if (!job) {
    return res.status(404).json({
      success: false,
      message: 'ไม่พบงานที่ต้องการ'
    });
  }
  
  res.json({
    success: true,
    data: job
  });
});

// Get statistics
app.get('/api/jobs/stats/summary', (req, res) => {
  const total = jobs.length;
  const completed = jobs.filter(job => job.status === 'COMPLETED').length;
  const inProgress = jobs.filter(job => 
    !['COMPLETED', 'NEW_QUEUE'].includes(job.status)
  ).length;
  const pending = jobs.filter(job => job.status === 'NEW_QUEUE').length;

  // Calculate proper percentages
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const pendingRate = total > 0 ? Math.round((pending / total) * 100) : 0;

  res.json({
    success: true,
    data: {
      total,
      completed,
      inProgress,
      pending,
      avgCompletionTime: 2,
      completionRate,
      inProgressRate,
      pendingRate,
      statusBreakdown: {
        NEW_QUEUE: pending,
        RECEIVED_AT_DROP: jobs.filter(j => j.status === 'RECEIVED_AT_DROP').length,
        TRANSFERRING_TO_ASP: jobs.filter(j => j.status === 'TRANSFERRING_TO_ASP').length,
        RECEIVED_AT_ASP: jobs.filter(j => j.status === 'RECEIVED_AT_ASP').length,
        EVALUATING: jobs.filter(j => j.status === 'EVALUATING').length,
        WAITING_PARTS: jobs.filter(j => j.status === 'WAITING_PARTS').length,
        REPAIRING: jobs.filter(j => j.status === 'REPAIRING').length,
        QUALITY_CHECK: jobs.filter(j => j.status === 'QUALITY_CHECK').length,
        READY_FOR_RETURN: jobs.filter(j => j.status === 'READY_FOR_RETURN').length,
        RETURNED_TO_DROP: jobs.filter(j => j.status === 'RETURNED_TO_DROP').length,
        READY_FOR_PICKUP: jobs.filter(j => j.status === 'READY_FOR_PICKUP').length,
        COMPLETED: completed
      },
      currentQueue: total,
      todayJobs: total
    }
  });
});

// Get current queue with proper time calculation
app.get('/api/jobs/queue/current', (req, res) => {
  const queueJobs = jobs
    .filter(job => ['NEW_QUEUE', 'RECEIVED_AT_DROP'].includes(job.status))
    .sort((a, b) => a.queueNumber - b.queueNumber)
    .slice(0, 10);

  // Generate proper estimated times
  const queueWithTimes = queueJobs.map((job, index) => {
    const baseTime = new Date();
    const estimatedMinutes = (index + 1) * 30; // 30 minutes per queue position
    const estimatedTime = new Date(baseTime.getTime() + estimatedMinutes * 60000);
    
    return {
      queueNumber: job.queueNumber,
      jobId: job.jobId,
      customerName: job.customerName,
      status: job.status,
      estimatedTime: estimatedTime.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  });

  res.json({
    success: true,
    data: {
      currentQueue: Math.max(...jobs.map(j => j.queueNumber), 0),
      totalToday: jobs.length,
      averageWaitTime: 30,
      lastUpdated: new Date(),
      queueList: queueWithTimes
    }
  });
});

// Analytics endpoints for Admin
app.get('/api/jobs/analytics/overview', (req, res) => {
  const stats = {
    total: jobs.length,
    completed: jobs.filter(job => job.status === 'COMPLETED').length,
    inProgress: jobs.filter(job => !['COMPLETED', 'NEW_QUEUE'].includes(job.status)).length,
    pending: jobs.filter(job => job.status === 'NEW_QUEUE').length
  };

  // Calculate realistic growth percentages
  const getGrowthPercentage = (current, category) => {
    const base = Math.max(current - 2, 0); // Simulate previous period
    if (base === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - base) / base) * 100);
  };

  res.json({
    success: true,
    data: {
      performance: {
        totalJobs: stats.total,
        completedJobs: stats.completed,
        inProgressJobs: stats.inProgress,
        pendingJobs: stats.pending,
        avgCompletionTime: 2,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        currentQueue: Math.max(...jobs.map(j => j.queueNumber), 0),
        todayJobs: stats.total,
        statusBreakdown: {
          NEW_QUEUE: stats.pending,
          RECEIVED_AT_DROP: jobs.filter(j => j.status === 'RECEIVED_AT_DROP').length,
          TRANSFERRING_TO_ASP: jobs.filter(j => j.status === 'TRANSFERRING_TO_ASP').length,
          RECEIVED_AT_ASP: jobs.filter(j => j.status === 'RECEIVED_AT_ASP').length,
          EVALUATING: jobs.filter(j => j.status === 'EVALUATING').length,
          WAITING_PARTS: jobs.filter(j => j.status === 'WAITING_PARTS').length,
          REPAIRING: jobs.filter(j => j.status === 'REPAIRING').length,
          QUALITY_CHECK: jobs.filter(j => j.status === 'QUALITY_CHECK').length,
          READY_FOR_RETURN: jobs.filter(j => j.status === 'READY_FOR_RETURN').length,
          RETURNED_TO_DROP: jobs.filter(j => j.status === 'RETURNED_TO_DROP').length,
          READY_FOR_PICKUP: jobs.filter(j => j.status === 'READY_FOR_PICKUP').length,
          COMPLETED: stats.completed
        }
      },
      trends: {
        jobsGrowth: getGrowthPercentage(stats.total, 'jobs'),
        revenueGrowth: getGrowthPercentage(stats.completed * 2500, 'revenue'),
        completionGrowth: getGrowthPercentage(stats.completed, 'completion'),
        efficiencyGrowth: stats.total > 0 ? Math.round((stats.completed / stats.total) * 10) : 0
      },
      lastUpdated: new Date()
    }
  });
});

// Daily analytics
app.get('/api/jobs/analytics/daily', (req, res) => {
  const days = 7;
  const dailyStats = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    // Mock daily data based on current jobs
    const dayJobCount = Math.max(1, Math.floor(jobs.length / days) + Math.floor(Math.random() * 3));
    const completedCount = Math.floor(dayJobCount * 0.6);
    
    dailyStats.push({
      date: dateStr,
      created: dayJobCount,
      completed: completedCount,
      revenue: completedCount * 2500
    });
  }

  res.json({
    success: true,
    data: dailyStats
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.originalUrl}`,
    availableEndpoints: ['/', '/health', '/api/jobs']
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log('🚀 Repair Tracking API running on port', PORT);
  console.log('📱 Health check: http://localhost:' + PORT + '/health');
  console.log('🌍 Environment:', process.env.NODE_ENV || 'development');
  console.log('📅 Today is:', new Date().toLocaleDateString('th-TH'));
});

module.exports = app;