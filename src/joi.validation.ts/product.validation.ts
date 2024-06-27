import * as Joi from "joi";
import {CurrencyE, LocationE, TypeArticleE, UOME} from '../enums';

export const schemaAssembledProducts = Joi.object({
    assembledProduct: Joi.object({
        description: Joi.string().required(),
        SKU: Joi.string().required(),
        mainMaterial: Joi.string().required(),
        mainFinish: Joi.string().required(),
        secondaryMaterial: Joi.string().required(),
        secondaryFinishing: Joi.string().required(),
        quantity: Joi.number().positive().message('La cantidad debe ser mayor a 0.').required(),
        isActive: Joi.boolean().required(),
    }),
    document: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).required(),
})

export const schemaCreateProduct = Joi.object({
    product: Joi.object({
        SKU: Joi.string().required(),
        classificationId: Joi.number().allow(null),
        lineId: Joi.number().allow(null),
        location: Joi.string().valid(...Object.values(LocationE)).allow(null).allow('').messages({
            'any.only': `El ubicación de articulo debe ser igual a uno de los valores permitidos.`
        }),
        typeArticle: Joi.string().valid(...Object.values(TypeArticleE)).allow(null).allow('').messages({
            'any.only': `El tipo de articulo debe ser igual a uno de los valores permitidos.`
        }),
        name: Joi.string().required(),
        description: Joi.string().allow('').allow(null),
        UOM: Joi.string().valid(...Object.values(UOME)).allow(null).allow('').messages({
            'any.only': `El UOM debe ser igual a uno de los valores permitidos.`
        }),
        mainMaterial: Joi.string().allow('').allow(null),
        mainFinish: Joi.string().allow('').allow(null),
        secondaryMaterial: Joi.string().allow('').allow(null),
        secondaryFinishing: Joi.string().allow('').allow(null),
        countryOrigin: Joi.string().allow('').allow(null),
        isPurchasable: Joi.boolean().allow(null),
        providerId: Joi.number().allow(null),
        model: Joi.string().allow('').allow(null),
        originCode: Joi.string().allow('').allow(null),
        currency: Joi.string().valid(...Object.values(CurrencyE)).allow(null).allow('').messages({
            'any.only': `El moneda de compra debe ser igual a uno de los valores permitidos.`
        }),
        isSale: Joi.boolean().allow(null),
        factor: Joi.number().allow(0).allow(null),
        price: Joi.number().allow(0).allow(null),
        listPrice: Joi.number().allow(0).allow(null),
        discount: Joi.number().allow(0).allow(null),
        CATSAT: Joi.string().allow('').allow(null),
        tariffFraction: Joi.number().allow(0).allow(null),
        brandId: Joi.number().allow(null),
    }),
    assembledProducts: Joi.when('product.typeArticle', {is: TypeArticleE.PRODUCTO_ENSAMBLADO, then: Joi.array().items(schemaAssembledProducts)}).optional().allow(null),
    document: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    mainMaterialImage: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    mainFinishImage: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    secondaryMaterialImage: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
    secondaryFinishingImage: Joi.object({
        fileURL: Joi.string().required(),
        name: Joi.string().required(),
        extension: Joi.string().required(),
    }).optional().allow(null),
})


export const schemaActivateDeactivate = Joi.object({
    activateDeactivateComment: Joi.string().required()
})
