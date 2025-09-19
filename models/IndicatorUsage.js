import mongoose from 'mongoose';

const IndicatorUsageSchema = new mongoose.Schema({
  // A reference to the main indicator pattern (e.g., '404/الف')
  indicator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Indicator',
    required: true,
  },
  // The specific number that was used (e.g., 101)
  number: {
    type: Number,
    required: true,
  },
  // A reference to the enrollment this number was assigned to
  enrollment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Enrollment',
    required: true,
    unique: true, // An enrollment can only have one certificate number
  },
  // The full, human-readable certificate ID (e.g., '404/الف/101')
  fullCertificateId: {
    type: String,
    required: true,
  },
}, { timestamps: true });

// Ensures that a number is never used more than once for the same indicator pattern
IndicatorUsageSchema.index({ indicator: 1, number: 1 }, { unique: true });

export default mongoose.models.IndicatorUsage || mongoose.model('IndicatorUsage', IndicatorUsageSchema);