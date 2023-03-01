const User=require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncErrors');
const ErrorHandler = require('../utils/errorHandler');
const bcrypt=require('bcryptjs');
const sendToken=require('../utils/jwtToken')
const sendEmail=require("../utils/sendEmail");
const crypto=require('crypto')



//Register a new user /api/v1/register

exports.registerUser=catchAsyncErrors(async(req,res,next)=>{
    const {name,email,password,role}=req.body

    const user=await User.create({name,email,password,role});

    //create jwt token
    sendToken(user,200,res)

})

//login user => /api/v1/login

exports.loginUser=catchAsyncErrors(async(req,res,next)=>{
    const {email,password}=req.body

    //check email and password present
    if(!email || !password){
        return next(new ErrorHandler("Please enter Email & Password",400))
    }

    const user=await User.findOne({email}).select('+password')
    if(!user){
        return next(new ErrorHandler("Invalid Email or Password.",401))
    }

    //check valid password
    const isPAsswordMatched=await user.comparePassword(password)
    if(!isPAsswordMatched){
        return next(new ErrorHandler("Invalid Email or Password.",401))
    }

    //create jwt token
    sendToken(user,200,res)
})

//Forgot password  ==> api/v1/password/forgot

exports.forgotpassword=catchAsyncErrors(async(req,res,next)=>{
    const user=await User.findOne({email:req.body.email})

    //Check user email in database
    if(!user){
        return next(new ErrorHandler("Email not registered",404))
    }
    
    //Get reset token
    const resetToken=user.getResetPasswordToken()

    await user.save({validateBeforeSave:false})

    //create reset password url
    const resetUrl=`${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`

    const message=`Password reset link :\n\n${resetUrl}
    \n\n If you haven't requested this, Please ignore`


    try{
        await sendEmail({
            email:user.email,
            subject:'Jobee Reset password',
            message
        })
    
        res.status(200).json({
            success:true,
            message:`Email sent successfully to : ${user.email}`
        })
    }catch(err){
        user.resetPasswordToken=undefined
        user.resetPasswordExpire=undefined

        await user.save({validateBeforeSave:false})

        return next(new ErrorHandler('Email is not sent',500))

    }
    
})


//Reset password =. /api/v1/password/reset/:token
exports.resetPassword=catchAsyncErrors(async(req,res,next)=>{
    //Hash url token
    const resetPasswordToken=crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex')

    const user=await User.findOne({
        resetPasswordToken,
        resetPasswordExpire:{$gt:Date.now()}
    })

    if(!user){
        return next(new ErrorHandler("Password Reset token is Invalid or has been expired.",400))
    }

    //Setup new password
    user.password=req.body.password

    user.resetPasswordToken=undefined
    user.resetPasswordExpire=undefined
    
    await user.save()

    sendToken(user,200,res)

})


//Logout user
exports.logout=catchAsyncErrors(async(req,res,next)=>{
    res.cookie('token','none',{
        expires:new Date(Date.now()),
        httpOnly:true
    })
    res.status(200).json({
        success:true,
        message:"Logged out successfully."
    })
})
