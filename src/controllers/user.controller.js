import asyncHandler from "../utils/asyncHandler.js"
import { isEmpty, isPasswordValid, isEmailValid } from "../utils/validations.js"
import ApiError from "../utils/apiError.js"
import ApiResponse from "../utils/apiResponse.js"
import User from "../models/user.models.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import fs from "fs"

export const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend.
  // data validation
  // check if user already exists.
  // check for images : avatar required.
  // upload them to cloudinary.
  // create user object.
  // now send data to frontend after removing password and RT field.
  // check for user creation
  // return that user

  const {username, fullName, email, password} = req.body;
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
  // we get access to req.files due to multer middleware which we added in our route.

  const errors = [];

  if (isEmpty(username)) errors.push("username is required")
  if (isEmpty(fullName)) errors.push("fullName is required")
  if (isEmpty(password)) errors.push("password is required")
  if (isEmpty(email)) errors.push("email is required")
  if (!isEmailValid(email)) errors.push("Invalid email")
  if (!isPasswordValid(password)) errors.push("Password should be of atleast 6 characters")
  if (!avatarLocalPath) errors.push("Avatar file is required")

  if (errors.length > 0) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath) 
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath)
    throw new ApiError(400, errors.join(", ")) 
  }

  const existedUser = await User.findOne({ $or : [{username}, {email}] })
  if (existedUser) {
    if (avatarLocalPath) fs.unlinkSync(avatarLocalPath) 
    if (coverImageLocalPath) fs.unlinkSync(coverImageLocalPath)
    throw new ApiError(400, "User with email or username already exists")
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath)   
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)  
  // this will return complete resonse object and not url.
  // if coverImageLocalPath is null or undefined, then this method will return null as we wrote in the uploadOnCloudinary function.

  if (!avatar) throw new ApiError(400, "Failed to upload Avatar")
  
  const user = await User.create({
    fullName, email, password, username, 
    avatar : avatar.url, 
    coverImage : coverImage?.url || ""
  })

  const createdUser = await User.findById(user._id).select("-password -refreshToken")
  const createdObject = createdUser.toObject()

  if (!createdUser) throw new ApiError(500, "something went wrong while registering the user")

  return res.status(201).json(new ApiResponse(200, createdObject, "User registered successfully"))

})

// note that we are returning data in this post request which is generally meant to save some data. why ??

// When you create a user, your database (e.g., MongoDB) generates a unique _id for that new user. The frontend (your web or mobile app) does not know this ID until the server sends it back. Without this ID, the frontend can't do anything else with that user, such as: Navigate to the new user's profile page (e.g., /profile/60f8...) or Send a request to update this specific user's details or Store the new user's full data in its global state (like in Redux or React Context).

// so if we will not return this data here, we will have to make an extra call to get request after creating the user to get its information.

// in postman, while checking code, Body se ham form data bhi bhej sakte hai, ham x-form-data bhi sakte hai jo ki urlencoded hai, lekin is urlencoded ma ham files nhi bhej sakte, ham yaha raw data bhejenge, and raw ma bhi json. Ab ye raw json ma bhi files nhi bhej sakte, isliye jab files bhejni ho tab form data use kro.