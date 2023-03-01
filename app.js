const express=require('express')
const  dotenv=require('dotenv')
const connectDatabase = require('./config/database')
const errorMiddleware=require('./middlewares/errors')
const ErrorHandler=require('./utils/errorHandler')
const cookieParser=require('cookie-parser')
const fileUpload=require('express-fileupload')
const rateLimit=require('express-rate-limit')
const helmet=require('helmet')
const mongoSanitize=require('express-mongo-sanitize')
const xssClean=require('xss-clean')
const hpp=require('hpp')
const cors=require('cors')
const bodyParser=require('body-parser')



const app=express()

//setting env file variables
dotenv.config({path:'./config/config.env'})

// Handling Uncaught errors
process.on('uncaughtException',err=>{
    console.log(`ERROR : ${err.message}`)
    console.log("Shutting down due to uncaught exception.")
    process.exit(1)
})

//connect to databse
connectDatabase()

//setup bodyparser
app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))

//bodyParser
app.use(express.json())
//cookie parser
app.use(cookieParser())
//Handle file upload
app.use(fileUpload())

//sanitize data
app.use(mongoSanitize())

//prevent xss attack
app.use(xssClean())

//prevent url parameter pollution
app.use(hpp())

//setup security headers
app.use(helmet())

//Rate limiting
const limiter=rateLimit({
    windowMs:10*60*1000, //10 min
    max:100
})
app.use(limiter)

//setup CORS - Accessible by other domains
app.use(cors())


//Importing all routes
const jobs =require('./routes/jobs')
const auth =require('./routes/auth')
const user =require("./routes/user")

app.use("/api/v1",jobs)
app.use("/api/v1",auth)
app.use("/api/v1",user)


//Handle unhandled routes
app.all('*',(req,res,next)=>{
    next(new ErrorHandler(`${req.originalUrl} route not found`,404))
})

//middlewares to handle errors
app.use(errorMiddleware)

const PORT=process.env.PORT
const server=app.listen(PORT,()=>{
    console.log(`Server started on port ${process.env.PORT} in ${process.env.NODE_ENV} mode.`)
})


//Handling unhandled promise rejection

process.on('unhandledRejection',err=>{
    console.log(`Error : ${err.message}`)
    console.log("Shutting down the server due to unhandled promise rejection")
    server.close(()=>{
        process.exit(1)
    })
})


