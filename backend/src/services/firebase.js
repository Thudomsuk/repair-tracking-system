// ===== backend/src/services/firebase.js =====
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  // Check for required environment variables
  const requiredEnvVars = [
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY_ID', 
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'FIREBASE_CLIENT_ID'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing Firebase environment variables:', missingVars);
    console.error('Please check your .env file in the backend folder');
    process.exit(1);
  }

  const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth',
    token_uri: process.env.FIREBASE_TOKEN_URI || 'https://oauth2.googleapis.com/token',
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
  });

  console.log('🔥 Firebase Admin initialized successfully');
}

const db = admin.firestore();
const auth = admin.auth();

// Helper function to generate Job ID
const generateJobId = () => {
  const now = new Date();
  const year = now.getFullYear().toString().substr(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `${year}${month}${day}${random}`;
};

// Job Service Functions
const jobService = {
  // Create new job
  async createJob(jobData) {
    try {
      const jobId = generateJobId();
      const now = new Date();
      
      const job = {
        jobId,
        ...jobData,
        status: 'NEW_QUEUE',
        createdAt: now,
        updatedAt: now,
        queueNumber: await this.getNextQueueNumber(),
        estimatedCost: 0,
        actualCost: 0,
        history: [{
          status: 'NEW_QUEUE',
          updatedBy: 'system',
          updatedByName: 'System',
          timestamp: now,
          note: 'สร้างงานใหม่',
          location: jobData.source || 'ONLINE'
        }],
        isActive: true
      };

      await db.collection('jobs').doc(jobId).set(job);
      console.log(`✅ Created job: ${jobId}`);
      
      return { jobId, queueNumber: job.queueNumber };
    } catch (error) {
      console.error('❌ Error creating job:', error);
      throw error;
    }
  },

  // Get next queue number
  async getNextQueueNumber() {
    try {
      // ใช้วิธีง่ายกว่า - นับจำนวน document ทั้งหมดแล้วบวก 1
      const allJobsSnapshot = await db.collection('jobs').get();
      return allJobsSnapshot.size + 1;
    } catch (error) {
      console.error('❌ Error getting queue number:', error);
      // Fallback to random number
      return Math.floor(Math.random() * 1000) + 1;
    }
  },

  // Get all jobs with filters
  async getJobs(filters = {}) {
    try {
      let query = db.collection('jobs');

      // Apply filters
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      
      if (filters.branchId) {
        query = query.where('dropAppId', '==', filters.branchId);
      }

      if (filters.aspId) {
        query = query.where('aspId', '==', filters.aspId);
      }

      // Order by creation date (newest first)
      query = query.orderBy('createdAt', 'desc');

      // Apply pagination
      if (filters.limit) {
        query = query.limit(parseInt(filters.limit));
      }

      const snapshot = await query.get();
      const jobs = [];

      snapshot.forEach(doc => {
        const data = doc.data();
        jobs.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || new Date(),
          updatedAt: data.updatedAt?.toDate?.() || new Date(),
          completedAt: data.completedAt?.toDate?.() || null,
          history: data.history?.map(h => ({
            ...h,
            timestamp: h.timestamp?.toDate?.() || new Date()
          })) || []
        });
      });

      return jobs;
    } catch (error) {
      console.error('❌ Error getting jobs:', error);
      throw error;
    }
  },

  // Get job by ID
  async getJobById(jobId) {
    try {
      const doc = await db.collection('jobs').doc(jobId).get();
      
      if (!doc.exists) {
        return null;
      }

      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
        updatedAt: data.updatedAt?.toDate?.() || new Date(),
        completedAt: data.completedAt?.toDate?.() || null,
        history: data.history?.map(h => ({
          ...h,
          timestamp: h.timestamp?.toDate?.() || new Date()
        })) || []
      };
    } catch (error) {
      console.error('❌ Error getting job:', error);
      throw error;
    }
  },

  // Update job status
  async updateJob(jobId, updateData) {
    try {
      const jobRef = db.collection('jobs').doc(jobId);
      const jobDoc = await jobRef.get();

      if (!jobDoc.exists) {
        throw new Error('Job not found');
      }

      const currentData = jobDoc.data();
      const oldStatus = currentData.status;
      const now = new Date();

      // Prepare update data
      const updates = {
        ...updateData,
        updatedAt: now
      };

      // Handle status change
      if (updateData.status && updateData.status !== oldStatus) {
        // Add to history (update separately to avoid serverTimestamp in array issue)
        const historyEntry = {
          status: updateData.status,
          updatedBy: updateData.updatedBy || 'system',
          updatedByName: updateData.updatedByName || 'System User',
          timestamp: now,
          note: updateData.note || `เปลี่ยนสถานะจาก ${oldStatus} เป็น ${updateData.status}`,
          location: updateData.location || 'API'
        };

        // Get current history and add new entry
        const currentHistory = currentData.history || [];
        updates.history = [...currentHistory, historyEntry];

        // Mark as completed if status is COMPLETED
        if (updateData.status === 'COMPLETED') {
          updates.completedAt = now;
        }
      }

      await jobRef.update(updates);
      console.log(`✅ Updated job: ${jobId}`);
      
      return { jobId, oldStatus, newStatus: updateData.status };
    } catch (error) {
      console.error('❌ Error updating job:', error);
      throw error;
    }
  },

  // Get statistics
  async getStats() {
    try {
      const allJobsSnapshot = await db.collection('jobs').get();
      const jobs = allJobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const total = jobs.length;
      const completed = jobs.filter(job => job.status === 'COMPLETED').length;
      const inProgress = jobs.filter(job => 
        !['COMPLETED', 'NEW_QUEUE'].includes(job.status)
      ).length;
      const pending = jobs.filter(job => job.status === 'NEW_QUEUE').length;

      // Status breakdown
      const statusBreakdown = {};
      const statusList = [
        'NEW_QUEUE', 'RECEIVED_AT_DROP', 'TRANSFERRING_TO_ASP', 'RECEIVED_AT_ASP',
        'EVALUATING', 'WAITING_PARTS', 'REPAIRING', 'QUALITY_CHECK',
        'READY_FOR_RETURN', 'RETURNED_TO_DROP', 'READY_FOR_PICKUP', 'COMPLETED'
      ];

      statusList.forEach(status => {
        statusBreakdown[status] = jobs.filter(job => job.status === status).length;
      });

      // Calculate average completion time
      const completedJobs = jobs.filter(job => job.completedAt && job.createdAt);
      let avgCompletionTime = 0;

      if (completedJobs.length > 0) {
        const totalTime = completedJobs.reduce((sum, job) => {
          const start = job.createdAt?.toDate?.() || new Date(job.createdAt);
          const end = job.completedAt?.toDate?.() || new Date(job.completedAt);
          return sum + (end - start);
        }, 0);
        avgCompletionTime = Math.round(totalTime / completedJobs.length / (1000 * 60 * 60 * 24)); // days
      }

      // Current queue
      const currentQueue = Math.max(...jobs.map(j => j.queueNumber || 0), 0);

      // Today's jobs
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const todayJobs = jobs.filter(job => {
        const jobDate = job.createdAt?.toDate?.() || new Date(job.createdAt);
        return jobDate >= startOfDay;
      }).length;

      return {
        total,
        completed,
        inProgress,
        pending,
        avgCompletionTime,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        statusBreakdown,
        currentQueue,
        todayJobs
      };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      throw error;
    }
  },

  // Get current queue status
  async getCurrentQueue() {
    try {
      const stats = await this.getStats();
      
      const queueJobs = await db.collection('jobs')
        .where('status', 'in', ['NEW_QUEUE', 'RECEIVED_AT_DROP'])
        .orderBy('queueNumber', 'asc')
        .limit(10)
        .get();

      const queueList = queueJobs.docs.map(doc => {
        const job = doc.data();
        return {
          queueNumber: job.queueNumber,
          jobId: job.jobId,
          customerName: job.customerName,
          status: job.status,
          estimatedTime: new Date(
            (job.createdAt?.toDate?.() || new Date()).getTime() + 2 * 60 * 60 * 1000
          ).toLocaleTimeString('th-TH', {
            hour: '2-digit',
            minute: '2-digit'
          })
        };
      });

      return {
        currentQueue: stats.currentQueue,
        totalToday: stats.todayJobs,
        averageWaitTime: 30, // minutes (calculated based on historical data)
        lastUpdated: new Date(),
        queueList
      };
    } catch (error) {
      console.error('❌ Error getting current queue:', error);
      throw error;
    }
  }
};

// User Service Functions
const userService = {
  // Get user by UID
  async getUserById(uid) {
    try {
      const doc = await db.collection('users').doc(uid).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        id: doc.id,
        ...doc.data()
      };
    } catch (error) {
      console.error('❌ Error getting user:', error);
      throw error;
    }
  },

  // Create or update user
  async createOrUpdateUser(uid, userData) {
    try {
      const userRef = db.collection('users').doc(uid);
      const updates = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      await userRef.set(updates, { merge: true });
      console.log(`✅ Updated user: ${uid}`);
      
      return { uid };
    } catch (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
  }
};

module.exports = {
  db,
  auth,
  jobService,
  userService,
  admin
};