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
const Room = mongoose.model('Room', { name: String, users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], questions: [String], userAnswers: {} });
const Question = mongoose.model('Question',{
    question: String,
    options: [String],
    answer:String
    
  } );
  const User = mongoose.model('User',{name:String,score:Number})
app.use(express.static(__dirname + '/public'));

app.get('/api/getRoomlist', (req, res) => {
    res.sendFile(__dirname + '/public/roomlist.html');
});



server.listen(3000, () => {
  console.log('Server is running on port 3000');
});




async function getAvailableRoom(req,res) {
    try {
        
      const availableRooms = await Room.aggregate([
        {
          $match: {
            $expr: {
              $lt: [{ $size: "$users" }, 2]
            }
          }
        }
      ])             //.populate('users', 'username');
      console.log(availableRooms)
       
      res.status(200).json(availableRooms)
      
    } catch (err) {
      console.error('Error fetching available rooms from MongoDB:', err);
      return createRoom(); // Fallback to creating a new room in case of an error
    }
  }
  app.get("/api/getRoomslist",getAvailableRoom)

  async function questionList(req,res){
    var data = await Question.aggregate([{ $sample: { size: 5 } }]); 
    console.log(data)
    res.status(200).json(data)
  }
  app.get("/api/getQuestions",questionList)
  // questionList()
  // const questions =data;
  // console.log(questions,"ji");
let currentRoomName;
let currentQuestionIndex = 0;
  
  io.on('connection', async (socket) => {
    var data = await Question.aggregate([{ $sample: { size: 5 } }]); 
    let questions=data
    //console.log(questions)
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
            room.users.push(user._id);   // userId
            await room.save();
        }
        socket.join(room.name);
        currentRoomName = roomName; 
        socket.roomName = room.name;
        socket.userid= user._id
        socket.userIndex = room.users.indexOf(socket.id); // 0 or 1
        //let updateInRoom=await Room.findOneAndUpdate({name:roomName},{$push:{users:user._id}})
        // Notify the user about the room they joined
        socket.emit('room-joined', room.name);
  
        // Start the quiz in this room
        //startQuiz(room.name);
      } catch (err) {
        console.error('Error joining user to room:', err);
      }
    });
    
    let score=0
    const userScores = new Map();
    const userscore= 0
    

     // Event handler for when a user submits an answer
     socket.on('submit-answer', async (userAnswer) => {
      // var data = await Question.aggregate([{ $sample: { size: 5 } }]);
      // let questions=data[0]
      const currentQuestion = questions[currentQuestionIndex];

      // Check if the user's answer is correct
      const isCorrect = userAnswer === currentQuestion.correctAnswer;
      
        if(isCorrect){
          score= score+1
          console.log(score)
         // let updateScore=await User.findOneAndUpdate({_id:socket.userid},{score:score})
        }
      // Emit the result of the user's answer
      io.emit('answer-result', { isCorrect});

      // Move to the next question
      currentQuestionIndex++;
      console.log(currentQuestionIndex,"this index")

      // If all questions have been asked, calculate and send the final score
      if (currentQuestionIndex === questions.length) {
          // const userScore = await User.findOne({_id:socket.userid});
          // console.log(userScore,socket.userid)
          let finalScore=score
          io.emit('final-score', { finalScore });
      } else {
          // Otherwise, send the next question
          io.emit('next-question', questions[currentQuestionIndex]);
      }
  });

  // Event handler for when a user disconnects
  // socket.on('disconnect', () => {
  //     console.log('A user disconnected');
  // });

  // Start the quiz by sending the first question
  socket.emit('next-question', questions[currentQuestionIndex]);
    if(currentQuestionIndex>=5){
      currentQuestionIndex=0
    }

  });
 
  
  async function createRoom(req,res) {     // userId was parameter in func
    try {
      // Find or create a room with less than 2 users
      //console.log("hi",req.body.userId)
     // const room = await Room.findOne({ users: { $size: 1 } });
  
      // if (room) {
      //   room.users.push(userId);
      //   await room.save();
      //   return room;
      // } else {
        const newRoom = new Room({ name: `Room_${Date.now()}`, users: [], questions: [], userAnswers: {} });
        await newRoom.save();
        console.log(newRoom)
        res.sendFile(__dirname + '/public/roomlist.html');
        //return newRoom;
      //}
    } catch (err) {
      throw err;
    }
  }
  app.post("/api/createRoom",createRoom);
  
 
  


async function closeAndDeleteRoom(req,res) {
    try {
       //console.log(io.sockets.adapter.rooms)
      // const roomName = req.io.roomName;
      // console.log(roomName)
        const room = await Room.findOne({ name: currentRoomName });
        if (room) {
            // Remove the room from MongoDB
            await Room.deleteOne({ name: currentRoomName });

            // Notify clients that the room is closed
            io.to(currentRoomName).emit('room-closed');

            // Disconnect all sockets in the room
            const roomSockets = io.sockets.adapter.rooms.get(currentRoomName);
            if (roomSockets) {
                roomSockets.forEach(socketId => {
                    io.sockets.sockets.get(socketId).disconnect(true);
                });
            }
        }
        res.sendFile(__dirname + '/public/endquiz.html');
        console.log("hii")
    } catch (err) {
        console.error('Error closing and deleting the room:', err);
    }
}
app.put("/api/deleteCloseRoom",closeAndDeleteRoom)
  
  
  
