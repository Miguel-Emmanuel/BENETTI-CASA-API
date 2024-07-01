import {Entity, belongsTo, model, property} from '@loopback/repository';
import {AdvancePaymentStatusE, ExchangeRateE, ExchangeRateQuotationE, PaymentTypeProofE, TypeAdvancePaymentRecordE} from '../enums';
import {Project} from './project.model';

//Registro del pago anticipado (cobro)
@model({
    settings: {
        postgresql: {
            table: 'project_AdvancePaymentRecord' // Nombre de la tabla en PostgreSQL
        },
    }
})
export class AdvancePaymentRecord extends Entity {
    @property({
        type: 'number',
        id: true,
        generated: true,
    })
    id: number;

    @property({
        type: 'number',
    })
    consecutiveId: number;

    //Fecha de creacion
    @property({
        type: 'date',
        default: () => new Date(),
    })
    createdAt: Date;

    //Fecha de pago
    @property({
        type: 'date',
    })
    paymentDate: Date;

    //Metodo de pago
    @property({
        type: 'string',
    })
    paymentMethod: PaymentTypeProofE;

    //Monto pagado
    @property({
        type: 'number',
        postgresql: {
            dataType: 'double precision',
        },
    })
    amountPaid: number;

    //Moneda de pago
    @property({
        type: 'string',
    })
    paymentCurrency: ExchangeRateE;

    //T.C./Paridad
    @property({
        type: 'number',
        postgresql: {
            dataType: 'double precision',
        },
    })
    parity: number;

    //Iva porcentaje
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    percentageIva: number;

    //Moneda a aplicar
    @property({
        type: 'string',
    })
    currencyApply: ExchangeRateQuotationE;

    //Importe pagado
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    conversionAmountPaid: number;

    //Importe pagado sin iva
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    subtotalAmountPaid: number;

    //Porcentaje de pago
    @property({
        type: 'number',
        required: false,
        postgresql: {
            dataType: 'double precision',
        },
    })
    paymentPercentage: number;

    //Estatus del pago
    @property({
        type: 'string',
        required: false,
        default: AdvancePaymentStatusE.PENDIENTE
    })
    status: AdvancePaymentStatusE;

    //Tipo de cobro
    @property({
        type: 'string',
        required: false,
    })
    type: TypeAdvancePaymentRecordE;

    @belongsTo(() => Project)
    projectId: number;


    constructor(data?: Partial<AdvancePaymentRecord>) {
        super(data);
    }
}

export interface AdvancePaymentRecordRelations {
    // describe navigational properties here
}

export type AdvancePaymentRecordWithRelations = AdvancePaymentRecord & AdvancePaymentRecordRelations;
