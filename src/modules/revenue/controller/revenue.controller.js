import mongoose from "mongoose";
import { insuredModel } from "#db/models/Insured.model.js";
import { ExpenseModel } from "#db/models/Expense.model.js";
import { RevenueModel } from "#db/models/Revenue.model.js";
import logger from "#utils/logService.js";
import { asyncHandler } from "#utils/asyncHandler.js";
import { logAudit } from "#utils/auditLogger.js";
import {
  successResponse,
  notFoundResponse
} from "#utils/apiResponse.js";

export const transferInsurance = asyncHandler(async (req, res) => {
  const { insuredId, fromVehicleId, toVehicleId, insuranceId } = req.params;
  const { customerFee, companyFee, customerPaymentMethod, companyPaidBy, companyPaymentMethod, description } = req.body;

  const insured = await insuredModel.findById(insuredId);
  if (!insured) {
    return notFoundResponse(res, "Customer");
  }

  const fromVehicle = insured.vehicles.id(fromVehicleId);
  const toVehicle = insured.vehicles.id(toVehicleId);
  if (!fromVehicle || !toVehicle) {
    return notFoundResponse(res, "One of the vehicles");
  }

  const insurance = fromVehicle.insurance.id(insuranceId);
  if (!insurance) {
    return notFoundResponse(res, "Insurance");
  }

  const newInsurance = { ...insurance.toObject(), _id: new mongoose.Types.ObjectId() };
  toVehicle.insurance.push(newInsurance);
  fromVehicle.insurance.pull(insuranceId);
  await insured.save({ validateBeforeSave: false });

  const revenue = new RevenueModel({
    title: `Transfer fee for insurance (${insurance.insuranceCompany})`,
    amount: customerFee,
    receivedFrom: `${insured.first_name} ${insured.last_name}`,
    paymentMethod: customerPaymentMethod,
    description: description || `Transfer of insurance from vehicle ${fromVehicle.plateNumber} to vehicle ${toVehicle.plateNumber}`,
    fromVehiclePlate: fromVehicle.plateNumber,
    toVehiclePlate: toVehicle.plateNumber
  });
  await revenue.save({ validateBeforeSave: false });

  const expense = new ExpenseModel({
    title: `Company transfer fee for insurance (${insurance.insuranceCompany})`,
    amount: companyFee,
    paidBy: companyPaidBy,
    paymentMethod: companyPaymentMethod,
    description
  });
  await expense.save({ validateBeforeSave: false });

  logger.info("Insurance transferred successfully", {
    insuredId,
    fromVehicleId,
    toVehicleId,
    insuranceId,
    customerFee,
    companyFee
  });

  return successResponse(res, {
    insurance: newInsurance,
    revenue,
    expense
  }, "Insurance transferred successfully");
});

export const getCustomerPaymentsReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;

  const insureds = await insuredModel.find().select("first_name last_name agentsName vehicles.insurance");

  let report = [];
  let totalPayments = 0;

  for (const insured of insureds) {
    if (agentName && insured.agentsName !== agentName) continue;

    let customerPaid = 0;
    let customerPaymentsDetails = [];

    insured.vehicles.forEach(vehicle => {
      vehicle.insurance.forEach(insurance => {
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const insuranceDate = new Date(insurance.insuranceStartDate);
          if (insuranceDate < start || insuranceDate > end) return;
        }

        if (insurance.paidAmount > 0) {
          customerPaid += insurance.paidAmount;
          customerPaymentsDetails.push({
            type: "Insurance Payment",
            insuranceCompany: insurance.insuranceCompany,
            insuranceType: insurance.insuranceType,
            vehiclePlate: vehicle.plateNumber,
            amount: insurance.paidAmount,
            paymentMethod: insurance.paymentMethod,
            date: insurance.insuranceStartDate
          });
        }
      });
    });

    const revenueFilter = { receivedFrom: `${insured.first_name} ${insured.last_name}` };
    if (startDate && endDate) {
      revenueFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    const revenues = await RevenueModel.find(revenueFilter);

    revenues.forEach(rev => {
      customerPaid += rev.amount;
      customerPaymentsDetails.push({
        type: "Insurance Transfer Fee",
        description: rev.description,
        amount: rev.amount,
        paymentMethod: rev.paymentMethod,
        date: rev.createdAt,
        fromVehiclePlate: rev.fromVehiclePlate || null,
        toVehiclePlate: rev.toVehiclePlate || null
      });
    });

    if (customerPaid > 0) {
      report.push({
        customer: `${insured.first_name} ${insured.last_name}`,
        totalPaid: customerPaid,
        payments: customerPaymentsDetails
      });
      totalPayments += customerPaid;
    }
  }

  logger.info("Customer payments report generated", {
    startDate,
    endDate,
    agentName,
    totalPayments,
    customerCount: report.length
  });

  return successResponse(res, {
    totalPayments,
    customerPaymentsCount: report.length,
    report
  }, "Customer payments report generated successfully");
});

export const geterredInsurancesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;

  const filter = { title: /Transfer fee for insurance/i };
  if (startDate && endDate) {
    filter.createdAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
  }
  if (agentName) {
    filter.receivedFrom = agentName;
  }

  const transferredRevenues = await RevenueModel.find(filter);

  const report = transferredRevenues.map(rev => ({
    customer: rev.receivedFrom,
    amount: rev.amount,
    paymentMethod: rev.paymentMethod,
    description: rev.description,
    date: rev.createdAt,
    fromVehiclePlate: rev.fromVehiclePlate,
    toVehiclePlate: rev.toVehiclePlate
  }));

  const totalAmount = report.reduce((acc, item) => acc + item.amount, 0);

  logger.info("Transferred insurances report generated", {
    startDate,
    endDate,
    agentName,
    totalAmount,
    count: report.length
  });

  return successResponse(res, {
    totalAmount,
    count: report.length,
    report
  }, "Transferred insurances report generated successfully");
});

export const getCancelledInsurancesReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, agentName } = req.query;

  const insureds = await insuredModel.find().select("first_name last_name agentsName vehicles.insurance vehicles.plateNumber vehicles.model");

  let report = [];
  let totalCancelledAmount = 0;

  insureds.forEach(insured => {
    if (agentName && insured.agentsName !== agentName) return;

    insured.vehicles.forEach(vehicle => {
      vehicle.insurance.forEach(insurance => {
        if (insurance.insuranceStatus !== "cancelled") return;

        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          const insuranceDate = new Date(insurance.insuranceStartDate);
          if (insuranceDate < start || insuranceDate > end) return;
        }

        report.push({
          customer: `${insured.first_name} ${insured.last_name}`,
          vehiclePlate: vehicle.plateNumber,
          vehicleModel: vehicle.model,
          insuranceCompany: insurance.insuranceCompany,
          insuranceType: insurance.insuranceType,
          totalAmount: insurance.insuranceAmount,
          paidAmount: insurance.paidAmount,
          remainingDebt: insurance.remainingDebt,
          startDate: insurance.insuranceStartDate,
          endDate: insurance.insuranceEndDate
        });

        totalCancelledAmount += insurance.insuranceAmount || 0;
      });
    });
  });

  logger.info("Cancelled insurances report generated", {
    startDate,
    endDate,
    agentName,
    totalCancelledAmount,
    count: report.length
  });

  return successResponse(res, {
    totalCancelledAmount,
    count: report.length,
    report
  }, "Cancelled insurances report generated successfully");
});
