import InsuranceCompanyPricingModel from "../../../../DB/models/InsuranceCompanyPricing.model.js";
import InsuranceCompany from "../../../../DB/models/insuranceCompany.model.js";
import PricingTypeModel from "../../../../DB/models/PricingType.model.js";
import { InsuranceTypeModel } from "../../../../DB/models/InsuranceType.model.js";
import logger from "../../../utils/logService.js";
import { getPaginationParams, buildPaginatedResponse } from "../../../utils/pagination.js";

/**
 * Create or update pricing for a company
 * POST /api/v1/pricing/:companyId
 */
export const createOrUpdatePricing = async (req, res, next) => {
  try {
    const { companyId } = req.params;
    const { pricing_type_id, rules } = req.body;

    // Validate company exists and populate insurance types
    const company = await InsuranceCompany.findById(companyId).populate('insuranceTypes');
    if (!company) {
      return res.status(404).json({ message: "Insurance company not found" });
    }

    // Validate pricing type exists
    const pricingType = await PricingTypeModel.findById(pricing_type_id);
    if (!pricingType) {
      return res.status(404).json({ message: "Pricing type not found" });
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
      return res.status(400).json({
        message: `This company does not offer any insurance type that uses '${pricing_type_id}' pricing. Company offers: ${offeredTypes || 'none'}`
      });
    }

    // Validate rules based on pricing type
    const validationError = validateRulesForPricingType(pricing_type_id, rules);
    if (validationError) {
      return res.status(400).json({ message: validationError });
    }

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

    logger.info(`Pricing ${pricing.isNew ? 'created' : 'updated'} for company ${companyId}, type ${pricing_type_id}`);

    return res.status(pricing.isNew ? 201 : 200).json({
      message: `Pricing ${pricing.isNew ? 'created' : 'updated'} successfully`,
      pricing
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Pricing already exists for this company and type" });
    }
    logger.error("Error creating/updating pricing:", error);
    next(error);
  }
};

/**
 * Get all pricing configurations
 * GET /api/v1/pricing/all
 */
export const getAllPricing = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Pricing configurations retrieved successfully",
      ...response
    });

  } catch (error) {
    logger.error("Error getting all pricing:", error);
    next(error);
  }
};

/**
 * Get pricing by company ID
 * GET /api/v1/pricing/company/:companyId
 */
export const getPricingByCompany = async (req, res, next) => {
  try {
    const { companyId } = req.params;

    const pricingList = await InsuranceCompanyPricingModel.find({ company_id: companyId })
      .populate("company_id", "name description")
      .populate("pricing_type_id")
      .sort({ pricing_type_id: 1 })
      .lean();

    return res.status(200).json({
      message: "Company pricing retrieved successfully",
      count: pricingList.length,
      pricing: pricingList
    });

  } catch (error) {
    logger.error("Error getting company pricing:", error);
    next(error);
  }
};

/**
 * Get specific pricing configuration
 * GET /api/v1/pricing/:companyId/:pricingTypeId
 */
export const getSpecificPricing = async (req, res, next) => {
  try {
    const { companyId, pricingTypeId } = req.params;

    const pricing = await InsuranceCompanyPricingModel.findOne({
      company_id: companyId,
      pricing_type_id: pricingTypeId
    })
      .populate("company_id", "name description")
      .populate("pricing_type_id");

    if (!pricing) {
      return res.status(404).json({ message: "Pricing configuration not found" });
    }

    return res.status(200).json({
      message: "Pricing configuration retrieved successfully",
      pricing
    });

  } catch (error) {
    logger.error("Error getting specific pricing:", error);
    next(error);
  }
};

/**
 * Delete pricing configuration
 * DELETE /api/v1/pricing/:companyId/:pricingTypeId
 */
export const deletePricing = async (req, res, next) => {
  try {
    const { companyId, pricingTypeId } = req.params;

    const pricing = await InsuranceCompanyPricingModel.findOneAndDelete({
      company_id: companyId,
      pricing_type_id: pricingTypeId
    });

    if (!pricing) {
      return res.status(404).json({ message: "Pricing configuration not found" });
    }

    logger.info(`Deleted pricing for company ${companyId}, type ${pricingTypeId}`);

    return res.status(200).json({
      message: "Pricing configuration deleted successfully",
      deletedPricing: pricing
    });

  } catch (error) {
    logger.error("Error deleting pricing:", error);
    next(error);
  }
};

/**
 * Calculate price based on pricing rules
 * POST /api/v1/pricing/calculate
 */
export const calculatePrice = async (req, res, next) => {
  try {
    const { company_id, pricing_type_id, params } = req.body;

    const pricing = await InsuranceCompanyPricingModel.findOne({
      company_id,
      pricing_type_id
    }).populate("pricing_type_id");

    if (!pricing) {
      return res.status(404).json({ message: "Pricing configuration not found" });
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
        return res.status(400).json({
          message: "Compulsory insurance has no pricing rules - value should be entered manually"
        });

      case "road_service":
        return res.status(400).json({
          message: "Road services pricing should be fetched from RoadService collection"
        });

      default:
        return res.status(400).json({ message: "Unknown pricing type" });
    }

    if (calculatedPrice === null) {
      return res.status(404).json({
        message: "No matching pricing rule found for the provided parameters"
      });
    }

    return res.status(200).json({
      message: "Price calculated successfully",
      price: calculatedPrice,
      matchedRule,
      pricing_type: pricing.pricing_type_id
    });

  } catch (error) {
    logger.error("Error calculating price:", error);
    next(error);
  }
};

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
