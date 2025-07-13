// ===== Firestore Database Schema Design =====

/*
📊 Collection Structure Overview:

1. users/           - ข้อมูลผู้ใช้และบทบาท
2. jobs/            - งานซ่อมทั้งหมด  
3. branches/        - ข้อมูลสาขา
4. queue/           - การจัดการคิวรายวัน
5. analytics/       - ข้อมูลสถิติและการวิเคราะห์
*/

// ===== 1. USERS COLLECTION =====
// Path: /users/{userId}
const userSchema = {
  uid: "string",                    // Firebase Auth UID
  email: "string",                  // อีเมลผู้ใช้
  displayName: "string",            // ชื่อแสดง
  role: "ADMIN | DROP_APP | ASP",   // บทบาทผู้ใช้
  isActive: "boolean",              // สถานะใช้งาน
  profile: {
    firstName: "string",            // ชื่อจริง
    lastName: "string",             // นามสกุล
    phone: "string",                // เบอร์โทร
    avatar: "string",               // URL รูปภาพ
    department: "string"            // แผนก
  },
  permissions: {
    canCreateJobs: "boolean",       // สร้างงานได้
    canUpdateStatus: "boolean",     // อัปเดตสถานะได้
    canViewAnalytics: "boolean",    // ดูสถิติได้
    canManageUsers: "boolean"       // จัดการผู้ใช้ได้
  },
  settings: {
    notifications: {
      email: "boolean",             // แจ้งเตือนอีเมล
      push: "boolean",              // แจ้งเตือน Push
      sms: "boolean"                // แจ้งเตือน SMS
    },
    language: "th | en",            // ภาษา
    timezone: "string"              // เขตเวลา
  },
  metadata: {
    createdAt: "timestamp",         // วันที่สร้าง
    updatedAt: "timestamp",         // วันที่อัปเดต
    lastLoginAt: "timestamp",       // เข้าสู่ระบบครั้งล่าสุด
    createdBy: "string"             // สร้างโดย
  }
};

// ===== 2. JOBS COLLECTION =====
// Path: /jobs/{jobId}
const jobSchema = {
  // Job Information
  jobId: "string",                  // รหัสงาน (25071xxxxx)
  queueNumber: "number",            // หมายเลขคิว
  status: "string",                 // สถานะงาน
  priority: "LOW | NORMAL | HIGH | URGENT", // ความเร่งด่วน
  source: "ONLINE | DROP_APP | PHONE", // แหล่งที่มา
  
  // Customer Information  
  customer: {
    name: "string",                 // ชื่อลูกค้า
    phone: "string",                // เบอร์โทร
    email: "string",                // อีเมล
    address: {
      street: "string",             // ที่อยู่
      city: "string",               // เมือง  
      zipCode: "string"             // รหัสไปรษณีย์
    }
  },

  // Device Information
  device: {
    model: "string",                // รุ่นอุปกรณ์
    serial: "string",               // หมายเลขเครื่อง
    brand: "string",                // ยี่ห้อ
    color: "string",                // สี
    accessories: ["string"],        // อุปกรณ์เสริม
    condition: "string",            // สภาพเครื่อง
    photos: ["string"]              // รูปภาพ URLs
  },

  // Problem Information
  problem: {
    category: "HARDWARE_ISSUE | SOFTWARE_ISSUE | SCREEN_ISSUE | BATTERY_ISSUE | WATER_DAMAGE | OTHER",
    description: "string",          // รายละเอียดปัญหา
    symptoms: ["string"],           // อาการที่เกิดขึ้น
    reproductionSteps: "string"     // ขั้นตอนการทำซ้ำ
  },

  // Assignment Information
  assignment: {
    dropAppId: "string",            // รหัส Drop-APP
    aspId: "string",                // รหัส ASP
    technicianId: "string",         // รหัสช่างเทคนิค
    branchId: "string"              // รหัสสาขา
  },

  // Repair Information
  repair: {
    diagnosis: "string",            // การวินิจฉัย
    solution: "string",             // วิธีแก้ไข
    partsUsed: [{
      partName: "string",           // ชื่ออะไหล่
      partCode: "string",           // รหัสอะไหล่
      quantity: "number",           // จำนวน
      cost: "number"                // ราคา
    }],
    laborCost: "number",            // ค่าแรง
    totalCost: "number",            // ราคารวม
    warrantyCovered: "boolean",     // รับประกัน
    warrantyPeriod: "number"        // ระยะเวลารับประกัน (วัน)
  },

  // Timeline & Status History
  timeline: [{
    status: "string",               // สถานะ
    timestamp: "timestamp",         // เวลา
    note: "string",                 // หมายเหตุ
    updatedBy: "string",            // อัปเดตโดย
    updatedByName: "string",        // ชื่อผู้อัปเดต
    location: "string",             // สถานที่
    photos: ["string"],             // รูปภาพประกอบ
    duration: "number"              // ระยะเวลาใช้ (นาที)
  }],

  // Scheduling
  schedule: {
    appointmentDate: "timestamp",   // วันที่นัดหมาย
    estimatedCompletion: "timestamp", // วันที่คาดว่าเสร็จ
    actualCompletion: "timestamp",  // วันที่เสร็จจริง
    pickupDeadline: "timestamp"     // กำหนดรับเครื่อง
  },

  // Quality & Feedback
  quality: {
    rating: "number",               // คะแนน 1-5
    feedback: "string",             // ความคิดเห็น
    reworkRequired: "boolean",      // ต้องทำใหม่
    reworkReason: "string"          // เหตุผลทำใหม่
  },

  // Metadata
  metadata: {
    createdAt: "timestamp",         // วันที่สร้าง
    updatedAt: "timestamp",         // วันที่อัปเดต
    completedAt: "timestamp",       // วันที่เสร็จสิ้น
    version: "number",              // เวอร์ชัน
    tags: ["string"],               // แท็ก
    isDeleted: "boolean",           // ลบแล้ว
    deletedAt: "timestamp",         // วันที่ลบ
    deletedBy: "string"             // ลบโดย
  }
};

// ===== 3. BRANCHES COLLECTION =====
// Path: /branches/{branchId}
const branchSchema = {
  branchId: "string",               // รหัสสาขา
  name: "string",                   // ชื่อสาขา
  code: "string",                   // รหัสสาขา
  type: "MAIN | SUB",               // ประเภทสาขา
  
  // Contact Information
  contact: {
    phone: "string",                // เบอร์โทร
    email: "string",                // อีเมล
    website: "string",              // เว็บไซต์
    fax: "string"                   // แฟกซ์
  },

  // Address Information
  address: {
    street: "string",               // ที่อยู่
    city: "string",                 // เมือง
    state: "string",                // จังหวัด
    zipCode: "string",              // รหัสไปรษณีย์
    country: "string",              // ประเทศ
    coordinates: {
      lat: "number",                // ละติจูด
      lng: "number"                 // ลองจิจูด
    }
  },

  // Operating Information
  operation: {
    workingHours: {
      monday: { open: "string", close: "string", closed: "boolean" },
      tuesday: { open: "string", close: "string", closed: "boolean" },
      wednesday: { open: "string", close: "string", closed: "boolean" },
      thursday: { open: "string", close: "string", closed: "boolean" },
      friday: { open: "string", close: "string", closed: "boolean" },
      saturday: { open: "string", close: "string", closed: "boolean" },
      sunday: { open: "string", close: "string", closed: "boolean" }
    },
    holidays: ["timestamp"],        // วันหยุด
    capacity: {
      maxJobsPerDay: "number",      // งานสูงสุดต่อวัน
      maxTechnicians: "number",     // ช่างสูงสุด
      avgRepairTime: "number"       // เวลาซ่อมเฉลี่ย (นาที)
    }
  },

  // Staff Information
  staff: [{
    userId: "string",               // รหัสผู้ใช้
    role: "string",                 // บทบาท
    isActive: "boolean",            // สถานะใช้งาน
    joinedAt: "timestamp"           // วันที่เข้าร่วม
  }],

  // Metadata
  metadata: {
    isActive: "boolean",            // สถานะใช้งาน
    createdAt: "timestamp",         // วันที่สร้าง
    updatedAt: "timestamp",         // วันที่อัปเดต
    createdBy: "string"             // สร้างโดย
  }
};

// ===== 4. QUEUE COLLECTION =====
// Path: /queue/{date}
const queueSchema = {
  date: "string",                   // วันที่ (YYYY-MM-DD)
  
  // Counter Information
  counters: {
    total: "number",                // จำนวนรวม
    completed: "number",            // เสร็จแล้ว
    pending: "number",              // รอดำเนินการ
    cancelled: "number"             // ยกเลิก
  },

  // Queue Jobs (สำหรับ Real-time)
  activeJobs: [{
    jobId: "string",                // รหัสงาน
    queueNumber: "number",          // หมายเลขคิว
    customerName: "string",         // ชื่อลูกค้า
    status: "string",               // สถานะ
    priority: "string",             // ความเร่งด่วน
    estimatedTime: "number",        // เวลาประมาณ (นาที)
    createdAt: "timestamp"          // วันที่สร้าง
  }],

  // Statistics
  stats: {
    avgWaitTime: "number",          // เวลารอเฉลี่ย (นาที)
    avgRepairTime: "number",        // เวลาซ่อมเฉลี่ย (นาที)
    satisfactionScore: "number",    // คะแนนความพึงพอใจ
    revenue: "number"               // รายได้
  },

  // Metadata
  metadata: {
    lastUpdated: "timestamp",       // อัปเดตล่าสุด
    updatedBy: "string"             // อัปเดตโดย
  }
};

// ===== 5. ANALYTICS COLLECTION =====
// Path: /analytics/{period}
const analyticsSchema = {
  period: "string",                 // ช่วงเวลา (daily, weekly, monthly, yearly)
  date: "string",                   // วันที่ (YYYY-MM-DD)
  
  // Job Analytics
  jobs: {
    total: "number",                // จำนวนรวม
    completed: "number",            // เสร็จแล้ว
    pending: "number",              // รอดำเนินการ
    cancelled: "number",            // ยกเลิก
    byStatus: {
      "NEW_QUEUE": "number",
      "RECEIVED_AT_DROP": "number",
      "TRANSFERRING_TO_ASP": "number",
      "RECEIVED_AT_ASP": "number",
      "EVALUATING": "number",
      "WAITING_PARTS": "number",
      "REPAIRING": "number",
      "QUALITY_CHECK": "number",
      "READY_FOR_RETURN": "number",
      "RETURNED_TO_DROP": "number",
      "READY_FOR_PICKUP": "number",
      "COMPLETED": "number"
    },
    byPriority: {
      "LOW": "number",
      "NORMAL": "number", 
      "HIGH": "number",
      "URGENT": "number"
    }
  },

  // Performance Analytics
  performance: {
    avgRepairTime: "number",        // เวลาซ่อมเฉลี่ย (นาที)
    avgWaitTime: "number",          // เวลารอเฉลี่ย (นาที)
    completionRate: "number",       // อัตราการเสร็จสิ้น (%)
    onTimeDelivery: "number",       // การส่งมอบตรงเวลา (%)
    customerSatisfaction: "number", // ความพึงพอใจลูกค้า (1-5)
    reworkRate: "number"            // อัตราการทำใหม่ (%)
  },

  // Revenue Analytics
  revenue: {
    total: "number",                // รายได้รวม
    labor: "number",                // ค่าแรง
    parts: "number",                // ค่าอะไหล่
    avgRevenuePerJob: "number"      // รายได้เฉลี่ยต่องาน
  },

  // Technician Analytics
  technicians: [{
    technicianId: "string",         // รหัสช่าง
    jobsCompleted: "number",        // งานที่เสร็จ
    avgRepairTime: "number",        // เวลาซ่อมเฉลี่ย
    qualityScore: "number",         // คะแนนคุณภาพ
    revenue: "number"               // รายได้
  }],

  // Metadata
  metadata: {
    generatedAt: "timestamp",       // วันที่สร้าง
    version: "number"               // เวอร์ชัน
  }
};

// ===== FIRESTORE SECURITY RULES =====
const firestoreRules = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Users collection - ผู้ใช้จัดการข้อมูลตัวเองได้
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        resource.data.role in ['ADMIN'] || 
        request.auth.token.role in ['ADMIN'];
    }
    
    // Jobs collection - จัดการตามบทบาท
    match /jobs/{jobId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && 
        request.auth.token.role in ['ADMIN', 'DROP_APP'];
      allow update: if request.auth != null && 
        request.auth.token.role in ['ADMIN', 'DROP_APP', 'ASP'];
      allow delete: if request.auth != null && 
        request.auth.token.role in ['ADMIN'];
    }
    
    // Branches collection - Admin เท่านั้น
    match /branches/{branchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role in ['ADMIN'];
    }
    
    // Queue collection - อ่านได้ทุกคน เขียนได้บางบทบาท
    match /queue/{date} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
        request.auth.token.role in ['ADMIN', 'DROP_APP', 'ASP'];
    }
    
    // Analytics collection - อ่านได้ตามบทบาท
    match /analytics/{period} {
      allow read: if request.auth != null && 
        request.auth.token.role in ['ADMIN'];
      allow write: if request.auth != null && 
        request.auth.token.role in ['ADMIN'];
    }
  }
}`;

// ===== INDEXES CONFIGURATION =====
const firestoreIndexes = [
  // Jobs collection indexes
  {
    collectionGroup: "jobs",
    fields: [
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" }
    ]
  },
  {
    collectionGroup: "jobs", 
    fields: [
      { fieldPath: "assignment.branchId", order: "ASCENDING" },
      { fieldPath: "status", order: "ASCENDING" },
      { fieldPath: "createdAt", order: "DESCENDING" }
    ]
  },
  {
    collectionGroup: "jobs",
    fields: [
      { fieldPath: "customer.phone", order: "ASCENDING" }
    ]
  },
  {
    collectionGroup: "jobs",
    fields: [
      { fieldPath: "priority", order: "DESCENDING" },
      { fieldPath: "createdAt", order: "ASCENDING" }
    ]
  },
  
  // Queue collection indexes
  {
    collectionGroup: "queue",
    fields: [
      { fieldPath: "date", order: "DESCENDING" }
    ]
  },
  
  // Analytics collection indexes
  {
    collectionGroup: "analytics", 
    fields: [
      { fieldPath: "period", order: "ASCENDING" },
      { fieldPath: "date", order: "DESCENDING" }
    ]
  }
];

export {
  userSchema,
  jobSchema, 
  branchSchema,
  queueSchema,
  analyticsSchema,
  firestoreRules,
  firestoreIndexes
};

