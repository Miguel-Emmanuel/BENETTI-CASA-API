import {belongsTo, hasMany, model, property} from '@loopback/repository';
import {ExchangeRateE, StatusQuotationE} from '../enums';
import {BaseEntity} from './base/base-entity.model';
import {Branch, BranchWithRelations} from './branch.model';
import {Customer, CustomerWithRelations} from './customer.model';
import {Organization} from './organization.model';
import {Product, ProductWithRelations} from './product.model';
import {QuotationDesigner} from './quotation-designer.model';
import {QuotationProducts} from './quotation-products.model';
import {QuotationProjectManager} from './quotation-project-manager.model';
import {User, UserWithRelations} from './user.model';

@model({
    settings: {
        postgresql: {
            table: 'quotation_Quotation' // Nombre de la tabla en PostgreSQL
        },
        foreignKeys: {
            fk_customer_customerId: {
                name: 'fk_customer_customerId',
                entity: 'Customer',
                entityKey: 'id',
                foreignKey: 'customerid',
            },
            fk_user_referenceCustomerId: {
                name: 'fk_user_referenceCustomerId',
                entity: 'User',
                entityKey: 'id',
                foreignKey: 'referencecustomerid',
            },
            fk_organization_organizationId: {
                name: 'fk_organization_organizationId',
                entity: 'Organization',
                entityKey: 'id',
                foreignKey: 'organizationid',
            },
            fk_branch_branchId: {
                name: 'fk_branch_branchId',
                entity: 'Branch',
                entityKey: 'id',
                foreignKey: 'branchid',
            },
        }
    }
})
export class Quotation extends BaseEntity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    //Cliente
    @belongsTo(() => Customer)
    customerId?: number;

    //Hay Arquitecto o despacho
    @property({
        type: 'boolean',
        required: false,
    })
    isArchitect: boolean;

    //Nombre del arquitecto
    @property({
        type: 'string',
        required: false,
    })
    architectName: string;

    //Comision del arquitecto
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    commissionPercentageArchitect: number;

    //Hay  cliente referenciado
    @property({
        type: 'boolean',
        required: false,
    })
    isReferencedCustomer: boolean;

    @belongsTo(() => User)
    referenceCustomerId?: number;

    //Comision del cliente referenciado
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    commissionPercentagereferencedCustomer: number;

    //Se requiere project manager
    @property({
        type: 'boolean',
        required: false,
    })
    isProjectManager: boolean;

    @hasMany(() => User, {through: {model: () => QuotationProjectManager}})
    projectManagers: User[];

    //Se requiere proyectista
    @property({
        type: 'boolean',
        required: false,
    })
    isDesigner: boolean;

    @hasMany(() => User, {through: {model: () => QuotationDesigner}})
    designers: User[];

    @hasMany(() => Product, {through: {model: () => QuotationProducts}})
    products: Product[];

    //Subtotal
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    subtotal: number;

    //Porcentaje descuento adicional
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    percentageAdditionalDiscount: number;

    @belongsTo(() => Organization)
    organizationId: number;

    @belongsTo(() => Branch)
    branchId: number;

    //descuento adicional total
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    additionalDiscount: number;

    //Iva porcentaje
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    percentageIva: number;

    //Iva total
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    iva: number;

    //Total
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    total: number;

    //Porcentaje anticipo
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    percentageAdvance: number;

    //Anticipo total
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    advance: number;

    //Tipo de cambio
    @property({
        type: 'string',
        required: false,
    })
    exchangeRate: ExchangeRateE;

    //Tipo de cambio monto
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    exchangeRateAmount: number;

    //Saldo
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    balance: number;

    //Estatus de la cotizacion
    @property({
        type: 'string',
        required: false,
    })
    status: StatusQuotationE;

    //Es borrador
    @property({
        type: 'boolean',
        required: false,
    })
    isDraft: boolean;

    constructor(data?: Partial<Quotation>) {
        super(data);
    }
}

export interface QuotationRelations {
    // describe navigational properties here
    projectManagers: User[],
    designers: User[],
    products: ProductWithRelations[];
    customer: CustomerWithRelations;
    referenceCustomer: UserWithRelations;
    branch: BranchWithRelations
}

export type QuotationWithRelations = Quotation & QuotationRelations;
