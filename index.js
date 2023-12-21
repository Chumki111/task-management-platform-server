const express = require('express')
const app = express()
require('dotenv').config()
const cors = require('cors')
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId} = require('mongodb')
const jwt = require('jsonwebtoken')
const port = process.env.PORT || 5000

// middleware
const corsOptions = {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    optionSuccessStatus: 200,
  }
  app.use(cors(corsOptions))
  app.use(express.json())
  app.use(cookieParser())

//   verifyToken
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.token
    console.log(token)
    if (!token) {
      return res.status(401).send({ message: 'unauthorized access' })
    }
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
        console.log(err)
        return res.status(401).send({ message: 'unauthorized access' })
      }
      req.user = decoded
      next()
    })
  }
  

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dnejwhv.mongodb.net/?retryWrites=true&w=majority`;
 const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    }
  });
  async function run() {
    try {
      // Connect the client to the server	(optional starting in v4.7)
      await client.connect();
      const usersCollection = client.db('taskManagement').collection('users')
      const tasksCollection = client.db('taskManagement').collection('tasks')

      app.post('/jwt', async (req, res) => {
        const user = req.body
        console.log('I need a new jwt', user)
        const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: '365d',
        })
        res
          .cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
          })
          .send({ success: true })
      })
  
      // Logout
      app.get('/logout', async (req, res) => {
        try {
          res
            .clearCookie('token', {
              maxAge: 0,
              secure: process.env.NODE_ENV === 'production',
              sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
            })
            .send({ success: true })
          console.log('Logout successful')
        } catch (err) {
          res.status(500).send(err)
        }
      })


 // Save or modify user email, status in DB
 app.put('/users/:email', async (req, res) => {
    const email = req.params.email
    const user = req.body
    const query = { email: email }
    const options = { upsert: true }
    const isExist = await usersCollection.findOne(query)
    console.log('User found?----->', isExist)
    if (isExist) return res.send(isExist)
    const result = await usersCollection.updateOne(
      query,
      {
        $set: { ...user, timestamp: Date.now() },
      },
      options
    )
    res.send(result)
  })



 // Save a task in database
 app.post('/tasks', verifyToken, async (req, res) => {
  const task = req.body
  const result = await tasksCollection.insertOne(task)
  res.send(result)
})

 //get all tasks
 app.get('/tasks/:email', verifyToken, async (req, res) => {
  const email = req.params.email
  const result = await tasksCollection
    .find({ email:email})
    .toArray()
  res.send(result)
})
// delete task 
app.delete('/tasks/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await tasksCollection.deleteOne(query);
  res.send(result);
})

 // Get single room data
 app.get('/task/:id', async (req, res) => {
  const id = req.params.id
  const result = await tasksCollection.findOne({ _id: new ObjectId(id) })
  res.send(result)
})
// Send a ping to confirm a successful connection
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
      // Ensures that the client will close when you finish/error
    //   await client.close();
    }
  }
  run().catch(console.dir);
  
app.get('/', (req, res) => {
    res.send('Hello from task management Server..')
  })
  
  app.listen(port, () => {
    console.log(`task management is running on port ${port}`)
  })