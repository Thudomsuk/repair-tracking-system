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

// Mock data
let jobs = [
  {
    jobId: "25010400001",
    customerName: "สมชาย ใจดี",
    customerPhone: "0812345678",
    deviceModel: "iPhone 14 Pro",
    problemDescription: "หน้าจอแตก",
    status: "NEW_QUEUE",
    queueNumber: 1,
    priority: "NORMAL",
    createdAt: new Date(),
    updatedAt: new Date(),
    dropAppId: "drop_app_001"
  }
];

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
      stats: '/api/jobs/stats/summary'
    }
  });
});

// Get all jobs
app.get('/api/jobs', (req, res) => {
  res.json({
    success: true,
    data: jobs,
    pagination: {
      page: 1,
      limit: 20,
      total: jobs.length,
      totalPages: 1
    }
  });
});

// Create new job
app.post('/api/jobs', (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail,
      deviceModel,
      problemDescription,
      problemCategory,
      priority = 'NORMAL',
      dropAppId
    } = req.body;

    // Validation
    if (!customerName || !customerPhone || !deviceModel || !problemDescription) {
      return res.status(400).json({
        success: false,
        message: 'กรุณากรอกข้อมูลให้ครบถ้วน'
      });
    }

    const newJob = {
      jobId: `2501040000${jobs.length + 1}`,
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      deviceModel,
      problemDescription,
      problemCategory: problemCategory || 'OTHER',
      status: "NEW_QUEUE",
      priority,
      queueNumber: jobs.length + 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      dropAppId: dropAppId || 'drop_app_001',
      estimatedCost: 0,
      actualCost: 0
    };

    jobs.push(newJob);

    console.log(`✅ Created job: ${newJob.jobId} for ${customerName}`);

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
    const { status, note } = req.body;

    const jobIndex = jobs.findIndex(j => j.jobId === id);
    if (jobIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'ไม่พบงานที่ต้องการ'
      });
    }

    const job = jobs[jobIndex];
    const oldStatus = job.status;
    
    job.status = status;
    job.updatedAt = new Date();

    console.log(`✅ Updated job ${id}: ${oldStatus} → ${status}`);

    res.json({
      success: true,
      message: 'อัพเดตสถานะเรียบร้อย',
      data: {
        jobId: job.jobId,
        oldStatus,
        newStatus: status
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

  res.json({
    success: true,
    data: {
      total,
      completed,
      inProgress,
      pending,
      avgCompletionTime: 2,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      statusBreakdown: {
        NEW_QUEUE: pending,
        RECEIVED_AT_DROP: Math.floor(total * 0.2),
        TRANSFERRING_TO_ASP: Math.floor(total * 0.1),
        RECEIVED_AT_ASP: Math.floor(total * 0.1),
        EVALUATING: Math.floor(total * 0.1),
        WAITING_PARTS: 0,
        REPAIRING: inProgress,
        QUALITY_CHECK: 0,
        READY_FOR_RETURN: 0,
        RETURNED_TO_DROP: 0,
        READY_FOR_PICKUP: 0,
        COMPLETED: completed
      },
      currentQueue: total,
      todayJobs: total
    }
  });
});

// Get current queue
app.get('/api/jobs/queue/current', (req, res) => {
  const queueJobs = jobs
    .filter(job => ['NEW_QUEUE', 'RECEIVED_AT_DROP'].includes(job.status))
    .slice(0, 10)
    .map(job => ({
      queueNumber: job.queueNumber,
      jobId: job.jobId,
      customerName: job.customerName,
      status: job.status,
      estimatedTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit'
      })
    }));

  res.json({
    success: true,
    data: {
      currentQueue: jobs.length,
      totalToday: jobs.length,
      averageWaitTime: 30,
      lastUpdated: new Date(),
      queueList: queueJobs
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
        currentQueue: stats.total,
        todayJobs: stats.total,
        statusBreakdown: {
          NEW_QUEUE: stats.pending,
          COMPLETED: stats.completed
        }
      },
      trends: {
        jobsGrowth: 12.5,
        revenueGrowth: 18.3,
        completionGrowth: 8.7,
        efficiencyGrowth: 5.2
      },
      lastUpdated: new Date()
    }
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
});

module.exports = app;