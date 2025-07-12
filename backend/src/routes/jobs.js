// ===== backend/src/routes/jobs.js =====
const express = require('express');
const { body, validationResult } = require('express-validator');
const { jobService } = require('../services/firebase');
const router = express.Router();
const { verifyToken, requireStaff, optionalAuth } = require('../middleware/auth');
const { createJobLimiter, heavyLimiter } = require('../middleware/rateLimit');

// Validation middleware
const validateJobCreation = [
  body('customerName').notEmpty().withMessage('Customer name is required'),
  body('customerPhone').isMobilePhone('th-TH').withMessage('Valid Thai phone number required'),
  body('deviceModel').notEmpty().withMessage('Device model is required'),
  body('problemDescription').notEmpty().withMessage('Problem description is required'),
  body('dropAppId').notEmpty().withMessage('Drop-APP ID is required')
];

// GET /api/jobs - ดึงรายการงานซ่อม
router.put('/:id', verifyToken, requireStaff, [
  body('status').notEmpty().withMessage('Status is required'),
  body('note').optional().isString()
], async (req, res) => {
  try {
    const { status, branchId, aspId, search, page = 1, limit = 20 } = req.query;
    
    // Build filters
    const filters = {};
    if (status) filters.status = status;
    if (branchId) filters.branchId = branchId;
    if (aspId) filters.aspId = aspId;
    if (limit) filters.limit = parseInt(limit);

    const jobs = await jobService.getJobs(filters);
    
    // Apply search filter (client-side for now)
    let filteredJobs = jobs;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredJobs = jobs.filter(job =>
        job.jobId.toLowerCase().includes(searchLower) ||
        job.customerName.toLowerCase().includes(searchLower) ||
        job.customerPhone.includes(search) ||
        job.deviceModel.toLowerCase().includes(searchLower)
      );
    }
    
    // Pagination (client-side for now)
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedJobs = filteredJobs.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedJobs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredJobs.length,
        totalPages: Math.ceil(filteredJobs.length / limit)
      }
    });
    
  } catch (error) {
    console.error('Error fetching jobs:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลงาน',
      error: error.message
    });
  }
});

// POST /api/jobs - สร้างงานซ่อมใหม่
router.post('/', createJobLimiter, validateJobCreation, async (req, res) => {
  try {
    // ตรวจสอบ validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      });
    }
    
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
      notes,
      source = 'ONLINE'
    } = req.body;
    
    // สร้างงานใหม่
    const jobData = {
      customerName,
      customerPhone,
      customerEmail: customerEmail || null,
      deviceModel,
      deviceSerial: deviceSerial || null,
      problemDescription,
      problemCategory: problemCategory || 'OTHER',
      priority,
      dropAppId,
      aspId: null,
      assignedTechnician: null,
      notes: notes || '',
      estimatedDuration: 0,
      warrantyPeriod: 90,
      metadata: {
        source,
        deviceCondition: 'UNKNOWN',
        accessories: [],
        customerType: 'NEW'
      }
    };
    
    const result = await jobService.createJob(jobData);
    
    console.log(`✅ Created new job: ${result.jobId} for ${customerName}`);
    
    res.status(201).json({
      success: true,
      message: 'สร้างงานซ่อมเรียบร้อย',
      data: {
        jobId: result.jobId,
        queueNumber: result.queueNumber,
        customerName: customerName
      }
    });
    
  } catch (error) {
    console.error('Error creating job:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการสร้างงาน',
      error: error.message
    });
  }
});

// GET /api/jobs/:id - ดึงข้อมูลงานเฉพาะ
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const job = await jobService.getJobById(id);
    
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
    
  } catch (error) {
    console.error('Error fetching job:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูล',
      error: error.message
    });
  }
});

// PUT /api/jobs/:id - อัพเดตสถานะงาน
router.put('/:id', [
  body('status').notEmpty().withMessage('Status is required'),
  body('note').optional().isString()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'ข้อมูลไม่ถูกต้อง',
        errors: errors.array()
      });
    }
    
    const { id } = req.params;
    const { 
      status, 
      note, 
      estimatedCost, 
      actualCost, 
      aspId, 
      assignedTechnician,
      updatedBy = 'system',
      updatedByName = 'System User'
    } = req.body;
    
    // Prepare update data
    const updateData = {
    status,
    note,
    updatedBy: req.user.uid,
    updatedByName: req.user.displayName
    };

    
    // Add optional fields
    if (estimatedCost !== undefined) updateData.estimatedCost = parseFloat(estimatedCost);
    if (actualCost !== undefined) updateData.actualCost = parseFloat(actualCost);
    if (aspId) updateData.aspId = aspId;
    if (assignedTechnician) updateData.assignedTechnician = assignedTechnician;
    
    const result = await jobService.updateJob(id, updateData);
    
    console.log(`✅ Updated job ${id}: ${result.oldStatus} → ${result.newStatus}`);
    
    res.json({
      success: true,
      message: 'อัพเดตสถานะเรียบร้อย',
      data: {
        jobId: result.jobId,
        oldStatus: result.oldStatus,
        newStatus: result.newStatus,
        updatedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('Error updating job:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการอัพเดต',
      error: error.message
    });
  }
});

// GET /api/jobs/stats/summary - ดึงสถิติงาน
router.get('/stats/summary', async (req, res) => {
  try {
    const stats = await jobService.getStats();
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถิติ',
      error: error.message
    });
  }
});

// GET /api/jobs/queue/current - ดึงสถานะคิวปัจจุบัน
router.get('/queue/current', async (req, res) => {
  try {
    const queueData = await jobService.getCurrentQueue();
    
    res.json({
      success: true,
      data: queueData
    });
    
  } catch (error) {
    console.error('Error fetching queue status:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงสถานะคิว',
      error: error.message
    });
  }
});

// GET /api/jobs/analytics/overview - สำหรับ Admin Dashboard
router.get('/analytics/overview', verifyToken, requireStaff, heavyLimiter, async (req, res) => {
  try {
    const stats = await jobService.getStats();
    
    // Enhanced analytics for admin
    const performance = {
      totalJobs: stats.total,
      completedJobs: stats.completed,
      inProgressJobs: stats.inProgress,
      pendingJobs: stats.pending,
      avgCompletionTime: stats.avgCompletionTime,
      completionRate: stats.completionRate,
      priorityBreakdown: {}, // TODO: Implement priority breakdown
      currentQueue: stats.currentQueue,
      todayJobs: stats.todayJobs
    };

    // Mock trends data (replace with real calculations)
    const trends = {
      jobsGrowth: 12.5,
      revenueGrowth: 18.3,
      completionGrowth: 8.7,
      efficiencyGrowth: 5.2
    };

    res.json({
      success: true,
      data: {
        performance: {
          ...performance,
          statusBreakdown: stats.statusBreakdown
        },
        trends,
        lastUpdated: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลวิเคราะห์',
      error: error.message
    });
  }
});

// GET /api/jobs/analytics/daily - สำหรับกราฟรายวัน
router.get('/analytics/daily', verifyToken, requireStaff, heavyLimiter, async (req, res) => {
  try {
    const days = 7; // ย้อนหลัง 7 วัน
    const dailyStats = [];

    // TODO: Implement proper daily analytics from Firestore
    // For now, return mock data structure
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      dailyStats.push({
        date: dateStr,
        created: Math.floor(Math.random() * 5) + 1,
        completed: Math.floor(Math.random() * 3),
        revenue: Math.floor(Math.random() * 10000) + 5000
      });
    }

    res.json({
      success: true,
      data: dailyStats
    });

  } catch (error) {
    console.error('Error fetching daily analytics:', error);
    res.status(500).json({
      success: false,
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลรายวัน',
      error: error.message
    });
  }
});

module.exports = router;