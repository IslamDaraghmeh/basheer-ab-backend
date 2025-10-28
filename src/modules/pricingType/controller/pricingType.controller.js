import PricingTypeModel from "../../../../DB/models/PricingType.model.js";
import logger from "../../../utils/logService.js";

/**
 * Initialize/Seed pricing types with reference data
 * This should be run once on system setup or can be called to reset types
 */
export const initializePricingTypes = async (req, res, next) => {
  try {
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

    return res.status(200).json({
      message: "Pricing types initialized successfully",
      summary: {
        inserted: result.upsertedCount,
        updated: result.modifiedCount,
        total: pricingTypes.length
      },
      pricingTypes
    });

  } catch (error) {
    logger.error("Error initializing pricing types:", error);
    next(error);
  }
};

/**
 * Get all pricing types
 */
export const getAllPricingTypes = async (req, res, next) => {
  try {
    const pricingTypes = await PricingTypeModel.find().sort({ _id: 1 });

    return res.status(200).json({
      message: "Pricing types retrieved successfully",
      count: pricingTypes.length,
      pricingTypes
    });

  } catch (error) {
    logger.error("Error getting pricing types:", error);
    next(error);
  }
};

/**
 * Get single pricing type by ID
 */
export const getPricingTypeById = async (req, res, next) => {
  try {
    const { typeId } = req.params;

    const pricingType = await PricingTypeModel.findById(typeId);

    if (!pricingType) {
      return res.status(404).json({ message: "Pricing type not found" });
    }

    return res.status(200).json({
      message: "Pricing type retrieved successfully",
      pricingType
    });

  } catch (error) {
    logger.error("Error getting pricing type:", error);
    next(error);
  }
};
