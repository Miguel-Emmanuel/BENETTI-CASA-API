import { /* inject, */ BindingScope, inject, injectable} from '@loopback/core';
import {Filter, FilterExcludingWhere, InclusionFilter, Where, repository} from '@loopback/repository';
import BigNumber from 'bignumber.js';
import {AdvancePaymentStatusE, CurrencyE, ExchangeRateQuotationE, ProductTypeE, ProformaCurrencyE, PurchaseOrdersStatus} from '../enums';
import {schameCreateAdvancePayment, schameCreateAdvancePaymentUpdate} from '../joi.validation.ts/advance-payment-record.validation';
import {ResponseServiceBindings, SendgridServiceBindings} from '../keys';
import {AccountsReceivableWithRelations, AdvancePaymentRecord, AdvancePaymentRecordCreate, Quotation, QuotationProducts, QuotationProductsWithRelations} from '../models';
import {DocumentSchema} from '../models/base/document.model';
import {AccountsReceivableRepository, AdvancePaymentRecordRepository, DocumentRepository, ProformaRepository, ProjectRepository, PurchaseOrdersRepository, QuotationProductsRepository, QuotationRepository, UserRepository} from '../repositories';
import {ResponseService} from './response.service';
import {SendgridService, SendgridTemplates} from './sendgrid.service';

@injectable({scope: BindingScope.TRANSIENT})
export class AdvancePaymentRecordService {
    constructor(
        @repository(AdvancePaymentRecordRepository)
        public advancePaymentRecordRepository: AdvancePaymentRecordRepository,
        @repository(AccountsReceivableRepository)
        public accountsReceivableRepository: AccountsReceivableRepository,
        @inject(ResponseServiceBindings.RESPONSE_SERVICE)
        public responseService: ResponseService,
        @repository(DocumentRepository)
        public documentRepository: DocumentRepository,
        @repository(UserRepository)
        public userRepository: UserRepository,
        @repository(ProjectRepository)
        public projectRepository: ProjectRepository,
        @repository(QuotationRepository)
        public quotationRepository: QuotationRepository,
        @repository(PurchaseOrdersRepository)
        public purchaseOrdersRepository: PurchaseOrdersRepository,
        @repository(QuotationProductsRepository)
        public quotationProductsRepository: QuotationProductsRepository,
        @repository(ProformaRepository)
        public proformaRepository: ProformaRepository,
        @inject(SendgridServiceBindings.SENDGRID_SERVICE)
        public sendgridService: SendgridService,
    ) { }


    async create(advancePaymentRecord: Omit<AdvancePaymentRecordCreate, 'id'>,) {
        try {
            await this.validateBodyAdvancePayment(advancePaymentRecord);
            const {accountsReceivableId, vouchers} = advancePaymentRecord;
            const accountsReceivable = await this.findAccountReceivable(accountsReceivableId);
            const {advancePaymentRecords} = accountsReceivable;
            let consecutiveId = 1;
            if (advancePaymentRecords?.length > 0)
                consecutiveId = advancePaymentRecords[0].consecutiveId + 1

            delete advancePaymentRecord?.vouchers;
            const advancePaymentRecordRes = await this.advancePaymentRecordRepository.create({...advancePaymentRecord, consecutiveId});

            await this.createDocuments(advancePaymentRecordRes.id, vouchers);
            return advancePaymentRecordRes;
        } catch (error) {
            throw this.responseService.badRequest(error.message ?? error);
        }
    }

    async createDocuments(advancePaymentRecordId: number, documents?: DocumentSchema[]) {
        if (documents)
            for (let index = 0; index < documents?.length; index++) {
                const {fileURL, name, extension, id} = documents[index];
                if (id)
                    await this.documentRepository.updateById(id, {...documents[index]});
                else
                    await this.advancePaymentRecordRepository.documents(advancePaymentRecordId).create({fileURL, name, extension})

            }
    }

    async count(where?: Where<AdvancePaymentRecord>,) {
        return this.advancePaymentRecordRepository.count(where);
    }
    async find(filter?: Filter<AdvancePaymentRecord>,) {
        return this.advancePaymentRecordRepository.find(filter);
    }

    async findById(id: number, filter?: FilterExcludingWhere<AdvancePaymentRecord>) {
        await this.findAdvancePayment(id);
        const include: InclusionFilter[] = [
            {
                relation: 'documents',
                scope: {
                    fields: ['id', 'createdAt', 'createdBy', 'fileURL', 'name', 'extension', 'advancePaymentRecordId', 'updatedBy', 'updatedAt']
                }
            },
            {
                relation: 'accountsReceivable',
                scope: {
                    fields: ['id', 'totalSale']
                }
            },

        ]
        if (filter?.include)
            filter.include = [
                ...filter.include,
                ...include
            ]
        else
            filter = {
                ...filter, include: [
                    ...include,
                ]
            };
        const advancePaymentRecord = await this.advancePaymentRecordRepository.findById(id, filter);

        for (let index = 0; index < advancePaymentRecord?.documents?.length; index++) {
            const document = advancePaymentRecord?.documents[index];
            if (document) {
                const element: any = document;
                const createdBy = await this.userRepository.findByIdOrDefault(element.createdBy);
                const updatedBy = await this.userRepository.findByIdOrDefault(element.updatedBy);
                element.createdBy = {id: createdBy?.id, avatar: createdBy?.avatar, name: createdBy && `${createdBy?.firstName} ${createdBy?.lastName}`};
                element.updatedBy = {id: updatedBy?.id, avatar: updatedBy?.avatar, name: updatedBy && `${updatedBy?.firstName} ${updatedBy?.lastName}`};
            }
        }
        return advancePaymentRecord
    }

    async updateById(id: number, advancePaymentRecord: AdvancePaymentRecordCreate,) {
        const payment = await this.findAdvancePayment(id);
        await this.validateBodyAdvancePaymentUpdate(advancePaymentRecord);
        if (payment.status === AdvancePaymentStatusE.PAGADO)
            throw this.responseService.badRequest("El cobro ya fue pagado y no puede actualizarse.");

        const {vouchers, status, salesDeviation, productType} = advancePaymentRecord;
        const {conversionAmountPaid, accountsReceivable, projectId} = payment;


        let {totalSale, totalPaid, updatedTotal, typeCurrency} = accountsReceivable;

        if (salesDeviation > 0) {
            const updatedTotalNew = totalSale + salesDeviation;
            updatedTotal = updatedTotalNew
            await this.accountsReceivableRepository.updateById(accountsReceivable.id, {updatedTotal: this.roundToTwoDecimals(updatedTotalNew)})
        }

        if (status && status === AdvancePaymentStatusE.PAGADO) {
            const {balance: balanceOld} = await this.accountsReceivableRepository.findById(accountsReceivable.id);
            let totalVenta = totalSale;
            if (updatedTotal > 0)
                totalVenta = updatedTotal;

            const balance = balanceOld - conversionAmountPaid;
            const totalPaidNew = this.roundToTwoDecimals(totalPaid + conversionAmountPaid);
            await this.accountsReceivableRepository.updateById(accountsReceivable.id, {balance: this.roundToTwoDecimals(balance), totalPaid: totalPaidNew})
            await this.createPurchaseOrders(projectId, accountsReceivable.id, totalPaidNew, typeCurrency,)
            await this.validatePaid(accountsReceivable, totalPaidNew, totalSale, productType);
        }
        delete advancePaymentRecord?.vouchers;
        await this.createDocuments(id, vouchers);
        await this.advancePaymentRecordRepository.updateById(id, {...advancePaymentRecord});
        return this.responseService.ok({message: '¡En hora buena! La acción se ha realizado con éxito.'});
    }

    async validatePaid(accountsReceivable: AccountsReceivableWithRelations, totalPaid: number, total: number, productType: ProductTypeE) {
        if (totalPaid >= total) {
            const {project} = accountsReceivable;
            const {projectId, quotation, customer} = project;
            const {mainProjectManager, quotationProducts} = quotation;
            await this.accountsReceivableRepository.updateById(accountsReceivable.id, {isPaid: true});

            if (productType === ProductTypeE.STOCK)
                await this.notifyStock(mainProjectManager.email, projectId, customer.name, quotationProducts);
            else
                await this.notifyPedido(mainProjectManager.email, projectId, customer.name, quotationProducts);
        }
    }

    async notifyPedido(email: string, projectId: string, customerName: string, quotationProducts: QuotationProductsWithRelations[]) {
        const options = {
            to: email,
            templateId: SendgridTemplates.NOTIFICATION_PRODUCT_PEDIDO.id,
            dynamicTemplateData: {
                subject: SendgridTemplates.NOTIFICATION_PRODUCT_PEDIDO.subject,
                projectId,
                customerName,
                products: quotationProducts?.map((value: QuotationProducts & QuotationProductsWithRelations) => {
                    const {id: productId, product, mainMaterial, mainFinish, secondaryMaterial, secondaryFinishing, } = value;
                    const {document, line, name} = product;
                    const descriptionParts = [
                        line?.name,
                        name,
                        mainMaterial,
                        mainFinish,
                        secondaryMaterial,
                        secondaryFinishing
                    ];
                    const description = descriptionParts.filter(part => part !== null && part !== undefined && part !== '').join(' ');
                    return {
                        id: productId,
                        name: name,
                        image: document?.fileURL,
                        description,
                    }
                })
            }
        };
        await this.sendgridService.sendNotification(options);
    }

    async notifyStock(email: string, projectId: string, customerName: string, quotationProducts: QuotationProductsWithRelations[]) {
        const users = await this.userRepository.find({where: {isLogistics: true}})
        const emails = users.map(value => value.email);
        for (let index = 0; index < emails?.length; index++) {
            const elementMail = emails[index];
            const options = {
                to: elementMail,
                templateId: SendgridTemplates.NOTIFICATION_PRODUCT_STOCK.id,
                dynamicTemplateData: {
                    subject: SendgridTemplates.NOTIFICATION_PRODUCT_STOCK.subject,
                    projectId,
                    customerName,
                    products: quotationProducts?.map((value: QuotationProducts & QuotationProductsWithRelations) => {
                        const {id: productId, product, mainMaterial, mainFinish, secondaryMaterial, secondaryFinishing, } = value;
                        const {document, line, name} = product;
                        const descriptionParts = [
                            line?.name,
                            name,
                            mainMaterial,
                            mainFinish,
                            secondaryMaterial,
                            secondaryFinishing
                        ];
                        const description = descriptionParts.filter(part => part !== null && part !== undefined && part !== '').join(' ');
                        return {
                            id: productId,
                            name: name,
                            image: document?.fileURL,
                            description,
                        }
                    })
                }
            };
            await this.sendgridService.sendNotification(options);
        }
    }


    roundToTwoDecimals(num: number): number {
        return Number(new BigNumber(num).toFixed(2));
    }

    async deleteById(id: number) {
        await this.advancePaymentRecordRepository.deleteById(id);
    }



    async createPurchaseOrders(projectId: number, accountsReceivableId: number, totalPaid: number, typeCurrency: string) {
        const findProjectQuotation = await this.findProjectQuotation(projectId)

        const {id: quotationId} = findProjectQuotation.quotation
        const {advance} = this.getPricesQuotation(findProjectQuotation.quotation);

        if (advance && totalPaid >= advance) {
            // await this.findProjectProforma(projectId, accountsReceivableId, quotationId, typeCurrency)
            await this.createPurchaseOrderPaid(projectId, accountsReceivableId, quotationId, typeCurrency);
        }
    }

    async findProjectQuotation(id: number) {

        const findProjectQuotation = await this.projectRepository.findOne({where: {id}, include: [{relation: "quotation"}]})
        if (!findProjectQuotation)
            throw this.responseService.badRequest("El proyecto no existe.");
        return findProjectQuotation
    }

    async createPurchaseOrderPaid(projectId: number, accountsReceivableId: number, quotationId: number, typeCurrency: string) {
        /**
         * Buscar dentro de cotizacion para sabes si es isFractionate
         * Si no es fraccionada
         * entonces buscares con un find las proformas donde el projectId
         * despues de consultar cada proforma traero su cuenta por pagar y buscare si la cuenta por pagar ya tiene una orden de compra, si no le voy a crear una
         *
         * Si es fraccionada
         * entonces tomare el typeCurrency de account-receible (cuenta por cobrar)
         * buscares con un find las proformas donde el projectId y el currency sea igual a typeCurrency de account-receible
         * me traera solo una proforma y su accoun payable (cuenta por pagar)
         * despues de consultar cada proforma traero su cuenta por pagar y buscare si la cuenta por pagar ya tiene una orden de compra, si no le voy a crear una
         */

        const quotation = await this.quotationRepository.findById(quotationId);
        if (quotation.isFractionate) {
            // const cuentaPorCobrar = await this.accountsReceivableRepository.findOne({where: {quotationId: quotation.id, typeCurrency}});
            const proforma = await this.proformaRepository.findOne({where: {projectId, currency: typeCurrency === ExchangeRateQuotationE.EUR ? ProformaCurrencyE.EURO : typeCurrency === ExchangeRateQuotationE.MXN ? ProformaCurrencyE.PESO_MEXICANO : ProformaCurrencyE.USD}, include: [{relation: "accountPayable"}, {relation: "purchaseOrders"}]})
            if (proforma && proforma?.accountPayable && !proforma?.purchaseOrders) {
                const purchaseorder = await this.purchaseOrdersRepository.create({accountPayableId: proforma.accountPayable.id, status: PurchaseOrdersStatus.NUEVA, proformaId: proforma.id, accountsReceivableId, projectId}, /*{transaction}*/)
                const findQuotationProducts = await this.quotationProductsRepository.find({
                    where: {
                        proformaId: proforma.id,
                        providerId: proforma.providerId,
                        brandId: proforma.brandId
                    }
                })
                for (let index = 0; index < findQuotationProducts?.length; index++) {
                    const element = findQuotationProducts[index];
                    await this.quotationProductsRepository.updateById(element.id, {purchaseOrdersId: purchaseorder.id});
                }
            }
        } else {
            const proformas = await this.proformaRepository.find({where: {projectId}, include: [{relation: "accountPayable"}, {relation: "purchaseOrders"}]})
            for (let index = 0; index < proformas.length; index++) {
                const element = proformas[index];
                if (element && element?.accountPayable && !element?.purchaseOrders) {
                    const purchaseorder = await this.purchaseOrdersRepository.create({accountPayableId: element.accountPayable.id, status: PurchaseOrdersStatus.NUEVA, proformaId: element.id, accountsReceivableId, projectId}, /*{transaction}*/)
                    const findQuotationProducts = await this.quotationProductsRepository.find({
                        where: {
                            proformaId: element.id,
                            providerId: element.providerId,
                            brandId: element.brandId
                        }
                    })
                    for (let index = 0; index < findQuotationProducts?.length; index++) {
                        const element = findQuotationProducts[index];
                        await this.quotationProductsRepository.updateById(element.id, {purchaseOrdersId: purchaseorder.id});
                    }
                }
            }
        }

    }

    async findProjectProforma(projectId: number, accountsReceivableId: number, quotationId: number, typeCurrency: any) {
        //cotizacion where projectid, includes cotizacionproducti filtrar por currency tomar brand y provider, proformaid
        //cada ordern de compra guardar el id de cuentas por cobrar (Accounts-receivlables (al padre))

        const newCurrency = typeCurrency === ExchangeRateQuotationE.USD ? CurrencyE.USD :
            typeCurrency === ExchangeRateQuotationE.MXN ? CurrencyE.PESO_MEXICANO : CurrencyE.EURO


        const findQuotationProduct = await this.quotationProductsRepository.findOne({
            where: {
                and: [
                    {quotationId: quotationId},
                    {currency: newCurrency}
                ]
            }
        })

        if (findQuotationProduct && findQuotationProduct.proformaId) {
            const findProforma = await this.findProforma(findQuotationProduct.proformaId)

            if (findProforma && findProforma?.accountPayable && !findProforma?.purchaseOrders) {
                const purchaseorder = await this.purchaseOrdersRepository.create({accountPayableId: findProforma.accountPayable.id, status: PurchaseOrdersStatus.NUEVA, proformaId: findQuotationProduct.proformaId, accountsReceivableId, projectId}, /*{transaction}*/)
                const findQuotationProducts = await this.quotationProductsRepository.find({
                    where: {
                        proformaId: findProforma.id,
                        providerId: findProforma.providerId,
                        brandId: findProforma.brandId
                    }
                })
                for (let index = 0; index < findQuotationProducts?.length; index++) {
                    const element = findQuotationProducts[index];
                    await this.quotationProductsRepository.updateById(element.id, {purchaseOrdersId: purchaseorder.id});
                }
            }
        }
    }

    async findAdvancePayment(id: number) {
        const advancePaymentRecord = await this.advancePaymentRecordRepository.findOne({
            where: {id},
            include: [
                {
                    relation: 'accountsReceivable',
                    scope: {
                        include: [
                            {
                                relation: 'project',
                                scope: {
                                    include: [
                                        {
                                            relation: 'quotation',
                                            scope: {
                                                include: [
                                                    {
                                                        relation: 'mainProjectManager'
                                                    },
                                                    {
                                                        relation: 'quotationProducts',
                                                        scope: {
                                                            include: [
                                                                {
                                                                    relation: 'product',
                                                                    scope: {
                                                                        include: [
                                                                            {
                                                                                relation: 'document'
                                                                            },
                                                                            {
                                                                                relation: 'line'
                                                                            }
                                                                        ]
                                                                    }
                                                                }
                                                            ],
                                                        }
                                                    }
                                                ]
                                            }
                                        },
                                        {
                                            relation: 'customer'
                                        }
                                    ]
                                }
                            }
                        ]
                    }
                },

            ]
        });
        if (!advancePaymentRecord)
            throw this.responseService.badRequest("Cobro no existe.");
        return advancePaymentRecord;
    }
    async findProforma(id: number) {
        const findProforma = await this.proformaRepository.findOne({where: {id}, include: [{relation: "accountPayable"}, {relation: "purchaseOrders"}]});
        return findProforma;
    }

    async findAccountReceivable(id: number) {
        const accountsReceivable = await this.accountsReceivableRepository.findOne({where: {id}, include: [{relation: 'advancePaymentRecords', scope: {order: ['consecutiveId DESC']}}]});
        if (!accountsReceivable)
            throw this.responseService.badRequest("Cuenta por cobrar no existe.");
        return accountsReceivable;
    }

    async validateBodyAdvancePayment(advancePaymentRecord: Omit<AdvancePaymentRecordCreate, 'id'>,) {
        try {
            await schameCreateAdvancePayment.validateAsync(advancePaymentRecord);
        }
        catch (err) {
            const {details} = err;
            const {context: {key}, message} = details[0];

            if (message.includes('is required') || message.includes('is not allowed to be empty'))
                throw this.responseService.unprocessableEntity(`${key} es requerido.`)
            throw this.responseService.unprocessableEntity(message)
        }
    }

    async validateBodyAdvancePaymentUpdate(advancePaymentRecord: Omit<AdvancePaymentRecordCreate, 'id'>,) {
        try {
            await schameCreateAdvancePaymentUpdate.validateAsync(advancePaymentRecord);
        }
        catch (err) {
            const {details} = err;
            const {context: {key}, message} = details[0];

            if (message.includes('is required') || message.includes('is not allowed to be empty'))
                throw this.responseService.unprocessableEntity(`${key} es requerido.`)
            throw this.responseService.unprocessableEntity(message)
        }
    }

    getPricesQuotation(quotation: Quotation) {
        const {exchangeRateQuotation, } = quotation;
        if (exchangeRateQuotation === ExchangeRateQuotationE.EUR) {
            const {subtotalEUR, percentageAdditionalDiscount, additionalDiscountEUR, percentageIva, ivaEUR, totalEUR, percentageAdvanceEUR,
                advanceEUR, exchangeRate, advanceCustomerEUR, conversionAdvanceEUR, balanceEUR, exchangeRateAmountEUR} = quotation
            const body = {
                subtotal: subtotalEUR,
                percentageAdditionalDiscount: percentageAdditionalDiscount,
                additionalDiscount: additionalDiscountEUR,
                percentageIva: percentageIva,
                iva: ivaEUR,
                total: totalEUR,
                percentageAdvance: percentageAdvanceEUR,
                advance: advanceEUR,
                exchangeRate: exchangeRate,
                exchangeRateAmount: exchangeRateAmountEUR,
                advanceCustomer: advanceCustomerEUR,
                conversionAdvance: conversionAdvanceEUR,
                balance: balanceEUR,
            }
            return body;
        } else if (exchangeRateQuotation === ExchangeRateQuotationE.USD) {
            const {subtotalUSD, percentageAdditionalDiscount, additionalDiscountUSD, percentageIva, ivaUSD, totalUSD, percentageAdvanceUSD,
                advanceUSD, exchangeRate, advanceCustomerUSD, conversionAdvanceUSD, balanceUSD, exchangeRateAmountUSD} = quotation
            const body = {
                subtotal: subtotalUSD,
                percentageAdditionalDiscount: percentageAdditionalDiscount,
                additionalDiscount: additionalDiscountUSD,
                percentageIva: percentageIva,
                iva: ivaUSD,
                total: totalUSD,
                percentageAdvance: percentageAdvanceUSD,
                advance: advanceUSD,
                exchangeRate: exchangeRate,
                exchangeRateAmount: exchangeRateAmountUSD,
                advanceCustomer: advanceCustomerUSD,
                conversionAdvance: conversionAdvanceUSD,
                balance: balanceUSD,
            }
            return body;
        } else if (exchangeRateQuotation === ExchangeRateQuotationE.MXN) {
            const {subtotalMXN, percentageAdditionalDiscount, additionalDiscountMXN, percentageIva, ivaMXN, totalMXN, percentageAdvanceMXN,
                advanceMXN, exchangeRate, advanceCustomerMXN, conversionAdvanceMXN, balanceMXN, exchangeRateAmountMXN} = quotation
            const body = {
                subtotal: subtotalMXN,
                percentageAdditionalDiscount: percentageAdditionalDiscount,
                additionalDiscount: additionalDiscountMXN,
                percentageIva: percentageIva,
                iva: ivaMXN,
                total: totalMXN,
                percentageAdvance: percentageAdvanceMXN,
                advance: advanceMXN,
                exchangeRate: exchangeRate,
                exchangeRateAmount: exchangeRateAmountMXN,
                advanceCustomer: advanceCustomerMXN,
                conversionAdvance: conversionAdvanceMXN,
                balance: balanceMXN,
            }
            return body;
        }
        const body = {
            subtotal: null,
            percentageAdditionalDiscount: null,
            additionalDiscount: null,
            percentageIva: null,
            iva: null,
            total: null,
            percentageAdvance: null,
            advance: null,
            exchangeRate: null,
            exchangeRateAmount: null,
            advanceCustomer: null,
            conversionAdvance: null,
            balance: null,
        }
        return body;
    }
}
