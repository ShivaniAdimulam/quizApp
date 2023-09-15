const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
    name: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    users: [String], 
    questions: [String], 
    userAnswers: {} 
    // Add more room-related fields as needed
  });
  
  
  const Room = mongoose.model('Room', roomSchema);