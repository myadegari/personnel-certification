import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  courseCode:{
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  date: { 
    type: Number, 
    required: true
   }, // باید از نوع Number باشد
   enrollmentDeadline: {
    type: Number, // Optional custom deadline, Unix timestamp in seconds
  },
   enrollmentLimit: {
    type: Number, // Optional maximum number of APPROVED enrollments (enforced by /api/enrollments)
  },
  duration: {
    type: Number, // مدت زمان به ساعت
    required: true,
  },
   organizingUnit: {
    type: String,
    required: true,
   },
   // Structured snapshot of the chosen organizing units (deputy name and/or
   // its units, max 2). organizingUnit above is the " و "-joined display
   // string derived from it; kept as plain strings so later unit renames
   // never rewrite course history.
   organizingUnits: {
    type: [String],
    default: [],
   },
  // Owning deputy (معاونت); its 2-digit number is embedded in certificate
  // numbers and its name can pre-fill organizingUnit on the form.
  deputy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Deputy',
  },
  // Per-deputy course sequence (2-digit) embedded in certificate numbers as
  // [year3][deputy2][course2][issue3]. Assigned once on first certificate
  // issue and stable afterwards; courseSeqDeputy records which deputy the
  // sequence belongs to (re-allocated only if the course's deputy changes).
  courseSeq: { type: Number, min: 1, max: 99 },
  courseSeqDeputy: { type: mongoose.Schema.Types.ObjectId, ref: 'Deputy' },
  // PUBLIC courses appear in the /dashboard/courses catalog and accept
  // enrollments. DEPUTY courses are created/managed by a deputy head: hidden
  // from the catalog, not enrollable, certificates issued directly.
  visibility: {
    type: String,
    enum: ['PUBLIC', 'DEPUTY'],
    default: 'PUBLIC',
  },
   // --- امضاکننده اول ---
  signatory: { 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'User',
    // required: true
   },
  unitStamp: { type: mongoose.Schema.Types.ObjectId,
    ref: 'File' }, // مهر اول

  // --- امضاکننده دوم (اختیاری) ---
  signatory2: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
     },
  unitStamp2: { type: mongoose.Schema.Types.ObjectId,
    ref: 'File' }, // مهر دوم
}, { timestamps: true });

// The course catalog and admin list sort by date/creation recency.
CourseSchema.index({ date: -1 });
CourseSchema.index({ createdAt: -1 });

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);