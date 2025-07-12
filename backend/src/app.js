// ===== backend/src/app.js =====
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

console.log('🔥 Starting Repair Tracking Server...');
console.log('📁 Environment:', process.env.NODE_ENV);
console.log('🔌 Port:', process.env.PORT || 5001);

// Debug: ตรวจสอบ Firebase Environment Variables
console.log('🔥 Firebase Environment Check:');
console.log('  Project ID:', process.env.FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
console.log('  Private Key ID:', process.env.FIREBASE_PRIVATE_KEY_ID ? '✅ Set' : '❌ Missing');
console.log('  Private Key:', process.env.FIREBASE_PRIVATE_KEY ? '✅ Set' : '❌ Missing');
console.log('  Client Email:', process.env.FIREBASE_CLIENT_EMAIL ? '✅ Set' : '❌ Missing');

// Import routes AFTER environment check
const jobRoutes = require('./routes/jobs');

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/jobs', jobRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('📊 Health check requested');
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Repair Tracking API is running!',
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 5001,
    endpoints: {
      jobs: '/api/jobs',
      stats: '/api/jobs/stats/summary',
      queue: '/api/jobs/queue/current',
      analytics: '/api/jobs/analytics/overview'
    }
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
      createJob: 'POST /api/jobs',
      jobStats: '/api/jobs/stats/summary',
      currentQueue: '/api/jobs/queue/current',
      analytics: '/api/jobs/analytics/overview',
      dailyAnalytics: '/api/jobs/analytics/daily'
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
  console.log('🚀 Server running on port', PORT);
  console.log('📱 Health check: http://localhost:' + PORT + '/health');
  console.log('🌍 API Base URL: http://localhost:' + PORT + '/');
  console.log('💼 Jobs API: http://localhost:' + PORT + '/api/jobs');
  console.log('📊 Stats API: http://localhost:' + PORT + '/api/jobs/stats/summary');
  console.log('📈 Analytics API: http://localhost:' + PORT + '/api/jobs/analytics/overview');
  console.log('📊 Daily Analytics: http://localhost:' + PORT + '/api/jobs/analytics/daily');
  console.log('🔥 Environment:', process.env.NODE_ENV || 'development');
});

module.exports = app;