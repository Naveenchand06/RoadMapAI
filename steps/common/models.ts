import mongoose, { Schema, model } from 'mongoose';

const userSchema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || model('User', userSchema);

// Learning Path Schema
const learningPathSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  topic: { type: String, required: true },
  background: { type: String, required: true },
  goalLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced'], required: true },
  preferences: {
    includeVideos: { type: Boolean, default: false },
    includeArticles: { type: Boolean, default: true },
    includeDocs: { type: Boolean, default: true },
    languages: [{ type: String }]
  },
  analysis: { type: String },
  curriculum: {
    title: { type: String },
    description: { type: String },
    total_hours: { type: Number },
    modules: [{
      order: { type: Number },
      title: { type: String },
      description: { type: String },
      objectives: [{ type: String }],
      key_concepts: [{ type: String }],
      estimated_hours: { type: Number },
      prerequisites: [{ type: String }],
      resources: [{
        type: { type: String, enum: ['video', 'article', 'documentation'] },
        title: { type: String },
        description: { type: String },
        url: { type: String },
        duration: { type: String },
        difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] }
      }]
    }]
  },
  traceId: { type: String, index: true },
  status: { type: String, enum: ['processing', 'completed', 'failed'], default: 'completed' },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

learningPathSchema.pre('save', async function() {
  this.updatedAt = new Date();
});

export const LearningPath = mongoose.models.LearningPath || model('LearningPath', learningPathSchema);
