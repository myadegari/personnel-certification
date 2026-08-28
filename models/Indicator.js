import mongoose from 'mongoose';

const IndicatorSchema = new mongoose.Schema({
  pattern: {
    type: String,
    required: true,
    unique: true, // Each pattern must be unique
  },
  lastNumber: {
    type: Number,
    required: true,
    default: 999, // Starts at 999, so the first generated number is 1000
  },
}, { timestamps: true });

export default mongoose.models.Indicator || mongoose.model('Indicator', IndicatorSchema);