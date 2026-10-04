import { Notification } from '../models/Notification.js';
import { asyncHandler, ok } from '../utils/errors.js';

export const list = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(50);
  const unread = await Notification.countDocuments({ userId: req.user._id, isRead: false });
  ok(res, { notifications, unread });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, userId: req.user._id }, { isRead: true });
  ok(res, {}, 'Marked as read');
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
  ok(res, {}, 'All marked as read');
});
