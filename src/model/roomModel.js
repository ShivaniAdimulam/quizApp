const mongoose = require('mongoose');
const roomSchema = new mongoose.Schema({
    name: String,
    users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    //users: [String], 
    questions: [String], 
    userAnswers: {} 
    
  });
  
  
  const Room = mongoose.model('Room', roomSchema);