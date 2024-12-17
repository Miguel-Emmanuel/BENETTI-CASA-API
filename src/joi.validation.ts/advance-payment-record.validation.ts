import * as Joi from "joi";
import {AdvancePaymentStatusE, ExchangeRateE, PaymentTypeProofE, ProductTypeE, TypeAdvancePaymentRecordE} from '../enums';
export const documents = Joi.object({
    id: Joi.number(),
    fileURL: Joi.string().required(),
    name: Joi.string().required(),
    extension: Joi.string().required(),
})
export const schameCreateAdvancePayment = Joi.object({
    paymentDate: Joi.date().required(),
    paymentMethod: Joi.string().valid(...Object.values(PaymentTypeProofE)).messages({
        'any.only': `El metodo de pago debe ser igual a uno de los valores permitidos.`
    }).required(),
    productType: Joi.string().valid(...Object.values(ProductTypeE)).messages({
        'any.only': `El tipo de producto debe ser igual a uno de los valores permitidos.`
    }).required(),
    amountPaid: Joi.number().required(),
    paymentCurrency: Joi.string().valid(...Object.values(ExchangeRateE)).messages({
        'any.only': `La moneda de pago debe ser igual a uno de los valores permitidos.`
    }).required(),
    parity: Joi.number().required(),
    projectId: Joi.number().required(),
    percentageIva: Joi.number().required(),
    accountsReceivableId: Joi.number().required(),
    currencyApply: Joi.string().required(),
    conversionAmountPaid: Joi.number().required(),
    subtotalAmountPaid: Joi.number().required(),
    paymentPercentage: Joi.number().required(),
    type: Joi.string().valid(...Object.values(TypeAdvancePaymentRecordE)).messages({
        'any.only': `El tipo de cobro debe ser igual a uno de los valores permitidos.`
    }).required(),
    vouchers: Joi.array().items(documents).optional(),
    salesDeviation: Joi.number().required(),
    status: Joi.string().optional(),
})

export const schameCreateAdvancePaymentUpdate = Joi.object({
    status: Joi.string().valid(...Object.values(AdvancePaymentStatusE)).messages({
        'any.only': `El status debe ser igual a uno de los valores permitidos.`
    }),
    paymentDate: Joi.date().required(),
    paymentMethod: Joi.string().valid(...Object.values(PaymentTypeProofE)).messages({
        'any.only': `El metodo de pago debe ser igual a uno de los valores permitidos.`
    }).required(),
    amountPaid: Joi.number().required(),
    productType: Joi.string().valid(...Object.values(ProductTypeE)).messages({
        'any.only': `El tipo de producto debe ser igual a uno de los valores permitidos.`
    }).required(),
    paymentCurrency: Joi.string().valid(...Object.values(ExchangeRateE)).messages({
        'any.only': `La moneda de pago debe ser igual a uno de los valores permitidos.`
    }).required(),
    parity: Joi.number().required(),
    projectId: Joi.number().required(),
    percentageIva: Joi.number().required(),
    accountsReceivableId: Joi.number().required(),
    currencyApply: Joi.string().required(),
    conversionAmountPaid: Joi.number().required(),
    subtotalAmountPaid: Joi.number().required(),
    paymentPercentage: Joi.number().required(),
    type: Joi.string().valid(...Object.values(TypeAdvancePaymentRecordE)).messages({
        'any.only': `El tipo de cobro debe ser igual a uno de los valores permitidos.`
    }).required(),
    vouchers: Joi.array().items(documents).optional(),
    salesDeviation: Joi.number().required(),
})
