/**
 * Comments service — cross-platform comment management.
 * Currently uses Facebook Analytics API for comments.
 */

import * as fb from "./facebookService";
import type {
  PostCommentDto,
  CommentResultDto,
} from "@/types/facebook";

export async function getPostComments(
  postId: string
): Promise<PostCommentDto[]> {
  return fb.getPostComments(postId);
}

export async function replyToComment(
  commentId: string,
  message: string
): Promise<CommentResultDto> {
  return fb.replyToComment({ commentId, message });
}

export async function hideComment(
  commentId: string,
  hidden = true
): Promise<CommentResultDto> {
  return fb.hideComment({ commentId, hidden });
}

export async function deleteComment(
  commentId: string
): Promise<CommentResultDto> {
  return fb.deleteComment(commentId);
}
