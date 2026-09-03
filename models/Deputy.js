import mongoose from 'mongoose';

const DeputySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "نام معاونت الزامی است."],
    trim: true,
  },
  // 2-digit sequence embedded in certificate numbers [year3][deputy2]...
  // Auto-assigned on creation as (max existing number) + 1.
  number: {
    type: Number,
    unique: true,
    min: 1,
    max: 99,
  },
  // Organizing units (واحدها) under this deputy. Courses may belong to the
  // deputy itself and/or up to two of these units.
  units: {
    type: [String],
    default: [],
  },
}, { timestamps: true });

export default mongoose.models.Deputy || mongoose.model('Deputy', DeputySchema);
