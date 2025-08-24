import mongoose from 'mongoose';

const CourseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  date: { type: Number, required: true }, // باید از نوع Number باشد
  
  duration: {
    type: Number, // مدت زمان به ساعت
    required: true,
  },
  organizingUnit: {
    type: String,
    required: true,
  },
   // --- امضاکننده اول ---
  unitManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position1: { type: String, required: true }, // سمت امضاکننده اول
  unitStamp: { type: String }, // مهر اول

  // --- امضاکننده دوم (اختیاری) ---
  unitManager2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  position2: { type: String }, // سمت امضاکننده دوم
  unitStamp2: { type: String }, // مهر دوم

  // --- اطلاعات گواهی ---
  certificateNumberPattern: { type: String, required: true }, // مثلا: 404/الف
}, { timestamps: true });

export default mongoose.models.Course || mongoose.model('Course', CourseSchema);