import mongoose from "mongoose";

export const pendingSlotSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.String,
        ref: 'User',
        required: true,
    },
    ground: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ground',
        required: true,
    },
    startTime: {
        type: String, // Format: "HH:MM"
        required: true,
    },
    endTime: {
        type: String, // Format: "HH:MM"
        required: true,
    },
});

export const PendingSlot = mongoose.model('PendingSlot', pendingSlotSchema);