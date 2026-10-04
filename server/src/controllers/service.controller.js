import { Business } from '../models/Business.js';
import { Service } from '../models/Service.js';
import { Booking } from '../models/Booking.js';
import { AppError, asyncHandler, ok } from '../utils/errors.js';
import { refreshMinPrice } from './business.controller.js';

const ownBusiness = async (user) => {
  const business = await Business.findOne({ ownerId: user._id });
  if (!business) throw new AppError('Register your business first', 400);
  return business;
};

const ownService = async (user, id) => {
  const business = await ownBusiness(user);
  const service = await Service.findOne({ _id: id, businessId: business._id });
  if (!service) throw new AppError('Service not found', 404);
  return service;
};

export const createService = asyncHandler(async (req, res) => {
  const business = await ownBusiness(req.user);
  const service = await Service.create({ ...req.body, businessId: business._id });
  await refreshMinPrice(business._id);
  ok(res, { service }, 'Service added', 201);
});

export const updateService = asyncHandler(async (req, res) => {
  const service = await ownService(req.user, req.params.id);
  Object.assign(service, req.body);
  await service.save();
  await refreshMinPrice(service.businessId);
  ok(res, { service }, 'Service updated');
});

// Services that already have bookings are deactivated (history keeps working); unused ones are removed.
export const deleteService = asyncHandler(async (req, res) => {
  const service = await ownService(req.user, req.params.id);
  if (await Booking.exists({ serviceId: service._id })) {
    service.isActive = false;
    await service.save();
  } else {
    await service.deleteOne();
  }
  await refreshMinPrice(service.businessId);
  ok(res, {}, 'Service removed');
});
