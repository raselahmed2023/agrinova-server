import type { Request, Response } from "express";
import AppError from "../../utils/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { CommunityService } from "./community.service";

const requireUser = (req: Request) => {
  if (!req.user) throw new AppError(401, "Authentication required");
  return req.user;
};

const getFeed = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getFeedFromDB(undefined, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Community feed retrieved", data: result.data, meta: result.meta });
});

const createPost = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.createPostInDB(req.body, user);
  sendResponse(res, { statusCode: 201, success: true, message: "Post published", data: result });
});

const updatePost = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.updatePostInDB(String(req.params.postId), user.id, req.body);
  sendResponse(res, { statusCode: 200, success: true, message: "Post updated", data: result });
});

const deleteOwnPost = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.deleteOwnPostFromDB(String(req.params.postId), user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Post deleted", data: result });
});

const toggleLike = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.toggleLikeInDB(String(req.params.postId), user.id);
  sendResponse(res, { statusCode: 200, success: true, message: "Reaction updated", data: result });
});

const addComment = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.addCommentInDB(String(req.params.postId), req.body.content, user);
  sendResponse(res, { statusCode: 201, success: true, message: "Comment added", data: result });
});

const addReply = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.addReplyInDB(String(req.params.postId), String(req.params.commentId), req.body.content, user);
  sendResponse(res, { statusCode: 201, success: true, message: "Reply added", data: result });
});

const getFarmerProfile = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.getFarmerProfileFromDB(String(req.params.farmerId), user.id, req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Farmer Community profile retrieved", data: result });
});

const uploadImage = catchAsync(async (req: Request, res: Response) => {
  requireUser(req);
  if (!req.file) throw new AppError(400, "Image file is required");
  const result = await CommunityService.uploadImageToImgBB(req.file);
  sendResponse(res, { statusCode: 201, success: true, message: "Image uploaded", data: result });
});

const getAdminPosts = catchAsync(async (req: Request, res: Response) => {
  const result = await CommunityService.getAdminPostsFromDB(req.query);
  sendResponse(res, { statusCode: 200, success: true, message: "Community moderation feed retrieved", data: result.data, meta: result.meta });
});

const removePostByAdmin = catchAsync(async (req: Request, res: Response) => {
  const user = requireUser(req);
  const result = await CommunityService.removePostByAdminInDB(String(req.params.postId), user.id, req.body.reason);
  sendResponse(res, { statusCode: 200, success: true, message: "Post removed and farmer notified", data: result });
});

const warnFarmerByAdmin = catchAsync(async (req: Request, res: Response) => {
  requireUser(req);
  const result = await CommunityService.warnFarmerByAdminInDB(String(req.params.postId), req.body.reason);
  sendResponse(res, { statusCode: 200, success: true, message: "Warning sent to farmer", data: result });
});

export const CommunityController = {
  getFeed,
  createPost,
  updatePost,
  deleteOwnPost,
  toggleLike,
  addComment,
  addReply,
  getFarmerProfile,
  uploadImage,
  getAdminPosts,
  removePostByAdmin,
  warnFarmerByAdmin,
};