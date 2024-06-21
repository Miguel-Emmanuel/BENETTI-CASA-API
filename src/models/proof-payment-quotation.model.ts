import {Entity, belongsTo, hasMany, model, property} from '@loopback/repository';
import {ExchangeRateE, PaymentTypeProofE} from '../enums';
import {Document} from './document.model';
import {Quotation} from './quotation.model';

@model({
    settings: {
        postgresql: {
            table: 'quotation_ProofPaymentQuotation' // Nombre de la tabla en PostgreSQL
        },
    }
})
export class ProofPaymentQuotation extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id?: number;

    @hasMany(() => Document)
    documents: Document[];

    //Fecha de pago
    @property({
        type: 'date',
    })
    paymentDate: Date;

    //Tipo de pago
    @property({
        type: 'string',
    })
    paymentType: PaymentTypeProofE;


    //Tipo de cambio
    @property({
        type: 'string',
    })
    exchangeRate: ExchangeRateE;

    //Anticipo cliente
    @property({
        type: 'number',
        postgresql: {
            dataType: 'double precision',
        },
    })
    advanceCustomer: number;

    //Anticipo Conversión
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    conversionAdvance: number;

    //Cotizacion
    @belongsTo(() => Quotation)
    quotationId: number;

    constructor(data?: Partial<ProofPaymentQuotation>) {
        super(data);
    }
}

export interface ProofPaymentQuotationRelations {
    // describe navigational properties here
}

export type ProofPaymentQuotationWithRelations = ProofPaymentQuotation & ProofPaymentQuotationRelations;
