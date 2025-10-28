import mongoose, { Schema } from "mongoose";

/**
 * InsuranceCompanyPricing Model
 *
 * Flexible pricing model that handles different pricing types:
 * - compulsory: User enters value manually (no rules needed)
 * - comprehensive/third_party: Matrix-based pricing (rules.matrix)
 * - road_service: List of services with CRUD (separate RoadService collection)
 * - accident_fee_waiver: Fixed value (rules.fixedAmount)
 */

const insuranceCompanyPricingSchema = new Schema(
  {
    company_id: {
      type: Schema.Types.ObjectId,
      ref: "InsuranceCompany",
      required: true,
      index: true
    },

    pricing_type_id: {
      type: String,
      ref: "PricingType",
      required: true,
      enum: ["compulsory", "third_party", "comprehensive", "road_service", "accident_fee_waiver"],
      index: true
    },

    // Flexible rules object - structure depends on pricing_type_id
    rules: {
      type: Schema.Types.Mixed,
      default: {}
    }

    /**
     * Rules structure examples:
     *
     * 1. compulsory:
     *    {} or null - user enters value manually
     *
     * 2. comprehensive / third_party:
     *    {
     *      matrix: [
     *        {
     *          vehicle_type: "car",
     *          driver_age_group: "under_24",
     *          offer_amount_min: 60000,
     *          offer_amount_max: 100000,
     *          price: 5000
     *        },
     *        ...
     *      ]
     *    }
     *
     * 3. road_service:
     *    Referenced in separate RoadService collection with company_id
     *
     * 4. accident_fee_waiver:
     *    {
     *      fixedAmount: 500
     *    }
     */
  },
  {
    timestamps: true
  }
);

// Compound index for unique company + pricing_type combination
insuranceCompanyPricingSchema.index({ company_id: 1, pricing_type_id: 1 }, { unique: true });

const InsuranceCompanyPricingModel = mongoose.model("InsuranceCompanyPricing", insuranceCompanyPricingSchema);

export default InsuranceCompanyPricingModel;
