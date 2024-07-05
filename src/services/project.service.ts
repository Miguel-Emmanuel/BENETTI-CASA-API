import { /* inject, */ BindingScope, inject, injectable, service} from '@loopback/core';
import {Filter, FilterExcludingWhere, InclusionFilter, Where, repository} from '@loopback/repository';
import {SecurityBindings, UserProfile} from '@loopback/security';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import fs from "fs/promises";
import {AccessLevelRolE, AdvancePaymentTypeE, ExchangeRateE, ExchangeRateQuotationE, PaymentTypeProofE, QuotationProductStatusE, TypeAdvancePaymentRecordE, TypeArticleE} from '../enums';
import {ResponseServiceBindings} from '../keys';
import {Project, Quotation} from '../models';
import {AccountsReceivableRepository, AdvancePaymentRecordRepository, BranchRepository, CommissionPaymentRecordRepository, DocumentRepository, ProjectRepository, QuotationDesignerRepository, QuotationProductsRepository, QuotationProjectManagerRepository, QuotationRepository} from '../repositories';
import {LetterNumberService} from './letter-number.service';
import {PdfService} from './pdf.service';
import {ResponseService} from './response.service';
@injectable({scope: BindingScope.TRANSIENT})
export class ProjectService {
    constructor(
        @repository(ProjectRepository)
        public projectRepository: ProjectRepository,
        @repository(AdvancePaymentRecordRepository)
        public advancePaymentRecordRepository: AdvancePaymentRecordRepository,
        @repository(QuotationRepository)
        public quotationRepository: QuotationRepository,
        @repository(CommissionPaymentRecordRepository)
        public commissionPaymentRecordRepository: CommissionPaymentRecordRepository,
        @inject(ResponseServiceBindings.RESPONSE_SERVICE)
        public responseService: ResponseService,
        @repository(QuotationProjectManagerRepository)
        public quotationProjectManagerRepository: QuotationProjectManagerRepository,
        @repository(QuotationDesignerRepository)
        public quotationDesignerRepository: QuotationDesignerRepository,
        @repository(BranchRepository)
        public branchRepository: BranchRepository,
        @repository(QuotationProductsRepository)
        public quotationProductsRepository: QuotationProductsRepository,
        @service()
        public pdfService: PdfService,
        @inject(SecurityBindings.USER)
        private user: UserProfile,
        @service()
        public letterNumberService: LetterNumberService,
        @repository(DocumentRepository)
        public documentRepository: DocumentRepository,
        @repository(AccountsReceivableRepository)
        public accountsReceivableRepository: AccountsReceivableRepository,
    ) { }

    async create(body: {quotationId: number}, transaction: any) {
        const {quotationId} = body;
        const quotation = await this.findQuotationById(quotationId);
        const project = await this.createProject({quotationId, branchId: quotation.branchId, customerId: quotation?.customerId}, transaction);
        await this.changeStatusProductsToPedido(quotationId, transaction);
        await this.createAdvancePaymentRecord(quotation, project.id, transaction)
        await this.createCommissionPaymentRecord(quotation, project.id, quotationId, transaction)
        await this.createPdfToCustomer(quotationId, project.id, transaction);
        await this.createPdfToProvider(quotationId, project.id, transaction);
        await this.createPdfToAdvance(quotationId, project.id, transaction);
        return project;

    }

    async count(where?: Where<Project>,) {
        return this.projectRepository.count(where);
    }

    async find(filter?: Filter<Project>,) {
        const accessLevel = this.user.accessLevel;
        let where: any = {};
        if (accessLevel === AccessLevelRolE.SUCURSAL) {
            where = {...where, branchId: this.user.branchId}
        }

        if (accessLevel === AccessLevelRolE.PERSONAL) {
            const quotations = (await this.quotationRepository.find({where: {mainProjectManagerId: this.user.id}})).map(value => value.id);
            where = {...where, quotationId: {inq: [...quotations]}}
        }

        if (filter?.where) {
            filter.where = {...filter.where, ...where}
        } else {
            filter = {...filter, where: {...where}};
        }

        const include = [
            {
                relation: 'quotation',
                scope: {
                    fields: ['id', 'mainProjectManagerId', 'mainProjectManagerClassificationId', 'mainProjectManager', 'customerId', 'branchId', 'exchangeRateQuotation', 'totalEUR', 'totalMXN', 'totalUSD', 'closingDate', 'mainProjectManagerId', 'mainProjectManagerClassificationId'],
                    include: [
                        {
                            relation: 'mainProjectManager',
                            scope: {
                                fields: ['id', 'firstName', 'lastName']
                            }
                        }
                    ]
                }
            },
            {
                relation: 'customer',
                scope: {
                    fields: ['id', 'name', 'lastName'],
                }
            },
            {
                relation: 'branch',
                scope: {
                    fields: ['id', 'name'],
                }
            }
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
        const projects = await this.projectRepository.find(filter);
        return projects.map(value => {
            const {id, projectId, customer, branch, quotation, status, branchId} = value;
            const {mainProjectManager, exchangeRateQuotation, closingDate, mainProjectManagerId, mainProjectManagerClassificationId} = quotation;
            return {
                id,
                projectId,
                customerName: `${customer?.name} ${customer?.lastName ?? ''}`,
                projectManager: `${mainProjectManager?.firstName} ${mainProjectManager?.lastName ?? ''}`,
                branch: branch?.name,
                total: this.getTotalQuotation(exchangeRateQuotation, quotation),
                status,
                closingDate,
                branchId,
                mainProjectManagerId,
                mainProjectManagerClassificationId
            }
        })
    }

    async findById(id: number, filter?: FilterExcludingWhere<Project>) {
        const include: InclusionFilter[] = [
            {
                relation: 'quotation',
                scope: {
                    fields: ['id', 'mainProjectManagerId', 'mainProjectManagerClassificationId', 'mainProjectManager', 'customerId', 'branchId', 'exchangeRateQuotation', 'totalEUR', 'totalMXN', 'totalUSD', 'closingDate', 'balanceMXN', 'balanceUSD', 'balanceEUR'],
                    include: [
                        {
                            relation: 'mainProjectManager',
                            scope: {
                                fields: ['id', 'firstName', 'lastName']
                            }
                        },
                        {
                            relation: 'products',
                            scope: {
                                include: ['brand', 'document', 'mainFinishImage', 'quotationProducts', 'provider', 'secondaryFinishingImage']
                            }
                        },
                    ]
                }
            },
            {
                relation: 'customer',
                scope: {
                    fields: ['id', 'name', 'lastName'],
                }
            },
            {
                relation: 'advancePaymentRecords',
            },
            {
                relation: 'clientQuoteFile',
            },
            {
                relation: 'providerFile',
            },
            {
                relation: 'advanceFile',
            },
            {
                relation: 'documents',
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
        const project = await this.projectRepository.findById(id, filter);
        const {customer, quotation, advancePaymentRecords, clientQuoteFile, providerFile, advanceFile, documents} = project;
        const {closingDate, products, exchangeRateQuotation} = quotation;
        const {subtotal, additionalDiscount, percentageIva, iva, total, advance, exchangeRate, balance, percentageAdditionalDiscount, advanceCustomer, conversionAdvance} = this.getPricesQuotation(quotation);
        const productsArray = [];
        for (const iterator of products ?? []) {
            productsArray.push({
                id: iterator?.id,
                image: iterator?.document ? iterator?.document?.fileURL : '',
                brandName: iterator?.brand?.brandName ?? '',
                description: iterator?.description,
                price: iterator?.price,
                listPrice: iterator?.listPrice,
                factor: iterator?.factor,
                quantity: iterator?.quotationProducts?.quantity,
                provider: iterator?.provider?.name,
                status: iterator?.status,
                mainFinish: iterator?.mainFinish,
                mainFinishImage: iterator?.mainFinishImage?.fileURL,
                secondaryFinishing: iterator?.secondaryFinishing,
                secondaryFinishingImage: iterator?.secondaryFinishingImage?.fileURL,
            })
        }
        return {
            id,
            customerName: `${customer?.name} ${customer?.lastName}`,
            closingDate,
            total,
            totalPay: advanceCustomer,
            balance,
            products: productsArray,
            advancePaymentRecords,
            exchangeRateQuotation,
            files: {
                clientQuoteFile: {
                    fileURL: clientQuoteFile?.fileURL,
                    name: clientQuoteFile?.name,
                    createdAt: clientQuoteFile?.createdAt,
                    extension: clientQuoteFile?.extension,
                },
                providerFile:
                {
                    fileURL: providerFile?.fileURL,
                    name: providerFile?.name,
                    createdAt: providerFile?.createdAt,
                    extension: providerFile?.extension,
                },
                advanceFile: advanceFile?.map(value => {return {fileURL: value.fileURL, name: value?.name, createdAt: value?.createdAt, extension: value?.extension, }}),
                documents: documents?.map(value => {return {fileURL: value.fileURL, name: value?.name, createdAt: value?.createdAt, id: value?.id, extension: value?.extension}}),
            }
        }
    }

    async getDocuments(id: number) {
        const include: InclusionFilter[] = [
            {
                relation: 'clientQuoteFile',
            },
            {
                relation: 'providerFile',
            },
            {
                relation: 'advanceFile',
            },
            {
                relation: 'documents',
            },
        ]
        const project = await this.projectRepository.findById(id, {include: [...include]});
        const {clientQuoteFile, providerFile, advanceFile, documents} = project;
        return {
            id,
            clientQuoteFile: {
                fileURL: clientQuoteFile?.fileURL,
                name: clientQuoteFile?.name,
                createdAt: clientQuoteFile?.createdAt,
                extension: clientQuoteFile?.extension,
            },
            providerFile:
            {
                fileURL: providerFile?.fileURL,
                name: providerFile?.name,
                createdAt: providerFile?.createdAt,
                extension: providerFile?.extension,
            },
            advanceFile: advanceFile?.map(value => {return {fileURL: value.fileURL, name: value?.name, createdAt: value?.createdAt, extension: value?.extension, }}),
            documents: documents?.map(value => {return {fileURL: value.fileURL, name: value?.name, createdAt: value?.createdAt, id: value?.id, extension: value?.extension, }}),
        }
    }

    async updateById(id: number, project: Project,) {
        await this.projectRepository.updateById(id, project);
    }

    async uploadDocuments(id: number, data: {document: {fileURL: string, name: string, extension: string, id?: number}[]},) {
        await this.findByIdProject(id);
        const {document} = data
        for (let index = 0; index < document?.length; index++) {
            const element = document[index];
            if (element && !element?.id) {
                await this.projectRepository.documents(id).create(element);
            } else if (document) {
                await this.documentRepository.updateById(element.id, {...element});
            }
        }
        return this.responseService.ok({message: '¡En hora buena! La acción se ha realizado con éxito.'});
    }

    async findByIdProject(id?: number) {
        const project = await this.projectRepository.findOne({where: {id}});
        if (!project)
            throw this.responseService.notFound("El proyecto no se ha encontrado.")
    }


    async createPdfToCustomer(quotationId: number, projectId: number, transaction: any) {
        const quotation = await this.quotationRepository.findById(quotationId, {include: [{relation: 'customer'}, {relation: 'mainProjectManager'}, {relation: 'referenceCustomer'}, {relation: 'products', scope: {include: ['brand', 'document', 'mainFinishImage', 'quotationProducts']}}]});
        const {customer, mainProjectManager, referenceCustomer, products, } = quotation;
        const defaultImage = `data:image/svg+xml;base64,${await fs.readFile(`${process.cwd()}/src/templates/images/NoImageProduct.svg`, {encoding: 'base64'})}`

        let productsTemplate = [];
        for (const product of products) {
            const {brand, status, description, document, mainFinish, mainFinishImage, quotationProducts} = product;
            productsTemplate.push({
                brandName: brand?.brandName,
                status,
                description,
                image: document?.fileURL ?? defaultImage,
                mainFinish,
                mainFinishImage: mainFinishImage?.fileURL ?? defaultImage,
                quantity: quotationProducts?.quantity,
                percentage: quotationProducts?.percentageDiscountProduct,
                subtotal: quotationProducts?.subtotal
            })
        }
        const {subtotal, additionalDiscount, percentageIva, iva, total, advance, exchangeRate, balance, percentageAdditionalDiscount, advanceCustomer, conversionAdvance} = this.getPricesQuotation(quotation);
        const logo = `data:image/png;base64,${await fs.readFile(`${process.cwd()}/src/templates/images/logo_benetti.png`, {encoding: 'base64'})}`
        try {
            const properties: any = {
                "logo": logo,
                "customerName": `${customer?.name} ${customer?.lastName}`,
                "quotationId": quotationId,
                "projectManager": `${mainProjectManager?.firstName} ${mainProjectManager?.lastName}`,
                "createdAt": dayjs(quotation?.createdAt).format('DD/MM/YYYY'),
                "referenceCustomer": `${referenceCustomer?.firstName} ${referenceCustomer?.lastName}`,
                "products": productsTemplate,
                subtotal,
                percentageAdditionalDiscount,
                additionalDiscount,
                percentageIva,
                iva,
                total,
                advance,
                advanceCustomer,
                conversionAdvance,
                balance

            }
            const nameFile = `cotizacion_cliente_${quotationId}_${dayjs().format()}.pdf`
            await this.pdfService.createPDFWithTemplateHtmlSaveFile(`${process.cwd()}/src/templates/cotizacion_cliente.html`, properties, {format: 'A3'}, `${process.cwd()}/.sandbox/${nameFile}`);
            await this.projectRepository.clientQuoteFile(projectId).create({fileURL: `${process.env.URL_BACKEND}/files/${nameFile}`, name: nameFile, extension: 'pdf'}, {transaction})
        } catch (error) {
            await transaction.rollback()
            console.log('error: ', error)
        }
    }

    async createPdfToProvider(quotationId: number, projectId: number, transaction: any) {
        const quotation = await this.quotationRepository.findById(quotationId, {include: [{relation: 'customer'}, {relation: 'mainProjectManager'}, {relation: 'referenceCustomer'}, {relation: 'products', scope: {include: ['brand', 'document', 'mainFinishImage', 'quotationProducts', {relation: 'assembledProducts', scope: {include: ['document']}}]}}]});
        const {customer, mainProjectManager, referenceCustomer, products, } = quotation;
        const defaultImage = `data:image/svg+xml;base64,${await fs.readFile(`${process.cwd()}/src/templates/images/NoImageProduct.svg`, {encoding: 'base64'})}`

        let prodcutsArray = [];
        for (const product of products) {
            const {brand, status, description, document, mainFinish, mainFinishImage, quotationProducts, typeArticle, assembledProducts, originCode} = product;
            prodcutsArray.push({
                brandName: brand?.brandName,
                status,
                description,
                image: document?.fileURL ?? defaultImage,
                mainFinish,
                mainFinishImage: mainFinishImage?.fileURL ?? defaultImage,
                quantity: quotationProducts?.quantity,
                typeArticle: TypeArticleE.PRODUCTO_ENSAMBLADO === typeArticle ? true : false,
                originCode,
                assembledProducts: assembledProducts
            })
        }
        const logo = `data:image/png;base64,${await fs.readFile(`${process.cwd()}/src/templates/images/logo_benetti.png`, {encoding: 'base64'})}`
        try {
            const properties: any = {
                "logo": logo,
                "customerName": `${customer?.name} ${customer?.lastName}`,
                "quotationId": quotationId,
                "projectManager": `${mainProjectManager?.firstName} ${mainProjectManager?.lastName}`,
                "createdAt": dayjs(quotation?.createdAt).format('DD/MM/YYYY'),
                "referenceCustomer": `${referenceCustomer?.firstName} ${referenceCustomer?.lastName}`,
                "products": prodcutsArray,
            }
            const nameFile = `cotizacion_proveedor_${quotationId}_${dayjs().format()}.pdf`
            await this.pdfService.createPDFWithTemplateHtmlSaveFile(`${process.cwd()}/src/templates/cotizacion_proveedor.html`, properties, {format: 'A3'}, `${process.cwd()}/.sandbox/${nameFile}`);
            await this.projectRepository.providerFile(projectId).create({fileURL: `${process.env.URL_BACKEND}/files/${nameFile}`, name: nameFile, extension: 'pdf'}, {transaction})
        } catch (error) {
            await transaction.rollback()
            console.log('error: ', error)
        }
    }


    async createPdfToAdvance(quotationId: number, projectId: number, transaction: any) {
        const quotation = await this.quotationRepository.findById(quotationId, {include: [{relation: 'customer'}, {relation: 'mainProjectManager'}, {relation: 'referenceCustomer'}, {relation: 'proofPaymentQuotations', scope: {order: ['createdAt ASC'], }}]});
        const {customer, mainProjectManager, referenceCustomer} = quotation;
        const logo = `data:image/png;base64,${await fs.readFile(`${process.cwd()}/src/templates/images/logo_benetti.png`, {encoding: 'base64'})}`

        const advancePaymentRecord = await this.advancePaymentRecordRepository.find({where: {projectId}}, {transaction})
        try {
            const propertiesGeneral: any = {
                "logo": logo,
                "customerName": `${customer?.name} ${customer?.lastName}`,
                "quotationId": quotationId,
                "projectManager": `${mainProjectManager?.firstName} ${mainProjectManager?.lastName}`,
                "createdAt": dayjs(quotation?.createdAt).format('DD/MM/YYYY'),
                "referenceCustomer": `${referenceCustomer?.firstName} ${referenceCustomer?.lastName}`,
            }
            for (let index = 0; index < advancePaymentRecord?.length; index++) {
                const {paymentDate, amountPaid, parity, currencyApply, paymentMethod} = advancePaymentRecord[index];
                const letterNumber = this.letterNumberService.convertNumberToWords(amountPaid)
                const propertiesAdvance: any = {
                    ...propertiesGeneral,
                    advanceCustomer: amountPaid,
                    conversionAdvance: parity,
                    proofPaymentType: currencyApply,
                    paymentType: paymentMethod,
                    exchangeRateAmount: parity,
                    paymentDate: dayjs(paymentDate).format('DD/MM/YYYY'),
                    letterNumber,
                    consecutiveId: (index + 1)
                }

                const nameFile = `recibo_anticipo_${currencyApply}_${quotationId}_${dayjs().format()}.pdf`
                await this.pdfService.createPDFWithTemplateHtmlSaveFile(`${process.cwd()}/src/templates/recibo_anticipo.html`, propertiesAdvance, {format: 'A3'}, `${process.cwd()}/.sandbox/${nameFile}`);
                await this.projectRepository.advanceFile(projectId).create({fileURL: `${process.env.URL_BACKEND}/files/${nameFile}`, name: nameFile, extension: 'pdf'}, {transaction})

            }

        } catch (error) {
            await transaction.rollback()
            console.log('error: ', error)
        }
        // try {
        //     const propertiesGeneral: any = {
        //         "logo": logo,
        //         "customerName": `${customer?.name} ${customer?.lastName}`,
        //         "quotationId": quotationId,
        //         "projectManager": `${mainProjectManager?.firstName} ${mainProjectManager?.lastName}`,
        //         "createdAt": dayjs(quotation?.createdAt).format('DD/MM/YYYY'),
        //         "referenceCustomer": `${referenceCustomer?.firstName} ${referenceCustomer?.lastName}`,
        //     }
        //     for (let index = 0; index < proofPaymentQuotations?.length; index++) {
        //         const {proofPaymentType, advanceCustomer, conversionAdvance, paymentType, exchangeRateAmount, paymentDate} = proofPaymentQuotations[index];
        //         const letterNumber = this.letterNumberService.convertNumberToWords(advanceCustomer)
        //         const propertiesAdvance: any = {
        //             ...propertiesGeneral,
        //             advanceCustomer,
        //             conversionAdvance,
        //             proofPaymentType,
        //             paymentType,
        //             exchangeRateAmount,
        //             paymentDate: dayjs(paymentDate).format('DD/MM/YYYY'),
        //             letterNumber,
        //             consecutiveId: (index + 1)
        //         }

        //         const nameFile = `recibo_anticipo_${proofPaymentType}_${quotationId}_${dayjs().format()}.pdf`
        //         await this.pdfService.createPDFWithTemplateHtmlSaveFile(`${process.cwd()}/src/templates/recibo_anticipo.html`, propertiesAdvance, {format: 'A3'}, `${process.cwd()}/.sandbox/${nameFile}`);
        //         await this.projectRepository.advanceFile(projectId).create({fileURL: `${process.env.URL_BACKEND}/files/${nameFile}`, name: nameFile, extension: 'pdf'}, {transaction})

        //     }

        // } catch (error) {
        //     await transaction.rollback()
        //     console.log('error: ', error)
        // }
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

    async createProject(body: {quotationId: number, branchId: number, customerId?: number}, transaction: any) {
        const previousProject = await this.projectRepository.findOne({order: ['createdAt DESC'], include: [{relation: 'branch'}]})
        const branch = await this.branchRepository.findOne({where: {id: body.branchId}})
        let projectId = null;
        if (previousProject) {
            projectId = `${previousProject.id + 1}${branch?.name?.charAt(0)}`;
        } else {
            projectId = `${1}${branch?.name?.charAt(0)}`;
        }
        const project = await this.projectRepository.create({...body, projectId}, {transaction});
        return project;
    }

    async changeStatusProductsToPedido(quotationId: number, transaction: any) {
        await this.quotationProductsRepository.updateAll({status: QuotationProductStatusE.PEDIDO}, {quotationId}, {transaction})
    }

    async createCommissionPaymentRecord(quotation: Quotation, projectId: number, quotationId: number, transaction: any) {
        const {isArchitect, exchangeRateQuotation, isReferencedCustomer, isProjectManager, isDesigner, showroomManagerId} = quotation;
        //Arquitecto
        if (isArchitect === true) {
            const {architectName, commissionPercentageArchitect} = quotation;
            const body = {
                userName: architectName,
                projectId,
                commissionPercentage: commissionPercentageArchitect,
                commissionAmount: this.calculateCommissionAmount(exchangeRateQuotation, quotation, commissionPercentageArchitect),
                projectTotal: this.getTotalQuotation(exchangeRateQuotation, quotation),
                type: AdvancePaymentTypeE.ARQUITECTO
            }
            await this.commissionPaymentRecordRepository.create(body, {transaction});
        }

        //Cliente referenciado
        if (isReferencedCustomer === true) {
            const {referenceCustomerId, commissionPercentagereferencedCustomer} = quotation;
            const body = {
                userId: referenceCustomerId,
                projectId,
                commissionPercentage: commissionPercentagereferencedCustomer,
                commissionAmount: this.calculateCommissionAmount(exchangeRateQuotation, quotation, commissionPercentagereferencedCustomer),
                projectTotal: this.getTotalQuotation(exchangeRateQuotation, quotation),
                type: AdvancePaymentTypeE.CLIENTE_REFERENCIADO
            }
            await this.commissionPaymentRecordRepository.create(body, {transaction});
        }

        //Project managers
        if (isProjectManager === true) {
            const quotationProjectManagers = await this.quotationProjectManagerRepository.find({where: {quotationId}});
            for (const iterator of quotationProjectManagers) {
                const {commissionPercentageProjectManager, userId} = iterator;
                const body = {
                    userId: userId,
                    projectId,
                    commissionPercentage: commissionPercentageProjectManager,
                    commissionAmount: this.calculateCommissionAmount(exchangeRateQuotation, quotation, commissionPercentageProjectManager),
                    projectTotal: this.getTotalQuotation(exchangeRateQuotation, quotation),
                    type: AdvancePaymentTypeE.PROJECT_MANAGER
                }
                await this.commissionPaymentRecordRepository.create(body, {transaction});
            }
        }

        //Showroom manager
        if (showroomManagerId) {
            const commissionPercentage = 16;
            const body = {
                userId: showroomManagerId,
                projectId,
                commissionPercentage: commissionPercentage,
                commissionAmount: this.calculateCommissionAmount(exchangeRateQuotation, quotation, commissionPercentage),
                projectTotal: this.getTotalQuotation(exchangeRateQuotation, quotation),
                type: AdvancePaymentTypeE.SHOWROOM_MANAGER
            }
            await this.commissionPaymentRecordRepository.create(body, {transaction});
        }

        //Proyectistas
        if (isDesigner === true) {
            const QuotationDesigners = await this.quotationDesignerRepository.find({where: {quotationId}});
            for (const iterator of QuotationDesigners) {
                const {commissionPercentageDesigner, userId} = iterator;
                const body = {
                    userId: userId,
                    projectId,
                    commissionPercentage: commissionPercentageDesigner,
                    commissionAmount: this.calculateCommissionAmount(exchangeRateQuotation, quotation, commissionPercentageDesigner),
                    projectTotal: this.getTotalQuotation(exchangeRateQuotation, quotation),
                    type: AdvancePaymentTypeE.PROYECTISTA
                }
                await this.commissionPaymentRecordRepository.create(body, {transaction});
            }
        }

    }

    getTotalQuotation(exchangeRateQuotation: ExchangeRateQuotationE, quotation: Quotation) {
        switch (exchangeRateQuotation) {
            case ExchangeRateQuotationE.EUR:
                return quotation.totalEUR;
                break;
            case ExchangeRateQuotationE.MXN:
                return quotation.totalMXN;

                break;
            case ExchangeRateQuotationE.USD:
                return quotation.totalUSD;
                break;
        }
    }

    calculateCommissionAmount(exchangeRateQuotation: ExchangeRateQuotationE, quotation: Quotation, commissionPercentage: number) {
        switch (exchangeRateQuotation) {
            case ExchangeRateQuotationE.EUR:
                const commisionEUR = this.bigNumberDividedBy(commissionPercentage, 100);
                return this.bigNumberMultipliedBy(quotation.totalEUR, commisionEUR)
                break;
            case ExchangeRateQuotationE.MXN:
                const commisionMXN = this.bigNumberDividedBy(commissionPercentage, 100);
                return this.bigNumberMultipliedBy(quotation.totalMXN, commisionMXN)

                break;
            case ExchangeRateQuotationE.USD:
                const commisionUSD = this.bigNumberDividedBy(commissionPercentage, 100);
                return this.bigNumberMultipliedBy(quotation.totalUSD, commisionUSD)

                break;

            default:
                break;
        }
    }

    async createAdvancePaymentRecord(quotation: Quotation, projectId: number, transaction: any) {
        const {proofPaymentQuotations, exchangeRateQuotation, percentageIva, customerId, id, createdAt, isFractionate, typeFractional} = quotation;
        if (isFractionate) {
            if (typeFractional.EUR == true) {
                const {totalEUR, ivaEUR} = quotation;
                const accountsReceivable = await this.accountsReceivableRepository.create({quotationId: id, projectId, customerId, totalSale: totalEUR ?? 0, totalPaid: 0, updatedTotal: 0, balance: totalEUR ?? 0, typeCurrency: ExchangeRateQuotationE.EUR}, {transaction});
                for (let index = 0; index < proofPaymentQuotations?.length; index++) {
                    const {paymentDate, paymentType, exchangeRateAmount, exchangeRate, id, documents, proofPaymentType, advanceCustomer} = proofPaymentQuotations[index];
                    if (proofPaymentType === ExchangeRateQuotationE.EUR) {
                        const conversionAmountPaid = this.bigNumberDividedBy(advanceCustomer, exchangeRateAmount); //importe pagado
                        const subtotalAmountPaid = this.bigNumberDividedBy(conversionAmountPaid, ((percentageIva / 100) + 1)) //importe pagado sin iva
                        const paymentPercentage = this.calculatePercentage(conversionAmountPaid, totalEUR)
                        await this.createAdvancePaymentRecordRepository(paymentType, advanceCustomer, exchangeRate, exchangeRateAmount, percentageIva, exchangeRateQuotation, conversionAmountPaid, subtotalAmountPaid, paymentPercentage, projectId, accountsReceivable.id, transaction, documents, paymentDate);
                    }
                }
            }

            if (typeFractional.MXN == true) {
                const {totalMXN, ivaMXN} = quotation;
                const accountsReceivable = await this.accountsReceivableRepository.create({quotationId: id, projectId, customerId, totalSale: totalMXN ?? 0, totalPaid: 0, updatedTotal: 0, balance: totalMXN ?? 0, typeCurrency: ExchangeRateQuotationE.MXN}, {transaction});
                for (let index = 0; index < proofPaymentQuotations?.length; index++) {
                    const {paymentDate, paymentType, exchangeRateAmount, exchangeRate, id, documents, conversionAdvance, proofPaymentType, advanceCustomer} = proofPaymentQuotations[index];
                    if (proofPaymentType === ExchangeRateQuotationE.MXN) {
                        const conversionAmountPaid = this.bigNumberDividedBy(conversionAdvance, exchangeRateAmount); //importe pagado
                        const subtotalAmountPaid = this.bigNumberDividedBy(conversionAmountPaid, ((percentageIva / 100) + 1)) //importe pagado sin iva
                        const paymentPercentage = this.calculatePercentage(conversionAmountPaid, totalMXN)
                        await this.createAdvancePaymentRecordRepository(paymentType, advanceCustomer, exchangeRate, exchangeRateAmount, percentageIva, exchangeRateQuotation, conversionAmountPaid, subtotalAmountPaid, paymentPercentage, projectId, accountsReceivable.id, transaction, documents, paymentDate);
                    }

                }
            }

            if (typeFractional.USD == true) {
                const {totalUSD, ivaUSD} = quotation;
                const accountsReceivable = await this.accountsReceivableRepository.create({quotationId: id, projectId, customerId, totalSale: totalUSD ?? 0, totalPaid: 0, updatedTotal: 0, balance: totalUSD ?? 0, typeCurrency: ExchangeRateQuotationE.USD}, {transaction});
                for (let index = 0; index < proofPaymentQuotations?.length; index++) {
                    const {paymentDate, paymentType, exchangeRateAmount, exchangeRate, id, documents, conversionAdvance, proofPaymentType, advanceCustomer} = proofPaymentQuotations[index];
                    if (proofPaymentType === ExchangeRateQuotationE.USD) {
                        const conversionAmountPaid = this.bigNumberDividedBy(conversionAdvance, exchangeRateAmount); //importe pagado
                        const subtotalAmountPaid = this.bigNumberDividedBy(conversionAmountPaid, ((percentageIva / 100) + 1)) //importe pagado sin iva
                        const paymentPercentage = this.calculatePercentage(conversionAmountPaid, totalUSD)
                        await this.createAdvancePaymentRecordRepository(paymentType, advanceCustomer, exchangeRate, exchangeRateAmount, percentageIva, exchangeRateQuotation, conversionAmountPaid, subtotalAmountPaid, paymentPercentage, projectId, accountsReceivable.id, transaction, documents, paymentDate);
                    }

                }
            }
        } else {
            const {total, iva, exchangeRate} = this.getPricesQuotation(quotation);
            const accountsReceivable = await this.accountsReceivableRepository.create({quotationId: id, projectId, customerId, totalSale: total ?? 0, totalPaid: 0, updatedTotal: 0, balance: total ?? 0, typeCurrency: exchangeRateQuotation}, {transaction});
            for (let index = 0; index < proofPaymentQuotations?.length; index++) {
                const {paymentDate, paymentType, exchangeRateAmount, exchangeRate, id, documents, conversionAdvance, proofPaymentType, advanceCustomer} = proofPaymentQuotations[index];
                // const conversionAmountPaid = this.bigNumberDividedBy(conversionAdvance, exchangeRateAmount);
                // const subtotalAmountPaid = this.bigNumberDividedBy(conversionAmountPaid, ((percentageIva / 100) + 1))
                // const paymentPercentage = this.calculatePercentage(conversionAmountPaid, total ?? 0)
                // await this.createAdvancePaymentRecordRepository(accountsReceivable.id, projectId, paymentPercentage, subtotalAmountPaid, iva ?? 0, conversionAmountPaid, proofPaymentType, percentageIva, exchangeRateAmount, exchangeRate, conversionAdvance, paymentType, transaction, documents, paymentDate);
                const conversionAmountPaid = this.bigNumberDividedBy(conversionAdvance, exchangeRateAmount); //importe pagado
                const subtotalAmountPaid = this.bigNumberDividedBy(conversionAmountPaid, ((percentageIva / 100) + 1)) //importe pagado sin iva
                const paymentPercentage = this.calculatePercentage(conversionAmountPaid, total ?? 0)
                await this.createAdvancePaymentRecordRepository(paymentType, advanceCustomer, exchangeRate, exchangeRateAmount, percentageIva, exchangeRateQuotation, conversionAmountPaid, subtotalAmountPaid, paymentPercentage, projectId, accountsReceivable.id, transaction, documents, paymentDate);

            }

        }
    }

    async createAdvancePaymentRecordRepository(paymentMethod: PaymentTypeProofE, amountPaid: number, paymentCurrency: ExchangeRateE, parity: number, percentageIva: number, currencyApply: ExchangeRateQuotationE, conversionAmountPaid: number, subtotalAmountPaid: number, paymentPercentage: number, projectId: number, accountsReceivableId: number, transaction: any, documents: any, paymentDate: Date | undefined) {
        const body = {
            consecutiveId: 1,
            paymentDate,
            paymentMethod,
            amountPaid,
            paymentCurrency,
            parity,
            percentageIva,
            currencyApply,
            conversionAmountPaid,
            // salesDeviation: ((conversionAmountPaid / (1 + (iva ?? 0))) - subtotalAmountPaid),
            salesDeviation: 0,
            subtotalAmountPaid,
            paymentPercentage,
            projectId,
            type: TypeAdvancePaymentRecordE.ANTICIPO_PRODUCTO,
            accountsReceivableId
        }
        console.log('body: ', body)
        const advancePaymentRecord = await this.advancePaymentRecordRepository.create(body, {transaction});
        for (let index = 0; index < documents.length; index++) {
            const {fileURL, name, extension} = documents[index];
            await this.advancePaymentRecordRepository.documents(advancePaymentRecord.id).create({fileURL, name, extension})
        }
    }

    bigNumberDividedBy(price: number, value: number): number {
        return Number(new BigNumber(price).dividedBy(new BigNumber(value)));
    }

    bigNumberMultipliedBy(price: number, value: number): number {
        return Number(new BigNumber(price).multipliedBy(new BigNumber(value)));
    }


    calculatePercentage(conversionAmountPaid: number, total: number) {
        return (conversionAmountPaid / total) * 100
    }

    async findQuotationById(id: number) {
        const quotation = await this.quotationRepository.findOne({
            where: {id}, include: [{
                relation: 'proofPaymentQuotations',
                scope: {
                    order: ['createdAt ASC'],
                    include: ['documents']
                }
            }]
        });
        if (!quotation)
            throw this.responseService.badRequest('La cotizacion no existe.');
        return quotation
    }

}
