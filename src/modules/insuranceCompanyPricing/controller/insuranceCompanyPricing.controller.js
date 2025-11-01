import InsuranceCompanyPricingModel from "#db/models/InsuranceCompanyPricing.model.js";
import InsuranceCompany from "#db/models/insuranceCompany.model.js";
import PricingTypeModel from "#db/models/PricingType.model.js";
import { InsuranceTypeModel } from "#db/models/InsuranceType.model.js";
import logger from "#utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "#utils/pagination.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  conflictResponse
} from "#utils/apiResponse.js";

/**
 * Create or update pricing for a company
 * POST /api/v1/pricing/:companyId
 */
export const createOrUpdatePricing = asyncHandler(async (req, res) => {
  const { companyId } = req.params;
  const { pricing_type_id, rules } = req.body;

  // Validate company exists and populate insurance types
  const company = await InsuranceCompany.findById(companyId).populate('insuranceTypes');
  if (!company) {
    return notFoundResponse(res, "Insurance company");
  }

  // Validate pricing type exists
  const pricingType = await PricingTypeModel.findById(pricing_type_id);
  if (!pricingType) {
    return notFoundResponse(res, "Pricing type");
  }

  // CRITICAL VALIDATION: Check if company offers an insurance type that uses this pricing type
  const companyInsuranceTypes = await InsuranceTypeModel.find({
    _id: { $in: company.insuranceTypes }
  }).select('pricing_type_id name');

  const hasMatchingInsuranceType = companyInsuranceTypes.some(
    insuranceType => insuranceType.pricing_type_id === pricing_type_id
  );

  if (!hasMatchingInsuranceType) {
    const offeredTypes = companyInsuranceTypes.map(t => `${t.name} (${t.pricing_type_id})`).join(', ');
    return badRequestResponse(res, `This company does not offer any insurance type that uses '${pricing_type_id}' pricing. Company offers: ${offeredTypes || 'none'}`);
  }

  // Validate rules based on pricing type
  const validationError = validateRulesForPricingType(pricing_type_id, rules);
  if (validationError) {
    return badRequestResponse(res, validationError);
  }

  // Check if pricing already exists to determine if creating or updating
  const existingPricing = await InsuranceCompanyPricingModel.findOne({
    company_id: companyId,
    pricing_type_id
  });

  // Upsert (create or update) pricing
  const pricing = await InsuranceCompanyPricingModel.findOneAndUpdate(
    { company_id: companyId, pricing_type_id },
    {
      company_id: companyId,
      pricing_type_id,
      rules: rules || {}
    },
    {
      new: true,
      upsert: true,
      runValidators: true
    }
  ).populate("company_id", "name description")
   .populate("pricing_type_id");

  const isNew = !existingPricing;

  logger.info(`Pricing ${isNew ? 'created' : 'updated'} for company`, {
    companyId,
    pricing_type_id,
    isNew
  });

  if (isNew) {
    return createdResponse(res, { pricing }, "Pricing created successfully");
  } else {
    return successResponse(res, { pricing }, "Pricing updated successfully");
  }
});

/**
 * Get all pricing configurations
 * GET /api/v1/pricing/all
 */
export const list = asyncHandler(async (req, res) => {
  const { company_id, pricing_type_id } = req.query;
  const { page, limit, skip } = getPaginationParams(req.query);

  // Build query
  const query = {};
  if (company_id) query.company_id = company_id;
  if (pricing_type_id) query.pricing_type_id = pricing_type_id;

  const [pricingList, total] = await Promise.all([
    InsuranceCompanyPricingModel.find(query)
      .populate("company_id", "name description")
      .populate("pricing_type_id")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    InsuranceCompanyPricingModel.countDocuments(query)
  ]);

  const response = buildPaginatedResponse(pricingList, total, page, limit);

  logger.info("Pricing configurations retrieved", {
    total,
    filters: query
  });

  return successResponse(res, response, "Pricing configurations retrieved successfully");
});

/**
 * Get pricing by company ID
 * GET /api/v1/pricing/company/:companyId
 */
export const getPricingByCompany = asyncHandler(async (req, res) => {
  const { companyId } = req.params;

  const pricingList = await InsuranceCompanyPricingModel.find({ company_id: companyId })
    .populate("company_id", "name description")
    .populate("pricing_type_id")
    .sort({ pricing_type_id: 1 })
    .lean();

  logger.info("Company pricing retrieved", {
    companyId,
    count: pricingList.length
  });

  return successResponse(res, {
    count: pricingList.length,
    pricing: pricingList
  }, "Company pricing retrieved successfully");
});

/**
 * Get specific pricing configuration
 * GET /api/v1/pricing/:companyId/:pricingTypeId
 */
export const getSpecificPricing = asyncHandler(async (req, res) => {
  const { companyId, pricingTypeId } = req.params;

  const pricing = await InsuranceCompanyPricingModel.findOne({
    company_id: companyId,
    pricing_type_id: pricingTypeId
  })
    .populate("company_id", "name description")
    .populate("pricing_type_id");

  if (!pricing) {
    return notFoundResponse(res, "Pricing configuration");
  }

  logger.info("Specific pricing retrieved", {
    companyId,
    pricingTypeId
  });

  return successResponse(res, { pricing }, "Pricing configuration retrieved successfully");
});

/**
 * Delete pricing configuration
 * DELETE /api/v1/pricing/:companyId/:pricingTypeId
 */
export const deletePricing = asyncHandler(async (req, res) => {
  const { companyId, pricingTypeId } = req.params;

  const pricing = await InsuranceCompanyPricingModel.findOneAndDelete({
    company_id: companyId,
    pricing_type_id: pricingTypeId
  });

  if (!pricing) {
    return notFoundResponse(res, "Pricing configuration");
  }

  logger.info("Pricing deleted", {
    companyId,
    pricingTypeId
  });

  return successResponse(res, {
    deletedPricing: pricing
  }, "Pricing configuration deleted successfully");
});

/**
 * Calculate price based on pricing rules
 * POST /api/v1/pricing/calculate
 */
export const calculatePrice = asyncHandler(async (req, res) => {
  const { company_id, pricing_type_id, params } = req.body;

  const pricing = await InsuranceCompanyPricingModel.findOne({
    company_id,
    pricing_type_id
  }).populate("pricing_type_id");

  if (!pricing) {
    return notFoundResponse(res, "Pricing configuration");
  }

  let calculatedPrice = null;
  let matchedRule = null;

  // Calculate based on pricing type
  switch (pricing_type_id) {
    case "comprehensive":
    case "third_party":
      // Find matching rule in matrix
      if (pricing.rules.matrix && Array.isArray(pricing.rules.matrix)) {
        matchedRule = pricing.rules.matrix.find(rule => {
          return (
            rule.vehicle_type === params.vehicle_type &&
            rule.driver_age_group === params.driver_age_group &&
            params.offer_amount >= rule.offer_amount_min &&
            (!rule.offer_amount_max || params.offer_amount <= rule.offer_amount_max)
          );
        });

        if (matchedRule) {
          calculatedPrice = matchedRule.price;
        }
      }
      break;

    case "accident_fee_waiver":
      calculatedPrice = pricing.rules.fixedAmount || 0;
      break;

    case "compulsory":
      return badRequestResponse(res, "Compulsory insurance has no pricing rules - value should be entered manually");

    case "road_service":
      return badRequestResponse(res, "Road services pricing should be fetched from RoadService collection");

    default:
      return badRequestResponse(res, "Unknown pricing type");
  }

  if (calculatedPrice === null) {
    return notFoundResponse(res, "No matching pricing rule found for the provided parameters");
  }

  logger.info("Price calculated", {
    company_id,
    pricing_type_id,
    calculatedPrice,
    params
  });

  return successResponse(res, {
    price: calculatedPrice,
    matchedRule,
    pricing_type: pricing.pricing_type_id
  }, "Price calculated successfully");
});

/**
 * Validate rules based on pricing type
 */
function validateRulesForPricingType(pricing_type_id, rules) {
  if (!rules) return null;

  switch (pricing_type_id) {
    case "compulsory":
      // No rules needed
      return null;

    case "comprehensive":
    case "third_party":
      // Should have matrix array
      if (!rules.matrix || !Array.isArray(rules.matrix)) {
        return "Matrix-based pricing types require rules.matrix array";
      }

      // Validate each matrix entry
      for (const rule of rules.matrix) {
        if (!rule.vehicle_type || !rule.driver_age_group || rule.offer_amount_min === undefined || rule.price === undefined) {
          return "Each matrix entry must have: vehicle_type, driver_age_group, offer_amount_min, price";
        }
      }
      return null;

    case "accident_fee_waiver":
      // Should have fixedAmount
      if (rules.fixedAmount === undefined || typeof rules.fixedAmount !== 'number') {
        return "Accident fee waiver requires rules.fixedAmount (number)";
      }
      return null;

    case "road_service":
      // Road services are in separate collection
      return null;

    default:
      return "Unknown pricing type";
  }
}
