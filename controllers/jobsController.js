const Job=require('../models/jobs')
const geoCoder=require('../utils/geocoder')
const ErrorHandler=require('../utils/errorHandler')
const catchAsyncErrors=require('../middlewares/catchAsyncErrors')
const APIFilters =require('../utils/apiFilters')
const path=require('path')
const fs=require('fs')


//Get all jobs => /api/v1/jobs
exports.getJobs=catchAsyncErrors(async(req,res,next)=>{
    const apiFilters = new APIFilters(Job.find(),req.query)
    .filter()
    .sort()
    .limitfields()
    .searchByQuery()
    .pagination()

    const jobs=await apiFilters.query
    res.status(200).json({
        success:true,
        results:jobs.length,
        data:jobs
    })
})

//creat a new job = /api/v1/jobs/new

exports.newJob=catchAsyncErrors (async (req,res,next)=>{

    //adding user to body
    req.body.user=req.user.id

    const job=await Job.create(req.body)

    res.status(200).json({
        success:true,
        message:'Job Created',
        data:job
    })
})

// Update a job ==>  /api/v1/job/:id

exports.updateJob=catchAsyncErrors(async (req,res,next)=>{
    const id=req.params.id

    let job=await Job.findById(id)

    if(!job){
        return next(new ErrorHandler('Job Not Found.',404))
    }

    //check if the user is owner
    if(job.user.toString()!==req.user.id && req.user.role!=='admin'){
        return next(new ErrorHandler('Not allowed to update job that is not yours.',401))

    }

    job=await Job.findByIdAndUpdate(id,req.body,{
        new:true,
        runValidators:true,
        useFindAndModify:false
    })
    return res.status(200).json({
        success:true,
        message:"Job is updated",
        data:job
    })
})

//Delete a job ==>  /api/v1/job/:id

exports.deleteJob=catchAsyncErrors(async(req,res,next)=>{
    let job=await Job.findById(req.params.id).select('+applicantsApplied')

    if(!job){
        return next(new ErrorHandler('Job Not Found.',404))
    }

    //checkin if user is owner
    if(job.user.toString()!==req.user.id && req.user.role!=='admin'){
        return next(new ErrorHandler('Not allowed to update job that is not yours.',401))

    }

      //Deleting files associated with job
    job.applicantsApplied.forEach((applicant)=>{
        let filePath=`${__dirname}/public/uploads/${applicant.resume}`.replace
                ('\\controllers','')
                
        fs.unlink(filePath,err=>{
            if(err){
                return console.log(err)
            }
        })    
    })

    job=await Job.findByIdAndDelete(req.params.id)
    return res.status(200).json({
        success:true,
        message:'Job deleted successfully',
    })
})

// Get single job using id and slug ==> /api/v1/job/:id/:slug

exports.getJob=catchAsyncErrors(async(req,res,next)=>{
    let job=await Job.find({$and:[{_id:req.params.id},{slug:req.params.slug}]})
    .populate({
        path:'user',
        select:'name'
    })

    if(!job || job.length===0){
        return next(new ErrorHandler('Job Not Found.',404))
    }
    return res.status(200).json({
        success:true,
        data:job
    })

})

//get stats about a job ==>  /api/v1/stats/topic

exports.jobStats=catchAsyncErrors(async(req,res,next)=>{
    const stats=await Job.aggregate([
        {
            $match:{$text:{$search:"\""+req.params.topic+"\""}}
        },
        {
            $group:{
                _id:{$toUpper:'$experiance'},
                totalJobs:{$sum:1},
                avgPosition:{$avg:'$positions'},
                avgSalary:{$avg:'$salary'},
                minSalary:{$min:'$salary'},
                maxSalary:{$max:'$salary'}
            }
        }
    ])
    if(stats.length===0){
        return next(new ErrorHandler(`No stats found for - ${req.params.topic}`,200))
        
    }
    res.status(200).json({
        success:true,
        results:stats.length,
        data:stats
    })
})


// search job within radius ===>   /api/v1/jobs/:zipcode/:distance

exports.getJobsInRadius=catchAsyncErrors(async (req,res,next)=>{
    const {zipcode,distance}=req.params

    //getting latitude and longitude from geocoder using zipcode

    const loc=await geoCoder.geocode(zipcode)
    const latitude=loc[0].latitude
    const longitude=loc[0].longitude

    const radius=distance/3963

    const jobs=await Job.find({
        "location.coordinates":{$geoWithin:{$centerSphere:[[longitude,latitude],radius]}}
    })
    console.log(jobs)
    res.status(200).json({
        success:true,
        results:jobs.length,
        data:jobs
    })
})

//apply for job using resume =>  /api/v1/job/:id/apply
exports.applyJob=catchAsyncErrors(async (req,res,next)=>{
    const job=await Job.findById(req.params.id).select('+applicantsApplied')
    if(!job){
        return next(new ErrorHandler('job not found',404))
    }

    //check if job last date has been passed
    if(job.lastDate < new Date(Date.now())){
        return next(new ErrorHandler('Cannot apply,Date is over for this job.',400))
    }

    //check if user already applied
    job.applicantsApplied.forEach((user)=>{
        if(user.id===req.user.id){
            return next(new ErrorHandler('Already applied for this job',400))
        }
    })
    

    //check the file
    if(!req.files){
        return next(new ErrorHandler('Please upload resume.',400))
    }

    const file=req.files.file

    //check file type
    const supportedFiles= /.docs|.pdf/
    if(!supportedFiles.test(path.extname(file.name))){
        return next(new ErrorHandler('Please upload document/pdf file',400))
    }

    //Check document size
    if(file.size > process.env.MAX_FILE_SIZE){
        return next(new ErrorHandler('File too large, maximum file size is '+process.env.MAX_FILE_SIZE+'.',400))

    }

    //Renaming resume
    file.name=`${req.user.name.replace(' ','_')}_${job._id}${path.parse(file.name).ext}`
    
    file.mv(`${process.env.UPLOAD_PATH}/${file.name}`,async err=>{
        if(err){
            console.log(err)
            return next(new ErrorHandler('Resume upload failed.',500))
        }
        await Job.findByIdAndUpdate(req.params.id,{$push:{
            applicantsApplied:{
                id:req.user.id,
                resume:file.name
            }
        }},{
            new:true,
            runValidators:true,
            useFindAndModify:false
        })

        res.status(200).json({
            success:true,
            message:"Successfully applied for the job",
            data:file.name
        })
    })
})