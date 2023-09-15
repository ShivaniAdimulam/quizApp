const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
var bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
const server = http.createServer(app);
const io = socketIo(server);

// MongoDB setup
mongoose.connect('mongodb+srv://ShivaniAdimulam:6YVITVtB4JZQZ2Qb@cluster0.vhsq6.mongodb.net/quizApp?authSource=admin&replicaSet=atlas-y52ak9-shard-0&w=majority&readPreference=primary&retryWrites=true&ssl=true', { useNewUrlParser: true, useUnifiedTopology: true });
const Room = mongoose.model('Room', { name: String, users: [String], questions: [String], userAnswers: {} });
const Question = mongoose.model('Question',{
    question: String,
    option1: String,
    option2: String,
    option3: String,
    option4: String,
    answer:String
    // Add more room-related fields as needed
  } );
  const User = mongoose.model('User',{name:String,score:Number})
app.use(express.static(__dirname + '/public'));

app.get('/api/getRoomlist', (req, res) => {
    res.sendFile(__dirname + '/public/roomlist.html');
});

// app.post('/api/createRoom', (req, res) => {
//     res.sendFile(__dirname + '/public/roomlist.html');
// });

server.listen(3000, () => {
  console.log('Server is running on port 3000');
});




async function getAvailableRoom(req,res) {
    try {
        
      const availableRooms = await Room.find()              //.populate('users', 'username');
      console.log(availableRooms)
      //  let room = availableRooms.find((room) => room.users.length < 2);
      //  if(room.length=0){
      //   res.status(200).json({message:"No rooms available"})
      //  }
      res.status(200).json(availableRooms)
      // let room = availableRooms.find((room) => room.users.length < 2);
      //   console.log(room)
      // if (room) {
      //   //return room
      //   res.status(200).json(room)
      //  // res.render('roomlist', { room });
      // }{
      //   room=[]
      //   console.log(room)
      //   res.status(200).json({room:room})
      //   //return room
      // }
      
      
      //res.status(200).json(room)
      //res.render('roomlist', { room });
      // If no available rooms were found, create a new room
      //return createRoom();
    } catch (err) {
      console.error('Error fetching available rooms from MongoDB:', err);
      return createRoom(); // Fallback to creating a new room in case of an error
    }
  }
  app.get("/api/getRoomslist",getAvailableRoom)
  const questions = [
    {
        question: 'What is the capital of France?',
        options: ['Berlin', 'Madrid', 'Paris', 'Rome'],
        correctAnswer: 'Paris',
    },
    {
        question: 'Which planet is known as the Red Planet?',
        options: ['Earth', 'Mars', 'Venus', 'Jupiter'],
        correctAnswer: 'Mars',
    },
    {
        question: 'How many continents are there on Earth?',
        options: ['3', '5', '6', '7'],
        correctAnswer: '7',
    },
    {
        question: 'What is the largest mammal?',
        options: ['Elephant', 'Giraffe', 'Blue Whale', 'Kangaroo'],
        correctAnswer: 'Blue Whale',
    },
    {
        question: 'What is the chemical symbol for gold?',
        options: ['Go', 'Au', 'Ag', 'Ge'],
        correctAnswer: 'Au',
    },
];

let currentQuestionIndex = 0;
  
  io.on('connection', (socket) => {
    socket.on('join-room', async (roomName) => {
      try {
        //const room = await createRoom(socket.id);
        const room = await Room.findOne({ name: roomName });
        const user = await User.create({name:""})
        if (room) {
          let userId
          if(room.users.length==0){
            userId=0
          }else{
            userId=1
          }
            room.users.push(userId);    user._id
            await room.save();
        }
        socket.join(room.name);
        socket.roomName = room.name;
        socket.userid= user._id
        socket.userIndex = room.users.indexOf(socket.id); // 0 or 1
  
        // Notify the user about the room they joined
        socket.emit('room-joined', room.name);
  
        // Start the quiz in this room
        startQuiz(room.name);
      } catch (err) {
        console.error('Error joining user to room:', err);
      }
    });
    
    
    const userScores = new Map();
    const userscore= 0
    socket.on('user-answer', async ({ questionId, userAnswer }) => {
       // const correctAnswer = randomQuestions[questionIndex].correctAnswer;
       let answer = await Question.findOne({_id:questionId})
        const isCorrect = userAnswer === answer.correctAnswer;
      
        // Update user score
        if (!userScores.has(socket.id)) {
          userScores.set(socket.id, 0);
        }
        if (isCorrect) {
          userscore+=10
          let update =await User.findOneAndUpdate({_id:socket.userid},{score:userscore})
          userScores.set(socket.id, userScores.get(socket.id) + 10); // Assuming 10 points for a correct answer
        }
      
        // Emit the updated user scores to users
        io.to(roomName).emit('user-score', Array.from(userscore)); //userScores
      });

    // socket.on('user-answer', async (userAnswer) => {
    //     const roomName = socket.roomName;
    //     const userIndex = socket.userIndex;
      
    //     if (roomName && userIndex !== undefined) {
    //       const room = await Room.findOne({ name: roomName });
    //       if (room && room.questions.length > currentQuestionIndex) {
    //         room.userAnswers[currentQuestionIndex] = room.userAnswers[currentQuestionIndex] || {};
    //         room.userAnswers[currentQuestionIndex][userIndex] = userAnswer;
      
    //         // Check if all users have answered
    //         if (Object.keys(room.userAnswers[currentQuestionIndex]).length === 2) {
    //           // Calculate and send the score
    //           const scores = calculateScores(room.userAnswers[currentQuestionIndex], room.questions[currentQuestionIndex].correctAnswer);
    //           io.to(roomName).emit('user-scores', scores);
    //         }
    //       }
    //     }
    //   })


     // Event handler for when a user submits an answer
     socket.on('submit-answer', async (userAnswer) => {
      const currentQuestion = questions[currentQuestionIndex];

      // Check if the user's answer is correct
      const isCorrect = userAnswer === currentQuestion.correctAnswer;

      // Emit the result of the user's answer
      io.emit('answer-result', { isCorrect });

      // Move to the next question
      currentQuestionIndex++;

      // If all questions have been asked, calculate and send the final score
      if (currentQuestionIndex === questions.length) {
          const finalScore = 50
          io.emit('final-score', { finalScore });
      } else {
          // Otherwise, send the next question
          io.emit('next-question', questions[currentQuestionIndex]);
      }
  });

  // Event handler for when a user disconnects
  socket.on('disconnect', () => {
      console.log('A user disconnected');
  });

  // Start the quiz by sending the first question
  socket.emit('next-question', questions[currentQuestionIndex]);


  });
 
  
  async function createRoom(userId) {
    try {
      // Find or create a room with less than 2 users
      //console.log("hi",req.body.userId)
      const room = await Room.findOne({ users: { $size: 1 } });
  
      if (room) {
        room.users.push(userId);
        await room.save();
        return room;
      } else {
        const newRoom = new Room({ name: `Room_${Date.now()}`, users: [userId], questions: [], userAnswers: {} });
        await newRoom.save();
        return newRoom;
      }
    } catch (err) {
      throw err;
    }
  }
  app.post("/api/createRoom",createRoom);
  
 
  async function startQuiz(roomName) {
    try {
      const room = await Room.findOne({ name: roomName });
      if (room && room.users.length === 2) {
        // Select 5 random questions from your MongoDB collection
        //const randomQuestions = await selectRandomQuestions(5);
        const randomQuestions = await Question.aggregate([{ $sample: { size: 5 } }]);
        if (randomQuestions.length === 5) {
          room.questions = randomQuestions;
          await room.save();
  
          // Emit questions to the room
          io.to(roomName).emit('start-quiz', room.questions);
  
          // Start timer for each question (10 seconds)
          let currentQuestionIndex = 0;
          const questionInterval = setInterval(() => {
            if (currentQuestionIndex < room.questions.length) {
              io.to(roomName).emit('next-question', room.questions[currentQuestionIndex]);
              currentQuestionIndex++;
            } else {
              // All questions have been asked, end the quiz
              endQuiz(roomName);
              clearInterval(questionInterval);
            }
          }, 10000);
        }
      }
    } catch (err) {
      console.error('Error starting the quiz:', err);
    }
  }
  app.get("/api/startQuiz",startQuiz);
  
  
  async function endQuiz(roomName, userScores) {
    try {
        const room = await Room.findOne({ name: roomName });
        if (room) {
            // Emit the user scores to all users as part of the 'end-quiz' event
            io.to(roomName).emit('end-quiz', Array.from(userScores));
            
            // Clear userAnswers and questions to prepare for the next quiz
            room.userAnswers = {};
            room.questions = [];
            await room.save();
        }
    } catch (err) {
        console.error('Error ending the quiz:', err);
    }
}
app.put("/api/endQuiz",endQuiz)


async function closeAndDeleteRoom(roomName) {
    try {
        const room = await Room.findOne({ name: roomName });
        if (room) {
            // Remove the room from MongoDB
            await Room.deleteOne({ name: roomName });

            // Notify clients that the room is closed
            io.to(roomName).emit('room-closed');

            // Disconnect all sockets in the room
            const roomSockets = io.sockets.adapter.rooms.get(roomName);
            if (roomSockets) {
                roomSockets.forEach(socketId => {
                    io.sockets.sockets.get(socketId).disconnect(true);
                });
            }
        }
    } catch (err) {
        console.error('Error closing and deleting the room:', err);
    }
}
app.put("/api/deleteCloseRoom",closeAndDeleteRoom)
  
  
  
//   async function endQuiz(roomName) {
//     try {
//       const room = await Room.findOne({ name: roomName });
//       if (room) {
//         // Calculate the final scores based on user answers
//         const finalScores = calculateFinalScores(room);
  
//         // Emit the final scores to all users in the room
//         io.to(roomName).emit('quiz-ended', finalScores);
  
//         // Close and delete the room
//         await Room.findOneAndDelete({ name: roomName });
//       }
//     } catch (err) {
//       console.error('Error ending the quiz:', err);
//     }
//   }
  
//   function calculateFinalScores(room) {
//     // Calculate and return the final scores based on user answers and questions
//     // Implement your scoring logic here
//     const finalScores = {}; // Map of user IDs to scores
//     // Calculate scores...
//     return finalScores;
//   }
  
  