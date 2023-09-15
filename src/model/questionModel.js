const mongoose = require('mongoose');
const questionSchema = new mongoose.Schema({
    question: String,
    options: [String],
    // option2: String,
    // option3: String,
    // option4: String,
    correctAnswer:String
    // Add more room-related fields as needed
  });
  
  
  const question = mongoose.model('question', questionSchema);