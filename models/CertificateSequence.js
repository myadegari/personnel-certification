import mongoose from 'mongoose';

const CertificateSequenceSchema = new mongoose.Schema({
  pattern: {
    type: String,
    required: true,
    unique: true, // هر الگو باید یکتا باشد
  },
  lastNumber: {
    type: Number,
    required: true,
    default: 99, // با ۹۹ شروع می‌شود تا اولین شماره تولید شده ۱۰۰ باشد
  },
}, { timestamps: true });

export default mongoose.models.CertificateSequence || mongoose.model('CertificateSequence', CertificateSequenceSchema);