import { randomBytes } from "crypto";
import { isValidObjectId } from "mongoose";

import AppError from "../../utils/AppError";

import {
  IInvestmentProject,
  IInvestmentQuery,
  TInvestmentStatus,
} from "./investment.interface";

import {
  InvestmentProject,
} from "./investment.model";


// Generate unique investment project code

const generateProjectCode =
  async (): Promise<string> => {

    for (let i = 0; i < 10; i++) {

      const projectCode =
        `INV-${randomBytes(4)
          .toString("hex")
          .toUpperCase()}`;


      const exists =
        await InvestmentProject.exists({
          projectCode,
        });


      if (!exists) {
        return projectCode;
      }
    }


    throw new AppError(
      500,
      "Failed to generate project code"
    );
};



// Create investment project

const createInvestmentProjectInDB =
async (

  payload: Omit<
    IInvestmentProject,

    | "projectCode"
    | "farmerId"
    | "farmerName"
    | "farmerEmail"
    | "status"
    | "adminNote"
    | "reviewedAt"
    | "isDeleted"
  >,


  farmer:{
    id:string;
    name?:string;
    email:string;
  }

)=>{


  const projectCode =
    await generateProjectCode();

  const project =
    await InvestmentProject.create({

      projectCode,

      farmerId:
        farmer.id,

      farmerName:
        farmer.name || "",

      farmerEmail:
        farmer.email
          .toLowerCase()
          .trim(),

      projectName:
        payload.projectName,
      category:
        payload.category,
      requiredInvestment:
        payload.requiredInvestment,

      ownContribution:
        payload.ownContribution || 0,

      duration:
        payload.duration,

      expectedReturn:
        payload.expectedReturn,
      profitSharing:
        payload.profitSharing,
      estimatedRevenue:
        payload.estimatedRevenue,
      estimatedCost:
        payload.estimatedCost,
      estimatedProfit:
        payload.estimatedProfit,
      division:
        payload.division,
      district:
        payload.district,
      upazila:
        payload.upazila,
      address:
        payload.address,

      description:
        payload.description,

      nidNumber:
        payload.nidNumber,

      nidFrontImage:
        payload.nidFrontImage,

      status:
        "PENDING_REVIEW",

      adminNote:
        "",
      isDeleted:
        false,

    });



  return project;

};


// Farmer own projects

const getMyInvestmentProjectsFromDB =
async (

  farmerId:string
)=>{


  return InvestmentProject.find({

    farmerId,

    isDeleted:{
      $ne:true,
    },

  })

  .sort({
    createdAt:-1,
  })

  .lean();

};


// Farmer single project

const getMyInvestmentProjectByIdFromDB =
async (
 projectId:string,
 farmerId:string
)=>{


 if(!isValidObjectId(projectId)){

   throw new AppError(
    400,
    "Invalid investment project id"
   );

 }


 const project =
 await InvestmentProject.findOne({

  _id:projectId,

  farmerId,

  isDeleted:{
    $ne:true,
  }

 });


 if(!project){

   throw new AppError(
    404,
    "Investment project not found"
   );

 }
 return project;

};

// Farmer update

const updateMyInvestmentProjectInDB =
async (

 projectId:string,

 farmerId:string,

 payload:Partial<IInvestmentProject>

)=>{


 if(!isValidObjectId(projectId)){

  throw new AppError(
    400,
    "Invalid investment project id"
  );

 }


 const project =
 await InvestmentProject.findOne({

  _id:projectId,

  farmerId,

  isDeleted:{
    $ne:true,
  }

 });


 if(!project){
  throw new AppError(
   404,
   "Investment project not found"
  );

 }

 if(
  project.status !==
  "PENDING_REVIEW"
 ){

  throw new AppError(
   400,
   "Only pending projects can be edited"
  );

 }

 Object.assign(
  project,
  payload
 );

 await project.save();
 return project;

};


// Farmer delete/withdraw

const deleteMyInvestmentProjectFromDB =
async (

 projectId:string,
 farmerId:string
)=>{

 const project =
 await InvestmentProject.findOne({

  _id:projectId,

  farmerId,

 });


 if(!project){

  throw new AppError(
   404,
   "Investment project not found"
  );

 }

 if(
  project.status !==
  "PENDING_REVIEW"
 ){

  throw new AppError(
   400,
   "Only pending projects can be withdrawn"
  );

 }

 project.isDeleted=true;
 await project.save();
 return project;

};

// Admin get all projects

const getAdminInvestmentProjectsFromDB =
async (

 query:IInvestmentQuery

)=>{

 const filter:any={

  isDeleted:{
   $ne:true,
  }

 };


 if(query.status){

  filter.status =
   query.status;

 }

 if(query.search){

  filter.$or=[

   {
    projectName:{
     $regex:
     query.search,
     $options:"i",
    }
   },


   {
    farmerName:{
     $regex:
     query.search,
     $options:"i",
    }
   },


   {
    district:{
     $regex:
     query.search,
     $options:"i",
    }
   }

  ];

 }

 const page =
 Math.max(
  Number(query.page)||1,
  1
 );


 const limit =
 Math.min(
  Number(query.limit)||20,
  50
 );

 const skip =
 (page-1)*limit;

 const [
  data,
  total

 ] =
 await Promise.all([


  InvestmentProject.find(filter)

  .sort({
   createdAt:-1,
  })

  .skip(skip)

  .limit(limit)

  .lean(),



  InvestmentProject.countDocuments(
   filter
  )

 ]);


 return {

  meta:{

   page,

   limit,

   total,

   totalPages:
   Math.ceil(total/limit)

  },


  data,

 };

};

// Admin single project

const getAdminInvestmentProjectByIdFromDB =
async (

  projectId:string

)=>{


  if(!isValidObjectId(projectId)){

    throw new AppError(
      400,
      "Invalid investment project id"
    );

  }



  const project =
    await InvestmentProject.findOne({

      _id: projectId,

      isDeleted:{
        $ne:true,
      }

    });



  if(!project){

    throw new AppError(
      404,
      "Investment project not found"
    );

  }



  return project;

};;

// Admin approve reject

const reviewInvestmentProjectInDB =
async (

 projectId:string,

 status:TInvestmentStatus,

 adminNote?:string

)=>{

 const project =
 await InvestmentProject.findById(
  projectId
 );

 if(!project){

  throw new AppError(
   404,
   "Project not found"
  );

 }


 if(
  project.status !==
  "PENDING_REVIEW"
 ){

  throw new AppError(
   400,
   "Project already reviewed"
  );

 }

 project.status =
 status;

 project.adminNote =
 adminNote || "";

 project.reviewedAt =
 new Date();
 await project.save();
 return project;

};



export const InvestmentService = {
 createInvestmentProjectInDB,
 getMyInvestmentProjectsFromDB,
 getMyInvestmentProjectByIdFromDB,
 updateMyInvestmentProjectInDB,
 deleteMyInvestmentProjectFromDB,
 getAdminInvestmentProjectsFromDB,
 getAdminInvestmentProjectByIdFromDB,
 reviewInvestmentProjectInDB,

};
