import PricingTypeModel from "#db/models/PricingType.model.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  notFoundResponse
} from "#utils/apiResponse.js";

/**
 * Initialize/Seed pricing types with reference data
 * This should be run once on system setup or can be called to reset types
 */
export const initializePricingTypes = asyncHandler(async (req, res) => {
  const pricingTypes = [
    {
      _id: "compulsory",
      name: "Compulsory Insurance",
      description: "Basic mandatory insurance - value entered manually",
      requiresPricingTable: false
    },
    {
      _id: "third_party",
      name: "Third Party Insurance",
      description: "Third party liability coverage with pricing matrix",
      requiresPricingTable: true
    },
    {
      _id: "comprehensive",
      name: "Comprehensive Insurance",
      description: "Full coverage insurance with pricing matrix",
      requiresPricingTable: true
    },
    {
      _id: "road_service",
      name: "Road Services",
      description: "Emergency road assistance services",
      requiresPricingTable: false
    },
    {
      _id: "accident_fee_waiver",
      name: "Accident Fee Waiver",
      description: "Fixed fee waiver for accident-related charges",
      requiresPricingTable: false
    }
  ];

  // Use bulkWrite with upsert to insert or update
  const operations = pricingTypes.map(type => ({
    updateOne: {
      filter: { _id: type._id },
      update: { $set: type },
      upsert: true
    }
  }));

  const result = await PricingTypeModel.bulkWrite(operations);

  logger.info(`Pricing types initialized: ${result.upsertedCount} inserted, ${result.modifiedCount} updated`);

  return successResponse(res, {
    summary: {
      inserted: result.upsertedCount,
      updated: result.modifiedCount,
      total: pricingTypes.length
    },
    pricingTypes
  }, "Pricing types initialized successfully");
});

/**
 * Get all pricing types
 */
export const list = asyncHandler(async (req, res) => {
  const pricingTypes = await PricingTypeModel.find().sort({ _id: 1 });

  return successResponse(res, {
    pricingTypes,
    count: pricingTypes.length
  }, "Pricing types retrieved successfully");
});

/**
 * Get single pricing type by ID
 */
export const getPricingTypeById = asyncHandler(async (req, res) => {
  const { typeId } = req.params;

  const pricingType = await PricingTypeModel.findById(typeId);

  if (!pricingType) {
    return notFoundResponse(res, "Pricing type");
  }

  return successResponse(res, { pricingType }, "Pricing type retrieved successfully");
});
