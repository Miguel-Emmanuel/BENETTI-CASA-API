import * as Joi from "joi";
import {CurrencyE, OriginExpenseE, PaymentMethodE, TypeArticleE, UOME} from '../enums';

export const schemaAssembledProducts = Joi.object({
    assembledProduct: Joi.object({
        id: Joi.number(),
        description: Joi.string().required(),
        mainMaterial: Joi.string().required(),
        mainFinish: Joi.string().required(),
        secondaryMaterial: Joi.string().required(),
        secondaryFinishing: Joi.string().required(),
        quantity: Joi.number().positive().message('La cantidad debe ser mayor a 0.').required(),
        isActive: Joi.boolean().required(),
    }),
    document: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).required(),
})

const schemaProviderInformation = Joi.object({
    id: Joi.number(),
    providerId: Joi.number().required(),
    model: Joi.string().required(),
    originCode: Joi.string().allow(null),
    originCost: Joi.number().required(),
    currency: Joi.string().valid(...Object.values(CurrencyE)).messages({
        'any.only': `El tipo de moneda debe ser igual a uno de los valores permitidos.`
    }),
})

export const schemaCreateProduct = Joi.object({
    product: Joi.object({
        providersInformation: Joi.array().items(schemaProviderInformation).required(),
        classificationId: Joi.number().allow(null),
        lineId: Joi.number().allow(null),
        typeArticle: Joi.string().valid(...Object.values(TypeArticleE)).allow(null).allow('').messages({
            'any.only': `El tipo de articulo debe ser igual a uno de los valores permitidos.`
        }),
        name: Joi.string().required(),
        UOM: Joi.string().valid(...Object.values(UOME)).allow(null).allow('').messages({
            'any.only': `El UOM debe ser igual a uno de los valores permitidos.`
        }),
        countryOrigin: Joi.string().allow('').allow(null),
        isPurchasable: Joi.boolean().allow(null),
        isSale: Joi.boolean().allow(null),
        factor: Joi.number().allow(0).allow(null),
        discount: Joi.number().allow(0).allow(null),
        CATSAT: Joi.string().allow('').allow(null),
        tariffFraction: Joi.number().allow(0).allow(null),
        brandId: Joi.number().allow(null),
    }),
    assembledProducts: Joi.when('product.typeArticle', {is: TypeArticleE.PRODUCTO_ENSAMBLADO, then: Joi.array().items(schemaAssembledProducts).required()}),
    document: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    mainMaterialImage: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    mainFinishImage: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    secondaryMaterialImage: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    secondaryFinishingImage: Joi.object({
        id: Joi.number(),
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
})


export const schemaActivateDeactivate = Joi.object({
    activateDeactivateComment: Joi.string().required()
})


export const schemaUpdateProforma = Joi.object({
    price: Joi.number().required()
})


export const schemaCreateInternalExpenses = Joi.object({
    typesExpensesId: Joi.number().required(),
    concept: Joi.string().required(),
    originExpense: Joi.string().valid(...Object.values(OriginExpenseE)).messages({
        'any.only': `El origen del gasto debe ser igual a uno de los valores permitidos.`
    }).required(),
    projectReference: Joi.when('originExpense', {is: [OriginExpenseE.PROYECTO], then: Joi.string().required(), otherwise: Joi.forbidden()}),
    branchId: Joi.when('originExpense', {is: [OriginExpenseE.SUCURSAL], then: Joi.number().required(), otherwise: Joi.forbidden()}),
    amount: Joi.number().required(),
    expenditureDate: Joi.date().required(),
    paymentMethod: Joi.string().valid(...Object.values(PaymentMethodE)).messages({
        'any.only': `El metodo de pago debe ser igual a uno de los valores permitidos.`
    }).required(),
    provider: Joi.string().allow('').allow(null),

})
