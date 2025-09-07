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
  
  duration: {
    type: Number, // مدت زمان به ساعت
    required: true,
  },
  organizingUnit: {
    type: String,
    required: true,
  },
   // --- امضاکننده اول ---
  signatory: { 
    type: mongoose.Schema.Types.ObjectId,
     ref: 'User',
    required: true
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

  // --- اطلاعات گواهی ---
  certificateNumberPattern: { type: String, required: true }, // مثلا: 404/الف
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);