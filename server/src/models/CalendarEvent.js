import mongoose from 'mongoose';
const { Schema } = mongoose;

const CalendarEventSchema = new Schema(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    title: { type: String, required: true },
    description: String,
    start: { type: Date, required: true, index: true },
    end: Date,
    allDay: { type: Boolean, default: false },
    type: { type: String, enum: ['meeting', 'reminder', 'invoice_due', 'bill_due', 'task', 'holiday'], default: 'reminder' },
    color: String,
    linkedTo: { type: Schema.Types.Mixed, default: null },
    reminderMinutes: Number,
  },
  { timestamps: true },
);

export const CalendarEvent = mongoose.model('CalendarEvent', CalendarEventSchema);
//*** End Patch