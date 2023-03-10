const User=require('../models/users')
const catchAsyncErrors=require('../middlewares/catchAsyncErrors')
const ErrorHandler=require('../utils/errorHandler')
const sendToken = require('../utils/jwtToken')
const fs=require('fs')
const Job=require('../models/jobs')
const APIFilters = require('../utils/apiFilters')


//Get current user =>    /api/v1/me

exports.getUserProfile=catchAsyncErrors(async(req,res,next)=>{
    const user=await User.findById(req.user.id)
        .populate({
            path:'jobsPublished',
            select:'title postingDate'
        })

    res.status(200).json({
        success:true,
        data:user
    })
})

//Update current user password  =>   /api/v1/password/update
exports.updatePassword=catchAsyncErrors(async(req,res,next)=>{
    const user=await User.findById(req.user.id).select('+password')
    
    //check previous user password
    const isMatched=await user.comparePassword(req.body.currentPassword)
    console.log(isMatched)
    if(!isMatched){
        return next(new ErrorHandler('Old password is incorrect.',401))
    }

    user.password=req.body.newPassword
    await user.save()

    sendToken(user,200,res)
})

//Update Current user data   /api/v1/me/update
exports.updateUser=catchAsyncErrors(async(req,res,next)=>{
    const newUserData={
        name:req.body.name,
        email:req.body.email
    }

    const user=await User.findByIdAndUpdate(req.user.id,newUserData,{
        new:true,
        runValidators:true,
        useFindAndModify:false
    })

    res.status(200).json({
        success:true,
        data:user
    })


})

// Deleted current user  =>   /api/v1/me/delete

exports.deleteUser=catchAsyncErrors(async(req,res,next)=>{

    deleteUserData(req.user.id,req.user.role)

    const user=await User.findByIdAndDelete(req.user.id)
    res.cookie('token','none',{
        expires:new Date(Date.now()),
        httpOnly:true
    })

    res.status(200).json({
        success:true,
        message:"Your account has been Deleted."
    })
})




//Controller methods only accessible to admin

//show all users  =>  /api/v1/users
exports.getAllUsers=catchAsyncErrors(async(req,res,next)=>{
    const apiFilters=new APIFilters(User.find(),req.query)
        .filter()
        .sort()
        .limitfields()
        .pagination()

    const users=await apiFilters.query

    res.status(200).json({
        success:true,
        results:users.length,
        data:users
    })
})

//Delete a user (admin function)   =>  /api/v1.user/:id
exports.deleteUser=catchAsyncErrors(async(req,res,next)=>{
    const user=await User.findById(req.params.id)
    if(!user){
        return next(new ErrorHandler(`User not found with Id: ${req.params.id}`,404))
    }

    deleteUserData(user.id,user.role)
    await user.remove()
    res.status(200).json({
        success:true,
        message:"User deleted succesfully by admin"
    })
})

//show all applied jobs   =>   /api/v1/jobs/applied
exports.getAppliedJobs=catchAsyncErrors(async(req,res,next)=>{
    const jobs=await Job.find({'applicantsApplied.id':req.user.id}).select('+applicantsApplied')

    res.status(200).json({
        success:true,
        results:jobs.length,
        data:jobs
    })
})

//show all applied jobs   =>   /api/v1/jobs/published
exports.getPublishedJobs=catchAsyncErrors(async(req,res,next)=>{
    const jobs=await Job.find({user:req.user.id})

    res.status(200).json({
        success:true,
        results:jobs.length,
        data:jobs
    })
})


 async function deleteUserData(user,role){
    if(role==='employer'){
        await Job.deleteMany({user:user})
    }
    if(role==='user'){
        const appliedJobs=await Job.find({'applicantsApplied.id':user}).select('+applicantsApplied')
        appliedJobs.forEach((job)=>{
            let obj=job.applicantsApplied.find(o=> o.id===user)

            console.log(__dirname)
            let filePath=`${__dirname}/public/uploads/${obj.resume}`.replace
                ('\\controllers','')
            
            fs.unlink(filePath,err=>{
                if(err){
                    return console.log(err)
                }
            })
            job.applicantsApplied.splice(job.applicantsApplied.indexOf(obj.id))

            job.save()
        })
    }
}
