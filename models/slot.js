const mongoose = require("mongoose");

const slotSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.String,
        ref: 'User',
        required: true,
    },
    ground: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Ground',
        required: true
    },
    startTime: {
        type: String, // Format: "HH:MM"
        required: true
    },
    endTime: {
        type: String, // Format: "HH:MM"
        required: true
    },
    isBooked: {
        type: Boolean,
        default: false
    }
});
module.exports = mongoose.model("Slot", slotSchema);